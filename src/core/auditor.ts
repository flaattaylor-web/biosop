/**
 * Protocol audit.
 *
 * Replaces `accuracyAuditor.ts`, whose score was clamped to
 * `Math.max(99.0, Math.min(99.9, x))` and therefore could never report a problem.
 *
 * Design rules for this module:
 *   1. The score CAN be low. There is no floor and no clamp.
 *   2. Unverifiable is not the same as verified. A protocol nothing could be
 *      checked against reports low CONFIDENCE, not a high score.
 *   3. No claim is printed that the code did not actually test. In particular
 *      no ISO/GLP conformance is asserted — this software cannot establish that.
 */

import { SopDocument } from '../types';
import { ReactionCalculation, CalculationFinding, FindingSeverity } from './reactionMath';

export type AuditDimensionKey =
  | 'STOICHIOMETRY'
  | 'VOLUME_BALANCE'
  | 'PIPETTABILITY'
  | 'DOCUMENT_COMPLETENESS'
  | 'SAFETY_AND_QC'
  | 'CITATION_INTEGRITY'
  | 'PLATFORM_RULES';

export interface AuditDimension {
  key: AuditDimensionKey;
  label: string;
  /** 0-100, or null when there was nothing to assess. */
  score: number | null;
  /** Fraction of the relevant items this dimension was able to check (0-1). */
  coverage: number;
  /** Exactly what was tested — shown in the UI so the score is interpretable. */
  whatWasChecked: string;
  /** Things this dimension explicitly did NOT verify. */
  notChecked: string[];
  findings: AuditFinding[];
}

export interface AuditFinding {
  severity: FindingSeverity;
  code: string;
  message: string;
  remedy?: string;
  componentId?: string;
}

export type AuditVerdict = 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL' | 'INSUFFICIENT_DATA';

export interface AuditReport {
  generatedAt: string;
  /** Weighted score over dimensions that could be assessed. Null if none could. */
  overallScore: number | null;
  /** How much of the protocol the audit was actually able to examine (0-1). */
  confidence: number;
  verdict: AuditVerdict;
  errorCount: number;
  warningCount: number;
  dimensions: AuditDimension[];
  /** Plain-language statement of scope. Rendered verbatim in the UI. */
  scopeStatement: string;
  limitations: string[];
}

const WEIGHTS: Record<AuditDimensionKey, number> = {
  STOICHIOMETRY: 0.25,
  VOLUME_BALANCE: 0.20,
  PIPETTABILITY: 0.08,
  DOCUMENT_COMPLETENESS: 0.12,
  SAFETY_AND_QC: 0.10,
  CITATION_INTEGRITY: 0.08,
  PLATFORM_RULES: 0.17,
};

function toAuditFindings(fs: CalculationFinding[], codes: string[]): AuditFinding[] {
  return fs
    .filter((f) => codes.includes(f.code))
    .map((f) => ({
      severity: f.severity,
      code: f.code,
      message: f.message,
      remedy: f.remedy,
      componentId: f.componentId,
    }));
}

/** Penalty model: errors cost far more than warnings, and the score can reach 0. */
function scoreFrom(base: number, findings: AuditFinding[]): number {
  let score = base;
  for (const f of findings) {
    if (f.severity === 'ERROR') score -= 25;
    else if (f.severity === 'WARNING') score -= 8;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/* Consumables that get used *during* a protocol but are never pipetted into the reaction as a
   component with a stock concentration. A model that lists them here produces a master mix
   containing 14 µL of ethanol and 14 µL of "Qubit assay kit", and because a nonsense pair like
   10 µM -> 1 µM is still unit-compatible, C1V1=C2V2 verifies it happily. Unit-compatible is not
   the same as physically meaningful, and this is where that gap gets closed. */
const NON_REAGENT_PATTERNS: { re: RegExp; kind: string }[] = [
  { re: /\bethanol\b|\bisopropanol\b|\bmethanol\b/i, kind: 'a wash solvent' },
  { re: /assay kit|qubit[^,]*\b(kit|assay)\b|screentape|tapestation|bioanalyzer reagent/i, kind: 'a QC assay consumable' },
  { re: /ampure|spri\s?select|rnaclean|magnetic bead|sera-?mag|bead slurry/i, kind: 'a bead slurry' },
  { re: /\btips?\b|barrier filter|microplate|pcr plate|\btubes?\b|microtube|flow cell|cartridge|spin column/i, kind: 'labware' },
  { re: /wash buffer|\beb buffer\b|elution buffer|priming (mix|kit)|flush (buffer|tether)|running buffer/i, kind: 'a wash or elution buffer' },
];

function nonReagentFindings(calc: ReactionCalculation): AuditFinding[] {
  const out: AuditFinding[] = [];
  for (const c of calc.components) {
    // A diluent legitimately IS water or a buffer, so it is exempt.
    if (c.role === 'DILUENT') continue;
    const hit = NON_REAGENT_PATTERNS.find((p) => p.re.test(c.name));
    if (!hit) continue;
    out.push({
      severity: 'ERROR',
      code: 'NON_REAGENT_COMPONENT',
      componentId: c.id,
      message: `"${c.name}" is ${hit.kind}, not a component of the reaction mix, but it is listed with a per-reaction volume.`,
      remedy: 'Move it out of the reaction components and into the step that consumes it. Leaving it here inflates the reaction volume, distorts every final concentration, and inflates the cost estimate.',
    });
  }
  return out;
}

/** Placeholder concentrations betray themselves: many unrelated reagents landing on one volume. */
function placeholderConcentrationFindings(calc: ReactionCalculation): AuditFinding[] {
  const real = calc.components.filter((c) => c.role !== 'DILUENT' && c.volPerRxnMicroliters > 0);
  if (real.length < 4) return [];
  const byVolume = new Map<number, number>();
  for (const c of real) byVolume.set(c.volPerRxnMicroliters, (byVolume.get(c.volPerRxnMicroliters) || 0) + 1);
  const [vol, count] = [...byVolume.entries()].sort((a, b) => b[1] - a[1])[0];
  if (count < 4 || count / real.length < 0.6) return [];
  return [{
    severity: 'WARNING',
    code: 'PLACEHOLDER_CONCENTRATIONS',
    message: `${count} of ${real.length} components resolve to the same ${vol} µL, which happens when one stock/final concentration pair has been copied across unrelated reagents.`,
    remedy: 'Check each component against its actual vendor stock concentration. Identical volumes across chemically unrelated reagents are almost always placeholder values rather than a designed reaction.',
  }];
}

function auditStoichiometry(calc: ReactionCalculation | null): AuditDimension {
  const notChecked = [
    'Whether a concentration is optimal for this assay — only whether it is physically meaningful',
    'Enzyme activity units against the manufacturer lot certificate',
  ];

  if (!calc || calc.totalComponentCount === 0) {
    return {
      key: 'STOICHIOMETRY', label: 'Stoichiometry (C₁V₁ = C₂V₂)',
      score: null, coverage: 0,
      whatWasChecked: 'No reaction components were present to check.',
      notChecked, findings: [],
    };
  }

  const findings = [
    ...toAuditFindings(calc.findings, ['STOICHIOMETRY_DEVIATION', 'UNVERIFIABLE_COMPONENT', 'NO_VOLUME']),
    ...nonReagentFindings(calc),
    ...placeholderConcentrationFindings(calc),
  ];
  const coverage = calc.verifiableComponentCount / calc.totalComponentCount;
  // A protocol we could barely check does not earn a high base score.
  const base = 60 + 40 * coverage;

  return {
    key: 'STOICHIOMETRY', label: 'Stoichiometry (C₁V₁ = C₂V₂)',
    score: scoreFrom(base, findings),
    coverage,
    whatWasChecked:
      `Recomputed the required volume for each component from its stock and final concentration and ` +
      `compared it to the protocol's stated volume. ${calc.verifiableComponentCount} of ` +
      `${calc.totalComponentCount} components had unit-compatible concentration pairs and could be verified. ` +
      `Also checked that every component is a substance actually pipetted into the reaction, and that the ` +
      `concentrations are not one placeholder pair repeated across unrelated reagents.`,
    notChecked,
    findings,
  };
}

function auditVolumeBalance(calc: ReactionCalculation | null): AuditDimension {
  const notChecked = ['Volume changes from temperature or evaporation during incubation'];

  if (!calc || calc.totalComponentCount === 0) {
    return {
      key: 'VOLUME_BALANCE', label: 'Volume conservation',
      score: null, coverage: 0,
      whatWasChecked: 'No reaction components were present to check.',
      notChecked, findings: [],
    };
  }

  const findings = toAuditFindings(calc.findings, ['VOLUME_OVERFLOW', 'NO_DILUENT', 'INVALID_TARGET_VOLUME']);
  const delta = Math.abs(calc.actualVolumeMicroliters - calc.targetVolumeMicroliters);
  let base = 100;
  if (delta >= 0.005 && delta < 0.5) base = 92;
  else if (delta >= 0.5) base = 60;

  return {
    key: 'VOLUME_BALANCE', label: 'Volume conservation',
    score: scoreFrom(base, findings),
    coverage: 1,
    whatWasChecked:
      `Summed all component volumes (${calc.actualVolumeMicroliters} µL) and compared to the stated ` +
      `reaction volume (${calc.targetVolumeMicroliters} µL). Difference: ${delta.toFixed(3)} µL.`,
    notChecked,
    findings,
  };
}

function auditPipettability(calc: ReactionCalculation | null): AuditDimension {
  const notChecked = ['Calibration status of the actual pipettes in your lab'];

  if (!calc || calc.totalComponentCount === 0) {
    return {
      key: 'PIPETTABILITY', label: 'Pipettable volumes',
      score: null, coverage: 0,
      whatWasChecked: 'No reaction components were present to check.',
      notChecked, findings: [],
    };
  }

  const findings = toAuditFindings(calc.findings, ['BELOW_MIN_PIPETTABLE', 'MIX_VOLUME_BELOW_FLOOR']);
  const below = calc.components.filter((c) => c.belowMinPipettable).length;

  return {
    key: 'PIPETTABILITY', label: 'Pipettable volumes',
    score: scoreFrom(100, findings),
    coverage: 1,
    whatWasChecked:
      `Checked every component volume against the accurate-pipetting floor. ` +
      `${below} of ${calc.totalComponentCount} fall below it.`,
    notChecked,
    findings,
  };
}

/**
 * The document joins reaction rows to procedure steps by stepNumber. When the model emits a
 * reaction sheet that skips a step with no reagents and renumbers to close the gap, every master
 * mix from that point on is attached to the wrong step — the arithmetic still balances, so nothing
 * else in this audit notices. Compared by word overlap because the two lists phrase the same
 * operation differently ("Adapter Ligation" vs "Ligation of barcoded adapters").
 */
function stepAlignmentFindings(sop: SopDocument): AuditFinding[] {
  const steps = sop.steps || [];
  const rxn = sop.reactionSheet?.stepByStepReactionSteps || [];
  if (steps.length === 0 || rxn.length === 0) return [];

  const out: AuditFinding[] = [];
  if (rxn.length !== steps.length) {
    out.push({
      severity: 'WARNING',
      code: 'STEP_COUNT_MISMATCH',
      message: `The procedure has ${steps.length} steps but the reaction sheet has ${rxn.length}, so at least one master mix cannot line up with the step that uses it.`,
      remedy: 'Emit one reaction entry per procedure step, including steps that add no reagents (an instrument run, an incubation, a wash) with an empty reagent list, so the numbering cannot drift.',
    });
  }

  const words = (t: string) => new Set((t || '').toLowerCase().match(/[a-z]{4,}/g) || []);
  const overlap = (a: string, b: string) => {
    const [wa, wb] = [words(a), words(b)];
    if (wa.size === 0 || wb.size === 0) return 1;
    let hits = 0;
    for (const w of wa) if (wb.has(w)) hits++;
    return hits / Math.min(wa.size, wb.size);
  };

  const drifted: number[] = [];
  for (const step of steps) {
    const paired = rxn.find((r) => r.stepNumber === step.stepNumber);
    if (!paired) continue;
    if (overlap(step.title, `${paired.stepName} ${paired.phase}`) < 0.15) drifted.push(step.stepNumber);
  }
  if (drifted.length >= 2) {
    out.push({
      severity: 'WARNING',
      code: 'STEP_CONTENT_DRIFT',
      message: `Step${drifted.length > 1 ? 's' : ''} ${drifted.join(', ')} carry a master mix whose name describes a different operation from the step text.`,
      remedy: 'Check each step against its table before use. This is the signature of a reaction sheet offset by one — the mix shown under a step usually belongs to the next one.',
    });
  }
  return out;
}

function auditDocumentCompleteness(sop: SopDocument): AuditDimension {
  const findings: AuditFinding[] = [];
  const required: { field: string; present: boolean; label: string }[] = [
    { field: 'title', present: !!sop.title, label: 'Title' },
    { field: 'documentId', present: !!sop.documentId, label: 'Document ID' },
    { field: 'version', present: !!sop.version, label: 'Version' },
    { field: 'effectiveDate', present: !!sop.effectiveDate, label: 'Effective date' },
    { field: 'author', present: !!sop.author, label: 'Author' },
    { field: 'scope', present: !!sop.scope, label: 'Scope' },
    { field: 'steps', present: (sop.steps?.length ?? 0) > 0, label: 'Procedure steps' },
    { field: 'equipmentRequired', present: (sop.equipmentRequired?.length ?? 0) > 0, label: 'Equipment list' },
    { field: 'reagentsRequired', present: (sop.reagentsRequired?.length ?? 0) > 0, label: 'Reagent list' },
    { field: 'revisionHistory', present: (sop.revisionHistory?.length ?? 0) > 0, label: 'Revision history' },
  ];

  for (const r of required) {
    if (!r.present) {
      findings.push({
        severity: 'WARNING', code: 'MISSING_FIELD',
        message: `${r.label} is missing.`,
        remedy: `Populate the ${r.label.toLowerCase()} before issuing this document.`,
      });
    }
  }

  // A document can carry every required field and still contain no protocol. These checks exist
  // because a generated SOP with step titles and empty instructions used to pass completeness.
  const steps = sop.steps || [];

  if (steps.length > 0 && steps.length < 3) {
    findings.push({
      severity: 'ERROR', code: 'TOO_FEW_STEPS',
      message: `Only ${steps.length} procedure step(s). This is not a runnable protocol.`,
      remedy: 'A bench protocol needs its full sequence of operations, typically five to twelve steps. Regenerate, stating the discipline explicitly.',
    });
  }

  const emptySteps = steps.filter((st) => !st.instruction || st.instruction.trim().length < 20);
  if (emptySteps.length > 0) {
    findings.push({
      severity: emptySteps.length >= Math.max(2, steps.length / 2) ? 'ERROR' : 'WARNING',
      code: 'THIN_STEPS',
      message: `${emptySteps.length} of ${steps.length} step(s) have little or no instruction text.`,
      remedy: 'Every step needs an instruction an operator could follow without prior knowledge — what is done, to what, how much, how long, at what temperature.',
    });
  }

  const echoes = steps.filter((st) => {
    const title = (st.title || '').trim().toLowerCase();
    const instruction = (st.instruction || '').trim().toLowerCase();
    return title.length > 6 && instruction.length > 0 && instruction.length < title.length * 2.5 && instruction.includes(title.slice(0, Math.min(title.length, 24)));
  });
  if (echoes.length > 0) {
    findings.push({
      severity: 'WARNING', code: 'STEP_ECHOES_TITLE',
      message: `${echoes.length} step(s) restate their own title instead of giving an instruction.`,
      remedy: 'Replace the restatement with the actual operation and its parameters.',
    });
  }

  const withNumbers = steps.filter((st) => /\d/.test(st.instruction || '')).length;
  if (steps.length >= 3 && withNumbers < steps.length / 2) {
    findings.push({
      severity: 'WARNING', code: 'STEPS_LACK_PARAMETERS',
      message: `Only ${withNumbers} of ${steps.length} steps contain any quantity, time or temperature.`,
      remedy: 'A protocol step without numbers cannot be executed reproducibly. Add volumes, concentrations, durations, temperatures and speeds.',
    });
  }

  findings.push(...stepAlignmentFindings(sop));

  const present = required.filter((r) => r.present).length;
  return {
    key: 'DOCUMENT_COMPLETENESS', label: 'Document completeness',
    score: scoreFrom(100, findings),
    coverage: 1,
    whatWasChecked: `Checked for ${required.length} structural fields; ${present} present. Checked each step for instruction text, and that every master mix lines up with the step that uses it.`,
    notChecked: [
      'Whether the content is scientifically correct for your application',
      'Conformance to your organisation’s SOP template or numbering convention',
    ],
    findings,
  };
}

function auditSafetyAndQc(sop: SopDocument): AuditDimension {
  const findings: AuditFinding[] = [];

  if ((sop.hazards?.length ?? 0) === 0) {
    findings.push({ severity: 'ERROR', code: 'NO_HAZARDS', message: 'No hazards are documented.', remedy: 'Add a hazard assessment before any bench work.' });
  }
  if ((sop.ppeRequirements?.length ?? 0) === 0) {
    findings.push({ severity: 'ERROR', code: 'NO_PPE', message: 'No PPE requirements are documented.', remedy: 'Specify required PPE.' });
  }
  if ((sop.qualityControl?.length ?? 0) === 0) {
    findings.push({ severity: 'WARNING', code: 'NO_QC', message: 'No quality-control checks are specified.', remedy: 'Add at least a no-template control and a positive control.' });
  }
  if ((sop.troubleshooting?.length ?? 0) === 0) {
    findings.push({ severity: 'INFO', code: 'NO_TROUBLESHOOTING', message: 'No troubleshooting guidance is provided.' });
  }

  const bsl = sop.biosafetyLevel;
  const hazardText = (sop.hazards || []).map((h) => `${h.label} ${h.description}`).join(' ').toLowerCase();
  const ppeText = (sop.ppeRequirements || []).map((p) => `${p.item} ${p.notes ?? ''}`).join(' ').toLowerCase();

  if ((bsl === 'BSL-2' || bsl === 'BSL-3') && !/hood|cabinet|bsc|containment/.test(`${hazardText} ${ppeText}`)) {
    findings.push({
      severity: 'ERROR', code: 'BSL_CONTAINMENT_MISSING',
      message: `This protocol is marked ${bsl} but no biosafety cabinet or containment measure is specified anywhere.`,
      remedy: `${bsl} work requires documented primary containment.`,
    });
  }

  const hasNtc = (sop.qualityControl || []).some((q) => /ntc|no[- ]template|negative control|blank/i.test(q));
  if ((sop.qualityControl?.length ?? 0) > 0 && !hasNtc) {
    findings.push({
      severity: 'WARNING', code: 'NO_NTC',
      message: 'Quality control does not include a no-template / negative control.',
      remedy: 'Add an NTC to detect reagent contamination.',
    });
  }

  return {
    key: 'SAFETY_AND_QC', label: 'Safety & quality control',
    score: scoreFrom(100, findings),
    coverage: 1,
    whatWasChecked:
      'Checked that hazards, PPE, and QC controls are present; that BSL-2/3 protocols specify containment; ' +
      'and that QC includes a negative control.',
    notChecked: [
      'Whether the stated biosafety level is correct for your organism and procedure',
      'Your institution’s specific biosafety committee requirements',
      'Chemical compatibility and waste-stream segregation',
    ],
    findings,
  };
}

function auditCitations(sop: SopDocument): AuditDimension {
  const refs = sop.references || [];
  const findings: AuditFinding[] = [];

  if (refs.length === 0) {
    return {
      key: 'CITATION_INTEGRITY', label: 'Citation integrity',
      score: null, coverage: 0,
      whatWasChecked: 'No references are present.',
      notChecked: ['Whether the protocol content matches any published source'],
      findings: [{ severity: 'WARNING', code: 'NO_REFERENCES', message: 'This protocol cites no sources.' }],
    };
  }

  let verified = 0;
  for (const r of refs) {
    const status = (r as { verificationStatus?: string }).verificationStatus;
    if (status === 'VERIFIED') {
      verified++;
    } else if (status === 'MISMATCH') {
      findings.push({
        severity: 'ERROR', code: 'CITATION_TEXT_MISMATCH',
        message: `Citation text does not match the registry record it points at: "${r.citation.slice(0, 100)}"`,
        remedy: 'A real identifier carrying an invented title is the commonest way a fabricated citation survives a check. Replace the citation text with the registry record shown in the reference panel.',
      });
    } else if (status === 'NOT_FOUND') {
      findings.push({
        severity: 'ERROR', code: 'CITATION_NOT_FOUND',
        message: `Citation could not be resolved in Crossref or PubMed: "${r.citation.slice(0, 100)}"`,
        remedy: 'This reference may not exist. Remove it or replace it with a verified source.',
      });
    } else {
      findings.push({
        severity: 'WARNING', code: 'CITATION_UNVERIFIED',
        message: `Citation has not been checked against a registry: "${r.citation.slice(0, 100)}"`,
        remedy: 'Run literature verification to confirm this source exists.',
      });
    }
  }

  const coverage = verified / refs.length;
  return {
    key: 'CITATION_INTEGRITY', label: 'Citation integrity',
    score: scoreFrom(50 + 50 * coverage, findings),
    coverage,
    whatWasChecked:
      `Checked each of the ${refs.length} reference(s) against Crossref/PubMed resolution status. ` +
      `${verified} verified as existing.`,
    notChecked: [
      'Whether a verified paper actually supports the specific claim it is cited for',
      'Whether the cited method was applied to a comparable system',
    ],
    findings,
  };
}

/* ------------------------------------------------------------------ platform rules

   Everything else in this file checks the document against itself: does the
   arithmetic close, is a field present, does a DOI resolve. A protocol can pass
   all of that and still be unrunnable, because a fluent model will happily write
   a workflow that contradicts the chemistry it names — shearing RNA destined for
   direct RNA sequencing, omitting the motor adapter a nanopore read depends on.

   These rules encode published, platform-specific constraints. Each one is
   deterministic and narrow: it only fires when the document itself names the
   platform, and it states the source of the constraint in its remedy so a
   scientist can overrule it with evidence rather than guesswork.

   Sources: Oxford Nanopore SQK-RNA004 protocol and support documentation. Add
   rules only where the vendor is unambiguous; a false positive here costs more
   trust than a missed warning.
------------------------------------------------------------------------------- */

interface PlatformContext {
  /** Every searchable sentence in the document, lowercased. */
  text: string;
  /** The same text split into clauses, so a rule can tell an instruction from a prohibition. */
  sentences: string[];
  /** Procedure step text in order, for rules that depend on what happens after what. */
  steps: string[];
  isNanopore: boolean;
  isDirectRna: boolean;
  isRnaWorkflow: boolean;
}

/**
 * A good protocol names the thing it forbids: "do NOT shear", "ethanol wash prohibited after RMX",
 * "fragmentation is contraindicated". Keyword matching reads those as instructions and fails the
 * document for following the rule. Every check below therefore asks whether the pattern appears in
 * a clause that is NOT a prohibition.
 */
const PROHIBITION_RE = /\b(no|not|never|without|avoid\w*|skip|omit\w*|prohibit\w*|contraindicat\w*|forbidden|instead of|rather than)\b/;

function asserted(ctx: PlatformContext, re: RegExp): boolean {
  return ctx.sentences.some((clause) => re.test(clause) && !PROHIBITION_RE.test(clause));
}

function platformContext(sop: SopDocument): PlatformContext {
  const parts: string[] = [
    sop.title, sop.scope, sop.category,
    ...(sop.equipmentRequired || []),
    ...(sop.reagentsRequired || []),
    ...(sop.qualityControl || []),
    ...(sop.steps || []).flatMap((st) => [st.title, st.instruction, (st as { conditions?: string }).conditions || '']),
    ...(sop.reactionSheet?.stepByStepReactionSteps || []).flatMap((st) => [
      st.stepName, st.phase, st.instructions, st.conditions,
      ...(st.reagentsAndVolumes || []).map((r) => r.reagentName),
    ]),
    ...(sop.reactionSheet?.components || []).map((c) => c.name || ''),
  ];
  const text = parts.filter(Boolean).join(' \n ').toLowerCase();
  const sentences = text.split(/[.;\n]+/).map((t) => t.trim()).filter(Boolean);
  const steps = (sop.steps || []).map((st) => `${st.title || ''} ${st.instruction || ''}`.toLowerCase());

  const isNanopore = /nanopore|minion|gridion|promethion|flongle|\bsqk-|flow cell/.test(text);
  const isDirectRna = /direct rna|drna[- ]seq|native rna|sqk-rna/.test(text);
  const isRnaWorkflow = isDirectRna || /\brna\b/.test(text);

  return { text, sentences, steps, isNanopore, isDirectRna, isRnaWorkflow };
}

interface PlatformRule {
  code: string;
  severity: FindingSeverity;
  /** Only evaluated when this returns true, so unrelated protocols are never touched. */
  applies: (c: PlatformContext) => boolean;
  /** True when the document VIOLATES the rule. */
  violated: (c: PlatformContext) => boolean;
  message: string;
  remedy: string;
}

const PLATFORM_RULE_SET: PlatformRule[] = [
  {
    code: 'DRNA_NO_FRAGMENTATION',
    severity: 'ERROR',
    applies: (c) => c.isDirectRna,
    // "shear" alone is too blunt: a protocol can legitimately warn that heat and shear destroy the
    // motor protein. Match it only where it takes the sample as its object.
    violated: (c) => asserted(c, /covaris|focused-ultrasonicator|ultrasonicat|sonicat|fragmentase|bioruptor|megaruptor|acoustic shear\w*|fragmentation (module|buffer|enzyme|step)|fragment the (rna|sample|input)|\bshear\w*\s+(the\s+)?(rna|dna|sample|input|library|target|to\b|at\b|using\b|on\b|with\b)/),
    message: 'Direct RNA sequencing reads native full-length molecules, but this protocol fragments the input.',
    remedy: 'Remove the shearing/fragmentation step. Oxford Nanopore states direct RNA input "requires no fragmentation"; shearing also severs transcripts from the poly(A) tail the RT adapter anneals to, so most fragments become uncapturable.',
  },
  {
    code: 'DRNA_NO_AMPLIFICATION',
    severity: 'WARNING',
    applies: (c) => c.isDirectRna,
    violated: (c) => asserted(c, /\bpcr\b|amplification step|amplify the librar|indexing pcr/),
    message: 'Direct RNA sequencing is amplification-free, but this protocol includes an amplification step.',
    remedy: 'Drop the amplification. Amplifying converts native RNA to cDNA and forfeits the base modifications and full-length isoform information direct RNA exists to capture.',
  },
  {
    code: 'NANOPORE_MOTOR_ADAPTER_MISSING',
    severity: 'ERROR',
    applies: (c) => c.isNanopore && /ligat/.test(c.text),
    violated: (c) => !/rna ligation adapter|\brla\b|\brmx\b|\bamx\b|\bla\b adapter|ligation adapter|sequencing adapter|motor protein|adapter mix/.test(c.text),
    message: 'No motor-protein sequencing adapter is ligated, so nothing can translocate the pore.',
    remedy: 'Add the platform sequencing adapter ligation (RLA for SQK-RNA004; the ligation adapter for DNA kits). A barcoded or RT adapter replaces the RT adapter, not the motor adapter — both are required.',
  },
  {
    code: 'NANOPORE_NO_HEAT_INACTIVATION',
    severity: 'ERROR',
    applies: (c) => c.isNanopore && /ligat/.test(c.text),
    violated: (c) => asserted(c, /heat[- ]?inactivat|thermal inactivation/),
    message: 'A ligated nanopore library is heat-inactivated in this protocol.',
    remedy: 'Remove the heat inactivation. Heat denatures the motor protein and melts the splint/adapter duplex holding the construct together; nanopore protocols proceed straight from ligation to bead cleanup.',
  },
  {
    code: 'RNA_DNA_SPRI_CHEMISTRY',
    severity: 'ERROR',
    applies: (c) => c.isDirectRna,
    violated: (c) => asserted(c, /ampure xp|spri\s?select/) && !/rnaclean|rna clean xp|nucleomag rna/.test(c.text),
    message: 'A double-stranded DNA SPRI chemistry is used to purify RNA.',
    remedy: 'Substitute Agencourt RNAClean XP, which Oxford Nanopore specifies throughout the direct RNA protocol. Binding conditions differ from AMPure XP/SPRIselect and RNA recovery on a DNA SPRI is poor and size-biased.',
  },
  {
    code: 'ETHANOL_AFTER_MOTOR_ADAPTER',
    severity: 'ERROR',
    applies: (c) => c.isNanopore,
    violated: (c) => {
      const ligationStep = c.steps.findIndex((t) => /\brmx\b|\brla\b|motor protein|rna adapter|sequencing adapter/.test(t) && /ligat/.test(t));
      if (ligationStep < 0) return false;
      return c.steps.slice(ligationStep).some((t) => /ethanol/.test(t) && /wash/.test(t) && !PROHIBITION_RE.test(t));
    },
    message: 'An ethanol wash is performed after the motor-protein adapter is ligated.',
    remedy: 'Wash with the kit wash buffer (WSB for Oxford Nanopore) instead. Ethanol denatures the motor protein bound to the adapter, and a library with no motor protein produces no reads.',
  },
  {
    code: 'DRNA_MULTIPLEX_UNDECLARED',
    severity: 'WARNING',
    applies: (c) => c.isDirectRna,
    // SQK-RNA004 on its own has no barcoding. Oxford Nanopore now sells a separate Direct RNA
    // Barcoding Kit (SQK-DRB004.24, Early Access), and custom splint barcoding is established
    // research practice. So multiplexing is no longer disqualifying — silently implying that the
    // base kit does it is.
    violated: (c) =>
      /barcod|multiplex|\d+[- ]plex/.test(c.text) &&
      !/drb004|direct rna barcoding kit|not (natively |currently )?support(ed|s)?|non-standard|nonstandard|not vendor[- ]supported|not a supported/.test(c.text),
    message: 'This protocol barcodes or multiplexes a direct RNA run without saying which barcoding chemistry it uses.',
    remedy: 'Name the Direct RNA Barcoding Kit (SQK-DRB004.24, Early Access) if you are using it, or state that the barcoding is custom and non-standard and cite the method. The base SQK-RNA004 kit contains no barcodes, so a reader following this protocol with RNA004 alone will have nothing to demultiplex.',
  },
  {
    code: 'DRNA_PLEX_ABOVE_GUIDANCE',
    severity: 'WARNING',
    applies: (c) => c.isDirectRna && /\d+[- ]plex|multiplex/.test(c.text),
    // ONT's stated optimum: 4-8 poly(A)+ enriched RNA samples, or 12-24 poly(A)-tailed IVT transcripts.
    violated: (c) => {
      const plex = [...c.text.matchAll(/(\d+)[-\s]?plex/g)].map((m) => parseInt(m[1], 10));
      const highest = plex.length ? Math.max(...plex) : 0;
      if (highest <= 8) return false;
      const isIvt = /\bivt\b|in vitro transcri|poly\(?a\)?[- ]tailed/.test(c.text);
      return !isIvt || highest > 24;
    },
    message: 'The declared plex count is above the sample number Oxford Nanopore gives guidance for on direct RNA.',
    remedy: 'ONT optimises the Direct RNA Barcoding Kit for 4-8 poly(A)+ enriched RNA samples, or 12-24 poly(A)-tailed IVT transcript samples. Above that, expect reduced per-sample depth; state the expected coverage per sample or reduce the pool.',
  },
  {
    code: 'DRNA_POLYA_SELECTION',
    severity: 'WARNING',
    applies: (c) => c.isDirectRna,
    violated: (c) => /total rna/.test(c.text) && !/poly[- ]?\(?a\)?\+?[-\s](select|purif|enrich|tail)|oligo[- ]?d\(?t\)?[-\s](select|enrich)|polyadenylat/.test(c.text),
    message: 'Total RNA is accepted as input without poly(A) selection or poly(A) tailing.',
    remedy: 'Direct RNA capture is oligo-dT based, so non-polyadenylated RNA is invisible to it. Require poly(A)-selected input, or add an in vitro polyadenylation step for bacterial or non-polyadenylated RNA.',
  },
  {
    code: 'DRNA_FLOW_CELL_UNSPECIFIED',
    severity: 'WARNING',
    applies: (c) => c.isDirectRna,
    violated: (c) => !/flo-min004|flo-pro004|rna flow cell/.test(c.text),
    message: 'No RNA-specific flow cell is specified for a direct RNA run.',
    remedy: 'Name the flow cell explicitly: FLO-MIN004RA (MinION/GridION) or FLO-PRO004RA (PromethION). A standard DNA flow cell will not run this chemistry.',
  },
  {
    code: 'RNA_SIZED_IN_BASE_PAIRS',
    severity: 'INFO',
    applies: (c) => c.isRnaWorkflow && !/\bdna librar|cdna|double[- ]stranded/.test(c.text),
    violated: (c) => /\d+\s?bp\b/.test(c.text),
    message: 'RNA lengths are expressed in base pairs.',
    remedy: 'Single-stranded RNA is sized in nucleotides (nt). Base pairs describe duplex DNA.',
  },
];

function auditPlatformRules(sop: SopDocument): AuditDimension {
  const notChecked = [
    'Whether the chosen platform suits your biological question',
    'Vendor constraints for platforms this rule set does not yet cover',
    'Any constraint published after this rule set was written',
  ];

  const ctx = platformContext(sop);
  const applicable = PLATFORM_RULE_SET.filter((r) => r.applies(ctx));

  if (applicable.length === 0) {
    return {
      key: 'PLATFORM_RULES', label: 'Platform chemistry rules',
      score: null, coverage: 0,
      whatWasChecked:
        'No sequencing platform this rule set covers was named in the document, so no platform-specific ' +
        'constraint could be applied.',
      notChecked, findings: [],
    };
  }

  const findings: AuditFinding[] = applicable
    .filter((r) => r.violated(ctx))
    .map((r) => ({ severity: r.severity, code: r.code, message: r.message, remedy: r.remedy }));

  return {
    key: 'PLATFORM_RULES', label: 'Platform chemistry rules',
    score: scoreFrom(100, findings),
    coverage: 1,
    whatWasChecked:
      `Applied ${applicable.length} published constraint(s) for the sequencing chemistry this document names ` +
      `(fragmentation, amplification, adapter requirements, purification chemistry, input selection, flow cell). ` +
      `${findings.length} were violated.`,
    notChecked,
    findings,
  };
}

export function auditProtocol(sop: SopDocument, calc: ReactionCalculation | null): AuditReport {
  const dimensions: AuditDimension[] = [
    auditStoichiometry(calc),
    auditVolumeBalance(calc),
    auditPipettability(calc),
    auditDocumentCompleteness(sop),
    auditSafetyAndQc(sop),
    auditCitations(sop),
    auditPlatformRules(sop),
  ];

  const scored = dimensions.filter((d) => d.score !== null);
  const totalWeight = scored.reduce((s, d) => s + WEIGHTS[d.key], 0);
  const overallScore =
    totalWeight > 0
      ? Number((scored.reduce((s, d) => s + (d.score as number) * WEIGHTS[d.key], 0) / totalWeight).toFixed(1))
      : null;

  // Confidence reflects how much could actually be examined, weighted the same way.
  const confidence = Number(
    dimensions.reduce((s, d) => s + d.coverage * WEIGHTS[d.key], 0).toFixed(3)
  );

  const all = dimensions.flatMap((d) => d.findings);
  const errorCount = all.filter((f) => f.severity === 'ERROR').length;
  const warningCount = all.filter((f) => f.severity === 'WARNING').length;

  // A confirmed error is a FAIL no matter how little else we could see. Only
  // when nothing is wrong AND we could see little do we decline to pass.
  let verdict: AuditVerdict;
  if (errorCount > 0) verdict = 'FAIL';
  else if (overallScore === null || confidence < 0.4) verdict = 'INSUFFICIENT_DATA';
  else if (warningCount > 0) verdict = 'PASS_WITH_WARNINGS';
  else verdict = 'PASS';

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    confidence,
    verdict,
    errorCount,
    warningCount,
    dimensions,
    scopeStatement:
      'This is an automated consistency check of the protocol document. It verifies internal arithmetic, ' +
      'structural completeness, whether cited sources resolve in a public registry, and whether the workflow ' +
      'obeys a fixed set of published constraints for the sequencing platform it names. It does NOT verify ' +
      'that the science as a whole is correct or appropriate for your application, and it does not constitute ' +
      'validation, qualification, or evidence of conformance to ISO 9001, GLP, GMP, or 21 CFR Part 11. ' +
      'A qualified scientist must review this protocol before use.',
    limitations: Array.from(new Set(dimensions.flatMap((d) => d.notChecked))),
  };
}
