import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  logGamma,
  tTestTwoSided,
  probit,
  tQuantile,
  mean,
  standardDeviation,
  summarize,
  wilsonInterval,
  pairedComparison,
  assessPower,
  binomialUpperTail,
  mcNemar,
  agreement,
  agreementBand,
  MIN_MEANINGFUL_PAIRS,
} from '../src/core/evalStats';
import type { PairedComparisonFailed } from '../src/core/evalStats';

/**
 * Reference values in this file were produced independently with SciPy
 * (scipy.stats / scipy.special), not by running the implementation and
 * recording what it said. A test that records its own output proves only that
 * the code is deterministic.
 */

const near = (actual: number, expected: number, tol = 1e-10) =>
  expect(Math.abs(actual - expected)).toBeLessThan(tol);

describe('special functions against SciPy', () => {
  it('logGamma matches math.lgamma', () => {
    near(logGamma(0.5), 0.5723649429247, 1e-12);
    near(logGamma(1.0), 0.0, 1e-12);
    near(logGamma(5.0), 3.178053830347945, 1e-12);
    near(logGamma(10.5), 13.940625219403763, 1e-11);
    // reflection branch, z < 0.5
    near(logGamma(0.1), 2.252712651734206, 1e-11);
  });

  it('two-sided t p-values match scipy.stats.t.sf', () => {
    near(tTestTwoSided(2.0, 10), 0.07338803477074, 1e-12);
    near(tTestTwoSided(11.2, 17), 2.869621e-9, 1e-15);
    near(tTestTwoSided(1.0, 1), 0.5, 1e-12);
    near(tTestTwoSided(3.5, 29), 0.001524446314655, 1e-13);
    near(tTestTwoSided(0.5, 100), 0.618173565830887, 1e-12);
  });

  it('probit matches scipy.stats.norm.ppf to its documented accuracy', () => {
    // Acklam is a rational approximation, not an exact inverse. The tolerance
    // here is the accuracy the method actually has (~2e-9 absolute), which is
    // still four orders of magnitude finer than anything that moves a verdict.
    const ACKLAM = 2e-9;
    near(probit(0.975), 1.959963984540054, ACKLAM);
    near(probit(0.5), 0.0, 1e-12);
    near(probit(0.8), 0.841621233572914, ACKLAM);
    near(probit(0.01), -2.326347874040841, ACKLAM);
    near(probit(0.999), 3.090232306167813, ACKLAM);
  });

  it('probit refuses values outside (0, 1) rather than extrapolating', () => {
    expect(Number.isNaN(probit(0))).toBe(true);
    expect(Number.isNaN(probit(1))).toBe(true);
    expect(Number.isNaN(probit(-0.2))).toBe(true);
  });

  it('t quantiles match scipy.stats.t.ppf where golden sets actually live', () => {
    near(tQuantile(0.975, 1), 12.706204736174694, 1e-7);
    near(tQuantile(0.975, 5), 2.570581835636315, 1e-9);
    near(tQuantile(0.975, 11), 2.200985160091639, 1e-9);
    near(tQuantile(0.975, 17), 2.109815577833316, 1e-9);
    near(tQuantile(0.975, 29), 2.045229642132703, 1e-9);
    near(tQuantile(0.975, 100), 1.983971518523552, 1e-9);
  });

  it('substitutes the normal above df 2000, and that substitution is defensible', () => {
    // Documented shortcut: above df 2000 the t quantile is replaced by the normal.
    near(tQuantile(0.975, 3000), 1.959963984540054, 2e-9);
    // The true value there is 1.9607550553; the error the shortcut introduces is
    // smaller than a thousandth of a multiplier, which cannot move a verdict.
    expect(Math.abs(1.960755055322458 - tQuantile(0.975, 3000))).toBeLessThan(1e-3);
  });

  it('the small-n t multiplier is materially larger than 1.96', () => {
    // The reason tQuantile exists at all. At n = 12 a normal multiplier
    // understates the interval by roughly 12 percent.
    expect(tQuantile(0.975, 11) / probit(0.975)).toBeGreaterThan(1.11);
  });
});

describe('descriptive statistics', () => {
  it('mean and sample standard deviation', () => {
    near(mean([1, 2, 3, 4]), 2.5, 1e-15);
    near(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]), 2.13808993529939, 1e-12);
  });

  it('refuses a standard deviation of one value instead of reporting zero', () => {
    expect(Number.isNaN(standardDeviation([5]))).toBe(true);
    expect(Number.isNaN(standardDeviation([]))).toBe(true);
  });

  it('summarize reports the CI half-width, which is the number worth showing', () => {
    const s = summarize([0.62, 0.55, 0.71, 0.48, 0.66, 0.59, 0.73, 0.51, 0.68, 0.57, 0.64, 0.6]);
    expect(s.n).toBe(12);
    near(s.mean, 0.6116666666666666, 1e-12);
    near(s.half, tQuantile(0.975, 11) * s.se, 1e-12);
    near(s.lo, s.mean - s.half, 1e-12);
  });
});

describe('Wilson interval against scipy proportion_ci', () => {
  it('matches at a middling proportion', () => {
    // Tolerance is 1e-9 because the Acklam z propagates into both endpoints.
    const w = wilsonInterval(10, 20);
    near(w.lo, 0.299298008198212, 1e-9);
    near(w.hi, 0.700701991801788, 1e-9);
  });

  it('stays inside [0, 1] at the boundaries where the normal approximation escapes', () => {
    const zero = wilsonInterval(0, 10);
    near(zero.lo, 0, 1e-12);
    near(zero.hi, 0.277532799862889, 1e-9);
    const all = wilsonInterval(18, 18);
    near(all.lo, 0.824120776353342, 1e-9);
    near(all.hi, 1, 1e-12);
  });

  it('matches at a small awkward n', () => {
    const w = wilsonInterval(3, 7);
    near(w.lo, 0.15821985525147, 1e-9);
    near(w.hi, 0.749541635472343, 1e-9);
  });

  it('never produces an interval outside [0, 1] for any input', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 200 }), fc.integer({ min: 1, max: 200 }), (k, n) => {
        const kk = Math.min(k, n);
        const w = wilsonInterval(kk, n);
        return w.lo >= 0 && w.hi <= 1 && w.lo <= w.p && w.p <= w.hi;
      }),
    );
  });
});

/** Twelve matched scores. Reference figures computed with scipy.stats.ttest_rel. */
const RUN_A = [0.62, 0.55, 0.71, 0.48, 0.66, 0.59, 0.73, 0.51, 0.68, 0.57, 0.64, 0.6];
const RUN_B = [0.81, 0.74, 0.88, 0.69, 0.85, 0.77, 0.91, 0.72, 0.86, 0.79, 0.83, 0.78];

describe('paired comparison', () => {
  it('matches scipy.stats.ttest_rel and pearsonr', () => {
    const r = pairedComparison(RUN_A, RUN_B);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.n).toBe(12);
    expect(r.df).toBe(11);
    near(r.meanA, 0.6116666666666666, 1e-12);
    near(r.meanB, 0.8024999999999999, 1e-12);
    near(r.diff, 0.190833333333333, 1e-12);
    near(r.sdDiff, 0.015050420310249, 1e-12);
    near(r.t, 43.923428355815183, 1e-9);
    near(r.p, 1.04e-13, 1e-14);
    near(r.r, 0.988355356282291, 1e-10);
    near(r.lo, 0.181270752486616, 1e-11);
    near(r.hi, 0.200395914180051, 1e-11);
  });

  it('refuses runs of different lengths instead of truncating them', () => {
    const r = pairedComparison([1, 2, 3], [1, 2]);
    expect(r.ok).toBe(false);
    // The repo's base tsconfig is non-strict, where narrowing a boolean
    // discriminant to its false branch does not apply. The cast keeps this file
    // compiling under both passes that `npm run lint` runs.
    expect((r as PairedComparisonFailed).code).toBe('LENGTH_MISMATCH');
  });

  it('refuses a single pair', () => {
    const r = pairedComparison([1], [2]);
    expect(r.ok).toBe(false);
    expect((r as PairedComparisonFailed).code).toBe('TOO_FEW_PAIRS');
  });

  it('reverses sign but not magnitude when the runs are swapped', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true })), {
          minLength: 3,
          maxLength: 40,
        }),
        (pairs) => {
          const a = pairs.map((p) => p[0]);
          const b = pairs.map((p) => p[1]);
          const fwd = pairedComparison(a, b);
          const rev = pairedComparison(b, a);
          if (!fwd.ok || !rev.ok) return true;
          if (!Number.isFinite(fwd.t) || !Number.isFinite(rev.t)) return true;
          return (
            Math.abs(fwd.diff + rev.diff) < 1e-9 && Math.abs(Math.abs(fwd.t) - Math.abs(rev.t)) < 1e-6
          );
        },
      ),
    );
  });
});

describe('power assessment', () => {
  it('reproduces the 7.849 leading constant at alpha .05 and power .80', () => {
    const z = probit(0.975) + probit(0.8);
    near(z * z, 7.848879, 1e-5);
  });

  it('floors the requirement rather than claiming a two-item study was enough', () => {
    const cmp = pairedComparison(RUN_A, RUN_B);
    expect(cmp.ok).toBe(true);
    if (!cmp.ok) return;
    const power = assessPower(cmp.sdDiff, cmp.diff, cmp.n);
    // The raw formula asks for well under one pair for a gap this large.
    expect(power.requiredRaw).toBeLessThan(1);
    expect(power.floored).toBe(true);
    expect(power.required).toBe(MIN_MEANINGFUL_PAIRS);
    near(power.q, 12 / MIN_MEANINGFUL_PAIRS, 1e-12);
    expect(power.claimable).toBe(true);
  });

  it('refuses to call a gap claimable when the sample cannot resolve it', () => {
    // Noisy scores, small real difference, few items.
    const power = assessPower(0.2, 0.02, 10);
    expect(power.floored).toBe(false);
    expect(power.required).toBeGreaterThan(100);
    expect(power.claimable).toBe(false);
    expect(power.q).toBeLessThan(1);
  });

  it('reports the smallest difference the sample could have resolved', () => {
    const power = assessPower(0.2, 0.02, 10);
    const z = probit(0.975) + probit(0.8);
    near(power.minimumDetectable, 0.2 * Math.sqrt((z * z) / 10), 1e-12);
    // and that floor is above the observed gap, which is why it is not claimable
    expect(power.minimumDetectable).toBeGreaterThan(0.02);
  });

  it('gives no verdict at all when there is no difference to size', () => {
    const power = assessPower(0.05, 0, 20);
    expect(Number.isNaN(power.required)).toBe(true);
    expect(power.claimable).toBe(false);
  });
});

describe('McNemar exact', () => {
  it('matches the exact binomial tail', () => {
    // 299 / 4096 = P(X >= 9 | n = 12, p = 0.5)
    near(binomialUpperTail(9, 12), 299 / 4096, 1e-12);
  });

  it('reproduces a hand-checkable table', () => {
    // n10 = 9 (A pass, B fail), n01 = 3 (A fail, B pass)
    const a = [...Array(9).fill(true), ...Array(3).fill(false), true, false];
    const b = [...Array(9).fill(false), ...Array(3).fill(true), true, false];
    const m = mcNemar(a, b);
    expect(m.n10).toBe(9);
    expect(m.n01).toBe(3);
    expect(m.n11).toBe(1);
    expect(m.n00).toBe(1);
    expect(m.discordant).toBe(12);
    near(m.p, 0.14599609375, 1e-12);
  });

  it('reports p = 1 when nothing disagrees, rather than dividing by zero', () => {
    const m = mcNemar([true, false, true], [true, false, true]);
    expect(m.discordant).toBe(0);
    expect(m.p).toBe(1);
  });

  it('cell counts always sum to n', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.boolean(), fc.boolean()), { minLength: 1, maxLength: 60 }), (pairs) => {
        const m = mcNemar(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
        return m.n00 + m.n01 + m.n10 + m.n11 === m.n && m.n === pairs.length;
      }),
    );
  });
});

describe('agreement', () => {
  /** tp = 20, fp = 5, fn = 10, tn = 15. Cohen's kappa is exactly 0.40. */
  const reference = [...Array(20).fill(true), ...Array(10).fill(true), ...Array(5).fill(false), ...Array(15).fill(false)];
  const candidate = [...Array(20).fill(true), ...Array(10).fill(false), ...Array(5).fill(true), ...Array(15).fill(false)];

  it('reproduces a hand-computed kappa', () => {
    const a = agreement(reference, candidate);
    expect(a.n).toBe(50);
    expect([a.tp, a.fp, a.fn, a.tn]).toEqual([20, 5, 10, 15]);
    near(a.po, 0.7, 1e-12);
    near(a.kappa, 0.4, 1e-12);
  });

  it('computes Gwet AC1 alongside it', () => {
    const a = agreement(reference, candidate);
    // pi = 0.55, pe = 2(0.55)(0.45) = 0.495, AC1 = (0.7 - 0.495) / 0.505
    near(a.ac1, 0.205 / 0.505, 1e-12);
  });

  it('reports sensitivity, specificity and the direction of the disagreement', () => {
    const a = agreement(reference, candidate);
    near(a.sensitivity, 20 / 30, 1e-12);
    near(a.specificity, 15 / 20, 1e-12);
    // The candidate says yes 25 times where the reference says yes 30 times:
    // it is stricter, not more lenient.
    near(a.leniency, -0.1, 1e-12);
  });

  it('flags a degenerate criterion instead of reporting a meaningless kappa', () => {
    // Reference never varies. Kappa is undefined here, and the honest answer is
    // that the criterion is uninformative, not that agreement was perfect.
    const a = agreement([true, true, true, true], [true, true, false, true]);
    expect(a.degenerate).toBe(true);
    expect(a.po).toBeGreaterThan(0);
  });

  it('perfect agreement gives kappa 1, and a coin flip gives about 0', () => {
    const perfect = agreement([true, false, true, false], [true, false, true, false]);
    near(perfect.kappa, 1, 1e-12);
    const chance = agreement([true, true, false, false], [true, false, true, false]);
    near(chance.kappa, 0, 1e-12);
  });

  it('observed agreement is always a proportion', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.boolean(), fc.boolean()), { minLength: 1, maxLength: 60 }), (pairs) => {
        const a = agreement(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
        return a.po >= 0 && a.po <= 1 && a.tp + a.fp + a.fn + a.tn === pairs.length;
      }),
    );
  });

  it('bands kappa the way the calibration report reads it', () => {
    expect(agreementBand(NaN)).toBe('undefined');
    expect(agreementBand(0.2)).toBe('poor to fair');
    expect(agreementBand(0.39999)).toBe('poor to fair');
    expect(agreementBand(0.4)).toBe('moderate');
    expect(agreementBand(0.6)).toBe('substantial');
    expect(agreementBand(0.75)).toBe('almost perfect');
  });
});
