import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateReaction, calculateMasterMix, computeComponentVolume, totalReactions, inferRole } from '../src/core/reactionMath';
import { convert } from '../src/core/units';

describe('computeComponentVolume', () => {
  it('10 µM primer → 0.2 µM in 50 µL = 1.0 µL', () => {
    const r = computeComponentVolume({ id: 'p', name: 'Primer', stockConc: 10, stockUnit: 'µM', finalConc: 0.2, finalUnit: 'µM' }, 50);
    expect(r.volume).toBeCloseTo(1.0);
  });
  it('handles cross-prefix units: 10 mM dNTP → 200 µM in 25 µL = 0.5 µL', () => {
    const r = computeComponentVolume({ id: 'd', name: 'dNTPs', stockConc: 10, stockUnit: 'mM', finalConc: 200, finalUnit: 'µM' }, 25);
    expect(r.volume).toBeCloseTo(0.5);
  });
  it('2X master mix → 1X in 20 µL = 10 µL', () => {
    const r = computeComponentVolume({ id: 'm', name: 'Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X' }, 20);
    expect(r.volume).toBeCloseTo(10);
  });
  it('enzyme units: 5 U/µL → 0.05 U/µL in 50 µL = 0.5 µL', () => {
    const r = computeComponentVolume({ id: 'e', name: 'Taq', stockConc: 5, stockUnit: 'U/µL', finalConc: 0.05, finalUnit: 'U/µL' }, 50);
    expect(r.volume).toBeCloseTo(0.5);
  });
  it('refuses impossible dilutions (final > stock)', () => {
    const r = computeComponentVolume({ id: 'x', name: 'X', stockConc: 1, stockUnit: 'µM', finalConc: 5, finalUnit: 'µM' }, 50);
    expect(r.volume).toBeNull();
    expect(r.reason).toMatch(/exceeds the stock/);
  });
  it('refuses incompatible units and says why', () => {
    const r = computeComponentVolume({ id: 'x', name: 'X', stockConc: 100, stockUnit: 'ng/µL', finalConc: 1, finalUnit: 'µM' }, 50);
    expect(r.volume).toBeNull();
    expect(r.reason).toMatch(/molecular weight/i);
  });
  it('uses molecular weight when supplied', () => {
    // 100 ng/µL of a 660,000 g/mol fragment = 151.5 nM; want 1 nM in 20 µL → 0.132 µL
    const r = computeComponentVolume({ id: 'x', name: 'X', stockConc: 100, stockUnit: 'ng/µL', finalConc: 1, finalUnit: 'nM', molecularWeight: 660_000 }, 20);
    expect(r.volume).toBeCloseTo(0.132, 3);
  });
});

describe('property: C1·V1 = C2·V2 holds for every computed volume', () => {
  const units = ['M', 'mM', 'µM', 'nM'];
  it('for any stock > final in compatible units, C1*V1 == C2*Vt', () => {
    fc.assert(fc.property(
      fc.double({ min: 1e-3, max: 1e3, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 1e-3, max: 1, noNaN: true, noDefaultInfinity: true }),
      fc.constantFrom(...units), fc.constantFrom(...units),
      fc.double({ min: 5, max: 200, noNaN: true, noDefaultInfinity: true }),
      (stock, ratio, su, fu, vt) => {
        // final = stock * ratio expressed in fu
        const stockInFu = (convert(stock, su, fu) as { value: number }).value;
        const final = stockInFu * ratio;
        const r = computeComponentVolume({ id: 'c', name: 'C', stockConc: stock, stockUnit: su, finalConc: final, finalUnit: fu }, vt);
        expect(r.volume).not.toBeNull();
        const v1 = r.volume as number;
        // C1*V1 (in fu units) must equal C2*Vt
        expect((stockInFu * v1) / (final * vt)).toBeCloseTo(1, 8);
      }
    ), { numRuns: 500 });
  });
});

describe('calculateReaction', () => {
  const qpcr = () => [
    { id: 'w', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 6 },
    { id: 'mm', name: '2X SYBR Master Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 10 },
    { id: 'f', name: 'Forward Primer', stockConc: 10, stockUnit: 'µM', finalConc: 400, finalUnit: 'nM', volPerRxnMicroliters: 0.8 },
    { id: 'r', name: 'Reverse Primer', stockConc: 10, stockUnit: 'µM', finalConc: 400, finalUnit: 'nM', volPerRxnMicroliters: 0.8 },
    { id: 't', name: 'Template cDNA', stockConc: 5, stockUnit: 'ng/µL', finalConc: 0.5, finalUnit: 'ng/µL', volPerRxnMicroliters: 2 },
  ];

  it('balances a correct reaction with no findings', () => {
    const c = calculateReaction(qpcr(), { targetVolumeMicroliters: 20 });
    expect(c.volumeBalanced).toBe(true);
    expect(c.actualVolumeMicroliters).toBe(20);
    expect(c.findings.filter((f) => f.severity === 'ERROR')).toHaveLength(0);
    expect(c.components.find((x) => x.id === 'w')!.volPerRxnMicroliters).toBeCloseTo(6.4);
  });

  it('flags a proposed volume that violates C1V1=C2V2 instead of silently accepting it', () => {
    const inputs = qpcr();
    inputs[2].volPerRxnMicroliters = 1.0; // should be 0.8 → 25% high
    const c = calculateReaction(inputs, { targetVolumeMicroliters: 20 });
    const f = c.findings.find((x) => x.code === 'STOICHIOMETRY_DEVIATION' && x.componentId === 'f');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('ERROR');
    expect(c.components.find((x) => x.id === 'f')!.volPerRxnMicroliters).toBeCloseTo(0.8);
    expect(c.components.find((x) => x.id === 'f')!.provenance).toBe('COMPUTED');
  });

  it('flags a 10% deviation as WARNING (previously anything under 15% was silently accepted)', () => {
    const inputs = qpcr();
    inputs[2].volPerRxnMicroliters = 0.86; // 7.5% high
    const c = calculateReaction(inputs, { targetVolumeMicroliters: 20 });
    const f = c.findings.find((x) => x.code === 'STOICHIOMETRY_DEVIATION' && x.componentId === 'f');
    expect(f?.severity).toBe('WARNING');
  });

  it('reports overflow as an ERROR and does NOT redefine the reaction volume', () => {
    const inputs = qpcr();
    inputs[1].volPerRxnMicroliters = 30; // impossible for a 20 µL rxn — but 2X→1X computes to 10, so push via final conc
    inputs[1].finalConc = 1.5; inputs[1].stockConc = 2; // 15 µL
    inputs[3].finalConc = 4; inputs[3].finalUnit = 'µM'; // 8 µL
    const c = calculateReaction(inputs, { targetVolumeMicroliters: 20 });
    expect(c.targetVolumeMicroliters).toBe(20);
    expect(c.findings.some((f) => f.code === 'VOLUME_OVERFLOW' && f.severity === 'ERROR')).toBe(true);
    expect(c.volumeBalanced).toBe(false);
  });

  it('warns below the pipettable floor and proposes a concrete intermediate dilution', () => {
    const c = calculateReaction([
      { id: 'e', name: 'Enzyme', stockConc: 20, stockUnit: 'U/µL', finalConc: 0.02, finalUnit: 'U/µL' },
      { id: 'w', name: 'Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
    ], { targetVolumeMicroliters: 20, minPipettableMicroliters: 0.5 });
    const e = c.components.find((x) => x.id === 'e')!;
    expect(e.volPerRxnMicroliters).toBeCloseTo(0.02);
    expect(e.belowMinPipettable).toBe(true);
    expect(e.intermediateDilution).not.toBeNull();
    expect(e.intermediateDilution!.foldDilution).toBe(100);
    expect(e.intermediateDilution!.volumeFromDilutedStockMicroliters).toBeCloseTo(2);
  });

  it('never invents a volume for a component it cannot compute — it flags it', () => {
    const c = calculateReaction([
      { id: 'x', name: 'Mystery', stockConc: 5, stockUnit: 'blorp', finalConc: 1, finalUnit: 'blorp' },
    ], { targetVolumeMicroliters: 20 });
    expect(c.findings.some((f) => f.code === 'NO_VOLUME' || f.code === 'UNVERIFIABLE_COMPONENT')).toBe(true);
    expect(c.fullyVerifiable).toBe(false);
  });

  it('property: for any balanced input set the components always sum to the target', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        stock: fc.double({ min: 2, max: 100, noNaN: true, noDefaultInfinity: true }),
        ratio: fc.double({ min: 0.001, max: 0.05, noNaN: true, noDefaultInfinity: true }),
      }), { minLength: 1, maxLength: 8 }),
      fc.double({ min: 10, max: 100, noNaN: true, noDefaultInfinity: true }),
      (comps, vt) => {
        const inputs = comps.map((c, i) => ({ id: `c${i}`, name: `Reagent ${i}`, stockConc: c.stock, stockUnit: 'µM', finalConc: c.stock * c.ratio, finalUnit: 'µM' }));
        inputs.push({ id: 'w', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X' });
        const r = calculateReaction(inputs, { targetVolumeMicroliters: vt });
        expect(Math.abs(r.actualVolumeMicroliters - vt)).toBeLessThan(0.02);
        expect(r.findings.filter((f) => f.code === 'VOLUME_OVERFLOW')).toHaveLength(0);
      }
    ), { numRuns: 300 });
  });
});

describe('inferRole', () => {
  it('classifies the usual suspects', () => {
    expect(inferRole('Nuclease-Free Water').role).toBe('DILUENT');
    expect(inferRole('Template DNA').role).toBe('PER_SAMPLE');
    expect(inferRole('gDNA (10 ng/µL)').role).toBe('PER_SAMPLE');
    expect(inferRole('2X Q5 Master Mix').role).toBe('MASTER_MIX');
    expect(inferRole('Forward Primer').role).toBe('MASTER_MIX');
  });
  it('flags every inference as inferred so the UI can ask', () => {
    expect(inferRole('Anything').inferred).toBe(true);
  });
});

describe('calculateMasterMix', () => {
  it('excludes PER_SAMPLE components from the shared mix (the old export scaled them in)', () => {
    const calc = calculateReaction([
      { id: 'mm', name: '2X Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
      { id: 't', name: 'Template', stockConc: 10, stockUnit: 'ng/µL', finalConc: 1, finalUnit: 'ng/µL' },
      { id: 'w', name: 'Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
    ], { targetVolumeMicroliters: 20 });
    const mm = calculateMasterMix(calc, { sampleCount: 10, replicates: 1, posControls: 0, negControls: 0, overflowPercent: 10 });
    const t = mm.lines.find((l) => l.id === 't')!;
    expect(t.includedInMix).toBe(false);
    expect(t.volForRunMicroliters).toBe(0);
    expect(mm.masterMixVolumePerReaction).toBeCloseTo(18);
    expect(mm.perSampleVolumePerReaction).toBeCloseTo(2);
    expect(mm.masterMixTotalVolume).toBeCloseTo(18 * 11);
  });
  it('honours an explicit 0% overflow (Word export previously coerced 0 → 10)', () => {
    const calc = calculateReaction([{ id: 'a', name: 'A', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X' }], { targetVolumeMicroliters: 10 });
    const mm = calculateMasterMix(calc, { sampleCount: 4, replicates: 1, posControls: 0, negControls: 0, overflowPercent: 0 });
    expect(mm.overflowPercent).toBe(0);
    expect(mm.effectiveReactions).toBe(4);
  });
  it('totalReactions is the single source of truth', () => {
    expect(totalReactions({ sampleCount: 20, replicates: 3, posControls: 2, negControls: 2 })).toBe(64);
    expect(totalReactions({ sampleCount: 0, replicates: 1, posControls: 0, negControls: 0 })).toBe(0);
  });
});
