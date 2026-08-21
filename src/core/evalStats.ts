/**
 * Statistics for evaluating generated output against human judgement.
 *
 * Design principle: this module never reports a result it cannot support. Every
 * function that can be undefined for its input says so explicitly rather than
 * returning a number that looks authoritative. The reason is the same one that
 * produced `auditor.ts`: a score that cannot fail, or a difference that cannot
 * be distinguished from noise, is worse than no number at all because it reads
 * as an endorsement.
 *
 * Everything here is pure and dependency-free. Implementations are checked
 * against published reference values in `tests/evalStats.test.ts`.
 */

/* ------------------------------------------------------------------ *
 * Special functions
 * ------------------------------------------------------------------ */

/** Lanczos approximation, g = 7, n = 9. Accurate to ~15 significant figures. */
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
] as const;

export function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const zz = z - 1;
  let x = LANCZOS[0];
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (zz + i);
  const t = zz + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Continued-fraction expansion for the incomplete beta (modified Lentz). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const EPS = 3e-16;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta, I_x(a, b). */
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Two-sided p-value for Student's t with `df` degrees of freedom. */
export function tTestTwoSided(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return NaN;
  return incompleteBeta(df / 2, 0.5, df / (df + t * t));
}

/**
 * Inverse standard normal CDF (Acklam's rational approximation).
 *
 * Accurate to roughly 2e-9 absolute across the range, which is four orders of
 * magnitude finer than anything that could move a verdict here: it shifts a
 * 95 percent interval multiplier in the ninth decimal place. `tests/evalStats.test.ts`
 * pins it to that documented accuracy rather than to machine precision, because
 * claiming precision the method does not have is the same error this module exists
 * to prevent.
 */
export function probit(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p <= 0 || p >= 1) return NaN;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/**
 * Student t quantile by bisection on the CDF.
 *
 * Deliberately not 1.96. Golden sets are small, and at n = 12 the normal
 * multiplier understates the interval by about 10 percent.
 */
export function tQuantile(p: number, df: number): number {
  if (df > 2000) return probit(p);
  let lo = -100;
  let hi = 100;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const cdf = mid >= 0 ? 1 - tTestTwoSided(mid, df) / 2 : tTestTwoSided(mid, df) / 2;
    if (cdf < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ------------------------------------------------------------------ *
 * Descriptive
 * ------------------------------------------------------------------ */

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN;
}

/** Sample standard deviation (n - 1). NaN for fewer than two values. */
export function standardDeviation(xs: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1));
}

export interface Summary {
  n: number;
  mean: number;
  sd: number;
  se: number;
  /** Half-width of the confidence interval, which is the number worth showing. */
  half: number;
  lo: number;
  hi: number;
}

export function summarize(values: readonly number[], confidence = 0.95): Summary {
  const n = values.length;
  const m = mean(values);
  if (n < 2) {
    return { n, mean: m, sd: NaN, se: NaN, half: NaN, lo: NaN, hi: NaN };
  }
  const sd = standardDeviation(values);
  const se = sd / Math.sqrt(n);
  const tc = tQuantile(1 - (1 - confidence) / 2, n - 1);
  return { n, mean: m, sd, se, half: tc * se, lo: m - tc * se, hi: m + tc * se };
}

export interface ProportionInterval {
  p: number;
  lo: number;
  hi: number;
}

/**
 * Wilson score interval for a proportion.
 *
 * Correct at the sample sizes golden sets actually reach, where the normal
 * approximation produces intervals that run past 0 or 1.
 */
export function wilsonInterval(successes: number, n: number, confidence = 0.95): ProportionInterval {
  if (n <= 0) return { p: NaN, lo: NaN, hi: NaN };
  const z = probit(1 - (1 - confidence) / 2);
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  // At p = 0 and p = 1 the algebra gives exactly 0 and exactly 1, but the
  // floating-point route can land a fraction below. Pin the endpoints so an
  // all-pass run never reports an upper bound of 0.9999999999999999.
  const lo = successes === 0 ? 0 : Math.max(0, centre - half);
  const hi = successes === n ? 1 : Math.min(1, centre + half);
  return { p, lo, hi };
}

/* ------------------------------------------------------------------ *
 * Paired comparison
 * ------------------------------------------------------------------ */

export interface PairedComparisonFailed {
  ok: false;
  reason: string;
  code: 'LENGTH_MISMATCH' | 'TOO_FEW_PAIRS';
}

export interface PairedComparisonOk {
  ok: true;
  n: number;
  meanA: number;
  meanB: number;
  /** Mean of (b - a) over matched items. */
  diff: number;
  sdDiff: number;
  se: number;
  t: number;
  df: number;
  p: number;
  /** Correlation between the two runs. This is what pairing buys you. */
  r: number;
  lo: number;
  hi: number;
}

export type PairedComparison = PairedComparisonOk | PairedComparisonFailed;

/** Paired comparison of matched continuous scores. `b` minus `a`. */
export function pairedComparison(
  a: readonly number[],
  b: readonly number[],
  confidence = 0.95,
): PairedComparison {
  if (a.length !== b.length) {
    return {
      ok: false,
      code: 'LENGTH_MISMATCH',
      reason: `Runs cover different item counts (${a.length} and ${b.length}); pairing requires identical items.`,
    };
  }
  const n = a.length;
  if (n < 2) {
    return { ok: false, code: 'TOO_FEW_PAIRS', reason: 'Need at least two paired items.' };
  }
  const diffs = a.map((x, i) => (b[i] as number) - x);
  const diff = mean(diffs);
  const sdDiff = standardDeviation(diffs);
  const se = sdDiff / Math.sqrt(n);
  const df = n - 1;
  const t = se > 0 ? diff / se : diff === 0 ? 0 : Infinity;
  const p = se > 0 ? tTestTwoSided(t, df) : diff === 0 ? 1 : 0;
  const tc = tQuantile(1 - (1 - confidence) / 2, df);

  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = (a[i] as number) - ma;
    const xb = (b[i] as number) - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const r = da > 0 && db > 0 ? num / Math.sqrt(da * db) : NaN;

  return {
    ok: true,
    n,
    meanA: ma,
    meanB: mb,
    diff,
    sdDiff,
    se,
    t,
    df,
    p,
    r,
    lo: diff - tc * se,
    hi: diff + tc * se,
  };
}

/**
 * Below this many pairs the large-sample power formula stops meaning anything.
 *
 * Without the floor, a very large observed gap reports "you needed 2 items",
 * which is arithmetically true and indefensible in front of anyone who knows
 * what the formula assumes.
 */
export const MIN_MEANINGFUL_PAIRS = 6;

export interface PowerAssessment {
  /** Raw N* from the formula, before flooring. NaN when delta is zero. */
  requiredRaw: number;
  /** The requirement actually claimed, never below MIN_MEANINGFUL_PAIRS. */
  required: number;
  /** True when the formula asked for fewer pairs than the floor allows. */
  floored: boolean;
  /** Resolution ratio q = n / required. At least 1 means the gap is claimable. */
  q: number;
  claimable: boolean;
  /** Smallest difference this sample size could resolve, given the observed noise. */
  minimumDetectable: number;
}

/**
 * Required paired n for a difference of `delta`, and whether the sample you
 * have can actually resolve it.
 *
 *   N* = ((z_(1-a/2) + z_(1-b)) * sd_D / delta)^2
 *
 * At alpha = 0.05 and power = 0.80 the leading constant is 7.849.
 */
export function assessPower(
  sdDiff: number,
  delta: number,
  n: number,
  alpha = 0.05,
  power = 0.8,
): PowerAssessment {
  const z = probit(1 - alpha / 2) + probit(power);
  const minimumDetectable = n > 0 ? sdDiff * Math.sqrt((z * z) / n) : NaN;
  const absDelta = Math.abs(delta);
  if (!(absDelta > 0) || !(sdDiff >= 0)) {
    return {
      requiredRaw: NaN,
      required: NaN,
      floored: false,
      q: NaN,
      claimable: false,
      minimumDetectable,
    };
  }
  const requiredRaw = Math.pow((z * sdDiff) / absDelta, 2);
  const floored = requiredRaw < MIN_MEANINGFUL_PAIRS;
  const required = Math.max(MIN_MEANINGFUL_PAIRS, requiredRaw);
  const q = required > 0 ? n / required : NaN;
  return { requiredRaw, required, floored, q, claimable: q >= 1, minimumDetectable };
}

/* ------------------------------------------------------------------ *
 * Paired binary
 * ------------------------------------------------------------------ */

export interface McNemarResult {
  n: number;
  n00: number;
  n01: number;
  n10: number;
  n11: number;
  /** Only the discordant pairs carry information. */
  discordant: number;
  /** Exact binomial two-sided p. No chi-square approximation, no continuity fudge. */
  p: number;
  rateA: number;
  rateB: number;
}

/** P(X >= k) for X ~ Binomial(n, 0.5). */
export function binomialUpperTail(k: number, n: number): number {
  if (k <= 0) return 1;
  let s = 0;
  for (let i = k; i <= n; i++) {
    s += Math.exp(
      logGamma(n + 1) - logGamma(i + 1) - logGamma(n - i + 1) + n * Math.log(0.5),
    );
  }
  return Math.min(1, s);
}

/** Exact McNemar test over matched pass/fail outcomes. */
export function mcNemar(a: readonly boolean[], b: readonly boolean[]): McNemarResult {
  let n00 = 0;
  let n01 = 0;
  let n10 = 0;
  let n11 = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    if (x && !y) n10++;
    else if (!x && y) n01++;
    else if (x && y) n11++;
    else n00++;
  }
  const discordant = n01 + n10;
  const p = discordant === 0 ? 1 : Math.min(1, 2 * binomialUpperTail(Math.max(n01, n10), discordant));
  return {
    n,
    n00,
    n01,
    n10,
    n11,
    discordant,
    p,
    rateA: n ? (n10 + n11) / n : NaN,
    rateB: n ? (n01 + n11) / n : NaN,
  };
}

/* ------------------------------------------------------------------ *
 * Agreement
 * ------------------------------------------------------------------ */

export interface Agreement {
  n: number;
  /** Reference said yes, candidate said yes. */
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  /** Raw observed agreement. Always report it beside kappa. */
  po: number;
  /** Cohen's kappa. NaN when chance agreement is total. */
  kappa: number;
  /** Gwet's AC1, which stays stable where kappa collapses on skewed marginals. */
  ac1: number;
  sensitivity: number;
  specificity: number;
  /** Positive means the candidate says yes more often than the reference does. */
  leniency: number;
  /** True when the reference labels never vary, which makes kappa meaningless. */
  degenerate: boolean;
}

/**
 * Two-by-two agreement between a reference labeller (you) and a candidate
 * labeller (the auditor, or a judge model).
 *
 * The matrix is the primary output. Every metric below it derives from those
 * four counts, and none of them can reconstruct what the matrix shows.
 */
export function agreement(
  reference: readonly boolean[],
  candidate: readonly boolean[],
): Agreement {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  const len = Math.min(reference.length, candidate.length);
  for (let i = 0; i < len; i++) {
    const r = reference[i];
    const c = candidate[i];
    if (r && c) tp++;
    else if (!r && c) fp++;
    else if (r && !c) fn++;
    else tn++;
  }
  const n = tp + fp + fn + tn;
  if (n === 0) {
    return {
      n: 0, tp: 0, fp: 0, fn: 0, tn: 0, po: NaN, kappa: NaN, ac1: NaN,
      sensitivity: NaN, specificity: NaN, leniency: NaN, degenerate: true,
    };
  }
  const po = (tp + tn) / n;
  const pe = ((tp + fn) / n) * ((tp + fp) / n) + ((fp + tn) / n) * ((fn + tn) / n);
  const kappa = pe < 1 ? (po - pe) / (1 - pe) : NaN;
  const pi = ((tp + fn) / n + (tp + fp) / n) / 2;
  const peGwet = 2 * pi * (1 - pi);
  const ac1 = peGwet < 1 ? (po - peGwet) / (1 - peGwet) : NaN;
  const positives = tp + fn;
  return {
    n,
    tp,
    fp,
    fn,
    tn,
    po,
    kappa,
    ac1,
    sensitivity: positives ? tp / positives : NaN,
    specificity: fp + tn ? tn / (fp + tn) : NaN,
    leniency: (tp + fp - positives) / n,
    degenerate: positives === 0 || positives === n,
  };
}

export type AgreementBand =
  | 'undefined'
  | 'poor to fair'
  | 'moderate'
  | 'substantial'
  | 'almost perfect';

/**
 * Landis and Koch bands.
 *
 * Below 0.40 on a criterion, the usual cause is an ambiguous criterion rather
 * than a bad labeller. Rewrite the criterion before blaming the model.
 */
export function agreementBand(kappa: number): AgreementBand {
  if (!Number.isFinite(kappa)) return 'undefined';
  if (kappa < 0.4) return 'poor to fair';
  if (kappa < 0.6) return 'moderate';
  if (kappa < 0.75) return 'substantial';
  return 'almost perfect';
}
