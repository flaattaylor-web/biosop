import { GoogleGenAI, Type } from '@google/genai';
import { SopDocument, ReactionSheet, CrossTestResult, SearchAndSuggestionResult, SelectedReagentConstraint } from '../types';
import { sanitizeAndValidateSop } from '../utils/sheetUtils';
import { getEnv } from './env';

export const defaultModel = (): string => getEnv('GEMINI_MODEL') || 'gemini-3.6-flash';

/**
 * Order tried on every call: explicitly requested → GEMINI_MODEL → current stable flash models.
 * Model IDs retire without warning (2.5-flash stopped accepting new keys in Aug 2026), so the
 * fallbacks exist to keep the app answering while GEMINI_MODEL is corrected. Pin the one your key
 * has access to via GEMINI_MODEL (wrangler.jsonc vars on Cloudflare, .env on Node).
 */
export function modelCandidates(requested?: string): string[] {
  return Array.from(
    new Set([
      requested || defaultModel(),
      defaultModel(),
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ].filter(Boolean) as string[])
  );
}

/** True when the caller cancelled — never retried, because the user asked for it to stop. */
export function isClientAbort(err: unknown): boolean {
  const e = err as { name?: string; message?: string };
  return e?.name === 'AbortError' || /aborted by client|The operation was aborted/i.test(String(e?.message || ''));
}

/** True when the provider is briefly refusing work — 503/UNAVAILABLE, "high demand", overload. */
export function isOverloaded(err: unknown): boolean {
  const m = String((err as { message?: string })?.message || err);
  return /\b50[03]\b|UNAVAILABLE|high demand|Overloaded|INTERNAL/i.test(m);
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Deadlines
//
// Every Gemini call in this file used to run unbounded. If the API accepted the request and then
// went silent, nothing on the server ever gave up: the model ladder is six candidates deep and each
// gets two attempts, so a single hang could sit through twelve openings and then fall back to the
// blocking path for twelve more. The only backstop was the client's five minute guard, by which
// point the user had waited five minutes to be told to shorten their description.
//
// Three bounds now apply. A per-attempt timeout kills one hung call and moves to the next model. An
// idle timeout on the stream catches the specific failure the error copy described, where the
// connection opens and no chunk ever arrives. A total budget stops the ladder well before the
// client's guard, so the failure is fast and says which models were actually tried.
// ---------------------------------------------------------------------------

/** One model call. Long enough for a real SOP, short enough that a hang is not the user's problem. */
const ATTEMPT_TIMEOUT_MS = Number(getEnv('GEMINI_ATTEMPT_TIMEOUT_MS') || 60_000);
/** Silence between stream chunks. Gemini streams steadily once it starts; a long gap means it stopped. */
const STREAM_IDLE_TIMEOUT_MS = Number(getEnv('GEMINI_STREAM_IDLE_TIMEOUT_MS') || 45_000);
/** Whole-generation budget, deliberately inside the client's 5 minute guard. */
const TOTAL_BUDGET_MS = Number(getEnv('GEMINI_TOTAL_BUDGET_MS') || 210_000);

export class GeminiTimeoutError extends Error {
  constructor(message: string) { super(message); this.name = 'GeminiTimeoutError'; }
}

/** True for our own deadline errors, which are retryable against the next model. */
export function isTimeout(err: unknown): boolean {
  return (err as { name?: string })?.name === 'GeminiTimeoutError';
}

/**
 * An AbortSignal that fires on our deadline or when the caller aborts, whichever comes first.
 * `AbortSignal.any` is not available in every runtime this ships to, so it is composed by hand.
 */
function deadline(ms: number, parent?: AbortSignal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('deadline')), ms);
  const onParent = () => { clearTimeout(timer); ctrl.abort(); };
  if (parent) {
    if (parent.aborted) onParent();
    else parent.addEventListener('abort', onParent, { once: true });
  }
  return {
    signal: ctrl.signal,
    done: () => { clearTimeout(timer); parent?.removeEventListener('abort', onParent); },
  };
}

/** Race a call against a deadline, so a silent provider costs one attempt rather than everything. */
export async function withTimeout<T>(ms: number, label: string, run: (signal: AbortSignal) => Promise<T>, parent?: AbortSignal): Promise<T> {
  const d = deadline(ms, parent);
  const timedOut = new Promise<never>((_, rej) => {
    d.signal.addEventListener('abort', () => {
      if (parent?.aborted) return; // a real client abort surfaces from the call itself
      rej(new GeminiTimeoutError(`${label} did not respond within ${Math.round(ms / 1000)}s.`));
    }, { once: true });
  });
  try {
    return await Promise.race([run(d.signal), timedOut]);
  } finally {
    d.done();
  }
}

/**
 * Wrap an async iterable so a gap between items is an error rather than an indefinite wait.
 * This is the guard for "Gemini accepted the request but never finished it".
 */
export async function* withIdleTimeout<T>(source: AsyncIterable<T>, ms: number): AsyncGenerator<T> {
  const it = source[Symbol.asyncIterator]();
  for (;;) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const idle = new Promise<'idle'>((res) => { timer = setTimeout(() => res('idle'), ms); });
    let r: IteratorResult<T> | 'idle';
    try {
      r = await Promise.race([it.next(), idle]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (r === 'idle') {
      // Close the source, but never wait on it. A generator suspended on a promise that will not
      // settle also never settles its own return(), so awaiting cleanup here reintroduced exactly
      // the hang this function exists to prevent. Found by the stalled-stream test, not by reading.
      try { void it.return?.(undefined as never); } catch { /* closing a dead iterator is not an error */ }
      throw new GeminiTimeoutError(`The model stopped sending data for ${Math.round(ms / 1000)}s.`);
    }
    if (r.done) return;
    yield r.value;
  }
}



/** True when an error means "this model ID is not usable by this key" rather than a transient fault. */
export function isModelUnavailable(err: unknown): boolean {
  const m = String((err as { message?: string })?.message || err);
  return m.includes('404') || m.includes('NOT_FOUND') || m.includes('no longer available');
}

export function getAiClient() {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Helper to invoke Gemini API with immediate candidate model failover and retries
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0]
) {
  const candidateModels = modelCandidates(params.model);
  const startedAt = Date.now();
  const tried: string[] = [];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;
    tried.push(modelName);
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;
      try {
        const response = await withTimeout(
          ATTEMPT_TIMEOUT_MS,
          `${modelName} (blocking)`,
          (signal) => ai.models.generateContent({
            ...params,
            model: modelName,
            config: { ...params.config, abortSignal: signal },
          }),
        );
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        // A hung model is worth exactly one attempt. Move down the ladder rather than waiting again.
        if (isTimeout(err)) {
          console.warn(`[Gemini API] ${modelName} timed out. Trying next candidate...`);
          break;
        }
        const isNotFound = errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('no longer available');
        if (isNotFound) {
          console.warn(`[Gemini API] Model ${modelName} is not available (404). Trying next valid candidate...`);
          break;
        }

        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('resource_exhausted') ||
          errMsg.includes('Overloaded');

        if (isTransient && attempt < 2) {
          const delayMs = 1200 + Math.floor(Math.random() * 600);
          console.warn(`[Gemini API] Model ${modelName} temporarily busy (503/high demand). Retrying in ${delayMs}ms...`);
          await new Promise((res) => setTimeout(res, delayMs));
        } else {
          console.warn(`[Gemini API] Switching from ${modelName} to next fallback model...`);
          break;
        }
      }
    }
  }

  // Say what was actually attempted. "It timed out" with no other detail is what made this hard to
  // diagnose from the outside in the first place.
  if (isTimeout(lastError) || !lastError) {
    throw new GeminiTimeoutError(
      `No model responded within the time budget. Tried: ${tried.join(', ') || 'none'}. ` +
      `Check that GEMINI_MODEL names a model your key can use (/api/ai-selftest reports this).`,
    );
  }
  throw lastError;
}

const sopDocumentSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    documentId: { type: Type.STRING },
    version: { type: Type.STRING },
    effectiveDate: { type: Type.STRING },
    title: { type: Type.STRING },
    category: { type: Type.STRING },
    companyKitInfo: {
      type: Type.OBJECT,
      properties: {
        vendor: { type: Type.STRING },
        catalogNumber: { type: Type.STRING },
        officialDocUrl: { type: Type.STRING },
        storageConditions: { type: Type.STRING },
        kitIncludes: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['vendor', 'catalogNumber', 'storageConditions']
    },
    author: { type: Type.STRING },
    reviewer: { type: Type.STRING },
    scope: { type: Type.STRING },
    biosafetyLevel: { type: Type.STRING },
    hazards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          label: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ['type', 'label', 'description']
      }
    },
    ppeRequirements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          required: { type: Type.BOOLEAN },
          notes: { type: Type.STRING }
        },
        required: ['item', 'required']
      }
    },
    equipmentRequired: { type: Type.ARRAY, items: { type: Type.STRING } },
    reagentsRequired: { type: Type.ARRAY, items: { type: Type.STRING } },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          title: { type: Type.STRING },
          instruction: { type: Type.STRING },
          timingMinutes: { type: Type.NUMBER },
          tempCelsius: { type: Type.NUMBER },
          safetyWarning: { type: Type.STRING },
          criticalCheckpoint: { type: Type.STRING },
          stoppingPoint: { type: Type.STRING }
        },
        required: ['stepNumber', 'title', 'instruction']
      }
    },
    qualityControl: { type: Type.ARRAY, items: { type: Type.STRING } },
    troubleshooting: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING },
          cause: { type: Type.STRING },
          solution: { type: Type.STRING }
        },
        required: ['issue', 'cause', 'solution']
      }
    },
    references: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          citation: { type: Type.STRING },
          doiOrUrl: { type: Type.STRING },
          summary: { type: Type.STRING }
        },
        required: ['citation']
      }
    },
    reactionSheet: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        assayType: { type: Type.STRING },
        reactionVolumeMicroliters: { type: Type.NUMBER },
        defaultNumReactions: { type: Type.NUMBER },
        defaultOverflowPercent: { type: Type.NUMBER },
        components: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              stockConc: { type: Type.NUMBER },
              stockUnit: { type: Type.STRING },
              finalConc: { type: Type.NUMBER },
              finalUnit: { type: Type.STRING },
              volPerRxnMicroliters: { type: Type.NUMBER },
              pipettingOrder: { type: Type.INTEGER },
              notes: { type: Type.STRING },
              storageTemp: { type: Type.STRING },
              role: { type: Type.STRING, enum: ['MASTER_MIX', 'PER_SAMPLE', 'DILUENT'] },
              molecularWeight: { type: Type.NUMBER, description: 'g/mol, only if known; enables mass<->molar conversion' }
            },
            required: ['id', 'name', 'stockConc', 'stockUnit', 'finalConc', 'finalUnit', 'volPerRxnMicroliters', 'role']
          }
        },
        stepByStepReactionSteps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              stepName: { type: Type.STRING },
              phase: { type: Type.STRING },
              tempCelsius: { type: Type.NUMBER },
              timingMinutes: { type: Type.NUMBER },
              conditions: { type: Type.STRING },
              reagentsAndVolumes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    reagentName: { type: Type.STRING },
                    volPerRxnMicroliters: { type: Type.NUMBER },
                    finalAmountOrConc: { type: Type.STRING },
                    notes: { type: Type.STRING }
                  },
                  required: ['reagentName', 'volPerRxnMicroliters']
                }
              },
              instructions: { type: Type.STRING },
              criticalCheckpoint: { type: Type.STRING },
              safetyWarning: { type: Type.STRING },
              stoppingPoint: { type: Type.STRING }
            },
            required: ['stepNumber', 'stepName', 'conditions', 'instructions']
          }
        },
        thermocyclerProfile: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              phase: { type: Type.STRING },
              tempCelsius: { type: Type.NUMBER },
              durationSeconds: { type: Type.NUMBER },
              cycles: { type: Type.INTEGER },
              notes: { type: Type.STRING }
            },
            required: ['stepNumber', 'phase', 'tempCelsius', 'durationSeconds']
          }
        },
        notes: { type: Type.STRING }
      },
      required: ['id', 'title', 'assayType', 'reactionVolumeMicroliters', 'components']
    },
    revisionHistory: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          version: { type: Type.STRING },
          date: { type: Type.STRING },
          changes: { type: Type.STRING },
          author: { type: Type.STRING }
        },
        required: ['version', 'date', 'changes', 'author']
      }
    }
  },
  required: [
    'id', 'documentId', 'version', 'title', 'category', 'scope',
    'biosafetyLevel', 'hazards', 'ppeRequirements', 'equipmentRequired',
    'reagentsRequired', 'steps', 'qualityControl', 'troubleshooting',
    'references', 'revisionHistory'
  ]
};

/**
 * Generate a standard biotechnology Standard Operating Procedure (SOP) and companion reaction sheet
 */
export interface SopGenerationParams {
  topic: string;
  category?: string;
  targetOrganismOrHost?: string;
  biosafetyLevel?: string;
  additionalRequirements?: string;
  referenceText?: string;
  generationMode?: 'de_novo' | 'literature_benchmark';
  isDeNovo?: boolean;
  sopTemplateText?: string;
  sopTemplateMode?: 'match_structure' | 'fill_placeholders';
  customTemplateName?: string;
  sampleCount?: number;
  replicates?: number;
  posControls?: number;
  negControls?: number;
  overflowPercent?: number;
  selectedReagents?: SelectedReagentConstraint[];
  /** Optional manufacturer document (e.g. protocol PDF) passed to the model as an inline attachment. */
  referenceAttachment?: { mimeType: string; data: string; name?: string };
  /** When set, the generated SOP is stamped with this kit metadata. */
  kit?: { vendor: string; catalogNumber: string; officialDocUrl?: string; storageConditions?: string; kitIncludes?: string[] };
}

interface SopRequestBundle {
  prompt: string;
  systemInstruction: string;
  isDeNovoMode: boolean;
  design: { sCount: number; reps: number; posCtl: number; negCtl: number; overflow: number; calculatedTotalReactions: number };
}

/** Builds the prompt + config once so blocking and streaming paths stay identical. */
/**
 * The generator was written for reagent-assembly work and said so in every prompt: multichannel
 * pipetting standards, Covaris shearing parameters, master mix breakdowns, no-template controls.
 * Handed a TCID50 titration or an H&E stain, a model asked for those things produces a document
 * with nothing usable in it. Classify the work first, then ask for what that discipline actually
 * specifies.
 */
export type WorkflowClass =
  | 'REAGENT_ASSEMBLY'
  | 'CELL_BASED'
  | 'STAINING_IMAGING'
  | 'PROTEIN_ANALYTICAL'
  | 'MICROBIOLOGY'
  | 'GENERIC';

export function workflowClass(params: SopGenerationParams): WorkflowClass {
  const text = [params.topic, params.category, params.additionalRequirements, params.targetOrganismOrHost]
    .filter(Boolean).join(' ').toLowerCase();

  if (/histolog|immunohistochem|\bihc\b|\bif\b staining|h&e|haematoxylin|hematoxylin|microscop|confocal|section|fixation|counterstain|chromogen/.test(text)) return 'STAINING_IMAGING';
  if (/tcid50|plaque assay|virus|viral|infect|cytotox|transfect|cell cultur|passage|cryopreserv|mycoplasma|viability|organoid|flow cytometr|\bmoi\b|monolayer/.test(text)) return 'CELL_BASED';
  if (/western|sds-page|proteom|mass spec|\blc-ms|chromatograph|purification|elisa|immunoprecipit|bca|bradford|protein assay|peptide|digest/.test(text)) return 'PROTEIN_ANALYTICAL';
  if (/bacteri|microbio|colony|agar|gram stain|antibiotic susceptib|\bmic\b|inoculum|broth|fermentation|growth curve|od600/.test(text)) return 'MICROBIOLOGY';
  if (/pcr|qpcr|sequenc|librar|cloning|ligat|restriction|crispr|rna extraction|dna extraction|reverse transcri|primer|master mix|nucleic acid/.test(text)) return 'REAGENT_ASSEMBLY';
  return 'GENERIC';
}

export function domainDirectives(cls: WorkflowClass, params: SopGenerationParams): string {
  const scale = `The design is ${params.sampleCount ?? 8} samples x ${params.replicates ?? 1} replicate(s) plus controls.`;

  switch (cls) {
    case 'CELL_BASED':
      return `CELL-BASED WORKFLOW DIRECTIVES — this protocol is built around living cells, not a reagent mix:
- Name the cell line or primary cell type, its medium formulation with supplement percentages, and the passage range that is acceptable.
- State seeding density per well and the vessel format, and the confluence or cell state required on the day of the experiment.
- Give incubation conditions explicitly: temperature, CO2 percentage, humidity, and duration in hours or days.
- Where an agent is applied, state the dose in the unit the field uses — MOI for virus, molarity for compounds, ng/mL for cytokines — and the dilution series if there is one.
- Define the readout and its scoring criteria in words an operator can apply without training: what counts as CPE, what counts as a positive well, what magnification.
- Controls are biological here, not no-template controls: uninfected or vehicle-treated wells, a reference-titre stock, and where relevant a cell-only plate control. ${scale}
- There is usually no master mix. Do NOT invent one. Leave reactionSheet.components empty and put the operational parameters in the steps, where they belong.`;

    case 'STAINING_IMAGING':
      return `STAINING AND IMAGING DIRECTIVES — this protocol acts on tissue or fixed cells:
- State the specimen: fixation type and duration, embedding, section thickness in micrometres, and the slide type.
- Give the full solvent series with times, including dewaxing and rehydration where the specimen is paraffin-embedded.
- For antigen retrieval, name the buffer and pH, the heating method, the time at temperature, and the cool-down.
- Give every antibody or stain as a dilution or concentration, with incubation time and temperature, and the number and duration of washes between steps.
- State development or differentiation timing explicitly, and say what the operator watches for, since these steps are judged by eye and are irreversible.
- Include a positive control specimen and a negative control with the primary omitted or an isotype match.
- There is no master mix in this work. Leave reactionSheet.components empty rather than inventing reagent volumes.`;

    case 'PROTEIN_ANALYTICAL':
      return `PROTEIN AND ANALYTICAL DIRECTIVES:
- State protein input as a mass or concentration per lane, per well or per injection, and how it was quantified.
- Give buffer compositions with component concentrations and pH, and state which are prepared fresh.
- For electrophoresis and transfer, state gel percentage, voltage or current, duration, and cooling.
- For antibodies, give the dilution, diluent, incubation time and temperature, and the wash regime.
- For chromatography or mass spectrometry, state column, mobile phases, gradient, flow rate, and the acquisition parameters that affect the result.
- Include loading controls, blanks and a standard curve where the method is quantitative. ${scale}
- Reagent mixes here are buffers rather than reaction master mixes: populate reactionSheet.components only where a genuine reaction is assembled per sample.`;

    case 'MICROBIOLOGY':
      return `MICROBIOLOGY DIRECTIVES:
- Name the organism and strain, the medium and agar formulation, and the incubation atmosphere, temperature and duration.
- State inoculum preparation quantitatively — OD600, McFarland standard, or CFU/mL — and the dilution scheme used to reach it.
- Give plating or broth volumes, and the counting rule including which plates are countable.
- State selection or supplementation with concentrations, and whether plates are fresh.
- Controls: an uninoculated medium control for sterility, a known reference strain, and where relevant a resistant and susceptible pair. ${scale}
- Populate reactionSheet.components only if a reagent reaction is genuinely assembled; a plating protocol has none.`;

    case 'REAGENT_ASSEMBLY':
      return `REAGENT ASSEMBLY AND MASTER MIX DIRECTIVES:
1. Multi-channel pipetting: for 96-well column work (rows A-H), specify 8-channel pipettes (0.5-10 µL, 2-20 µL, 20-200 µL) and calibrated single-channel pipettes (P2, P10, P20, P200, P1000). Do not specify 12-channel pipettes for column-wise additions.
2. Where the protocol genuinely fragments nucleic acid, give the instrument parameters in full: target fragment size, peak incident power, duty factor, cycles per burst, treatment duration, chiller temperature and vessel. Do not add a fragmentation step to a protocol that does not need one.
3. In reactionSheet.stepByStepReactionSteps, give a per-step reagent breakdown with exact single-reaction volumes, stock and target concentrations, and handling notes.
4. List every reagent and consumable the protocol consumes, including ethanol, beads, water, elution buffer and QC assay reagents — in the inventory and the step that consumes them, not in the reaction components.
${scale}`;

    default:
      return `GENERAL LABORATORY DIRECTIVES:
- Identify what the protocol acts on, in what quantity, and what the finished product or measurement is.
- Give every quantity, concentration, temperature, duration and speed the operator needs; a step without numbers is not a protocol step.
- State the controls appropriate to this kind of work and what result would invalidate the run.
- Populate reactionSheet.components only where reagents are genuinely combined per sample; otherwise leave it empty rather than inventing a mix. ${scale}`;
  }
}

export function buildSopRequest(params: SopGenerationParams): SopRequestBundle {
  const isDeNovoMode = !!(params.isDeNovo || params.generationMode === 'de_novo');

  const sCount = params.sampleCount && params.sampleCount > 0 ? params.sampleCount : 8;
  const reps = params.replicates && params.replicates > 0 ? params.replicates : 1;
  const posCtl = params.posControls !== undefined ? params.posControls : 1;
  const negCtl = params.negControls !== undefined ? params.negControls : 1;
  const overflow = params.overflowPercent !== undefined ? params.overflowPercent : 10;
  const calculatedTotalReactions = (sCount * reps) + posCtl + negCtl;

  let templatePromptSection = '';
  if (params.sopTemplateText && params.sopTemplateText.trim().length > 0) {
    templatePromptSection = `
CRITICAL CUSTOM SOP TEMPLATE FORMATTING DIRECTIVES:
The user has provided a Custom SOP Template / Format. You MUST construct and format the generated SOP so that all generated sections, procedure steps, safety checkpoints, equipment lists, and quality controls strictly match and fill into this template layout:

=== CUSTOM SOP TEMPLATE CONTENT BEGIN ===
${params.sopTemplateText.trim()}
=== CUSTOM SOP TEMPLATE CONTENT END ===

Template Execution Mode: ${params.sopTemplateMode === 'fill_placeholders' ? 'DIRECT PLACEHOLDER INJECTION & FILLING' : 'MATCH TEMPLATE SECTION STRUCTURE & HEADINGS'}
1. Map all generated experimental protocol details, safety requirements, master mix calculations, and step-by-step instructions into the exact structure and order specified by the template above.
2. If the template contains specific section headings, numbering, or mandatory disclaimer text, ensure those headings and disclaimers appear prominently in the generated scope, steps, or instructions.
3. Inject the generated protocol metadata, target host, BSL guidelines, equipment, and troubleshooting entries into the corresponding template fields.
`;
  }

  let reagentConstraintsSection = '';
  if (params.selectedReagents && params.selectedReagents.length > 0) {
    reagentConstraintsSection = `
CRITICAL REAGENT DATABASE & STOCK SOLUTION CONSTRAINTS:
The bench scientist has configured the following exact stock solutions, target working concentrations, and storage requirements from the laboratory database:
${params.selectedReagents
  .map(
    (r, i) =>
      `${i + 1}. [${r.name}] | Category: ${r.category} | Stock Conc (C1): ${r.stockConc} ${r.stockUnit} | Target Final Conc (C2): ${r.finalConc} ${r.finalUnit} | Storage Requirement: ${r.storageCondition} | Prep Notes: ${r.preparationNotes}${r.notes ? ` | Notes: ${r.notes}` : ''}`
  )
  .join('\n')}

REAGENT DATABASE DIRECTIVES:
1. In the Reaction Sheet and Master Mix tables, you MUST incorporate these specified stock reagents using the exact Stock Concentrations (C1) and Target Final Working Concentrations (C2).
2. Calculate single reaction pipetting volumes (V1) using exact C1*V1 = C2*V_total stoichiometry.
3. In the Reagents Required table and Storage Requirements section of the SOP, state the exact storage conditions and preparation/aliquot rules indicated above.
`;
  }

  const prompt = `
You are a senior Biotechnology R&D Director, Senior Quality Assurance Specialist, and Molecular Automation Architect.
Generate a complete, ISO/GLP-compliant Biotechnology Standard Operating Procedure (SOP) and companion Excel Reaction Sheet for the following request:

Topic / Protocol: ${params.topic}
Generation Mode: ${isDeNovoMode ? 'DE NOVO CUTTING-EDGE PROTOCOL SYNTHESIS' : 'LITERATURE BENCHMARK SOP'}
Category: ${params.category || 'Molecular Biology'}
Target Organism / Host: ${params.targetOrganismOrHost || 'Standard Biological System'}
Biosafety Level: ${params.biosafetyLevel || 'BSL-1'}
Additional Requirements: ${params.additionalRequirements || 'None'}
EXPERIMENTAL SCALE & SAMPLE CAPACITY DIRECTIVES:
- Primary Sample Count: ${sCount} Biological Test Samples
- Technical Replicates: ${reps}x (${reps === 1 ? 'Singlicate' : reps === 2 ? 'Duplicate' : 'Triplicate'})
- Positive Reference Controls: ${posCtl}
- Negative Controls: ${negCtl} (a no-template control for reagent reactions; an uninfected, untreated or unstained control for cell, tissue and culture work)
- Total Units N: ${calculatedTotalReactions} (+${overflow}% overflow where reagent is consumed per unit)

${domainDirectives(workflowClass(params), params)}

UNIVERSAL STEP QUALITY REQUIREMENT — this applies to every protocol regardless of discipline:
Every entry in steps[] must be executable at the bench by someone who has not read the paper. Each
instruction states what is done, to what, in what quantity, at what temperature, for how long, and
how the operator knows it worked. An instruction that merely restates its own title, or says
"prepare the sample appropriately", is a failure of the document, not a stylistic preference. Give
between 5 and 12 steps for a routine protocol; use more only when the work genuinely has more
stages. If a step has no reagent additions — an incubation, an instrument run, a scoring step — it
still gets a full instruction, and its reagentsAndVolumes array is simply empty.

${params.referenceText ? `Reference Literature / Benchmark Context:\n${params.referenceText}` : ''}
${templatePromptSection}
${reagentConstraintsSection}

${
  isDeNovoMode
    ? `CRITICAL DE NOVO SYNTHESIS DIRECTIVES:
1. Synthesize a completely NEW, novel, cutting-edge protocol based on first principles, thermodynamic/kinetic literature, and emerging 2024-2026 biotech methodologies.
2. For EVERY step in the protocol, provide a dedicated Step-by-Step Master Mix calculation (reagentsAndVolumes) with exact single-reaction microliter volumes, target concentrations, stock concentrations, step temperatures, and incubation conditions.
3. Include cited cutting-edge literature benchmarks (author, journal, year, DOI) that ground this de novo protocol in published biochemistry.
4. Highlight experimental hazard controls, critical checkpoints, and troubleshooting for novel reaction chemistries.`
    : `CRITICAL LITERATURE BENCHMARK DIRECTIVES:
1. Include realistic, precise chemical concentrations, stock solutions, pipetting volumes, incubation times, temperatures, and equipment based on standard literature protocols.
2. Provide a full hazard analysis and complete PPE requirements.
3. Include quality control checks and actionable troubleshooting pairs (Issue, Cause, Solution).
4. Provide cited literature references (author, journal, year, DOI or protocol source).
5. Include a companion ReactionSheet object with exact stock concentrations, target concentrations, single reaction volume in microliters, pipetting order, storage temperatures, and thermocycler or incubation profiles.`
}
  `;

  const systemInstruction =
    'You are a PhD Principal Investigator and Quality Director generating publication-grade biotechnology SOP documents and companion reaction master mix sheets. ' +
    'RULES: 1. For every reactionSheet component give the stock concentration (C1) with unit, the final concentration (C2) with unit, and your proposed per-reaction volume. Use compatible units for C1 and C2 (both molar, or both mass/volume, or both X). Volumes will be independently recomputed by software from C1V1=C2V2 — accuracy of the CONCENTRATIONS matters most. ' +
    '2. Mark each component with role: "MASTER_MIX" (shared mix), "PER_SAMPLE" (template/sample added per tube), or "DILUENT" (water/buffer to volume). ' +
    '3. State the reaction volume; the diluent will be computed to balance it. ' +
    '4. Specify real, commonly available laboratory equipment; do not invent instrument models. ' +
    '5. Every reference must be a real publication or vendor document you are confident exists, with a DOI or URL where available. If unsure a source exists, omit it — references will be verified against Crossref/PubMed and fabricated ones will be flagged. ' +
    '6. Populate stepByStepReactionSteps with per-step reagent additions referencing components by name. ' +
    '7. reactionSheet.components describes ONE reaction only — the primary reaction whose volume is ' +
    'reactionVolumeMicroliters — and its per-reaction volumes must sum to that volume, with a DILUENT absorbing ' +
    'the remainder. Reagents consumed by other steps (bead slurries, ethanol washes, elution buffer, QC assay ' +
    'reagents) belong ONLY in that step\'s reagentsAndVolumes and must NOT appear in the top-level components ' +
    'list. A software auditor sums components and fails the document when they exceed the stated reaction volume. ' +
    '8. stepByStepReactionSteps must correspond 1:1 with the SOP procedureSteps: same number of steps, and the ' +
    'entry with a given stepNumber must describe the SAME operation as the procedure step with that stepNumber, ' +
    'with stepName and phase naming that operation. When a procedure step adds no reagents — an instrument run ' +
    'such as acoustic shearing, an incubation, a magnet capture, an air-dry — still emit its reaction step with ' +
    'the matching stepNumber and stepName and an empty reagentsAndVolumes array. Never skip a step and never ' +
    'renumber to close a gap: the document joins the two lists by stepNumber, so any drift attaches each master ' +
    'mix to the wrong procedure step. ' +
    '9. Platform chemistry constrains the workflow and is not negotiable. Identify the sequencing platform and ' +
    'chemistry named in the request before writing any step, and obey its published limits. Oxford Nanopore ' +
    'DIRECT RNA sequences native full-length molecules: never fragment, shear or sonicate the input; never ' +
    'amplify it; purify with an RNA SPRI (Agencourt RNAClean XP — not AMPure XP or SPRIselect, which are ' +
    'double-stranded DNA chemistries); require poly(A)-selected input or add an in vitro polyadenylation step; ' +
    'name an RNA flow cell (FLO-MIN004RA or FLO-PRO004RA); and note that Oxford Nanopore does not currently ' +
    'support barcoding or multiplexing for direct RNA, so a multiplexed direct RNA protocol must be labelled ' +
    'non-standard and cite the custom-barcoding method it follows. EVERY nanopore library, DNA or RNA, must end ' +
    'with ligation of the motor-protein sequencing adapter — a barcoded or RT adapter replaces the RT adapter, ' +
    'never the motor adapter — and a ligated nanopore library is NEVER heat-inactivated, because heat denatures ' +
    'the motor protein and melts the adapter duplex. Size single-stranded RNA in nucleotides and duplex DNA in ' +
    'base pairs. When the request asks for something the named platform cannot do, say so plainly in the scope ' +
    'section and describe the nearest supported alternative rather than inventing a workflow that would fail at ' +
    'the bench. A deterministic auditor checks these constraints and fails the document when they are broken. ' +
    '10. reactionSheet.components may contain ONLY substances pipetted into the reaction tube that have a real ' +
    'stock concentration — enzymes, buffers, primers, adapters, nucleotides, template, and the diluent. Never ' +
    'list ethanol, bead slurries (AMPure/SPRIselect/RNAClean), wash or elution buffers, QC assay kits, tips, ' +
    'plates, tubes or flow cells as components; they are consumed by a step, so they belong in that step\'s ' +
    'reagentsAndVolumes and in the equipment/reagent inventory. Give each component its genuine vendor stock ' +
    'concentration and the final concentration the assay actually calls for. Do NOT reuse one stock/final pair ' +
    'across unrelated reagents: copying "10 uM to 1 uM" down the list is unit-compatible, so arithmetic checks ' +
    'pass, but it silently assigns every reagent the same volume and produces a mix no one can run.';

  const promptWithAttachment = params.referenceAttachment
    ? prompt + `\n\nMANUFACTURER DOCUMENT ATTACHED (${params.referenceAttachment.name || params.referenceAttachment.mimeType}): The attached document is the official manufacturer protocol for this product. Follow its reagent names, volumes, concentrations, temperatures, times and order of operations EXACTLY. Do not invent components that are not in the document. Where the document gives a range, use the manufacturer's recommended default. Cite the document as the primary reference.`
    : prompt;

  return {
    prompt: promptWithAttachment,
    systemInstruction,
    isDeNovoMode,
    design: { sCount, reps, posCtl, negCtl, overflow, calculatedTotalReactions },
  };
}

/** Gemini `contents` for a request: text prompt plus optional inline document. */
function contentsFor(bundle: SopRequestBundle, params: SopGenerationParams) {
  if (!params.referenceAttachment) return bundle.prompt;
  return [{
    role: 'user' as const,
    parts: [
      { text: bundle.prompt },
      { inlineData: { mimeType: params.referenceAttachment.mimeType, data: params.referenceAttachment.data } },
    ],
  }];
}

/** Applies design metadata and sanitises the raw model output. Shared by blocking and streaming paths. */
export function postProcessGeneratedSop(rawText: string, params: SopGenerationParams, bundle: SopRequestBundle): SopDocument {
  const data = JSON.parse(rawText || '{}') as SopDocument;
  const { isDeNovoMode } = bundle;
  const { sCount, reps, posCtl, negCtl, overflow, calculatedTotalReactions } = bundle.design;

  data.isDeNovo = isDeNovoMode;
  data.generationMode = isDeNovoMode ? 'de_novo' : 'literature_benchmark';
  if (params.kit) {
    data.companyKitInfo = {
      vendor: params.kit.vendor,
      catalogNumber: params.kit.catalogNumber,
      officialDocUrl: params.kit.officialDocUrl,
      storageConditions: params.kit.storageConditions || data.companyKitInfo?.storageConditions || '',
      kitIncludes: params.kit.kitIncludes?.length ? params.kit.kitIncludes : (data.companyKitInfo?.kitIncludes || []),
    };
  }
  if (params.sopTemplateText && params.sopTemplateText.trim().length > 0) {
    data.customTemplateApplied = true;
    data.customTemplateName = params.customTemplateName || 'Custom Institutional Template';
  }
  if (data.reactionSheet) {
    data.reactionSheet.isDeNovo = isDeNovoMode;
    data.reactionSheet.generationMode = isDeNovoMode ? 'de_novo' : 'literature_benchmark';
    data.reactionSheet.defaultNumReactions = calculatedTotalReactions;
    data.reactionSheet.defaultOverflowPercent = overflow;
    data.reactionSheet.sampleCount = sCount;
    data.reactionSheet.replicates = reps;
    data.reactionSheet.posControls = posCtl;
    data.reactionSheet.negControls = negCtl;
  }

  return sanitizeAndValidateSop(data);
}

/**
 * Generate a standard biotechnology SOP and companion reaction sheet (blocking).
 */
export async function generateSopAndReactionSheet(params: SopGenerationParams): Promise<SopDocument> {
  const ai = getAiClient();
  const bundle = buildSopRequest(params);
  const response = await generateWithRetry(ai, {
    model: defaultModel(),
    contents: contentsFor(bundle, params),
    config: {
      systemInstruction: bundle.systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: sopDocumentSchema,
    },
  });
  return postProcessGeneratedSop(response.text || '{}', params, bundle);
}

/**
 * Streaming variant. Calls `onChunk` with each text delta as it arrives so the
 * client can show real progress, then returns the fully post-processed SOP.
 */
export async function generateSopAndReactionSheetStream(
  params: SopGenerationParams,
  onChunk: (delta: string, accumulated: string) => void,
  signal?: AbortSignal
): Promise<SopDocument> {
  const ai = getAiClient();
  const bundle = buildSopRequest(params);
  // The stream is created before any bytes reach the client, so an unusable model ID can still be
  // swapped here without the user seeing a partial response.
  let stream: Awaited<ReturnType<typeof ai.models.generateContentStream>> | null = null;
  let streamError: unknown = null;
  const startedAt = Date.now();
  const tried: string[] = [];
  for (const modelName of modelCandidates()) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;
    tried.push(modelName);
    // Two attempts per model: a 503 "high demand" is usually a spike lasting seconds, and when it
    // is not, the next model in the ladder is rarely saturated at the same moment. Without this a
    // transient spike on one model failed the whole generation.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        stream = await withTimeout(
          ATTEMPT_TIMEOUT_MS,
          `${modelName} (stream open)`,
          (deadlineSignal) => ai.models.generateContentStream({
            model: modelName,
            contents: contentsFor(bundle, params),
            config: {
              systemInstruction: bundle.systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: sopDocumentSchema,
              abortSignal: deadlineSignal,
            },
          }),
          signal,
        );
        break;
      } catch (err) {
        streamError = err;
        if (isClientAbort(err) || signal?.aborted) throw err;
        if (isTimeout(err)) {
          console.warn(`[Gemini API] ${modelName} did not open a stream in time. Trying next candidate...`);
          break;
        }
        if (isModelUnavailable(err)) {
          console.warn(`[Gemini API] Model ${modelName} is not available (404). Trying next candidate...`);
          break;
        }
        if (isOverloaded(err)) {
          if (attempt < 2) {
            console.warn(`[Gemini API] Model ${modelName} reported high demand. Retrying once...`);
            await pause(1500);
            continue;
          }
          console.warn(`[Gemini API] Model ${modelName} still overloaded. Trying next candidate...`);
          break;
        }
        throw err;
      }
    }
    if (stream) break;
  }
  if (!stream) {
    if (isTimeout(streamError) || !streamError) {
      throw new GeminiTimeoutError(
        `No model opened a stream within the time budget. Tried: ${tried.join(', ') || 'none'}. ` +
        `Check GEMINI_MODEL against /api/ai-selftest.`,
      );
    }
    throw streamError instanceof Error ? streamError : new Error(String(streamError));
  }

  let acc = '';
  try {
    for await (const chunk of withIdleTimeout(stream, STREAM_IDLE_TIMEOUT_MS)) {
      if (signal?.aborted) throw new Error('Generation aborted by client.');
      const t = chunk.text || '';
      if (t) {
        acc += t;
        onChunk(t, acc);
      }
    }
  } catch (err) {
    // A dropped upstream stream leaves the SDK holding a partial SSE frame ("Incomplete JSON
    // segment at the end") and `acc` holding truncated JSON — unusable either way. The blocking
    // call returns the same document without depending on a long-lived connection, so retry there
    // once rather than failing a generation the user has already waited on.
    if (signal?.aborted || isClientAbort(err)) throw err;
    // The blocking retry is worth doing, but only if there is time left. Falling into a second full
    // model ladder after the budget is spent is how one stall turned into a five minute wait.
    const spent = Date.now() - startedAt;
    if (spent > TOTAL_BUDGET_MS) {
      throw new GeminiTimeoutError(
        `Generation stopped after ${Math.round(spent / 1000)}s. ${String((err as Error)?.message || err)} ` +
        `Tried: ${tried.join(', ')}.`,
      );
    }
    console.warn(`[Gemini API] Stream ended early (${String((err as Error)?.message || err)}). Retrying without streaming...`);
    onChunk('', acc); // nudge the SSE channel so the client sees the connection is still alive
    return await generateSopAndReactionSheet(params);
  }

  return postProcessGeneratedSop(acc, params, bundle);
}

/**
 * Cross-test an SOP and Reaction Sheet against literature standards and reference protocols
 */
export async function crossTestAgainstLiterature(params: {
  sop: SopDocument;
  referenceLiteratureOrSop: string;
}): Promise<CrossTestResult> {
  const ai = getAiClient();

  const prompt = `
You are an expert Biotechnology Protocol Auditor, QC Specialist, and Scientific Literature Validator.
Conduct a rigorous multi-tier audit cross-testing the target SOP & Reaction Sheet against the provided scientific literature or benchmark operating procedure.

TARGET SOP & REACTION SHEET:
Title: ${params.sop.title}
Document ID: ${params.sop.documentId}
Biosafety Level: ${params.sop.biosafetyLevel}
Steps: ${JSON.stringify(params.sop.steps, null, 2)}
Reaction Sheet Components: ${JSON.stringify(params.sop.reactionSheet?.components || [], null, 2)}
Thermocycler Profile: ${JSON.stringify(params.sop.reactionSheet?.thermocyclerProfile || [], null, 2)}

BENCHMARK LITERATURE / REFERENCE PROCEDURE TEXT:
${params.referenceLiteratureOrSop}

AUDIT RULES:
1. Chemical & Buffer Verification: Compare concentrations, pH, salt molarity, buffer ratios (e.g., Tris, MgCl2, dNTPs, enzyme units) against literature.
2. Stoichiometric & Volumetric Math: Verify total reaction volume equals sum of component volumes, stock-to-final concentration ratios.
3. Biosafety & Hazard Audit: Check if BSL rating matches risk level, inspect PPE gaps, check hazardous chemical disposal warnings (e.g., Ethidium Bromide, Phenol, SDS).
4. Identify all Discrepancies with Severity:
   - CRITICAL_HAZARD: Missing critical PPE, unsafe BSL level, dangerous chemical exposure without warning.
   - CONCENTRATION_DEVIATION: Reagent molarity/concentration significantly deviates from literature optimal range (e.g. 1.5mM vs 3.0mM MgCl2).
   - VOLUME_MISMATCH: Component volumes don't add up to total reaction volume.
   - OPTIMIZATION_SUGGESTION: Temperature or timing tweak recommended in modern papers for higher yield/purity.
5. Provide an overall compliance score (0 - 100%).
  `;

  const response = await generateWithRetry(ai, {
    model: defaultModel(),
    contents: prompt,
    config: {
      systemInstruction: 'You audit biotech procedures and reaction master mixes against peer-reviewed literature and ISO laboratory compliance standards.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          testedAt: { type: Type.STRING },
          overallScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          passedChecks: { type: Type.INTEGER },
          totalChecks: { type: Type.INTEGER },
          discrepancies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { type: Type.STRING },
                severity: { type: Type.STRING },
                title: { type: Type.STRING },
                location: { type: Type.STRING },
                currentValue: { type: Type.STRING },
                literatureValue: { type: Type.STRING },
                citation: { type: Type.STRING },
                explanation: { type: Type.STRING },
                suggestedFix: { type: Type.STRING }
              },
              required: [
                'id', 'category', 'severity', 'title', 'location',
                'currentValue', 'literatureValue', 'citation', 'explanation', 'suggestedFix'
              ]
            }
          },
          literatureReferences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                authors: { type: Type.STRING },
                journalOrSource: { type: Type.STRING },
                year: { type: Type.INTEGER },
                contentSnippet: { type: Type.STRING }
              },
              required: ['id', 'title', 'authors', 'journalOrSource', 'year', 'contentSnippet']
            }
          }
        },
        required: ['testedAt', 'overallScore', 'summary', 'passedChecks', 'totalChecks', 'discrepancies', 'literatureReferences']
      }
    }
  });

  const rawText = response.text || '{}';
  return JSON.parse(rawText) as CrossTestResult;
}

/**
 * Automatically update SOP and Reaction Sheet based on cross-test literature discrepancies
 */
export async function autoFixSopFromLiterature(params: {
  sop: SopDocument;
  discrepancies: any[];
}): Promise<SopDocument> {
  const ai = getAiClient();

  const prompt = `
You are a Lead Biotech Protocol Specialist & Quality Assurance Director.
Update the provided SOP and companion Reaction Sheet to resolve ALL discrepancies flagged during the literature cross-testing audit.

ORIGINAL SOP:
${JSON.stringify(params.sop, null, 2)}

DISCREPANCIES FLAGGED BY LITERATURE AUDIT:
${JSON.stringify(params.discrepancies, null, 2)}

CRITICAL INSTRUCTIONS:
1. Incorporate all recommended corrections to achieve 100% literature compliance.
2. Fix all concentration deviations, buffer stoichiometric ratios (C1*V1 = C2*V2), safety/PPE entries, and thermocycler step profiles.
3. Return the COMPLETE document. Every section, step, component, reference and table must be present
   in your output, changed where the audit requires it and byte-identical where it does not. Anything
   you omit is treated as deleted. Do not summarise, truncate, or replace content with placeholders.
4. Leave id, documentId and version alone — the application sets those. Describe each change you made
   in plain language; the revision history entry is written for you.
  `;

  const response = await generateWithRetry(ai, {
    model: defaultModel(),
    contents: prompt,
    config: {
      systemInstruction: 'You revise biotech SOPs and reaction sheets to achieve 100% compliance with validated literature standards.',
      responseMimeType: 'application/json',
      responseSchema: sopDocumentSchema
    }
  });

  let rawText = response.text || '{}';
  rawText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: SopDocument;
  try {
    parsed = JSON.parse(rawText) as SopDocument;
  } catch (err) {
    console.error('Failed to parse auto-fix output:', rawText);
    throw new Error('AI produced invalid structured JSON output during literature fix. Please try again.');
  }

  // The model returns a whole regenerated document, so anything it forgets would silently vanish and
  // the identity fields would drift — a new id means the app's "replace the protocol with this id"
  // update matches nothing and the fix appears to have been discarded. Merge over the original and
  // pin identity and versioning in code rather than trusting the model to preserve them.
  const fixed = sanitizeAndValidateSop(parsed);
  const nextVersion = bumpVersion(params.sop.version);
  return sanitizeAndValidateSop({
    ...params.sop,
    ...fixed,
    id: params.sop.id,
    documentId: params.sop.documentId,
    version: nextVersion,
    revisionHistory: [
      ...(params.sop.revisionHistory || []),
      {
        version: nextVersion,
        date: new Date().toISOString().split('T')[0],
        changes: `Literature cross-test fixes applied: ${params.discrepancies
          .map((d: { title?: string; issue?: string }) => d?.title || d?.issue)
          .filter(Boolean)
          .join('; ') || 'see audit report'}.`,
        author: 'Automated literature cross-test',
      },
    ],
  });
}

/** 1.0.0 -> 1.1.0, v1.0 -> v1.1. Deterministic, so two fixes never collide on one version string. */
export function bumpVersion(version: string | undefined): string {
  const raw = version || '1.0.0';
  const prefix = raw.startsWith('v') ? 'v' : '';
  const parts = raw.replace(/^v/, '').split('.').map((n) => parseInt(n, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return `${prefix}1.1`;
  parts[1] += 1;
  for (let i = 2; i < parts.length; i++) parts[i] = 0;
  return prefix + parts.join('.');
}

/**
  * AI Reasoning & Thought Function for Protocol Search & Smart Suggestions
  */
export async function searchAndSuggestProtocols(params: {
  query: string;
  targetOrganism?: string;
  categoryHint?: string;
}): Promise<SearchAndSuggestionResult> {
  const ai = getAiClient();

  const prompt = `
You are a Principal AI Biotech Research Scientist & Protocol Architect.
Analyze the user's protocol search/suggestion request: "${params.query}".
${params.targetOrganism ? `Target Organism/Host: ${params.targetOrganism}` : ''}
${params.categoryHint ? `Preferred Category: ${params.categoryHint}` : ''}

You MUST output an "AI Thought Chain" containing 5 explicit step-by-step reasoning phases detailing how you parsed, analyzed, cross-checked, and formulated optimized protocol suggestions, followed by 3 highly optimized protocol suggestions.

REASONING PHASES REQUIRED IN thoughtSteps:
1. INTENT_PARSING: Deconstruct user research goal, target organism/host, key assay type, and functional constraints.
2. STOICHIOMETRY: Analyze reaction stoichiometry (C1*V1 = C2*V2), enzyme kinetics, buffer requirements, and temperature profiles.
3. BIOSAFETY_QC: Evaluate Biosafety Level (BSL-1/2/3), hazard profiles, PPE matrices, and quality control checkpoints.
4. LITERATURE_SYNTHESIS: Cross-reference validated literature standards (Cold Spring Harbor, Nature Protocols, NIH/NCBI guidelines).
5. RECOMMENDATION: Formulate tailored protocol variants with match confidence scores and clear advantages.

Provide 3 distinct, practical protocol suggestions matching the user's query with realistic parameters ready to be sent to the SOP Generator.
  `;

  const response = await generateWithRetry(ai, {
    model: defaultModel(),
    contents: prompt,
    config: {
      systemInstruction: 'You perform deep scientific reasoning and protocol analysis for biotechnology queries, returning structured thought steps and high-precision protocol suggestions.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING },
          overallAnalysisSummary: { type: Type.STRING },
          thoughtSteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['INTENT_PARSING', 'STOICHIOMETRY', 'BIOSAFETY_QC', 'LITERATURE_SYNTHESIS', 'RECOMMENDATION'] },
                detail: { type: Type.STRING },
                keyFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['stepNumber', 'title', 'category', 'detail']
            }
          },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                matchScore: { type: Type.INTEGER },
                description: { type: Type.STRING },
                targetHostOrOrganism: { type: Type.STRING },
                biosafetyLevel: { type: Type.STRING, enum: ['BSL-1', 'BSL-2', 'BSL-3'] },
                estimatedDuration: { type: Type.STRING },
                keyReagents: { type: Type.ARRAY, items: { type: Type.STRING } },
                scientificRationale: { type: Type.STRING },
                suggestedTopic: { type: Type.STRING },
                suggestedCategory: { type: Type.STRING },
                suggestedAdditionalReqs: { type: Type.STRING },
                sampleCountDefault: { type: Type.INTEGER }
              },
              required: [
                'id',
                'title',
                'category',
                'matchScore',
                'description',
                'targetHostOrOrganism',
                'biosafetyLevel',
                'estimatedDuration',
                'keyReagents',
                'scientificRationale',
                'suggestedTopic',
                'suggestedCategory',
                'suggestedAdditionalReqs'
              ]
            }
          }
        },
        required: ['query', 'overallAnalysisSummary', 'thoughtSteps', 'suggestions']
      }
    }
  });

  const rawText = response.text || '{}';
  return JSON.parse(rawText) as SearchAndSuggestionResult;
}

/**
 * AI Protocol Blueprint Architect: Expands and structures a de novo protocol description
 */
export async function expandDeNovoDescription(params: {
  description: string;
  protocolTitle?: string;
  category?: string;
  targetHost?: string;
  biosafetyLevel?: string;
}) {
  const ai = getAiClient();

  const prompt = `
You are a Principal Molecular Biologist and Automation Workflow Architect.
Analyze and structure the following user's de novo protocol description into a publication-grade protocol blueprint:

User Description:
${params.description}

Title / Topic Hint: ${params.protocolTitle || 'De Novo Protocol'}
Category Hint: ${params.category || 'Molecular Biology'}
Host Hint: ${params.targetHost || 'Mammalian / Bacterial Cells'}
BSL Hint: ${params.biosafetyLevel || 'BSL-1'}

INSTRUCTIONS:
1. Parse the core experimental phases, starting material, input masses, enzymes, pipetting method (8-channel for 96-well format), Covaris shearing requirements (target bp, PIP, duty factor, cycles per burst, time), purification (SPRI beads, 80% ethanol washes, elution), and QC checkpoints (Qubit, TapeStation).
2. Return a clean, structured DeNovoProtocolBlueprint.
`;

  const response = await generateWithRetry(ai, {
    model: defaultModel(),
    contents: prompt,
    config: {
      systemInstruction: 'You structure biotechnology protocol specifications with 99%+ biochemical precision.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          userDescription: { type: Type.STRING },
          protocolTitle: { type: Type.STRING },
          targetHostOrOrganism: { type: Type.STRING },
          category: { type: Type.STRING },
          biosafetyLevel: { type: Type.STRING, enum: ['BSL-1', 'BSL-2', 'BSL-3'] },
          startingMaterial: { type: Type.STRING },
          inputMassOrConcentration: { type: Type.STRING },
          shearingMethod: { type: Type.STRING, enum: ['COVARIS_ACOUSTIC', 'ENZYMATIC', 'NONE'] },
          shearingTargetBp: { type: Type.INTEGER },
          pipettingFormat: { type: Type.STRING, enum: ['8_CHANNEL_MULTICHANNEL', 'SINGLE_CHANNEL', 'HYBRID'] },
          purificationStrategy: { type: Type.STRING, enum: ['SPRI_BEADS', 'SPIN_COLUMN', 'NONE'] },
          keyStepsOutline: { type: Type.ARRAY, items: { type: Type.STRING } },
          qcCheckpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          customReagents: { type: Type.ARRAY, items: { type: Type.STRING } },
          safeStoppingPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [
          'userDescription', 'protocolTitle', 'targetHostOrOrganism', 'category',
          'biosafetyLevel', 'startingMaterial', 'inputMassOrConcentration',
          'shearingMethod', 'pipettingFormat', 'purificationStrategy',
          'keyStepsOutline', 'qcCheckpoints', 'customReagents', 'safeStoppingPoints'
        ]
      }
    }
  });

  const rawText = response.text || '{}';
  return JSON.parse(rawText);
}
