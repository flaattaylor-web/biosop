import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SOP_DRAFTING_RUBRIC,
  scoreItem,
  criterionMetRates,
  WEIGHT_VALUE,
  type ItemScoreInput,
} from '../src/core/sopRubric';
import { summarize, pairedComparison, assessPower, wilsonInterval } from '../src/core/evalStats';

/**
 * Quality of BioSOP's SOP output, measured against a golden set.
 *
 * This suite SKIPS unless `tests/fixtures/goldenSet.json` exists. That is
 * deliberate and it is not a gap to be filled with fixtures: the golden set has
 * to be real methods where the answer is already known, and no amount of
 * generated placeholder data can stand in for that. See
 * `tests/fixtures/GOLDEN-SET.md`.
 *
 * The rubric mechanics below are tested unconditionally, because those are
 * arithmetic and can be checked without any bench knowledge at all.
 */

const GOLDEN_PATH = join(__dirname, 'fixtures', 'goldenSet.json');
const hasGoldenSet = existsSync(GOLDEN_PATH);

interface GoldenItem {
  id: string;
  sourceMethod: string;
  referenceSop: string;
  difficulty?: string;
  adversarial?: boolean;
  notes?: string;
}

describe('rubric mechanics', () => {
  it('weights essential, important and optional at 1.0, 0.7 and 0.3', () => {
    expect(WEIGHT_VALUE.ESSENTIAL).toBe(1.0);
    expect(WEIGHT_VALUE.IMPORTANT).toBe(0.7);
    expect(WEIGHT_VALUE.OPTIONAL).toBe(0.3);
  });

  it('scores an all-met item at 1 and an all-missed item at 0', () => {
    const all = SOP_DRAFTING_RUBRIC.criteria.map((c) => c.id);
    expect(scoreItem(SOP_DRAFTING_RUBRIC, { criteriaMet: all, hardFailsFired: [] }).score).toBeCloseTo(1, 12);
    expect(scoreItem(SOP_DRAFTING_RUBRIC, { criteriaMet: [], hardFailsFired: [] }).score).toBe(0);
  });

  it('a hard failure fails the item at any score', () => {
    // This is the property the whole design turns on. Everything satisfied,
    // one safety step weakened, and it must not pass.
    const all = SOP_DRAFTING_RUBRIC.criteria.map((c) => c.id);
    const r = scoreItem(SOP_DRAFTING_RUBRIC, { criteriaMet: all, hardFailsFired: ['h1'] });
    expect(r.score).toBeCloseTo(1, 12);
    expect(r.hardFailed).toBe(true);
    expect(r.passed).toBe(false);
  });

  it('a hard failure is a gate, not a deduction that good criteria can bury', () => {
    const all = SOP_DRAFTING_RUBRIC.criteria.map((c) => c.id);
    const clean = scoreItem(SOP_DRAFTING_RUBRIC, { criteriaMet: all, hardFailsFired: [] });
    const gated = scoreItem(SOP_DRAFTING_RUBRIC, { criteriaMet: all, hardFailsFired: ['h0'] });
    // Identical score, opposite verdict. If the gate were a weight these would differ.
    expect(gated.score).toBe(clean.score);
    expect(clean.passed).toBe(true);
    expect(gated.passed).toBe(false);
  });

  it('dropping one essential criterion falls below the 0.90 threshold', () => {
    const all = SOP_DRAFTING_RUBRIC.criteria.map((c) => c.id);
    const missingEssential = all.filter((id) => id !== 'c0');
    const r = scoreItem(SOP_DRAFTING_RUBRIC, { criteriaMet: missingEssential, hardFailsFired: [] });
    expect(r.passed).toBe(false);
  });

  it('dropping one optional criterion does not', () => {
    const all = SOP_DRAFTING_RUBRIC.criteria.map((c) => c.id);
    const missingOptional = all.filter((id) => id !== 'c11');
    expect(scoreItem(SOP_DRAFTING_RUBRIC, { criteriaMet: missingOptional, hardFailsFired: [] }).passed).toBe(true);
  });

  it('every criterion and hard fail carries a unique id', () => {
    const ids = SOP_DRAFTING_RUBRIC.criteria.map((c) => c.id);
    const hids = SOP_DRAFTING_RUBRIC.hardFails.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hids).size).toBe(hids.length);
  });

  it('reports per-criterion met rates worst first, so a failure says where', () => {
    const items: ItemScoreInput[] = [
      { criteriaMet: ['c0', 'c1', 'c5'], hardFailsFired: [] },
      { criteriaMet: ['c0', 'c5'], hardFailsFired: [] },
      { criteriaMet: ['c0'], hardFailsFired: [] },
    ];
    const rates = criterionMetRates(SOP_DRAFTING_RUBRIC, items);
    expect(rates[0]?.rate).toBe(0);
    const c0 = rates.find((r) => r.id === 'c0');
    expect(c0?.rate).toBe(1);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]!.rate).toBeGreaterThanOrEqual(rates[i - 1]!.rate);
    }
  });
});

describe.skipIf(!hasGoldenSet)('SOP quality against the golden set', () => {
  const golden = hasGoldenSet
    ? (JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as { items: GoldenItem[] })
    : { items: [] };

  it('the golden set is large enough to conclude anything', () => {
    expect(golden.items.length).toBeGreaterThanOrEqual(15);
  });

  it('every item carries a reference answer, which is what makes it gradeable', () => {
    for (const item of golden.items) {
      expect(item.referenceSop?.trim().length, `${item.id} has no reference SOP`).toBeGreaterThan(0);
      expect(item.sourceMethod?.trim().length, `${item.id} has no source method`).toBeGreaterThan(0);
    }
  });

  it('reserves a meaningful share of adversarial items', () => {
    const adversarial = golden.items.filter((i) => i.adversarial).length;
    // Roughly a third is the target. A quarter is the point below which the set
    // stops probing the failure mode that matters.
    expect(adversarial / golden.items.length).toBeGreaterThanOrEqual(0.25);
  });

  it('has no placeholder items left from the template', () => {
    for (const item of golden.items) {
      expect(item.id.startsWith('REPLACE-ME'), `${item.id} is still a template placeholder`).toBe(false);
      expect(item.sourceMethod.includes('<paste'), `${item.id} still holds template text`).toBe(false);
    }
  });
});

/**
 * Worked demonstration of the reporting path, on obviously synthetic scores.
 *
 * These numbers describe nothing. They exist so the statistics wiring is
 * exercised in CI even before a real golden set lands, and so the shape of the
 * output is visible to whoever reads this file next.
 */
describe('reporting path', () => {
  const SYNTHETIC_A = [0.86, 0.91, 0.78, 0.94, 0.83, 0.88, 0.9, 0.75, 0.92, 0.87, 0.8, 0.89];
  const SYNTHETIC_B = [0.9, 0.93, 0.84, 0.96, 0.88, 0.91, 0.94, 0.82, 0.95, 0.9, 0.86, 0.92];

  it('summarises a run with an interval rather than a bare mean', () => {
    const s = summarize(SYNTHETIC_A);
    expect(s.n).toBe(12);
    expect(s.half).toBeGreaterThan(0);
    expect(s.lo).toBeLessThan(s.mean);
    expect(s.hi).toBeGreaterThan(s.mean);
  });

  it('reports a pass rate as an interval, because 10 of 12 is not 83 percent', () => {
    const passes = SYNTHETIC_A.filter((x) => x >= SOP_DRAFTING_RUBRIC.passThreshold).length;
    const w = wilsonInterval(passes, SYNTHETIC_A.length);
    expect(w.hi - w.lo).toBeGreaterThan(0.2);
  });

  it('pairs two runs and refuses to claim a gap the sample cannot resolve', () => {
    const cmp = pairedComparison(SYNTHETIC_A, SYNTHETIC_B);
    expect(cmp.ok).toBe(true);
    if (!cmp.ok) return;
    const power = assessPower(cmp.sdDiff, cmp.diff, cmp.n);
    // Whichever way this lands, the verdict and the interval have to agree with
    // each other: a claimable gap is one whose interval excludes zero.
    if (power.claimable) {
      expect(Math.sign(cmp.lo)).toBe(Math.sign(cmp.hi));
    } else {
      expect(power.minimumDetectable).toBeGreaterThan(Math.abs(cmp.diff));
    }
  });
});
