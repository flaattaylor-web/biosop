/**
 * Calibration of the auditor against human judgement.
 *
 * `auditor.ts` produces verdicts. Nothing in the codebase has ever asked whether
 * those verdicts agree with a qualified reader, which is the same gap that made
 * the original 99.2-and-PASS scaffold worthless: it scored confidently and was
 * never measured against anyone.
 *
 * This module measures it. You hand-label a set of protocols, the auditor labels
 * the same set, and the result is a per-dimension agreement table. The headline
 * number is not "the auditor is good"; it is which dimensions agree with you and
 * which do not.
 *
 * Reading the output:
 *
 *   - Low agreement on a dimension usually means the DIMENSION is ambiguous, not
 *     that the auditor is broken. Rewrite the check before blaming it.
 *   - Positive leniency means the auditor passes things you would fail, which is
 *     the dangerous direction for a document someone will run at a bench.
 *   - A dimension the auditor could not assess is excluded, never counted as
 *     agreement. Silence is not concurrence.
 */

import type { AuditDimensionKey, AuditReport, AuditVerdict } from './auditor';
import { agreement, agreementBand, wilsonInterval } from './evalStats';
import type { Agreement, AgreementBand, ProportionInterval } from './evalStats';

/** Human judgement for one protocol. Omit a dimension you did not assess. */
export interface HumanLabels {
  /** Would you let someone run this document as written? */
  acceptable: boolean;
  /** Per-dimension pass/fail, for the dimensions you actually looked at. */
  dimensions: Partial<Record<AuditDimensionKey, boolean>>;
}

export interface CalibrationCase {
  /** Stable identifier so a disagreement can be traced back to a protocol. */
  id: string;
  report: AuditReport;
  labels: HumanLabels;
}

export interface CalibrationOptions {
  /**
   * Dimension score at or above which the auditor is taken to be passing that
   * dimension. Applied only when the dimension carries no ERROR finding.
   */
  passThreshold?: number;
  /**
   * Below this many compared items a kappa is reported but not trusted. Twenty
   * is the same floor the golden-set guidance uses.
   */
  minimumForConfidence?: number;
}

export type DimensionStatus =
  /** Enough agreement, and enough data to believe it. */
  | 'CALIBRATED'
  /** Kappa below 0.40. The criterion is probably ambiguous. */
  | 'AMBIGUOUS'
  /** Your labels never varied, so agreement carries no information. */
  | 'DEGENERATE'
  /** Too few comparable items to conclude anything. */
  | 'INSUFFICIENT'
  /** The auditor never assessed this dimension on any labelled protocol. */
  | 'NOT_ASSESSED';

export interface DimensionCalibration {
  key: AuditDimensionKey;
  label: string;
  /** Items where both you and the auditor produced a judgement. */
  compared: number;
  /** Items the auditor could not assess, excluded rather than assumed to agree. */
  excludedNotAssessed: number;
  /** Items you did not label, also excluded. */
  excludedUnlabelled: number;
  stats: Agreement;
  band: AgreementBand;
  status: DimensionStatus;
  /** Ids where you and the auditor disagreed, so they can be re-read. */
  disagreements: string[];
}

export interface CalibrationReport {
  /** Protocols carrying at least one usable comparison. */
  n: number;
  /** Agreement on the overall accept/reject call. */
  overall: Agreement;
  overallBand: AgreementBand;
  /** Proportion of protocols where the overall calls matched, with interval. */
  overallAccuracy: ProportionInterval;
  dimensions: DimensionCalibration[];
  /**
   * Plain-language problems found. Empty means nothing was flagged, which is
   * not the same as the auditor being validated.
   */
  concerns: string[];
  /** Verbatim scope statement, so a calibration figure never travels alone. */
  scopeStatement: string;
}

const DIMENSION_ORDER: AuditDimensionKey[] = [
  'STOICHIOMETRY',
  'VOLUME_BALANCE',
  'PIPETTABILITY',
  'DOCUMENT_COMPLETENESS',
  'SAFETY_AND_QC',
  'CITATION_INTEGRITY',
  'PLATFORM_RULES',
];

/** An auditor verdict reduced to the same accept/reject call a human makes. */
export function verdictIsAcceptable(verdict: AuditVerdict): boolean | null {
  switch (verdict) {
    case 'PASS':
    case 'PASS_WITH_WARNINGS':
      return true;
    case 'FAIL':
      return false;
    case 'INSUFFICIENT_DATA':
      // The auditor declining to judge is not a judgement. Excluded, not coerced.
      return null;
  }
}

/**
 * Whether the auditor passed one dimension.
 *
 * Returns null when the dimension was not assessed, which keeps unexamined
 * dimensions out of the agreement counts entirely.
 */
export function dimensionIsPassing(
  report: AuditReport,
  key: AuditDimensionKey,
  passThreshold: number,
): boolean | null {
  const dim = report.dimensions.find((d) => d.key === key);
  if (!dim || dim.score === null) return null;
  const hasError = dim.findings.some((f) => f.severity === 'ERROR');
  if (hasError) return false;
  return dim.score >= passThreshold;
}

export function calibrateAuditor(
  cases: readonly CalibrationCase[],
  options: CalibrationOptions = {},
): CalibrationReport {
  const passThreshold = options.passThreshold ?? 80;
  const minimumForConfidence = options.minimumForConfidence ?? 20;

  /* ---- overall accept/reject ---- */
  const humanOverall: boolean[] = [];
  const auditorOverall: boolean[] = [];
  for (const c of cases) {
    const a = verdictIsAcceptable(c.report.verdict);
    if (a === null) continue;
    humanOverall.push(c.labels.acceptable);
    auditorOverall.push(a);
  }
  const overall = agreement(humanOverall, auditorOverall);
  const matches = overall.tp + overall.tn;

  /* ---- per dimension ---- */
  const dimensions: DimensionCalibration[] = DIMENSION_ORDER.map((key) => {
    const human: boolean[] = [];
    const auditorSide: boolean[] = [];
    const disagreements: string[] = [];
    let excludedNotAssessed = 0;
    let excludedUnlabelled = 0;

    for (const c of cases) {
      const humanCall = c.labels.dimensions[key];
      const auditorCall = dimensionIsPassing(c.report, key, passThreshold);
      if (auditorCall === null) {
        excludedNotAssessed++;
        continue;
      }
      if (humanCall === undefined) {
        excludedUnlabelled++;
        continue;
      }
      human.push(humanCall);
      auditorSide.push(auditorCall);
      if (humanCall !== auditorCall) disagreements.push(c.id);
    }

    const stats = agreement(human, auditorSide);
    const compared = human.length;
    const label = findLabel(cases, key) ?? key;

    let status: DimensionStatus;
    if (compared === 0) status = 'NOT_ASSESSED';
    else if (stats.degenerate) status = 'DEGENERATE';
    else if (compared < minimumForConfidence) status = 'INSUFFICIENT';
    else if (!Number.isFinite(stats.kappa) || stats.kappa < 0.4) status = 'AMBIGUOUS';
    else status = 'CALIBRATED';

    return {
      key,
      label,
      compared,
      excludedNotAssessed,
      excludedUnlabelled,
      stats,
      band: agreementBand(stats.kappa),
      status,
      disagreements,
    };
  });

  /* ---- concerns, stated plainly ---- */
  const concerns: string[] = [];
  if (humanOverall.length < minimumForConfidence) {
    concerns.push(
      `Only ${humanOverall.length} protocols carry an overall comparison; ${minimumForConfidence} is the floor at which these figures mean much.`,
    );
  }
  if (Number.isFinite(overall.leniency) && overall.leniency > 0.1) {
    concerns.push(
      `The auditor accepts protocols you would reject on ${(overall.leniency * 100).toFixed(0)} percent of items. Leniency is the dangerous direction for a document someone runs at a bench.`,
    );
  }
  for (const d of dimensions) {
    if (d.status === 'AMBIGUOUS') {
      concerns.push(
        `${d.label}: kappa ${fmt(d.stats.kappa)} over ${d.compared} items. Rewrite the check before trusting it; low agreement usually means an ambiguous criterion.`,
      );
    }
    if (d.status === 'DEGENERATE') {
      concerns.push(
        `${d.label}: your labels never varied over ${d.compared} items, so agreement here carries no information. Label some failing protocols.`,
      );
    }
    if (d.status === 'NOT_ASSESSED') {
      concerns.push(`${d.label}: never assessed on any labelled protocol, so it is uncalibrated.`);
    }
    if (d.compared > 0 && Number.isFinite(d.stats.sensitivity) && d.stats.sensitivity < 0.5) {
      concerns.push(
        `${d.label}: catches under half of what you pass (sensitivity ${fmt(d.stats.sensitivity)}).`,
      );
    }
  }

  return {
    n: humanOverall.length,
    overall,
    overallBand: agreementBand(overall.kappa),
    overallAccuracy: wilsonInterval(matches, humanOverall.length),
    dimensions,
    concerns,
    scopeStatement:
      'These figures describe how far the automated auditor agrees with one human reader on one labelled set ' +
      'of protocols. They are a measure of agreement, not of correctness: a well-calibrated auditor reproduces ' +
      'that reader, including that reader’s mistakes. Agreement on this set says nothing about protocols ' +
      'unlike it, and nothing here constitutes validation, qualification, or evidence of conformance to ' +
      'ISO 9001, GLP, GMP, or 21 CFR Part 11.',
  };
}

function findLabel(cases: readonly CalibrationCase[], key: AuditDimensionKey): string | null {
  for (const c of cases) {
    const d = c.report.dimensions.find((x) => x.key === key);
    if (d) return d.label;
  }
  return null;
}

function fmt(x: number): string {
  return Number.isFinite(x) ? x.toFixed(2) : 'undefined';
}
