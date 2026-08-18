/**
 * Live-formula Excel export.
 *
 * The previous workbook was a printout: every "Vol / N Rxns" cell was a
 * hardcoded number, so changing the reaction count at the bench recalculated
 * nothing. This workbook has two input cells — reaction count and overflow — as
 * defined names, and every run volume is a formula that references them.
 *
 * Per-sample components (template etc.) are NOT scaled into the master mix.
 */
import ExcelJS from 'exceljs';
import type { ReactionSheet, SopDocument } from '../types';
import { calculateReaction, calculateMasterMix, totalReactions, ComponentInput } from '../core/reactionMath';

const NAVY = 'FF0F172A';
const BLUE = 'FF0284C7';
const INPUT_FILL = 'FFFFF7CC'; // pale yellow = "you may edit this"
const CALC_FILL = 'FFF1F5F9';
const WHITE = 'FFFFFFFF';

function header(ws: ExcelJS.Worksheet, row: number, labels: string[]) {
  const r = ws.getRow(row);
  labels.forEach((l, i) => {
    const c = r.getCell(i + 1);
    c.value = l;
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  r.height = 30;
}

function title(ws: ExcelJS.Worksheet, text: string, span: string) {
  ws.mergeCells(span);
  const c = ws.getCell(span.split(':')[0]);
  c.value = text;
  c.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  c.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;
}

function toInputs(sheet: ReactionSheet): ComponentInput[] {
  return (sheet.components || []).map((c) => ({
    id: c.id,
    name: c.name,
    stockConc: c.stockConc,
    stockUnit: c.stockUnit,
    finalConc: c.finalConc,
    finalUnit: c.finalUnit,
    volPerRxnMicroliters: c.volPerRxnMicroliters,
    pipettingOrder: c.pipettingOrder,
    role: (c as { role?: ComponentInput['role'] }).role,
    molecularWeight: (c as { molecularWeight?: number }).molecularWeight,
    notes: c.notes,
  }));
}

export async function generateLiveExcelWorkbook(reactionSheet: ReactionSheet, sop?: SopDocument): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BioSOP Generator';
  wb.created = new Date();

  const targetVol = reactionSheet.reactionVolumeMicroliters || 50;
  const calc = calculateReaction(toInputs(reactionSheet), { targetVolumeMicroliters: targetVol });
  const design = {
    sampleCount: reactionSheet.sampleCount ?? reactionSheet.defaultNumReactions ?? 8,
    replicates: reactionSheet.replicates ?? 1,
    posControls: reactionSheet.posControls ?? 0,
    negControls: reactionSheet.negControls ?? 0,
    overflowPercent: reactionSheet.defaultOverflowPercent ?? 10,
  };
  const nRxn = totalReactions(design) || reactionSheet.defaultNumReactions || 8;
  const mm = calculateMasterMix(calc, design);

  // =====================================================================
  // Sheet 1 — Master Mix (live)
  // =====================================================================
  const ws = wb.addWorksheet('Master Mix', { views: [{ showGridLines: true, state: 'frozen', ySplit: 9 }] });
  title(ws, `MASTER MIX — ${(reactionSheet.title || 'Reaction').toUpperCase()}`, 'A1:I1');

  ws.getCell('A3').value = 'Assay';
  ws.getCell('B3').value = reactionSheet.assayType || '';
  ws.getCell('A4').value = 'Reaction volume (µL)';
  ws.getCell('B4').value = targetVol;
  ws.getCell('A5').value = 'Number of reactions →';
  ws.getCell('B5').value = nRxn;
  ws.getCell('A6').value = 'Overflow (fraction) →';
  ws.getCell('B6').value = design.overflowPercent / 100;
  ws.getCell('B6').numFmt = '0%';
  ws.getCell('A7').value = 'Effective reactions';
  ws.getCell('B7').value = { formula: 'ROUND(N_RXN*(1+OVERFLOW),2)', result: mm.effectiveReactions };

  ['A3', 'A4', 'A5', 'A6', 'A7'].forEach((a) => (ws.getCell(a).font = { name: 'Arial', size: 10, bold: true }));
  ['B5', 'B6'].forEach((a) => {
    ws.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } };
    ws.getCell(a).border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };
    ws.getCell(a).protection = { locked: false };
  });
  ws.getCell('C5').value = '← edit these two yellow cells; everything below recalculates';
  ws.getCell('C5').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };

  wb.definedNames.add("'Master Mix'!$B$4", 'RXN_VOL');
  wb.definedNames.add("'Master Mix'!$B$5", 'N_RXN');
  wb.definedNames.add("'Master Mix'!$B$6", 'OVERFLOW');
  wb.definedNames.add("'Master Mix'!$B$7", 'N_EFF');

  const HDR = 9;
  header(ws, HDR, ['Order', 'Component', 'Stock', 'Final', 'µL / rxn', 'In mix?', 'µL for run', 'Source of volume', 'Notes']);
  ws.columns = [
    { width: 7 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 11 }, { width: 9 }, { width: 13 }, { width: 44 }, { width: 40 },
  ];

  const ordered = [...calc.components].sort((a, b) => {
    const pa = reactionSheet.components.find((c) => c.id === a.id)?.pipettingOrder ?? 99;
    const pb = reactionSheet.components.find((c) => c.id === b.id)?.pipettingOrder ?? 99;
    return pa - pb;
  });

  let row = HDR + 1;
  const firstDataRow = row;
  for (const c of ordered) {
    const src = reactionSheet.components.find((x) => x.id === c.id);
    const inMix = c.role !== 'PER_SAMPLE';
    ws.getCell(row, 1).value = src?.pipettingOrder ?? '';
    ws.getCell(row, 2).value = c.name;
    ws.getCell(row, 3).value = src ? `${src.stockConc} ${src.stockUnit}` : '';
    ws.getCell(row, 4).value = src ? `${src.finalConc} ${src.finalUnit}` : '';
    ws.getCell(row, 5).value = c.volPerRxnMicroliters;
    ws.getCell(row, 5).numFmt = '0.00';
    ws.getCell(row, 6).value = inMix ? 'Y' : 'N';
    ws.getCell(row, 6).alignment = { horizontal: 'center' };
    ws.getCell(row, 7).value = {
      formula: `IF(F${row}="Y",ROUND(E${row}*N_EFF,2),0)`,
      result: inMix ? Number((c.volPerRxnMicroliters * mm.effectiveReactions).toFixed(2)) : 0,
    };
    ws.getCell(row, 7).numFmt = '0.00';
    ws.getCell(row, 7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CALC_FILL } };
    ws.getCell(row, 8).value =
      c.provenance === 'COMPUTED'
        ? c.derivation || 'Computed'
        : c.provenance === 'MODEL_PROPOSED'
          ? `As specified (${c.uncomputableReason || 'not independently verifiable'})`
          : c.provenance;
    ws.getCell(row, 8).font = { name: 'Arial', size: 9, color: { argb: c.provenance === 'COMPUTED' ? 'FF166534' : 'FF9A3412' } };
    ws.getCell(row, 9).value = [
      inMix ? '' : 'Added per tube — not in mix.',
      c.belowMinPipettable && c.intermediateDilution ? c.intermediateDilution.recipe : '',
      src?.notes || '',
    ].filter(Boolean).join(' ');
    ws.getCell(row, 9).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(row, 8).alignment = { wrapText: true, vertical: 'top' };
    row++;
  }
  const lastDataRow = row - 1;

  row++;
  ws.getCell(row, 2).value = 'Master mix per reaction (µL)';
  ws.getCell(row, 2).font = { bold: true };
  ws.getCell(row, 5).value = { formula: `SUMIF(F${firstDataRow}:F${lastDataRow},"Y",E${firstDataRow}:E${lastDataRow})`, result: mm.masterMixVolumePerReaction };
  ws.getCell(row, 5).numFmt = '0.00';
  ws.getCell(row, 5).font = { bold: true };
  row++;
  ws.getCell(row, 2).value = 'Master mix total for run (µL)';
  ws.getCell(row, 2).font = { bold: true };
  ws.getCell(row, 7).value = { formula: `SUM(G${firstDataRow}:G${lastDataRow})`, result: mm.masterMixTotalVolume };
  ws.getCell(row, 7).numFmt = '0.00';
  ws.getCell(row, 7).font = { bold: true };
  row++;
  ws.getCell(row, 2).value = 'Dispense per tube from mix (µL)';
  ws.getCell(row, 2).font = { bold: true };
  ws.getCell(row, 5).value = { formula: `SUMIF(F${firstDataRow}:F${lastDataRow},"Y",E${firstDataRow}:E${lastDataRow})`, result: mm.masterMixVolumePerReaction };
  ws.getCell(row, 5).numFmt = '0.00';
  row++;
  ws.getCell(row, 2).value = 'Then add per tube (µL)';
  ws.getCell(row, 2).font = { bold: true };
  ws.getCell(row, 5).value = { formula: `SUMIF(F${firstDataRow}:F${lastDataRow},"N",E${firstDataRow}:E${lastDataRow})`, result: mm.perSampleVolumePerReaction };
  ws.getCell(row, 5).numFmt = '0.00';
  row++;
  ws.getCell(row, 2).value = 'Total per reaction (µL) — should equal RXN_VOL';
  ws.getCell(row, 5).value = { formula: `SUM(E${firstDataRow}:E${lastDataRow})`, result: calc.actualVolumeMicroliters };
  ws.getCell(row, 5).numFmt = '0.00';
  ws.getCell(row, 6).value = { formula: `IF(ABS(E${row}-RXN_VOL)<0.01,"OK","CHECK")`, result: calc.volumeBalanced ? 'OK' : 'CHECK' };
  ws.getCell(row, 6).font = { bold: true, color: { argb: calc.volumeBalanced ? 'FF166534' : 'FFB91C1C' } };

  // Findings block
  const findings = [...calc.findings, ...mm.findings];
  if (findings.length) {
    row += 2;
    ws.getCell(row, 2).value = 'CALCULATION FINDINGS';
    ws.getCell(row, 2).font = { bold: true, color: { argb: 'FFB91C1C' } };
    for (const f of findings) {
      row++;
      ws.getCell(row, 2).value = `${f.severity}: ${f.message}${f.remedy ? ` — ${f.remedy}` : ''}`;
      ws.mergeCells(row, 2, row, 9);
      ws.getCell(row, 2).alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(row).height = Math.min(90, 15 * Math.ceil(ws.getCell(row, 2).value!.toString().length / 120));
    }
  }

  // Protect the sheet, leaving only the two input cells unlocked.
  await ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatCells: true, formatColumns: true, formatRows: true });

  // =====================================================================
  // Sheet 2 — Experimental design (drives N_RXN via formula)
  // =====================================================================
  const wd = wb.addWorksheet('Design');
  title(wd, 'EXPERIMENTAL DESIGN', 'A1:C1');
  const rows: [string, number][] = [
    ['Samples', design.sampleCount],
    ['Replicates per sample', design.replicates],
    ['Positive controls', design.posControls],
    ['Negative controls', design.negControls],
  ];
  rows.forEach(([k, v], i) => {
    wd.getCell(3 + i, 1).value = k;
    wd.getCell(3 + i, 2).value = v;
    wd.getCell(3 + i, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } };
  });
  wd.getCell(8, 1).value = 'Total reactions';
  wd.getCell(8, 1).font = { bold: true };
  wd.getCell(8, 2).value = { formula: 'B3*B4+B5+B6', result: nRxn };
  wd.getCell(9, 1).value = 'Tip: set Master Mix!B5 to =Design!B8 to link the two sheets.';
  wd.getCell(9, 1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  wd.columns = [{ width: 26 }, { width: 12 }, { width: 40 }];

  // =====================================================================
  // Sheet 3 — Thermal profile
  // =====================================================================
  const tp = reactionSheet.thermocyclerProfile || [];
  if (tp.length) {
    const wt = wb.addWorksheet('Thermal Profile');
    title(wt, 'THERMOCYCLER PROFILE', 'A1:F1');
    header(wt, 3, ['Step', 'Phase', 'Temp (°C)', 'Duration (s)', 'Cycles', 'Notes']);
    tp.forEach((s, i) => {
      const r = 4 + i;
      wt.getCell(r, 1).value = s.stepNumber;
      wt.getCell(r, 2).value = s.phase;
      wt.getCell(r, 3).value = s.tempCelsius;
      wt.getCell(r, 4).value = s.durationSeconds;
      wt.getCell(r, 5).value = s.cycles ?? 1;
      wt.getCell(r, 6).value = s.notes || '';
    });
    const last = 3 + tp.length;
    wt.getCell(last + 2, 2).value = 'Estimated run time (min)';
    wt.getCell(last + 2, 2).font = { bold: true };
    wt.getCell(last + 2, 4).value = { formula: `SUMPRODUCT(D4:D${last},E4:E${last})/60`, result: tp.reduce((a, s) => a + s.durationSeconds * (s.cycles ?? 1), 0) / 60 };
    wt.getCell(last + 2, 4).numFmt = '0.0';
    wt.columns = [{ width: 7 }, { width: 28 }, { width: 11 }, { width: 13 }, { width: 8 }, { width: 40 }];
  }

  // =====================================================================
  // Sheet 4 — Provenance / audit
  // =====================================================================
  const wp = wb.addWorksheet('About this workbook');
  wp.getCell('A1').value = 'How these numbers were derived';
  wp.getCell('A1').font = { bold: true, size: 13 };
  const notes = [
    `Generated ${new Date().toISOString()} by BioSOP Generator.`,
    sop ? `Source document: ${sop.documentId || ''} v${sop.version || ''} — ${sop.title}` : '',
    'Per-reaction volumes marked "Computed" were derived from C1V1 = C2V2 using the stated stock and final concentrations.',
    'Volumes marked "As specified" could not be independently verified (incompatible units or missing concentration) and are reproduced from the protocol as written.',
    'Per-tube components (template, sample) are excluded from the master mix and must be added to each reaction individually.',
    'Yellow cells are inputs. All other numeric cells are formulas or locked values.',
    'This workbook is a calculation aid, not a validated system. Verify critical volumes independently.',
  ].filter(Boolean);
  notes.forEach((n, i) => {
    wp.getCell(3 + i, 1).value = n;
    wp.getCell(3 + i, 1).alignment = { wrapText: true };
  });
  wp.columns = [{ width: 110 }];

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
