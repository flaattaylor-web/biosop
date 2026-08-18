import { describe, it, expect } from 'vitest';
import { calculateReaction, calculateMasterMix } from '../src/core/reactionMath';
import { buildWorklists, generateWells } from '../src/core/worklists';

const setup = () => {
  const calc = calculateReaction([
    { id: 'w', name: 'Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
    { id: 'mm', name: '2X Mix', stockConc: 2, stockUnit: 'X', finalConc: 1, finalUnit: 'X' },
    { id: 't', name: 'Template DNA', stockConc: 10, stockUnit: 'ng/µL', finalConc: 1, finalUnit: 'ng/µL' },
  ], { targetVolumeMicroliters: 20 });
  const mm = calculateMasterMix(calc, { sampleCount: 6, replicates: 1, posControls: 1, negControls: 1, overflowPercent: 10 });
  return { calc, mm };
};

describe('worklists', () => {
  it('generateWells is column-major and bounded', () => {
    expect(generateWells(8, 12, 10).slice(0, 9)).toEqual(['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'A2']);
    expect(generateWells(8, 12, 200)).toHaveLength(96);
  });
  it('all formats use the same volumes as the calculation engine', () => {
    const { calc, mm } = setup();
    const wl = buildWorklists(calc, mm, { rows: 8, cols: 12, reactionCount: 8 }, { protocolTitle: 'T' });
    expect(wl.summary.reactionCount).toBe(8);
    expect(wl.summary.destinationWells).toHaveLength(8);
    // master mix per rxn = 18 → appears in Hamilton rows and the Opentrons constant
    expect(wl.hamiltonCsv).toMatch(/reaction_plate,A1,18\.00/);
    expect(wl.opentronsPy).toMatch(/MIX_PER_RXN_UL = 18/);
    expect(wl.opentronsPy).toMatch(/N_REACTIONS = 8/);
    // template is per-tube: 2 µL to each well, and NOT in the mix component list
    expect(wl.opentronsPy).toMatch(/PER_TUBE = \[\s*\{"name": "Template DNA", "tube": "\w+", "vol_ul": 2\}/);
    expect(wl.opentronsPy.split('MIX_COMPONENTS = [')[1].split(']')[0]).not.toMatch(/Template/);
    // Echo picklist in nL, 2.5 nL increments
    expect(wl.echoCsv).toMatch(/,A1,2000\n/);
    // Tecan aspirate/dispense pairs
    expect(wl.tecanGwl).toMatch(/^A;reagent_tubes;;;\d+;;18\.0/m);
    expect(wl.tecanGwl).toMatch(/^D;reaction_plate;;;1;;18\.0/m);
  });
  it('warns when the plate is too small', () => {
    const { calc, mm } = setup();
    const wl = buildWorklists(calc, mm, { rows: 2, cols: 2, reactionCount: 8 }, { protocolTitle: 'T' });
    expect(wl.summary.warnings.some((w) => /only 4 are mapped/.test(w))).toBe(true);
  });
});
