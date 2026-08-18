/**
 * Unit algebra for laboratory concentration and volume calculations.
 *
 * Design principle: this module NEVER guesses. Every conversion either succeeds
 * with a known factor or returns an explicit failure. Silent coercion is what
 * produced wrong volumes in the previous implementation.
 */

export type UnitKind = 'MOLAR' | 'MASS_PER_VOL' | 'ACTIVITY_PER_VOL' | 'PERCENT' | 'FOLD' | 'MASS' | 'VOLUME' | 'UNKNOWN';

export interface ParsedUnit {
  raw: string;
  canonical: string;
  kind: UnitKind;
  /** Multiplier to reach the base unit of this kind (M, g/L, U/µL, %, X, g, µL). */
  toBase: number;
}

export interface ConversionOk {
  ok: true;
  /** Multiply a value in `from` units by this to obtain the value in `to` units. */
  factor: number;
  /** True when the conversion required a molecular weight (mass <-> molar). */
  usedMolecularWeight: boolean;
}

export interface ConversionErr {
  ok: false;
  reason: string;
  code: 'UNKNOWN_UNIT' | 'INCOMPATIBLE_KINDS' | 'MW_REQUIRED' | 'MW_INVALID';
}

export type ConversionResult = ConversionOk | ConversionErr;

/**
 * Canonical unit table. `toBase` is relative to the base unit of each kind.
 *   MOLAR base            = M      (mol/L)
 *   MASS_PER_VOL base     = g/L    (equivalently mg/mL, µg/µL)
 *   ACTIVITY_PER_VOL base = U/µL
 *   PERCENT base          = %
 *   FOLD base             = X
 *   MASS base             = g
 *   VOLUME base           = µL
 */
const UNIT_TABLE: Record<string, { canonical: string; kind: UnitKind; toBase: number }> = {
  // ---- Molar ----
  'm': { canonical: 'M', kind: 'MOLAR', toBase: 1 },
  'mol/l': { canonical: 'M', kind: 'MOLAR', toBase: 1 },
  'molar': { canonical: 'M', kind: 'MOLAR', toBase: 1 },
  'mm': { canonical: 'mM', kind: 'MOLAR', toBase: 1e-3 },
  'mmol/l': { canonical: 'mM', kind: 'MOLAR', toBase: 1e-3 },
  'um': { canonical: 'µM', kind: 'MOLAR', toBase: 1e-6 },
  'µm': { canonical: 'µM', kind: 'MOLAR', toBase: 1e-6 },
  'μm': { canonical: 'µM', kind: 'MOLAR', toBase: 1e-6 },
  'umol/l': { canonical: 'µM', kind: 'MOLAR', toBase: 1e-6 },
  'nm': { canonical: 'nM', kind: 'MOLAR', toBase: 1e-9 },
  'nmol/l': { canonical: 'nM', kind: 'MOLAR', toBase: 1e-9 },
  'pm': { canonical: 'pM', kind: 'MOLAR', toBase: 1e-12 },
  'fm': { canonical: 'fM', kind: 'MOLAR', toBase: 1e-15 },

  // ---- Mass per volume (base g/L) ----
  'g/l': { canonical: 'g/L', kind: 'MASS_PER_VOL', toBase: 1 },
  'mg/ml': { canonical: 'mg/mL', kind: 'MASS_PER_VOL', toBase: 1 },
  'ug/ul': { canonical: 'µg/µL', kind: 'MASS_PER_VOL', toBase: 1 },
  'µg/µl': { canonical: 'µg/µL', kind: 'MASS_PER_VOL', toBase: 1 },
  'μg/μl': { canonical: 'µg/µL', kind: 'MASS_PER_VOL', toBase: 1 },
  'mg/l': { canonical: 'mg/L', kind: 'MASS_PER_VOL', toBase: 1e-3 },
  'ug/ml': { canonical: 'µg/mL', kind: 'MASS_PER_VOL', toBase: 1e-3 },
  'µg/ml': { canonical: 'µg/mL', kind: 'MASS_PER_VOL', toBase: 1e-3 },
  'μg/ml': { canonical: 'µg/mL', kind: 'MASS_PER_VOL', toBase: 1e-3 },
  'ng/ul': { canonical: 'ng/µL', kind: 'MASS_PER_VOL', toBase: 1e-3 },
  'ng/µl': { canonical: 'ng/µL', kind: 'MASS_PER_VOL', toBase: 1e-3 },
  'ng/μl': { canonical: 'ng/µL', kind: 'MASS_PER_VOL', toBase: 1e-3 },
  'ug/l': { canonical: 'µg/L', kind: 'MASS_PER_VOL', toBase: 1e-6 },
  'ng/ml': { canonical: 'ng/mL', kind: 'MASS_PER_VOL', toBase: 1e-6 },
  'pg/ul': { canonical: 'pg/µL', kind: 'MASS_PER_VOL', toBase: 1e-6 },
  'pg/µl': { canonical: 'pg/µL', kind: 'MASS_PER_VOL', toBase: 1e-6 },
  'pg/ml': { canonical: 'pg/mL', kind: 'MASS_PER_VOL', toBase: 1e-9 },

  // ---- Enzyme activity per volume (base U/µL) ----
  'u/ul': { canonical: 'U/µL', kind: 'ACTIVITY_PER_VOL', toBase: 1 },
  'u/µl': { canonical: 'U/µL', kind: 'ACTIVITY_PER_VOL', toBase: 1 },
  'u/μl': { canonical: 'U/µL', kind: 'ACTIVITY_PER_VOL', toBase: 1 },
  'units/ul': { canonical: 'U/µL', kind: 'ACTIVITY_PER_VOL', toBase: 1 },
  'u/ml': { canonical: 'U/mL', kind: 'ACTIVITY_PER_VOL', toBase: 1e-3 },
  'units/ml': { canonical: 'U/mL', kind: 'ACTIVITY_PER_VOL', toBase: 1e-3 },
  'mu/ul': { canonical: 'mU/µL', kind: 'ACTIVITY_PER_VOL', toBase: 1e-3 },

  // ---- Percent ----
  '%': { canonical: '%', kind: 'PERCENT', toBase: 1 },
  'percent': { canonical: '%', kind: 'PERCENT', toBase: 1 },
  '% (v/v)': { canonical: '% (v/v)', kind: 'PERCENT', toBase: 1 },
  '% (w/v)': { canonical: '% (w/v)', kind: 'PERCENT', toBase: 1 },
  'v/v%': { canonical: '% (v/v)', kind: 'PERCENT', toBase: 1 },
  'w/v%': { canonical: '% (w/v)', kind: 'PERCENT', toBase: 1 },

  // ---- Fold / stock multiple ----
  'x': { canonical: 'X', kind: 'FOLD', toBase: 1 },
  'fold': { canonical: 'X', kind: 'FOLD', toBase: 1 },

  // ---- Absolute mass (base g) ----
  'g': { canonical: 'g', kind: 'MASS', toBase: 1 },
  'mg': { canonical: 'mg', kind: 'MASS', toBase: 1e-3 },
  'ug': { canonical: 'µg', kind: 'MASS', toBase: 1e-6 },
  'µg': { canonical: 'µg', kind: 'MASS', toBase: 1e-6 },
  'μg': { canonical: 'µg', kind: 'MASS', toBase: 1e-6 },
  'ng': { canonical: 'ng', kind: 'MASS', toBase: 1e-9 },
  'pg': { canonical: 'pg', kind: 'MASS', toBase: 1e-12 },

  // ---- Volume (base µL) ----
  'l': { canonical: 'L', kind: 'VOLUME', toBase: 1e6 },
  'ml': { canonical: 'mL', kind: 'VOLUME', toBase: 1e3 },
  'ul': { canonical: 'µL', kind: 'VOLUME', toBase: 1 },
  'µl': { canonical: 'µL', kind: 'VOLUME', toBase: 1 },
  'μl': { canonical: 'µL', kind: 'VOLUME', toBase: 1 },
  'nl': { canonical: 'nL', kind: 'VOLUME', toBase: 1e-3 },
  'pl': { canonical: 'pL', kind: 'VOLUME', toBase: 1e-6 },
};

/** Normalises the many ways a unit string arrives from an LLM or a human. */
function normaliseKey(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/μ/g, 'µ')          // Greek mu -> micro sign
    .replace(/^1?x$/, 'x')       // "1x" -> "x"
    .replace(/[()]/g, (m) => m); // keep parens for %(v/v)
}

export function parseUnit(raw: string): ParsedUnit {
  const key = normaliseKey(raw);
  // Try direct hit, then a micro-sign-insensitive hit.
  const entry = UNIT_TABLE[key] ?? UNIT_TABLE[key.replace(/µ/g, 'u')];
  if (!entry) {
    return { raw: String(raw ?? ''), canonical: String(raw ?? ''), kind: 'UNKNOWN', toBase: NaN };
  }
  return { raw: String(raw ?? ''), canonical: entry.canonical, kind: entry.kind, toBase: entry.toBase };
}

export function isKnownUnit(raw: string): boolean {
  return parseUnit(raw).kind !== 'UNKNOWN';
}

/**
 * Returns the factor that converts a value expressed in `fromUnit` into `toUnit`.
 *
 * Mass/volume <-> molar conversion is supported only when a positive molecular
 * weight (g/mol) is supplied. Everything else must share a unit kind.
 */
export function conversionFactor(fromUnit: string, toUnit: string, molecularWeight?: number): ConversionResult {
  const from = parseUnit(fromUnit);
  const to = parseUnit(toUnit);

  if (from.kind === 'UNKNOWN') {
    return { ok: false, code: 'UNKNOWN_UNIT', reason: `Unrecognised unit "${fromUnit}".` };
  }
  if (to.kind === 'UNKNOWN') {
    return { ok: false, code: 'UNKNOWN_UNIT', reason: `Unrecognised unit "${toUnit}".` };
  }

  // Same kind: pure scaling through the shared base unit.
  if (from.kind === to.kind) {
    return { ok: true, factor: from.toBase / to.toBase, usedMolecularWeight: false };
  }

  // Cross-kind: only mass/volume <-> molar is chemically meaningful, and only with MW.
  const isMassMolarPair =
    (from.kind === 'MASS_PER_VOL' && to.kind === 'MOLAR') ||
    (from.kind === 'MOLAR' && to.kind === 'MASS_PER_VOL');

  if (!isMassMolarPair) {
    return {
      ok: false,
      code: 'INCOMPATIBLE_KINDS',
      reason: `Cannot convert ${from.kind} ("${fromUnit}") to ${to.kind} ("${toUnit}") — these measure different quantities.`,
    };
  }

  if (molecularWeight === undefined || molecularWeight === null) {
    return {
      ok: false,
      code: 'MW_REQUIRED',
      reason: `Converting between "${fromUnit}" and "${toUnit}" requires a molecular weight (g/mol).`,
    };
  }
  if (!Number.isFinite(molecularWeight) || molecularWeight <= 0) {
    return {
      ok: false,
      code: 'MW_INVALID',
      reason: `Molecular weight must be a positive number (received ${molecularWeight}).`,
    };
  }

  // g/L / (g/mol) = mol/L
  if (from.kind === 'MASS_PER_VOL') {
    const inGramsPerLitre = from.toBase;
    const molarBase = inGramsPerLitre / molecularWeight; // value in M
    return { ok: true, factor: molarBase / to.toBase, usedMolecularWeight: true };
  }

  // mol/L * (g/mol) = g/L
  const inMolar = from.toBase;
  const massBase = inMolar * molecularWeight; // value in g/L
  return { ok: true, factor: massBase / to.toBase, usedMolecularWeight: true };
}

/** Convenience wrapper: convert a numeric value between units. */
export function convert(
  value: number,
  fromUnit: string,
  toUnit: string,
  molecularWeight?: number
): { ok: true; value: number; usedMolecularWeight: boolean } | ConversionErr {
  const f = conversionFactor(fromUnit, toUnit, molecularWeight);
  if (f.ok === false) {
    return f as ConversionErr;
  }
  const okResult = f as ConversionOk;
  return { ok: true, value: value * okResult.factor, usedMolecularWeight: okResult.usedMolecularWeight };
}

/** Volume helper used throughout the reaction math (always returns µL). */
export function toMicrolitres(value: number, unit: string): number | null {
  const p = parseUnit(unit);
  if (p.kind !== 'VOLUME') return null;
  return value * p.toBase;
}

/**
 * Locale-aware numeric parser for pasted instrument output.
 *
 * Handles "1,234.56" (en) and "1.234,56" / "12,5" (de/fr). The previous
 * implementation stripped all non-digits, silently turning "12,5" into 125.
 */
export function parseLocaleNumber(raw: string | number): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw === null || raw === undefined) return null;

  let s = String(raw).trim();
  if (!s) return null;

  // Strip currency symbols, unit suffixes and whitespace, keep digits/sep/sign/exponent.
  s = s.replace(/[^0-9eE+\-.,]/g, '');
  if (!s || !/[0-9]/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: the rightmost is the decimal separator.
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    const commaCount = (s.match(/,/g) || []).length;
    // "1,234" or "1,234,567" -> thousands. "12,5" / "12,50" -> decimal.
    if (commaCount === 1 && after !== 3) {
      s = s.replace(',', '.');
    } else if (commaCount === 1 && after === 3 && /^\d{1,3},\d{3}$/.test(s)) {
      s = s.replace(',', '');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Round to a fixed number of decimals without floating-point drift artefacts. */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const f = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON * Math.sign(value) * Math.abs(value)) * f) / f;
}
