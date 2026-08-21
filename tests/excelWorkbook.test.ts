import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { generateLiveExcelWorkbook } from '../src/server/excelLive';
import type { ReactionSheet, SopDocument } from '../src/types';

const sheet = (): ReactionSheet => ({
  id: 'rs-1', title: 'Test reaction', assayType: 'PCR',
  reactionVolumeMicroliters: 50, defaultNumReactions: 8, defaultOverflowPercent: 10,
  components: [
    { id: 'w', name: 'Nuclease-Free Water', stockConc: 1, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 41, pipettingOrder: 1 },
    { id: 'b', name: '10X Buffer', stockConc: 10, stockUnit: 'X', finalConc: 1, finalUnit: 'X', volPerRxnMicroliters: 5, pipettingOrder: 2 },
    { id: 'p', name: 'Forward Primer', stockConc: 10, stockUnit: 'uM', finalConc: 0.2, finalUnit: 'uM', volPerRxnMicroliters: 1, pipettingOrder: 3 },
    { id: 't', name: 'Template DNA', stockConc: 25, stockUnit: 'ng/uL', finalConc: 1, finalUnit: 'ng/uL', volPerRxnMicroliters: 2, pipettingOrder: 4 },
  ],
});

const sop = (): SopDocument => ({
  id: 's1', documentId: 'SOP-TEST-001', version: '3.0', effectiveDate: '2026-01-01',
  title: 'Test Method', category: 'Molecular Biology', author: 'A', scope: 'S', biosafetyLevel: 'BSL-1',
  hazards: [{ type: 'CHEMICAL', label: 'Ethidium bromide', description: 'Mutagen.' }],
  ppeRequirements: [{ item: 'Nitrile gloves', required: true }],
  equipmentRequired: ['Thermocycler'], reagentsRequired: ['Taq'],
  steps: [
    { stepNumber: 1, title: 'Thaw', instruction: 'Thaw reagents on ice for 10 min.' },
    { stepNumber: 2, title: 'Assemble', instruction: 'Assemble a 50 uL reaction.' },
    { stepNumber: 3, title: 'Cycle', instruction: 'Run 35 cycles.' },
  ],
  qualityControl: ['Include a no-template control.'],
  troubleshooting: [{ issue: 'No product', cause: 'Bad primers', solution: 'Re-order primers.' }],
  references: [], revisionHistory: [{ version: '3.0', date: '2026-01-01', changes: 'init', author: 'A' }],
});

async function open(bytes: Uint8Array) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  return wb;
}

describe('bench workbook', () => {
  it('carries the SOP through: Protocol sheet, document ID and QC criteria', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet(), sop()));
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toContain('Protocol');

    const protocol = wb.getWorksheet('Protocol')!;
    const text = JSON.stringify(protocol.getSheetValues());
    expect(text).toContain('Thaw');
    expect(text).toContain('Ethidium bromide');
    expect(text).toContain('no-template control');

    // The Run Record must identify the document, not fall back to the reaction sheet id.
    const run = JSON.stringify(wb.getWorksheet('Run Record')!.getSheetValues());
    expect(run).toContain('SOP-TEST-001');
    expect(run).toContain('Test Method');
  });

  it('degrades honestly when no SOP is supplied rather than inventing one', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet()));
    expect(wb.worksheets.map((w) => w.name)).not.toContain('Protocol');
  });

  it('writes a live C1V1 formula, not a baked number', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet(), sop()));
    const mm = wb.getWorksheet('Master Mix')!;
    const primerRow = [...Array(20).keys()].map((i) => i + 5).find((r) => String(mm.getCell(r, 2).value).includes('Forward Primer'))!;
    const vol = mm.getCell(primerRow, 9).value as { formula?: string };
    expect(vol.formula).toMatch(/RXN_VOL/);
    expect(vol.formula).toMatch(/ROUND\(F\d+\*RXN_VOL\/\(D\d+\*H\d+\),2\)/);
  });

  it('balances the diluent without referencing its own cell', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet(), sop()));
    const mm = wb.getWorksheet('Master Mix')!;
    const waterRow = [...Array(20).keys()].map((i) => i + 5).find((r) => String(mm.getCell(r, 2).value).includes('Water'))!;
    const f = (mm.getCell(waterRow, 9).value as { formula?: string }).formula || '';
    expect(f).toMatch(/RXN_VOL-/);
    expect(f).not.toMatch(new RegExp(`I${waterRow}\\b`)); // no self-reference, no circular chain
  });

  it('defines every name the sheets reference', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet(), sop()));
    const dn = JSON.stringify((wb as unknown as { definedNames: { model: unknown } }).definedNames.model);
    for (const n of ['RXN_VOL', 'N_RXN', 'N_EFF', 'OVERFLOW', 'MIN_PIP']) expect(dn).toContain(n);
  });

  it('counts per-tube components in the run cost, which the mix column would report as zero', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet(), sop()));
    const cost = wb.getWorksheet('Reagents & Cost')!;
    const tRow = [...Array(20).keys()].map((i) => i + 5).find((r) => String(cost.getCell(r, 1).value).includes('Template'))!;
    const f = (cost.getCell(tRow, 3).value as { formula?: string }).formula || '';
    expect(f).toMatch(/N_EFF/);
    expect(f).not.toMatch(/!K\d+$/); // K is the master-mix column and is 0 for per-tube items
  });
});
