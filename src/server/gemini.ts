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

  let lastError: any = null;

  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
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
- No Template Controls (NTC): ${negCtl}
- Calculated Total Reaction Wells N: ${calculatedTotalReactions} Total Reaction Wells (+${overflow}% Pipetting Dead-Volume Buffer)

CRITICAL LABORATORY EQUIPMENT & PIPETTING ACCURACY DIRECTIVES:
1. Multi-Channel Pipetting Standard: For standard 96-well microplate column work (8 wells per column: Rows A–H), ALWAYS specify **8-channel multi-channel pipettes** (e.g. 0.5–10 µL, 2–20 µL, 20–200 µL). Do NOT hallucinate 12-channel pipettes for column-wise additions (12-channel is only for 12-well row-wise operations). Include calibrated single-channel pipettes (P2, P10, P20, P200, P1000).
2. Covaris DNA Shearing & Acoustic Fragmentation: For any protocol involving DNA fragmentation, NGS library prep, WGS, or shearing, include dedicated **Covaris Focused-ultrasonicator (ME220/S220/E220)** steps with exact instrument parameters:
   - Target fragment size (e.g. 200 bp, 350 bp, 550 bp)
   - Peak Incident Power (PIP in Watts, e.g. 50W to 175W)
   - Duty Factor % (e.g. 10% to 20%)
   - Cycles per Burst (CPB, e.g. 200)
   - Treatment Duration (seconds, e.g. 60s to 180s)
   - Water bath chiller temperature (4°C to 7°C) & Degas level
   - Vessel: Covaris microTUBE AFA Fiber Snap-Cap (130 µL) or 8 microTUBE Strip
3. Step-by-Step Reaction Sheet & Master Mix Breakdown:
   - In reactionSheet.stepByStepReactionSteps, generate a sequential breakdown for EVERY protocol step (e.g. 1. DNA Normalization & Shearing, 2. Master Mix Assembly & Aliquoting with 8-channel pipette, 3. Thermal Cycling / Incubation, 4. SPRI Bead Purification & 80% Ethanol Washes, 5. Elution & QC).
   - In each step, provide full reagentsAndVolumes with exact single-reaction microliters, target concentrations, stock concentrations, and handling notes.
4. Comprehensive Reagents & Consumables Breakdown:
   - Include EVERY reagent and consumable in the SOP and reaction sheet: 100% molecular ethanol, freshly prepared 80% ethanol wash, SPRIselect/AMPure magnetic beads, Nuclease-Free Water, 10 mM Tris-HCl pH 8.5 (EB buffer), Qubit HS assay reagents, barrier filter tips, 96-well PCR plates, and microcentrifuge tubes.

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
  for (const modelName of modelCandidates()) {
    // Two attempts per model: a 503 "high demand" is usually a spike lasting seconds, and when it
    // is not, the next model in the ladder is rarely saturated at the same moment. Without this a
    // transient spike on one model failed the whole generation.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        stream = await ai.models.generateContentStream({
          model: modelName,
          contents: contentsFor(bundle, params),
          config: {
            systemInstruction: bundle.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: sopDocumentSchema,
            abortSignal: signal,
          },
        });
        break;
      } catch (err) {
        streamError = err;
        if (isClientAbort(err) || signal?.aborted) throw err;
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
  if (!stream) throw streamError instanceof Error ? streamError : new Error(String(streamError));

  let acc = '';
  try {
    for await (const chunk of stream) {
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
3. Increment the document version number (e.g. from ${params.sop.version || 'v1.0'} to v1.1 or v2.0).
4. Append a new entry to revisionHistory detailing the exact literature audit corrections applied.
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

  return sanitizeAndValidateSop(parsed);
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
