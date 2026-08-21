import { describe, it, expect } from 'vitest';
import {
  calibrateAuditor,
  dimensionIsPassing,
  verdictIsAcceptable,
  type CalibrationCase,
  type HumanLabels,
} from '../src/core/auditCalibration';
import type { AuditDimension, AuditDimensionKey, AuditReport, AuditVerdict } from '../src/core/auditor';

/**
 * These fixtures are synthetic AuditReports, not generated protocols. The point
 * is to test the calibration arithmetic and, more importantly, what it refuses
 * to conclude. Whether the real auditor agrees with a real reader is a question
 * only a labelled corpus can answer.
 */

const ALL_KEYS: AuditDimensionKey[] = [
  'STOICHIOMETRY',
  'VOLUME_BALANCE',
  'PIPETTABILITY',
  'DOCUMENT_COMPLETENESS',
  'SAFETY_AND_QC',
  'CITATION_INTEGRITY',
  'PLATFORM_RULES',
];

function dim(key: AuditDimensionKey, score: number | null, hasError = false): AuditDimension {
  return {
    key,
    label: key.toLowerCase().replace(/_/g, ' '),
    score,
    coverage: score === null ? 0 : 1,
    whatWasChecked: 'fixture',
    notChecked: [],
    findings: hasError
      ? [{ severity: 'ERROR', code: 'X', message: 'fixture error' }]
      : [],
  };
}

function report(
  verdict: AuditVerdict,
  scores: Partial<Record<AuditDimensionKey, number | null>>,
  errored: AuditDimensionKey[] = [],
): AuditReport {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    overallScore: 90,
    confidence: 0.9,
    verdict,
    errorCount: errored.length,
    warningCount: 0,
    dimensions: ALL_KEYS.map((k) =>
      dim(k, k in scores ? (scores[k] as number | null) : 90, errored.includes(k)),
    ),
    scopeStatement: 'fixture',
    limitations: [],
  };
}

const labels = (acceptable: boolean, dims: Partial<Record<AuditDimensionKey, boolean>> = {}): HumanLabels => ({
  acceptable,
  dimensions: dims,
});

describe('mapping auditor output onto a human call', () => {
  it('treats PASS and PASS_WITH_WARNINGS as acceptable, FAIL as not', () => {
    expect(verdictIsAcceptable('PASS')).toBe(true);
    expect(verdictIsAcceptable('PASS_WITH_WARNINGS')).toBe(true);
    expect(verdictIsAcceptable('FAIL')).toBe(false);
  });

  it('refuses to turn INSUFFICIENT_DATA into a judgement', () => {
    // Declining to judge is not the same as passing. Coercing it either way
    // is how an auditor gets credit for work it did not do.
    expect(verdictIsAcceptable('INSUFFICIENT_DATA')).toBeNull();
  });

  it('an ERROR finding fails a dimension regardless of its score', () => {
    const r = report('FAIL', { STOICHIOMETRY: 99 }, ['STOICHIOMETRY']);
    expect(dimensionIsPassing(r, 'STOICHIOMETRY', 80)).toBe(false);
  });

  it('an unassessed dimension is null, not false', () => {
    const r = report('PASS', { PLATFORM_RULES: null });
    expect(dimensionIsPassing(r, 'PLATFORM_RULES', 80)).toBeNull();
  });

  it('applies the threshold to scored dimensions', () => {
    const r = report('PASS', { SAFETY_AND_QC: 79 });
    expect(dimensionIsPassing(r, 'SAFETY_AND_QC', 80)).toBe(false);
    expect(dimensionIsPassing(r, 'SAFETY_AND_QC', 70)).toBe(true);
  });
});

describe('calibration arithmetic', () => {
  it('counts overall agreement and traces disagreements to their protocol', () => {
    const cases: CalibrationCase[] = [
      { id: 'p1', report: report('PASS', {}), labels: labels(true, { STOICHIOMETRY: true }) },
      { id: 'p2', report: report('FAIL', {}, ['STOICHIOMETRY']), labels: labels(false, { STOICHIOMETRY: false }) },
      // auditor passes it, the human would not: a leniency error
      { id: 'p3', report: report('PASS', {}), labels: labels(false, { STOICHIOMETRY: false }) },
    ];
    const cal = calibrateAuditor(cases);
    expect(cal.n).toBe(3);
    expect(cal.overall.tp).toBe(1);
    expect(cal.overall.tn).toBe(1);
    expect(cal.overall.fp).toBe(1);
    const stoich = cal.dimensions.find((d) => d.key === 'STOICHIOMETRY');
    expect(stoich?.disagreements).toEqual(['p3']);
  });

  it('excludes protocols the auditor declined to judge instead of scoring them', () => {
    const cases: CalibrationCase[] = [
      { id: 'p1', report: report('PASS', {}), labels: labels(true) },
      { id: 'p2', report: report('INSUFFICIENT_DATA', {}), labels: labels(false) },
    ];
    const cal = calibrateAuditor(cases);
    expect(cal.n).toBe(1);
  });

  it('excludes unassessed dimensions rather than counting them as agreement', () => {
    const cases: CalibrationCase[] = [
      { id: 'p1', report: report('PASS', { PLATFORM_RULES: null }), labels: labels(true, { PLATFORM_RULES: true }) },
      { id: 'p2', report: report('PASS', { PLATFORM_RULES: null }), labels: labels(true, { PLATFORM_RULES: true }) },
    ];
    const cal = calibrateAuditor(cases);
    const platform = cal.dimensions.find((d) => d.key === 'PLATFORM_RULES');
    expect(platform?.compared).toBe(0);
    expect(platform?.excludedNotAssessed).toBe(2);
    expect(platform?.status).toBe('NOT_ASSESSED');
  });

  it('excludes dimensions the human did not label', () => {
    const cases: CalibrationCase[] = [
      { id: 'p1', report: report('PASS', {}), labels: labels(true, {}) },
    ];
    const cal = calibrateAuditor(cases);
    const stoich = cal.dimensions.find((d) => d.key === 'STOICHIOMETRY');
    expect(stoich?.excludedUnlabelled).toBe(1);
    expect(stoich?.compared).toBe(0);
  });
});

describe('what calibration refuses to conclude', () => {
  it('will not call a dimension calibrated on a handful of items', () => {
    const cases: CalibrationCase[] = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      report: report(i % 2 === 0 ? 'PASS' : 'FAIL', {}, i % 2 === 0 ? [] : ['SAFETY_AND_QC']),
      labels: labels(i % 2 === 0, { SAFETY_AND_QC: i % 2 === 0 }),
    }));
    const cal = calibrateAuditor(cases);
    const safety = cal.dimensions.find((d) => d.key === 'SAFETY_AND_QC');
    // Perfect agreement, and still not enough items to claim calibration.
    expect(safety?.stats.kappa).toBeCloseTo(1, 10);
    expect(safety?.status).toBe('INSUFFICIENT');
    expect(cal.concerns.some((c) => c.includes('floor at which these figures mean much'))).toBe(true);
  });

  it('flags a dimension where the human labels never vary', () => {
    const cases: CalibrationCase[] = Array.from({ length: 25 }, (_, i) => ({
      id: `p${i}`,
      report: report('PASS', {}),
      labels: labels(true, { CITATION_INTEGRITY: true }),
    }));
    const cal = calibrateAuditor(cases);
    const cite = cal.dimensions.find((d) => d.key === 'CITATION_INTEGRITY');
    expect(cite?.status).toBe('DEGENERATE');
    expect(cal.concerns.some((c) => c.includes('never varied'))).toBe(true);
  });

  it('flags an ambiguous criterion rather than reporting a low kappa quietly', () => {
    // Auditor and human agree at roughly chance on this dimension.
    const cases: CalibrationCase[] = Array.from({ length: 24 }, (_, i) => {
      const auditorPass = i % 2 === 0;
      const humanPass = i % 3 === 0;
      return {
        id: `p${i}`,
        report: report('PASS', { VOLUME_BALANCE: auditorPass ? 90 : 40 }),
        labels: labels(true, { VOLUME_BALANCE: humanPass }),
      };
    });
    const cal = calibrateAuditor(cases);
    const vol = cal.dimensions.find((d) => d.key === 'VOLUME_BALANCE');
    expect(vol?.compared).toBe(24);
    expect(vol?.status).toBe('AMBIGUOUS');
    expect(cal.concerns.some((c) => c.includes('Rewrite the check'))).toBe(true);
  });

  it('names leniency explicitly, because that is the direction that hurts', () => {
    // Auditor passes everything; the human rejects a third of it.
    const cases: CalibrationCase[] = Array.from({ length: 24 }, (_, i) => ({
      id: `p${i}`,
      report: report('PASS', {}),
      labels: labels(i % 3 !== 0),
    }));
    const cal = calibrateAuditor(cases);
    expect(cal.overall.leniency).toBeGreaterThan(0.1);
    expect(cal.concerns.some((c) => c.includes('dangerous direction'))).toBe(true);
  });

  it('reports an interval on overall accuracy, not a bare percentage', () => {
    const cases: CalibrationCase[] = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      report: report(i < 18 ? 'PASS' : 'FAIL', {}, i < 18 ? [] : ['STOICHIOMETRY']),
      labels: labels(i < 18),
    }));
    const cal = calibrateAuditor(cases);
    expect(cal.overallAccuracy.p).toBe(1);
    // 20 for 20 is not evidence of perfection; the interval says so.
    expect(cal.overallAccuracy.lo).toBeLessThan(0.9);
    expect(cal.overallAccuracy.hi).toBe(1);
  });

  it('carries a scope statement so a calibration figure never travels alone', () => {
    const cal = calibrateAuditor([]);
    expect(cal.scopeStatement).toContain('measure of agreement, not of correctness');
    expect(cal.scopeStatement).toContain('21 CFR Part 11');
  });

  it('an empty corpus concludes nothing rather than throwing', () => {
    const cal = calibrateAuditor([]);
    expect(cal.n).toBe(0);
    expect(cal.dimensions.every((d) => d.status === 'NOT_ASSESSED')).toBe(true);
  });
});
