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

  /**
   * Excel refuses a workbook whose XML violates the schema and "repairs" it by silently dropping
   * content; LibreOffice and most readers tolerate the same file, so a defect here survives review
   * and only shows up on a real user's machine. These assertions cover the violations this generator
   * has actually produced.
   */
  it('emits structurally valid XML: no overlapping validation or merge ranges', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet(), sop()));

    const boxes = (ref: string) => {
      const [a, b] = ref.split(':');
      const cell = (r: string) => {
        const m = /([A-Z]+)(\d+)/.exec(r)!;
        let col = 0;
        for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
        return { col, row: Number(m[2]) };
      };
      const p1 = cell(a); const p2 = cell(b || a);
      return { c1: Math.min(p1.col, p2.col), c2: Math.max(p1.col, p2.col), r1: Math.min(p1.row, p2.row), r2: Math.max(p1.row, p2.row) };
    };
    const overlaps = (x: ReturnType<typeof boxes>, y: ReturnType<typeof boxes>) =>
      !(x.c2 < y.c1 || y.c2 < x.c1 || x.r2 < y.r1 || y.r2 < x.r1);

    for (const ws of wb.worksheets) {
      // Data validation ranges must be disjoint. ExcelJS coalesces per-cell rules into overlapping
      // sqrefs, which is invalid OOXML and makes Excel repair the file.
      const dv = (ws as unknown as { dataValidations: { model: Record<string, unknown> } }).dataValidations.model || {};
      const refs = Object.keys(dv);
      for (let i = 0; i < refs.length; i++) {
        for (let j = i + 1; j < refs.length; j++) {
          expect(
            overlaps(boxes(refs[i]), boxes(refs[j])),
            `${ws.name}: validation ranges ${refs[i]} and ${refs[j]} overlap`,
          ).toBe(false);
        }
      }

      const merges: string[] = ((ws as unknown as { model: { merges?: string[] } }).model.merges) || [];
      for (let i = 0; i < merges.length; i++) {
        for (let j = i + 1; j < merges.length; j++) {
          expect(
            overlaps(boxes(merges[i]), boxes(merges[j])),
            `${ws.name}: merged ranges ${merges[i]} and ${merges[j]} overlap`,
          ).toBe(false);
        }
      }
    }
  });

  it('never writes an empty or unbalanced formula', async () => {
    const wb = await open(await generateLiveExcelWorkbook(sheet(), sop()));
    let checked = 0;
    for (const ws of wb.worksheets) {
      ws.eachRow((r) => r.eachCell((c) => {
        const v = c.value as { formula?: string } | null;
        if (v && typeof v === 'object' && 'formula' in v && typeof v.formula === 'string') {
          checked++;
          expect(v.formula.trim(), `${ws.name}!${c.address} has an empty formula`).not.toBe('');
          const opens = (v.formula.match(/\(/g) || []).length;
          const closes = (v.formula.match(/\)/g) || []).length;
          expect(opens, `${ws.name}!${c.address} unbalanced: ${v.formula}`).toBe(closes);
        }
      }));
    }
    expect(checked).toBeGreaterThan(10);
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
