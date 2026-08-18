import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { conversionFactor, convert, parseUnit, parseLocaleNumber, roundTo } from '../src/core/units';

describe('units: parsing', () => {
  it('recognises the units a lab actually uses', () => {
    for (const u of ['M', 'mM', 'µM', 'uM', 'μM', 'nM', 'pM', 'ng/µL', 'ng/uL', 'mg/mL', 'µg/mL', 'U/µL', 'U/mL', '%', 'X', '1X', 'µL', 'mL']) {
      expect(parseUnit(u).kind, u).not.toBe('UNKNOWN');
    }
  });
  it('treats Greek mu and micro sign identically', () => {
    expect(parseUnit('μM').canonical).toBe(parseUnit('µM').canonical);
    expect(parseUnit('μg/μL').canonical).toBe(parseUnit('µg/µL').canonical);
  });
  it('rejects garbage rather than guessing', () => {
    expect(parseUnit('banana').kind).toBe('UNKNOWN');
    expect(parseUnit('').kind).toBe('UNKNOWN');
  });
});

describe('units: conversion', () => {
  it('handles the molar ladder', () => {
    expect((convert(1, 'mM', 'µM') as { value: number }).value).toBeCloseTo(1000);
    expect((convert(1, 'µM', 'nM') as { value: number }).value).toBeCloseTo(1000);
    expect((convert(1, 'M', 'nM') as { value: number }).value).toBeCloseTo(1e9);
    expect((convert(2500, 'nM', 'µM') as { value: number }).value).toBeCloseTo(2.5);
  });
  it('handles mass/volume', () => {
    expect((convert(1, 'mg/mL', 'ng/µL') as { value: number }).value).toBeCloseTo(1000);
    expect((convert(1, 'µg/µL', 'mg/mL') as { value: number }).value).toBeCloseTo(1);
    expect((convert(500, 'ng/µL', 'µg/mL') as { value: number }).value).toBeCloseTo(500);
  });
  it('handles enzyme activity', () => {
    expect((convert(5, 'U/µL', 'U/mL') as { value: number }).value).toBeCloseTo(5000);
  });
  it('refuses to convert across kinds without a molecular weight', () => {
    const r = conversionFactor('ng/µL', 'µM');
    expect(r.ok).toBe(false);
    expect((r as { code: string }).code).toBe('MW_REQUIRED');
  });
  it('mass<->molar with MW is correct both ways (dsDNA 1 kb ≈ 660,000 g/mol)', () => {
    const MW = 660_000;
    const toMolar = convert(1000, 'ng/µL', 'nM', MW); // 1000 ng/µL = 1 g/L; /660000 = 1.515e-6 M = 1515 nM
    expect((toMolar as { value: number }).value).toBeCloseTo(1515.15, 1);
    const back = convert((toMolar as { value: number }).value, 'nM', 'ng/µL', MW);
    expect((back as { value: number }).value).toBeCloseTo(1000, 6);
  });
  it('rejects a nonsense cross-kind conversion', () => {
    expect(conversionFactor('%', 'µM').ok).toBe(false);
    expect(conversionFactor('X', 'ng/µL').ok).toBe(false);
  });
});

describe('units: property — conversion is a group action', () => {
  const molar = ['M', 'mM', 'µM', 'nM', 'pM'];
  const mass = ['g/L', 'mg/mL', 'ng/µL', 'µg/mL', 'ng/mL', 'pg/µL'];
  const pick = (arr: string[]) => fc.constantFrom(...arr);
  const positive = fc.double({ min: 1e-9, max: 1e9, noNaN: true, noDefaultInfinity: true });

  it('round-trips: convert(convert(x, a, b), b, a) == x', () => {
    fc.assert(fc.property(positive, pick([...molar]), pick([...molar]), (x, a, b) => {
      const there = convert(x, a, b) as { value: number };
      const back = convert(there.value, b, a) as { value: number };
      expect(back.value / x).toBeCloseTo(1, 9);
    }));
    fc.assert(fc.property(positive, pick(mass), pick(mass), (x, a, b) => {
      const there = convert(x, a, b) as { value: number };
      const back = convert(there.value, b, a) as { value: number };
      expect(back.value / x).toBeCloseTo(1, 9);
    }));
  });

  it('is transitive: f(a→c) == f(a→b) * f(b→c)', () => {
    fc.assert(fc.property(pick(molar), pick(molar), pick(molar), (a, b, c) => {
      const ac = (conversionFactor(a, c) as { factor: number }).factor;
      const ab = (conversionFactor(a, b) as { factor: number }).factor;
      const bc = (conversionFactor(b, c) as { factor: number }).factor;
      expect(ac / (ab * bc)).toBeCloseTo(1, 9);
    }));
  });
});

describe('units: locale-aware number parsing', () => {
  it('does not turn "12,5" into 125 (the previous implementation did)', () => {
    expect(parseLocaleNumber('12,5')).toBe(12.5);
    expect(parseLocaleNumber('12,50')).toBe(12.5);
    expect(parseLocaleNumber('0,85')).toBe(0.85);
  });
  it('still reads US thousands separators', () => {
    expect(parseLocaleNumber('1,234')).toBe(1234);
    expect(parseLocaleNumber('1,234.56')).toBe(1234.56);
    expect(parseLocaleNumber('1,234,567')).toBe(1234567);
  });
  it('reads European thousands+decimal', () => {
    expect(parseLocaleNumber('1.234,56')).toBe(1234.56);
  });
  it('strips units and returns null for non-numbers', () => {
    expect(parseLocaleNumber('45.2 ng/µL')).toBe(45.2);
    expect(parseLocaleNumber('N/A')).toBeNull();
    expect(parseLocaleNumber('')).toBeNull();
  });
});

describe('roundTo', () => {
  it('rounds without drift', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});
