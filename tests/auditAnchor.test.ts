import { describe, it, expect } from 'vitest';
import { ANCHOR_CASES } from './fixtures/anchorProtocols';
import { auditProtocol } from '../src/core/auditor';
import baseline from './fixtures/auditAnchors.json';

/**
 * Anchor suite: does the auditor still say what it said?
 *
 * Unlike the other test files here, the expected values in
 * `fixtures/auditAnchors.json` are a recording of this codebase's own output.
 * That is the point. This suite does not assert that the auditor is right; it
 * asserts that it has not silently changed its mind. Correctness is the job of
 * `auditor.test.ts`, and agreement with a human is the job of
 * `auditCalibration.ts` over a labelled corpus.
 *
 * Scope, stated so nobody over-reads a green run: `auditProtocol` is pure over
 * (document, calculation) and never calls a model. This catches drift in the
 * AUDITOR. It does not and cannot catch drift in the generation model, because
 * no model is invoked here. Model drift needs the golden-set run in
 * `sopQuality.test.ts`, which is key-gated and skips by default.
 *
 * When a fixture moves:
 *   1. Work out whether you meant it.
 *   2. If you did, regenerate the baseline in the same commit as the change and
 *      say in the message which fixture moved and why.
 *   3. If you did not, the anchor just did its job.
 *
 * Do not edit the fixtures in `anchorProtocols.ts` to make this pass.
 */

type DimensionBaseline = {
  score: number | null;
  coverage: number;
  errors: number;
  warnings: number;
};
type CaseBaseline = {
  verdict: string;
  overallScore: number | null;
  confidence: number;
  errorCount: number;
  warningCount: number;
  dimensions: Record<string, DimensionBaseline>;
};

const BASELINE = baseline as unknown as Record<string, CaseBaseline>;

describe('auditor anchors: the verdicts have not moved', () => {
  it('every anchor case has a recorded baseline', () => {
    for (const c of ANCHOR_CASES) {
      expect(BASELINE[c.id], `no baseline recorded for anchor "${c.id}"`).toBeDefined();
    }
    expect(Object.keys(BASELINE).length).toBe(ANCHOR_CASES.length);
  });

  for (const c of ANCHOR_CASES) {
    describe(c.id, () => {
      const expected = BASELINE[c.id] as CaseBaseline;
      const actual = auditProtocol(c.sop, c.calc);

      it(`holds its verdict (${c.intent})`, () => {
        expect(actual.verdict).toBe(expected.verdict);
      });

      it('holds its overall score and confidence', () => {
        expect(actual.overallScore).toBe(expected.overallScore);
        expect(actual.confidence).toBe(expected.confidence);
      });

      it('holds its error and warning counts', () => {
        expect(actual.errorCount).toBe(expected.errorCount);
        expect(actual.warningCount).toBe(expected.warningCount);
      });

      it('holds every dimension score, coverage and finding count', () => {
        for (const dim of actual.dimensions) {
          const exp = expected.dimensions[dim.key];
          expect(exp, `dimension ${dim.key} missing from baseline`).toBeDefined();
          const errors = dim.findings.filter((f) => f.severity === 'ERROR').length;
          const warnings = dim.findings.filter((f) => f.severity === 'WARNING').length;
          expect(
            { score: dim.score, coverage: dim.coverage, errors, warnings },
            `${c.id} / ${dim.key} moved`,
          ).toEqual(exp);
        }
      });
    });
  }
});

describe('the properties the anchors exist to protect', () => {
  it('a confirmed arithmetic error is a FAIL regardless of the overall score', () => {
    // This is the whole design argument restated as a test: hard failures gate,
    // they do not average out. The overflowing fixture scores in the eighties
    // and still fails.
    const overflow = ANCHOR_CASES.find((c) => c.id === 'overflowing-volumes');
    expect(overflow).toBeDefined();
    const r = auditProtocol(overflow!.sop, overflow!.calc);
    expect(r.errorCount).toBeGreaterThan(0);
    expect(r.verdict).toBe('FAIL');
    expect(r.overallScore).toBeGreaterThan(80);
  });

  it('declines to judge when there is nothing to judge, rather than passing', () => {
    const bare = ANCHOR_CASES.find((c) => c.id === 'no-reaction-data');
    const r = auditProtocol(bare!.sop, bare!.calc);
    expect(r.verdict).toBe('INSUFFICIENT_DATA');
    // The arithmetic dimensions must be null, not zero and not full marks.
    for (const key of ['STOICHIOMETRY', 'VOLUME_BALANCE', 'PIPETTABILITY']) {
      expect(r.dimensions.find((d) => d.key === key)?.score).toBeNull();
    }
  });

  it('never returns a score without also returning what it did not check', () => {
    for (const c of ANCHOR_CASES) {
      const r = auditProtocol(c.sop, c.calc);
      if (r.overallScore !== null) {
        expect(r.limitations.length, `${c.id} scored without stating limitations`).toBeGreaterThan(0);
      }
      expect(r.scopeStatement).toContain('does NOT verify');
    }
  });
});
