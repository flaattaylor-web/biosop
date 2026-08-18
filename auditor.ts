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
  | 'CITATION_INTEGRITY';

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
  STOICHIOMETRY: 0.30,
  VOLUME_BALANCE: 0.25,
  PIPETTABILITY: 0.10,
  DOCUMENT_COMPLETENESS: 0.15,
  SAFETY_AND_QC: 0.10,
  CITATION_INTEGRITY: 0.10,
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

function auditStoichiometry(calc: ReactionCalculation | null): AuditDimension {
  const notChecked = [
    'Whether the specified concentrations are biochemically appropriate for this assay',
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

  const findings = toAuditFindings(calc.findings, ['STOICHIOMETRY_DEVIATION', 'UNVERIFIABLE_COMPONENT', 'NO_VOLUME']);
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
      `${calc.totalComponentCount} components had unit-compatible concentration pairs and could be verified.`,
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

  const stepsWithoutDetail = (sop.steps || []).filter((s) => !s.instruction || s.instruction.trim().length < 20).length;
  if (stepsWithoutDetail > 0) {
    findings.push({
      severity: 'WARNING', code: 'THIN_STEPS',
      message: `${stepsWithoutDetail} step(s) have little or no instruction text.`,
      remedy: 'Expand these steps so they are executable without prior knowledge.',
    });
  }

  const present = required.filter((r) => r.present).length;
  return {
    key: 'DOCUMENT_COMPLETENESS', label: 'Document completeness',
    score: scoreFrom(100, findings),
    coverage: 1,
    whatWasChecked: `Checked for ${required.length} structural fields; ${present} present. Checked each step for instruction text.`,
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

export function auditProtocol(sop: SopDocument, calc: ReactionCalculation | null): AuditReport {
  const dimensions: AuditDimension[] = [
    auditStoichiometry(calc),
    auditVolumeBalance(calc),
    auditPipettability(calc),
    auditDocumentCompleteness(sop),
    auditSafetyAndQc(sop),
    auditCitations(sop),
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
      'structural completeness, and whether cited sources resolve in a public registry. It does NOT verify ' +
      'that the science is correct or appropriate for your application, and it does not constitute ' +
      'validation, qualification, or evidence of conformance to ISO 9001, GLP, GMP, or 21 CFR Part 11. ' +
      'A qualified scientist must review this protocol before use.',
    limitations: Array.from(new Set(dimensions.flatMap((d) => d.notChecked))),
  };
}
