/**
 * The bench workbook.
 *
 * Design brief: this should be the only thing a scientist carries to the bench. It is not a printout
 * of a calculation done elsewhere, it is the calculation. Concentrations are numeric and editable,
 * every derived volume is a real Excel formula, and the experimental design drives the reaction
 * count through defined names rather than through a note telling the user to wire it up themselves.
 *
 * What changed from the previous version, and why:
 *
 *   - `µL / rxn` used to be a static number computed in TypeScript. Stock and Final were text
 *     ("10 µM"), so nothing could reference them. Editing a concentration recalculated nothing.
 *     Now concentration is a numeric input cell and the volume is C2*V2/C1 in the sheet.
 *   - Excel cannot do the unit algebra in core/units.ts (M to fM, mass to molar with MW). Rather
 *     than pretend otherwise, each row carries a conversion factor computed once, here, with the
 *     real engine. The formula is then a clean C1V1 that stays correct as long as the row's own
 *     units do not change. Rows whose units could not be reconciled get a locked static value and
 *     say so in the open, instead of a formula that looks live and is wrong.
 *   - The diluent is a balancing formula against the target volume, so the reaction always closes.
 *   - The Design sheet computed a reaction total that nothing consumed. It is now N_RXN.
 *
 * Protection model: input cells are unlocked and yellow, everything derived is locked. The sheet
 * password is empty, so this stops fat fingers, not a determined user. That is the intent.
 */
import ExcelJS from 'exceljs';
import type { ReactionSheet, SopDocument } from '../types';
import {
  calculateReaction,
  calculateMasterMix,
  totalReactions,
  ComponentInput,
} from '../core/reactionMath';
import { conversionFactor } from '../core/units';
import { buildWorklists, generateWells } from '../core/worklists';
import { matchReagentPriceFromCatalog } from '../data/reagentPricingCatalog';

// ---------------------------------------------------------------------------
// Design system
// ---------------------------------------------------------------------------

const INK = 'FF0F172A';        // near-black, titles and rules
const ACCENT = 'FF0E7490';     // teal, table headers
const MUTED = 'FF64748B';      // secondary text
const HAIRLINE = 'FFCBD5E1';   // borders
const BAND = 'FFF8FAFC';       // zebra band
const CALC = 'FFEFF6FF';       // derived cell
const INPUT = 'FFFEF9C3';      // editable cell
const INPUT_EDGE = 'FFCA8A04';
const OK = 'FF15803D';
const WARN = 'FFB45309';
const BAD = 'FFB91C1C';
const PAPER = 'FFFFFFFF';

const FONT = 'Calibri';
const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: HAIRLINE } };
const boxed = { top: thin, left: thin, bottom: thin, right: thin };

type Cell = ExcelJS.Cell;

function fill(c: Cell, argb: string) {
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

/** An editable cell: yellow, outlined, and unlocked so sheet protection lets it through. */
function asInput(c: Cell, numFmt?: string) {
  fill(c, INPUT);
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: INPUT_EDGE } };
  c.border = { top: edge, left: edge, bottom: edge, right: edge };
  c.protection = { locked: false };
  c.font = { name: FONT, size: 10, bold: true, color: { argb: INK } };
  if (numFmt) c.numFmt = numFmt;
  c.alignment = { horizontal: 'center', vertical: 'middle' };
}

/** A derived cell: pale blue, locked, visibly not yours to type in. */
function asCalc(c: Cell, numFmt?: string) {
  fill(c, CALC);
  c.border = boxed;
  c.font = { name: FONT, size: 10, color: { argb: INK } };
  if (numFmt) c.numFmt = numFmt;
  c.alignment = { horizontal: 'center', vertical: 'middle' };
}

/** Page banner. Every sheet opens with one so the workbook reads as one document. */
function banner(ws: ExcelJS.Worksheet, span: string, kicker: string, heading: string, lastColNum: number) {
  const from = span.split(':')[0];
  ws.mergeCells(span);
  const c = ws.getCell(from);
  c.value = {
    richText: [
      { text: `${kicker}\n`, font: { name: FONT, size: 9, bold: true, color: { argb: 'FF7DD3FC' } } },
      { text: heading, font: { name: FONT, size: 16, bold: true, color: { argb: PAPER } } },
    ],
  };
  fill(c, INK);
  c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };
  ws.getRow(1).height = 46;
  const rule = ws.getRow(2);
  rule.height = 4;
  for (let i = 1; i <= lastColNum; i++) fill(rule.getCell(i), ACCENT);
}

function tableHead(ws: ExcelJS.Worksheet, row: number, labels: string[]) {
  const r = ws.getRow(row);
  labels.forEach((l, i) => {
    const c = r.getCell(i + 1);
    c.value = l;
    c.font = { name: FONT, size: 9, bold: true, color: { argb: PAPER } };
    fill(c, ACCENT);
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = boxed;
  });
  r.height = 28;
}

function label(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  text: string,
  opts: { bold?: boolean; size?: number; color?: string; indent?: number; italic?: boolean } = {},
) {
  const c = ws.getCell(row, col);
  c.value = text;
  c.font = { name: FONT, size: opts.size ?? 10, bold: opts.bold ?? false, italic: opts.italic ?? false, color: { argb: opts.color ?? INK } };
  c.alignment = { vertical: 'middle', wrapText: true, indent: opts.indent };
  return c;
}

function sectionRule(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { name: FONT, size: 10, bold: true, color: { argb: ACCENT } };
  c.alignment = { vertical: 'middle' };
  for (let i = 1; i <= cols; i++) {
    ws.getCell(row, i).border = { bottom: { style: 'medium', color: { argb: ACCENT } } };
  }
  ws.getRow(row).height = 22;
}

function band(ws: ExcelJS.Worksheet, row: number, cols: number, on: boolean) {
  for (let i = 1; i <= cols; i++) {
    const c = ws.getCell(row, i);
    if (on) fill(c, BAND);
    c.border = boxed;
  }
}

function page(ws: ExcelJS.Worksheet, o: { landscape?: boolean; titlesRow?: string; docId: string; sheetName: string }) {
  ws.pageSetup = {
    orientation: o.landscape ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    printTitlesRow: o.titlesRow,
  };
  // "&" starts a field code in an Excel header or footer, so a sheet called "Reagents & Cost"
  // silently loses the ampersand and everything after it unless it is doubled.
  const esc = (t: string) => t.replace(/&/g, '&&');
  ws.headerFooter = {
    oddFooter: `&L&9${esc(o.docId)}  ·  ${esc(o.sheetName)}&C&9Uncontrolled when printed&R&9Page &P of &N`,
  };
}

/**
 * Apply a validation to one explicit range.
 *
 * Setting the same rule cell-by-cell makes ExcelJS coalesce the cells into ranges badly: four calls
 * on B9..B12 came out as sqref="B10:B12" AND sqref="B9:B12". Overlapping dataValidation ranges are
 * invalid OOXML, and Excel treats an invalid range as a corrupt file, repairs it, and drops content
 * on the way through. LibreOffice ignores the overlap entirely, which is why it survived review.
 *
 * The typings do not expose the sheet-level collection, so this reaches past them deliberately.
 */
function validate(ws: ExcelJS.Worksheet, range: string, rule: ExcelJS.DataValidation) {
  (ws as unknown as { dataValidations: { add(r: string, v: ExcelJS.DataValidation): void } }).dataValidations.add(range, rule);
}

const money = (v: number) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------

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
    role: c.role,
    molecularWeight: c.molecularWeight,
    notes: c.notes,
  }));
}

/**
 * The factor that makes C1V1 legal inside Excel.
 *
 * Multiplying the stock concentration by this puts it in the same unit as the final concentration,
 * so `final * volume / (stock * factor)` is dimensionally sound. Returns null when the two units
 * cannot be reconciled at all, which is the signal to fall back to a locked static volume.
 */
function rowFactor(src: { stockUnit?: string; finalUnit?: string; molecularWeight?: number }): number | null {
  if (!src.stockUnit || !src.finalUnit) return null;
  const r = conversionFactor(src.stockUnit, src.finalUnit, src.molecularWeight);
  return r.ok ? r.factor : null;
}

export async function generateLiveExcelWorkbook(reactionSheet: ReactionSheet, sop?: SopDocument): Promise<Uint8Array> {
  const inputs = toInputs(reactionSheet);
  const targetVolume = reactionSheet.reactionVolumeMicroliters || 20;
  const calc = calculateReaction(inputs, { targetVolumeMicroliters: targetVolume });

  const design = {
    sampleCount: reactionSheet.sampleCount ?? reactionSheet.defaultNumReactions ?? 8,
    replicates: reactionSheet.replicates ?? 1,
    posControls: reactionSheet.posControls ?? 1,
    negControls: reactionSheet.negControls ?? 1,
    overflowPercent: reactionSheet.defaultOverflowPercent ?? 10,
  };
  const nRxn = totalReactions(design);
  const mm = calculateMasterMix(calc, design);

  const docId = sop?.documentId || reactionSheet.id || 'BIOSOP';
  const docTitle = sop?.title || reactionSheet.title || 'Reaction Sheet';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BioSOP Generator';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true; // recalculate on open, so the formulas prove themselves

  // =====================================================================
  // 1 — Run Record
  // =====================================================================
  const wr = wb.addWorksheet('Run Record', { views: [{ showGridLines: false }] });
  wr.columns = [{ width: 26 }, { width: 32 }, { width: 22 }, { width: 32 }];
  banner(wr, 'A1:D1', 'BIOSOP GENERATOR · BENCH WORKBOOK', docTitle, 4);

  let r = 4;
  sectionRule(wr, r++, 4, 'DOCUMENT');
  const meta: [string, string][] = [
    ['Document ID', docId],
    ['Version', sop?.version || '1.0'],
    ['Assay type', reactionSheet.assayType || ''],
    ['Effective date', sop?.effectiveDate || ''],
    ['Biosafety level', sop?.biosafetyLevel || ''],
    ['Workbook generated', new Date().toISOString().slice(0, 16).replace('T', ' ')],
  ];
  meta.forEach(([k, v]) => {
    label(wr, r, 1, k, { bold: true, size: 9, color: MUTED });
    label(wr, r, 2, v, { size: 10 });
    r++;
  });

  r++;
  sectionRule(wr, r++, 4, 'RUN');
  ['Operator', 'Date run', 'Instrument / serial', 'Location'].forEach((k) => {
    label(wr, r, 1, k, { bold: true, size: 9, color: MUTED });
    asInput(wr.getCell(r, 2));
    wr.getCell(r, 2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    r++;
  });

  r++;
  sectionRule(wr, r++, 4, 'REAGENT LOTS  (fill at the bench, this is your traceability record)');
  tableHead(wr, r, ['Component', 'Lot number', 'Expiry', 'Opened / notes']);
  r++;
  for (const c of calc.components) {
    label(wr, r, 1, c.name, { size: 9 });
    wr.getCell(r, 1).border = boxed;
    for (let col = 2; col <= 4; col++) {
      asInput(wr.getCell(r, col));
      wr.getCell(r, col).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    }
    r++;
  }

  r++;
  sectionRule(wr, r++, 4, 'SIGN-OFF');
  tableHead(wr, r, ['Role', 'Name', 'Signature', 'Date']);
  r++;
  ['Prepared by', 'Reviewed by', 'Approved by'].forEach((role) => {
    label(wr, r, 1, role, { bold: true, size: 9 });
    wr.getCell(r, 1).border = boxed;
    for (let col = 2; col <= 4; col++) {
      asInput(wr.getCell(r, col));
      wr.getCell(r, col).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    }
    wr.getRow(r).height = 26;
    r++;
  });

  r += 1;
  wr.mergeCells(r, 1, r + 2, 4);
  const disclaimer = wr.getCell(r, 1);
  disclaimer.value =
    'This workbook is a calculation aid. Arithmetic, structure and reference resolution are checked automatically. Scientific suitability for your cells, samples and containment level is not. A qualified scientist must review it before use.';
  disclaimer.font = { name: FONT, size: 9, color: { argb: WARN } };
  disclaimer.alignment = { wrapText: true, vertical: 'top' };
  page(wr, { docId, sheetName: 'Run Record' });
  await wr.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // =====================================================================
  // 2 — Setup: the single source of truth for every number downstream
  // =====================================================================
  const wsu = wb.addWorksheet('Setup', { views: [{ showGridLines: false }] });
  wsu.columns = [{ width: 34 }, { width: 14 }, { width: 6 }, { width: 70 }];
  banner(wsu, 'A1:D1', 'INPUTS', 'Change these, everything else recalculates', 4);

  let sr = 4;
  sectionRule(wsu, sr++, 4, 'REACTION');
  const reactionRows: [string, number, string, string, string, string][] = [
    ['Reaction volume', targetVolume, 'µL', 'RXN_VOL', '0.0', 'Target volume of a single reaction. Drives every computed volume and the diluent balance.'],
    ['Minimum pipettable volume', 1, 'µL', 'MIN_PIP', '0.00', 'Anything below this is flagged red on the Master Mix sheet.'],
  ];
  for (const [k, v, unit, name, fmt, note] of reactionRows) {
    label(wsu, sr, 1, k, { bold: true });
    asInput(wsu.getCell(sr, 2), fmt);
    wsu.getCell(sr, 2).value = v;
    label(wsu, sr, 3, unit, { size: 9, color: MUTED });
    label(wsu, sr, 4, note, { size: 9, color: MUTED });
    wb.definedNames.add(`'Setup'!$B$${sr}`, name);
    sr++;
  }

  sr++;
  sectionRule(wsu, sr++, 4, 'EXPERIMENTAL DESIGN');
  const designRows: [string, number, string, string][] = [
    ['Samples', design.sampleCount, 'N_SAMPLES', 'Distinct samples, not counting controls.'],
    ['Replicates per sample', design.replicates, 'N_REPS', 'Technical replicates.'],
    ['Positive controls', design.posControls, 'N_POS', ''],
    ['Negative controls', design.negControls, 'N_NEG', 'The no-template control belongs here.'],
  ];
  const designFirstRow = sr;
  for (const [k, v, name, note] of designRows) {
    label(wsu, sr, 1, k, { bold: true });
    asInput(wsu.getCell(sr, 2), '0');
    wsu.getCell(sr, 2).value = v;
    label(wsu, sr, 4, note, { size: 9, color: MUTED });
    wb.definedNames.add(`'Setup'!$B$${sr}`, name);
    sr++;
  }
  validate(wsu, `B${designFirstRow}:B${sr - 1}`, {
    type: 'whole', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: false,
    showErrorMessage: true, errorTitle: 'Whole number', error: 'Counts must be zero or a positive whole number.',
  });

  label(wsu, sr, 1, 'Total reactions', { bold: true });
  asCalc(wsu.getCell(sr, 2), '0');
  wsu.getCell(sr, 2).value = { formula: 'N_SAMPLES*N_REPS+N_POS+N_NEG', result: nRxn };
  wb.definedNames.add(`'Setup'!$B$${sr}`, 'N_RXN');
  label(wsu, sr, 4, 'Samples x replicates, plus controls. Referenced directly by the Master Mix sheet.', { size: 9, color: MUTED });
  sr++;

  label(wsu, sr, 1, 'Overflow allowance', { bold: true });
  asInput(wsu.getCell(sr, 2), '0%');
  wsu.getCell(sr, 2).value = design.overflowPercent / 100;
  validate(wsu, `B${sr}`, {
    type: 'decimal', operator: 'between', formulae: [0, 1], allowBlank: false,
    showErrorMessage: true, errorTitle: 'Overflow', error: 'Enter a percentage between 0% and 100%.',
  });
  label(wsu, sr, 4, 'Extra mix to cover pipetting loss. 10% is typical, more for many small transfers.', { size: 9, color: MUTED });
  wb.definedNames.add(`'Setup'!$B$${sr}`, 'OVERFLOW');
  sr++;

  label(wsu, sr, 1, 'Reactions to prepare', { bold: true });
  asCalc(wsu.getCell(sr, 2), '0.00');
  wsu.getCell(sr, 2).value = { formula: 'ROUND(N_RXN*(1+OVERFLOW),2)', result: mm.effectiveReactions };
  wb.definedNames.add(`'Setup'!$B$${sr}`, 'N_EFF');
  label(wsu, sr, 4, 'What the master mix is actually scaled to.', { size: 9, color: MUTED });
  sr++;

  sr++;
  sectionRule(wsu, sr++, 4, 'PLATE');
  const defRows = reactionSheet.plateLayout?.numRows || 8;
  const defCols = reactionSheet.plateLayout?.numCols || 12;
  ([['Plate rows', defRows, 'PLATE_ROWS'], ['Plate columns', defCols, 'PLATE_COLS']] as [string, number, string][]).forEach(([k, v, name]) => {
    label(wsu, sr, 1, k, { bold: true });
    asInput(wsu.getCell(sr, 2), '0');
    wsu.getCell(sr, 2).value = v;
    wb.definedNames.add(`'Setup'!$B$${sr}`, name);
    sr++;
  });
  label(wsu, sr, 1, 'Wells available', { bold: true });
  asCalc(wsu.getCell(sr, 2), '0');
  wsu.getCell(sr, 2).value = { formula: 'PLATE_ROWS*PLATE_COLS', result: defRows * defCols };
  const wellsRow = sr;
  sr++;
  label(wsu, sr, 1, 'Capacity check', { bold: true });
  const capCell = wsu.getCell(sr, 2);
  capCell.value = { formula: `IF(N_RXN<=B${wellsRow},"FITS","TOO MANY")`, result: nRxn <= defRows * defCols ? 'FITS' : 'TOO MANY' };
  asCalc(capCell);
  wsu.addConditionalFormatting({
    ref: `B${sr}`,
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'TOO MANY', priority: 1, style: { font: { bold: true, color: { argb: BAD } } } },
      { type: 'containsText', operator: 'containsText', text: 'FITS', priority: 2, style: { font: { bold: true, color: { argb: OK } } } },
    ],
  } as ExcelJS.ConditionalFormattingOptions);
  sr += 2;
  wsu.mergeCells(sr, 1, sr, 4);
  label(wsu, sr, 1, 'Yellow cells are yours to edit. Blue cells are formulas and are locked.', { size: 9, color: MUTED });
  wsu.getRow(sr).height = 18;
  page(wsu, { docId, sheetName: 'Setup' });
  await wsu.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // =====================================================================
  // 3 — Master Mix: the calculator
  // =====================================================================
  const ws = wb.addWorksheet('Master Mix', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
  ws.columns = [
    { width: 7 }, { width: 30 }, { width: 11 }, { width: 10 }, { width: 9 },
    { width: 10 }, { width: 9 }, { width: 10 }, { width: 11 }, { width: 9 },
    { width: 12 }, { width: 44 }, { width: 32 },
  ];
  banner(ws, 'A1:M1', 'CALCULATOR', 'Master mix and per-reaction volumes', 13);
  const HDR = 4;
  tableHead(ws, HDR, [
    'Order', 'Component', 'Role', 'Stock', 'Unit', 'Final', 'Unit', 'Factor', 'µL / rxn', 'In mix?', 'µL for run', 'How the volume was derived', 'Notes',
  ]);

  const ordered = [...calc.components].sort((a, b) => {
    const pa = reactionSheet.components.find((c) => c.id === a.id)?.pipettingOrder ?? 99;
    const pb = reactionSheet.components.find((c) => c.id === b.id)?.pipettingOrder ?? 99;
    return pa - pb;
  });

  const first = HDR + 1;
  let row = first;
  const diluentRows: number[] = [];
  ordered.forEach((c, idx) => {
    const src = reactionSheet.components.find((x) => x.id === c.id);
    const inMix = c.role !== 'PER_SAMPLE';
    const factor = rowFactor({ stockUnit: src?.stockUnit, finalUnit: src?.finalUnit, molecularWeight: src?.molecularWeight });
    const computable = c.role !== 'DILUENT' && factor !== null && !!src?.stockConc && !!src?.finalConc;

    band(ws, row, 13, idx % 2 === 1);
    ws.getCell(row, 1).value = src?.pipettingOrder ?? idx + 1;
    ws.getCell(row, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    label(ws, row, 2, c.name, { size: 10, bold: true });
    label(ws, row, 3, c.role === 'PER_SAMPLE' ? 'Per tube' : c.role === 'DILUENT' ? 'Diluent' : 'Mix', { size: 9, color: MUTED });

    if (c.role === 'DILUENT') {
      label(ws, row, 4, '—', { size: 9, color: MUTED });
      label(ws, row, 6, '—', { size: 9, color: MUTED });
      diluentRows.push(row);
    } else {
      asInput(ws.getCell(row, 4), '0.####');
      ws.getCell(row, 4).value = src?.stockConc ?? null;
      label(ws, row, 5, src?.stockUnit || '', { size: 9, color: MUTED });
      ws.getCell(row, 5).alignment = { horizontal: 'center', vertical: 'middle' };
      asInput(ws.getCell(row, 6), '0.####');
      ws.getCell(row, 6).value = src?.finalConc ?? null;
      label(ws, row, 7, src?.finalUnit || '', { size: 9, color: MUTED });
      ws.getCell(row, 7).alignment = { horizontal: 'center', vertical: 'middle' };
      const fc = ws.getCell(row, 8);
      fc.value = factor ?? '';
      fc.numFmt = '0.######';
      fc.font = { name: FONT, size: 9, color: { argb: MUTED } };
      fc.alignment = { horizontal: 'center', vertical: 'middle' };
      fc.border = boxed;
    }

    const vol = ws.getCell(row, 9);
    if (computable) {
      vol.value = { formula: `ROUND(F${row}*RXN_VOL/(D${row}*H${row}),2)`, result: Number(c.volPerRxnMicroliters.toFixed(2)) };
      asCalc(vol, '0.00');
    } else if (c.role === 'DILUENT') {
      asCalc(vol, '0.00'); // formula patched in below, once the row span is known
    } else {
      vol.value = Number(c.volPerRxnMicroliters.toFixed(2));
      vol.numFmt = '0.00';
      fill(vol, 'FFFDF2F8');
      vol.border = boxed;
      vol.alignment = { horizontal: 'center', vertical: 'middle' };
      vol.font = { name: FONT, size: 10, italic: true, color: { argb: WARN } };
    }

    const mixFlag = ws.getCell(row, 10);
    mixFlag.value = inMix ? 'Y' : 'N';
    asInput(mixFlag);

    const runVol = ws.getCell(row, 11);
    runVol.value = { formula: `IF(J${row}="Y",ROUND(I${row}*N_EFF,2),0)`, result: inMix ? Number((c.volPerRxnMicroliters * mm.effectiveReactions).toFixed(2)) : 0 };
    asCalc(runVol, '0.00');

    const how =
      c.role === 'DILUENT'
        ? 'Balances the reaction to the Setup reaction volume.'
        : computable
          ? `Live formula. ${c.derivation || ''}`.trim()
          : `Static: ${c.uncomputableReason || 'stock and final units could not be reconciled'}.`;
    label(ws, row, 12, how, { size: 8, color: computable || c.role === 'DILUENT' ? OK : WARN });
    ws.getCell(row, 12).alignment = { wrapText: true, vertical: 'top' };

    label(ws, row, 13, [
      inMix ? '' : 'Added per tube, not scaled into the mix.',
      c.belowMinPipettable && c.intermediateDilution ? 'See Dilutions sheet.' : '',
      src?.notes || '',
      src?.hazardNote || '',
    ].filter(Boolean).join(' '), { size: 8, color: MUTED });
    ws.getCell(row, 13).alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(row).height = 30;
    row++;
  });
  const last = row - 1;
  validate(ws, `J${first}:J${last}`, {
    type: 'list', allowBlank: false, formulae: ['"Y,N"'],
    showErrorMessage: true, errorTitle: 'In mix?', error: 'Y puts this component in the shared master mix. N means it is added to each tube.',
  });

  // The diluent balances against everything else. Excluding its own cell keeps the reference acyclic.
  for (const d of diluentRows) {
    const parts: string[] = [];
    if (d > first) parts.push(`SUM(I${first}:I${d - 1})`);
    if (d < last) parts.push(`SUM(I${d + 1}:I${last})`);
    const others = parts.length ? parts.join('+') : '0';
    ws.getCell(d, 9).value = {
      formula: `ROUND(RXN_VOL-(${others}),2)`,
      result: Number((calc.components.find((c) => c.role === 'DILUENT')?.volPerRxnMicroliters ?? 0).toFixed(2)),
    };
  }

  ws.autoFilter = { from: { row: HDR, column: 1 }, to: { row: last, column: 13 } };

  row++;
  const totalRowIdx: Record<string, number> = {};
  const totals: [string, string, string, number, string][] = [
    ['mixPer', 'Master mix per reaction', `SUMIF(J${first}:J${last},"Y",I${first}:I${last})`, mm.masterMixVolumePerReaction, 'Shared across every tube.'],
    ['perTube', 'Added per tube', `SUMIF(J${first}:J${last},"N",I${first}:I${last})`, mm.perSampleVolumePerReaction, 'Template and anything else that differs per sample.'],
    ['rxnTotal', 'Reaction total', `SUM(I${first}:I${last})`, calc.actualVolumeMicroliters, 'Must equal the reaction volume on Setup.'],
    ['mmTotal', 'MASTER MIX TO PREPARE', `SUM(K${first}:K${last})`, mm.masterMixTotalVolume, 'Make this much. Includes the overflow allowance.'],
  ];
  totals.forEach(([key, name, formula, result, note], i) => {
    const emphasise = i === totals.length - 1;
    totalRowIdx[key] = row;
    for (let col = 1; col <= 13; col++) {
      fill(ws.getCell(row, col), emphasise ? ACCENT : BAND);
      ws.getCell(row, col).border = boxed;
    }
    label(ws, row, 2, name, { bold: true, size: emphasise ? 11 : 10, color: emphasise ? PAPER : INK });
    const c = ws.getCell(row, 9);
    c.value = { formula, result: Number(result.toFixed(2)) };
    c.numFmt = '0.00';
    c.font = { name: FONT, size: emphasise ? 12 : 10, bold: true, color: { argb: emphasise ? PAPER : INK } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    label(ws, row, 12, note, { size: 8, color: emphasise ? PAPER : MUTED });
    ws.getRow(row).height = emphasise ? 26 : 20;
    row++;
  });

  const balRow = row;
  label(ws, balRow, 2, 'Volume balance', { bold: true });
  const bal = ws.getCell(balRow, 9);
  bal.value = {
    formula: `IF(ABS(I${totalRowIdx.rxnTotal}-RXN_VOL)<0.01,"BALANCED","OFF BY "&TEXT(I${totalRowIdx.rxnTotal}-RXN_VOL,"0.00"))`,
    result: calc.volumeBalanced ? 'BALANCED' : 'CHECK',
  };
  bal.font = { name: FONT, size: 10, bold: true };
  bal.alignment = { horizontal: 'center', vertical: 'middle' };
  bal.border = boxed;
  ws.addConditionalFormatting({
    ref: `I${balRow}`,
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'BALANCED', priority: 1, style: { font: { bold: true, color: { argb: OK } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCFCE7' } } } },
      { type: 'containsText', operator: 'containsText', text: 'OFF BY', priority: 2, style: { font: { bold: true, color: { argb: BAD } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } } } },
    ],
  } as ExcelJS.ConditionalFormattingOptions);

  // Sub-microlitre volumes are the commonest source of a quietly failed reaction.
  ws.addConditionalFormatting({
    ref: `I${first}:I${last}`,
    rules: [
      { type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 3, style: { font: { bold: true, color: { argb: BAD } } } },
      { type: 'expression', formulae: [`AND(I${first}>0,I${first}<MIN_PIP)`], priority: 4, style: { font: { bold: true, color: { argb: BAD } } } },
    ],
  } as ExcelJS.ConditionalFormattingOptions);

  row += 2;
  ws.mergeCells(row, 2, row, 13);
  label(ws, row, 2, 'Yellow = edit me.     Blue = formula.     Pink = static value that could not be derived.     Red = below the minimum pipettable volume.', { size: 9, color: MUTED });
  ws.getRow(row).height = 18;
  page(ws, { docId, sheetName: 'Master Mix', landscape: true, titlesRow: `${HDR}:${HDR}` });
  await ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, autoFilter: true });

  // =====================================================================
  // 4 — Dilutions
  // =====================================================================
  const needDil = calc.components.filter((c) => c.belowMinPipettable && c.intermediateDilution);
  const wdil = wb.addWorksheet('Dilutions', { views: [{ showGridLines: false }] });
  wdil.columns = [{ width: 30 }, { width: 16 }, { width: 9 }, { width: 18 }, { width: 16 }, { width: 58 }];
  banner(wdil, 'A1:F1', 'INTERMEDIATE DILUTIONS', needDil.length ? 'Components below the pipettable minimum' : 'Nothing needs a pre-dilution', 6);
  if (needDil.length) {
    tableHead(wdil, 4, ['Component', 'Stock', 'Fold', 'Diluted stock', 'Pipette instead', 'Recipe']);
    let dr = 5;
    needDil.forEach((c, i) => {
      const d = c.intermediateDilution!;
      band(wdil, dr, 6, i % 2 === 1);
      label(wdil, dr, 1, c.name, { bold: true, size: 10 });
      const srcC = reactionSheet.components.find((x) => x.id === c.id);
      label(wdil, dr, 2, srcC ? `${srcC.stockConc} ${srcC.stockUnit}` : '', { size: 9 });
      label(wdil, dr, 3, `1:${d.foldDilution}`, { size: 9 });
      label(wdil, dr, 4, `${d.dilutedStockConc} ${d.dilutedStockUnit}`, { size: 9 });
      label(wdil, dr, 5, `${d.volumeFromDilutedStockMicroliters.toFixed(2)} µL`, { bold: true, size: 10 });
      label(wdil, dr, 6, d.recipe, { size: 9, color: MUTED });
      wdil.getRow(dr).height = 30;
      dr++;
    });
    dr += 1;
    label(wdil, dr, 1, 'Make these fresh. A pre-dilution held over from a previous run is the usual explanation for a reaction that worked last week and not today.', { size: 9, color: WARN });
  } else {
    label(wdil, 4, 1, 'Every component is at or above the minimum pipettable volume set on the Setup sheet. Raise that value and re-export if your pipettes are less forgiving.', { size: 10, color: MUTED });
  }
  page(wdil, { docId, sheetName: 'Dilutions' });
  await wdil.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // =====================================================================
  // 5 — Plate Map
  // =====================================================================
  const pr = defRows;
  const pc = defCols;
  const wpm = wb.addWorksheet('Plate Map', { views: [{ showGridLines: false }] });
  banner(wpm, `A1:${String.fromCharCode(65 + pc)}1`, 'PLATE MAP', `${pr} x ${pc} · ${nRxn} reactions`, pc + 1);
  // If the protocol declares a layout, that is the layout. Mixing it with a generated column-major
  // fill produced a map that agreed with neither: the declared wells are frequently row-major.
  const declaredMap = reactionSheet.plateLayout?.wellMapping;
  const kindOf = new Map<string, string>();
  if (declaredMap && Object.keys(declaredMap).length) {
    Object.entries(declaredMap).forEach(([w, kind]) => kindOf.set(w, kind));
  } else {
    const nSamples = design.sampleCount * design.replicates;
    generateWells(pr, pc, nRxn).forEach((w, i) => {
      kindOf.set(w, i < nSamples ? 'sample' : i < nSamples + design.posControls ? 'control_pos' : 'control_neg');
    });
  }
  const LETTERS = 'ABCDEFGHIJKLMNOP';
  const tone: Record<string, { bg: string; fg: string; txt: string }> = {
    sample: { bg: 'FFDBEAFE', fg: 'FF1E3A8A', txt: 'S' },
    control_pos: { bg: 'FFDCFCE7', fg: OK, txt: '+' },
    control_neg: { bg: 'FFFEE2E2', fg: BAD, txt: '-' },
    standard: { bg: 'FFFEF3C7', fg: WARN, txt: 'St' },
    blank: { bg: 'FFF1F5F9', fg: MUTED, txt: '' },
  };
  wpm.getColumn(1).width = 5;
  for (let c = 1; c <= pc; c++) wpm.getColumn(c + 1).width = 6;
  for (let c = 1; c <= pc; c++) {
    const h = wpm.getCell(4, c + 1);
    h.value = c;
    h.font = { name: FONT, size: 9, bold: true, color: { argb: PAPER } };
    fill(h, ACCENT);
    h.alignment = { horizontal: 'center', vertical: 'middle' };
    h.border = boxed;
  }
  for (let rI = 0; rI < pr; rI++) {
    const rowN = 5 + rI;
    const h = wpm.getCell(rowN, 1);
    h.value = LETTERS[rI];
    h.font = { name: FONT, size: 9, bold: true, color: { argb: PAPER } };
    fill(h, ACCENT);
    h.alignment = { horizontal: 'center', vertical: 'middle' };
    h.border = boxed;
    wpm.getRow(rowN).height = 22;
    for (let cI = 0; cI < pc; cI++) {
      const kind = kindOf.get(`${LETTERS[rI]}${cI + 1}`);
      const cell = wpm.getCell(rowN, cI + 2);
      const t = kind ? tone[kind] || tone.blank : tone.blank;
      cell.value = kind ? t.txt : '';
      fill(cell, t.bg);
      cell.font = { name: FONT, size: 9, bold: true, color: { argb: t.fg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = boxed;
    }
  }
  const legendRow = 5 + pr + 2;
  wpm.mergeCells(legendRow, 1, legendRow, 3);
  label(wpm, legendRow, 1, 'Legend', { bold: true, size: 10 });
  const legendItems: [string, string, { bg: string; fg: string }][] = [
    ['S', 'Sample', tone.sample],
    ['+', 'Positive control', tone.control_pos],
    ['-', 'Negative control', tone.control_neg],
    ['', 'Empty', tone.blank],
  ];
  // Stacked, not strung across the plate columns: at 6 characters wide a horizontal legend clipped
  // "Negative control" under the following swatch.
  legendItems.forEach(([sym, name, t], i) => {
    const rowN = legendRow + 1 + i;
    wpm.getRow(rowN).height = 18;
    const c = wpm.getCell(rowN, 1);
    c.value = sym;
    fill(c, t.bg);
    c.font = { name: FONT, size: 9, bold: true, color: { argb: t.fg } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = boxed;
    wpm.mergeCells(rowN, 2, rowN, 4);
    const lab = wpm.getCell(rowN, 2);
    lab.value = name;
    lab.font = { name: FONT, size: 9, color: { argb: MUTED } };
    lab.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  });
  if (declaredMap && Object.keys(declaredMap).length) {
    const note = legendRow + legendItems.length + 2;
    wpm.mergeCells(note, 1, note, Math.min(pc + 1, 8));
    label(wpm, note, 1, 'Layout as declared in the protocol.', { size: 9, color: MUTED, italic: true });
  }
  page(wpm, { docId, sheetName: 'Plate Map', landscape: true });
  await wpm.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // =====================================================================
  // 6 — Worklist
  // =====================================================================
  const bundle = buildWorklists(calc, mm, { rows: pr, cols: pc, reactionCount: nRxn }, { protocolTitle: docTitle, documentId: docId, version: sop?.version });
  const wwl = wb.addWorksheet('Worklist', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
  wwl.columns = [{ width: 6 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 44 }];
  banner(wwl, 'A1:F1', 'TRANSFERS', 'Every pipetting step, in order', 6);
  tableHead(wwl, 4, ['#', 'Source', 'Destination', 'Volume (µL)', 'Stage', 'Notes']);
  let wl = 5;
  let stepNo = 1;
  const pushTransfer = (source: string, well: string, volume: number, stage: string) => {
    band(wwl, wl, 6, stepNo % 2 === 0);
    label(wwl, wl, 1, String(stepNo), { size: 9 });
    wwl.getCell(wl, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    label(wwl, wl, 2, source, { size: 9, bold: true });
    label(wwl, wl, 3, well, { size: 9 });
    wwl.getCell(wl, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    const v = wwl.getCell(wl, 4);
    v.value = Number(volume.toFixed(2));
    v.numFmt = '0.00';
    v.alignment = { horizontal: 'center', vertical: 'middle' };
    label(wwl, wl, 5, stage, { size: 9, color: MUTED });
    wl++; stepNo++;
  };
  bundle.summary.destinationWells.forEach((well) => pushTransfer('Master mix', well, bundle.summary.masterMixTubeVolumeMicroliters, 'Mix'));
  bundle.summary.perTubeComponents.forEach((p) => {
    bundle.summary.destinationWells.forEach((well) => pushTransfer(p.name, well, p.volPerRxnMicroliters, 'Per tube'));
  });
  if (wl > 5) wwl.autoFilter = { from: { row: 4, column: 1 }, to: { row: wl - 1, column: 6 } };
  wl++;
  label(wwl, wl, 1, 'Native Opentrons, Hamilton, Tecan and Echo files come from this same engine and are downloaded separately in the app.', { size: 9, color: MUTED });
  bundle.summary.warnings.forEach((w) => { wl++; label(wwl, wl, 1, w, { size: 9, color: WARN }); });
  page(wwl, { docId, sheetName: 'Worklist', titlesRow: '4:4' });
  await wwl.protect('', { selectLockedCells: true, selectUnlockedCells: true, autoFilter: true });

  // =====================================================================
  // 7 — Thermal Profile
  // =====================================================================
  const tp = reactionSheet.thermocyclerProfile || [];
  if (tp.length) {
    const wt = wb.addWorksheet('Thermal Profile', { views: [{ showGridLines: false }] });
    wt.columns = [{ width: 7 }, { width: 30 }, { width: 12 }, { width: 14 }, { width: 9 }, { width: 46 }];
    banner(wt, 'A1:F1', 'INSTRUMENT', 'Thermocycler profile', 6);
    tableHead(wt, 4, ['Step', 'Phase', 'Temp (°C)', 'Duration (s)', 'Cycles', 'Notes']);
    tp.forEach((s, i) => {
      const rr = 5 + i;
      band(wt, rr, 6, i % 2 === 1);
      wt.getCell(rr, 1).value = s.stepNumber;
      wt.getCell(rr, 1).alignment = { horizontal: 'center', vertical: 'middle' };
      label(wt, rr, 2, s.phase, { size: 10, bold: true });
      wt.getCell(rr, 3).value = s.tempCelsius;
      wt.getCell(rr, 3).numFmt = '0.0';
      wt.getCell(rr, 3).alignment = { horizontal: 'center', vertical: 'middle' };
      wt.getCell(rr, 4).value = s.durationSeconds;
      wt.getCell(rr, 4).alignment = { horizontal: 'center', vertical: 'middle' };
      wt.getCell(rr, 5).value = s.cycles ?? 1;
      wt.getCell(rr, 5).alignment = { horizontal: 'center', vertical: 'middle' };
      label(wt, rr, 6, s.notes || '', { size: 9, color: MUTED });
    });
    const lastT = 4 + tp.length;
    const tot = lastT + 2;
    label(wt, tot, 2, 'Estimated run time (min)', { bold: true });
    const tc = wt.getCell(tot, 4);
    tc.value = {
      formula: `ROUND(SUMPRODUCT(D5:D${lastT},E5:E${lastT})/60,1)`,
      result: Math.round((tp.reduce((a, s) => a + s.durationSeconds * (s.cycles ?? 1), 0) / 60) * 10) / 10,
    };
    asCalc(tc, '0.0');
    page(wt, { docId, sheetName: 'Thermal Profile', titlesRow: '4:4' });
    await wt.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  }

  // =====================================================================
  // 8 — Protocol: so the workbook can stand alone at the bench
  // =====================================================================
  if (sop) {
    const wpr = wb.addWorksheet('Protocol', { views: [{ showGridLines: false }] });
    wpr.columns = [{ width: 7 }, { width: 32 }, { width: 88 }, { width: 10 }];
    banner(wpr, 'A1:D1', 'METHOD', sop.title, 4);
    let p = 4;

    if (sop.hazards?.length || sop.ppeRequirements?.length) {
      sectionRule(wpr, p++, 4, 'SAFETY');
      (sop.hazards || []).forEach((h) => {
        label(wpr, p, 2, h.label, { bold: true, size: 9, color: BAD });
        label(wpr, p, 3, h.description, { size: 9 });
        wpr.getRow(p).height = 26;
        p++;
      });
      const ppe = (sop.ppeRequirements || []).map((x) => x.item).join(', ');
      if (ppe) {
        label(wpr, p, 2, 'PPE', { bold: true, size: 9, color: BAD });
        label(wpr, p, 3, ppe, { size: 9 });
        p++;
      }
      p++;
    }

    sectionRule(wpr, p++, 4, 'STEPS');
    tableHead(wpr, p, ['#', 'Step', 'Instruction', 'Done']);
    p++;
    (sop.steps || []).forEach((s, i) => {
      band(wpr, p, 4, i % 2 === 1);
      wpr.getCell(p, 1).value = s.stepNumber;
      wpr.getCell(p, 1).alignment = { horizontal: 'center', vertical: 'top' };
      label(wpr, p, 2, s.title, { bold: true, size: 10 });
      const bits = [s.instruction];
      if (s.timingMinutes) bits.push(`(${s.timingMinutes} min${s.tempCelsius !== undefined ? ` at ${s.tempCelsius} °C` : ''})`);
      if (s.criticalCheckpoint) bits.push(`Checkpoint: ${s.criticalCheckpoint}`);
      if (s.safetyWarning) bits.push(`Safety: ${s.safetyWarning}`);
      label(wpr, p, 3, bits.join('  '), { size: 9 });
      wpr.getCell(p, 3).alignment = { wrapText: true, vertical: 'top' };
      asInput(wpr.getCell(p, 4));
      wpr.getRow(p).height = 36;
      p++;
    });

    if (sop.qualityControl?.length) {
      p++;
      sectionRule(wpr, p++, 4, 'QUALITY CONTROL — acceptance criteria');
      sop.qualityControl.forEach((q, i) => {
        band(wpr, p, 4, i % 2 === 1);
        label(wpr, p, 2, `QC ${i + 1}`, { bold: true, size: 9 });
        label(wpr, p, 3, q, { size: 9 });
        wpr.getCell(p, 3).alignment = { wrapText: true, vertical: 'top' };
        asInput(wpr.getCell(p, 4));
        wpr.getRow(p).height = 30;
        p++;
      });
    }

    if (sop.troubleshooting?.length) {
      p++;
      sectionRule(wpr, p++, 4, 'TROUBLESHOOTING');
      tableHead(wpr, p, ['#', 'Problem', 'Likely cause and what to do']);
      p++;
      sop.troubleshooting.forEach((t, i) => {
        band(wpr, p, 4, i % 2 === 1);
        wpr.getCell(p, 1).value = i + 1;
        wpr.getCell(p, 1).alignment = { horizontal: 'center', vertical: 'top' };
        label(wpr, p, 2, t.issue, { bold: true, size: 9 });
        label(wpr, p, 3, `${t.cause}  ${t.solution}`, { size: 9 });
        wpr.getCell(p, 3).alignment = { wrapText: true, vertical: 'top' };
        wpr.getRow(p).height = 34;
        p++;
      });
    }
    page(wpr, { docId, sheetName: 'Protocol' });
    await wpr.protect('', { selectLockedCells: true, selectUnlockedCells: true });
  }

  // =====================================================================
  // 9 — Reagents & Cost
  // =====================================================================
  const wc = wb.addWorksheet('Reagents & Cost', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
  wc.columns = [{ width: 30 }, { width: 11 }, { width: 13 }, { width: 24 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 11 }];
  banner(wc, 'A1:H1', 'CONSUMPTION', 'What this run costs and what you need on the shelf', 8);
  tableHead(wc, 4, ['Component', 'µL / rxn', 'µL for run', 'Supplier', 'Catalogue', '$ / µL', 'Run cost', 'On hand?']);
  let cr = 5;
  const costFirst = cr;
  let estimatedTotal = 0;
  ordered.forEach((c, i) => {
    const price = matchReagentPriceFromCatalog(c.name);
    const runVolume = c.volPerRxnMicroliters * mm.effectiveReactions;
    estimatedTotal += runVolume * (price.costPerMicroliter || 0);
    band(wc, cr, 8, i % 2 === 1);
    label(wc, cr, 1, c.name, { size: 9, bold: true });
    const perRxn = wc.getCell(cr, 2);
    perRxn.value = { formula: `'Master Mix'!I${first + i}`, result: Number(c.volPerRxnMicroliters.toFixed(2)) };
    perRxn.numFmt = '0.00';
    perRxn.alignment = { horizontal: 'center', vertical: 'middle' };
    const runV = wc.getCell(cr, 3);
    // Total consumed, not the master-mix volume. A per-tube component is still pipetted into every
    // reaction, so referencing the mix column here would report zero template used and understate
    // the run cost the moment Excel recalculated.
    runV.value = { formula: `'Master Mix'!I${first + i}*N_EFF`, result: Number(runVolume.toFixed(2)) };
    runV.numFmt = '0.00';
    runV.alignment = { horizontal: 'center', vertical: 'middle' };
    label(wc, cr, 4, price.supplier || '', { size: 9, color: MUTED });
    label(wc, cr, 5, price.catalogNumber || '', { size: 9, color: MUTED });
    const cpu = wc.getCell(cr, 6);
    cpu.value = price.costPerMicroliter || 0;
    cpu.numFmt = '$0.0000';
    cpu.alignment = { horizontal: 'center', vertical: 'middle' };
    const cost = wc.getCell(cr, 7);
    cost.value = { formula: `ROUND(C${cr}*F${cr},2)`, result: money(runVolume * (price.costPerMicroliter || 0)) };
    asCalc(cost, '$0.00');
    asInput(wc.getCell(cr, 8));
    cr++;
  });
  const costLast = cr - 1;
  validate(wc, `H${costFirst}:H${costLast}`, { type: 'list', allowBlank: true, formulae: ['"Yes,No,Order"'] });
  cr++;
  for (let i = 1; i <= 8; i++) { fill(wc.getCell(cr, i), ACCENT); wc.getCell(cr, i).border = boxed; }
  label(wc, cr, 1, 'TOTAL PER RUN', { bold: true, size: 11, color: PAPER });
  const totalCost = wc.getCell(cr, 7);
  totalCost.value = { formula: `ROUND(SUM(G${costFirst}:G${costLast}),2)`, result: money(estimatedTotal) };
  totalCost.numFmt = '$0.00';
  totalCost.font = { name: FONT, size: 12, bold: true, color: { argb: PAPER } };
  totalCost.alignment = { horizontal: 'center', vertical: 'middle' };
  wc.getRow(cr).height = 26;
  const totalRow = cr;
  cr++;
  label(wc, cr, 1, 'Per reaction', { bold: true });
  const perRxnCost = wc.getCell(cr, 7);
  perRxnCost.value = { formula: `IF(N_RXN>0,ROUND(G${totalRow}/N_RXN,2),0)`, result: nRxn > 0 ? money(estimatedTotal / nRxn) : 0 };
  asCalc(perRxnCost, '$0.00');
  cr += 2;
  wc.mergeCells(cr, 1, cr, 8);
  label(wc, cr, 1, 'Prices come from the built-in catalogue and are indicative only. They are not a quote, and they do not know what your institution actually pays.', { size: 9, color: WARN });
  wc.getRow(cr).height = 18;
  wc.autoFilter = { from: { row: 4, column: 1 }, to: { row: costLast, column: 8 } };
  page(wc, { docId, sheetName: 'Reagents & Cost', landscape: true, titlesRow: '4:4' });
  await wc.protect('', { selectLockedCells: true, selectUnlockedCells: true, autoFilter: true });

  // =====================================================================
  // 10 — Checks
  // =====================================================================
  const wch = wb.addWorksheet('Checks', { views: [{ showGridLines: false }] });
  wch.columns = [{ width: 12 }, { width: 26 }, { width: 58 }, { width: 58 }];
  banner(wch, 'A1:D1', 'WHAT WAS CHECKED', 'Findings from the calculation engine', 4);
  const allFindings = [...calc.findings, ...mm.findings];
  let fr = 4;
  if (allFindings.length) {
    tableHead(wch, fr, ['Severity', 'Code', 'Finding', 'What to do']);
    fr++;
    allFindings.forEach((f, i) => {
      band(wch, fr, 4, i % 2 === 1);
      const sev = wch.getCell(fr, 1);
      sev.value = f.severity;
      sev.font = { name: FONT, size: 9, bold: true, color: { argb: f.severity === 'ERROR' ? BAD : f.severity === 'WARNING' ? WARN : MUTED } };
      sev.alignment = { horizontal: 'center', vertical: 'middle' };
      label(wch, fr, 2, f.code, { size: 8, color: MUTED });
      label(wch, fr, 3, f.message, { size: 9 });
      label(wch, fr, 4, f.remedy || '', { size: 9, color: MUTED });
      wch.getCell(fr, 3).alignment = { wrapText: true, vertical: 'top' };
      wch.getCell(fr, 4).alignment = { wrapText: true, vertical: 'top' };
      wch.getRow(fr).height = 32;
      fr++;
    });
  } else {
    label(wch, fr++, 1, 'The calculation engine raised no findings on this reaction.', { size: 10, color: OK });
  }
  fr += 2;
  sectionRule(wch, fr++, 4, 'COVERAGE');
  const coverage: [string, string][] = [
    ['Components', `${calc.totalComponentCount}`],
    ['Independently verified from C1V1', `${calc.verifiableComponentCount} of ${calc.totalComponentCount}`],
    ['Reaction closes to target volume', calc.volumeBalanced ? 'Yes' : 'No'],
    ['NOT checked', 'Whether the science is right for your cells, samples, containment level or institutional rules.'],
  ];
  coverage.forEach(([k, v]) => {
    label(wch, fr, 1, k, { bold: true, size: 9, color: MUTED });
    label(wch, fr, 3, v, { size: 9 });
    wch.getRow(fr).height = 22;
    fr++;
  });
  page(wch, { docId, sheetName: 'Checks' });
  await wch.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // =====================================================================
  // 11 — About
  // =====================================================================
  const wp = wb.addWorksheet('About', { views: [{ showGridLines: false }] });
  wp.columns = [{ width: 112 }];
  banner(wp, 'A1:A1', 'PROVENANCE', 'How these numbers were derived', 1);
  const notes: string[] = [
    `Generated ${new Date().toISOString()} by BioSOP Generator.`,
    sop ? `Source document: ${docId} v${sop.version || ''} — ${sop.title}` : '',
    '',
    'LIVE CELLS. Where stock and final units could be reconciled, µL/rxn is an Excel formula of the form final x reaction volume / (stock x factor). Edit a concentration and the sheet recalculates.',
    'THE FACTOR COLUMN. Excel cannot do the unit algebra this app does (molar to mass, activity, percent, fold, and mass to molar using molecular weight). The factor converts the stock unit into the final unit and is computed once, when the workbook is written. It stays correct while the row keeps the units it was written with. Change a unit string and you must re-export.',
    'PINK CELLS. Rows whose units could not be reconciled keep the volume as written in the protocol, locked, with the reason stated. They are not silently converted, and they are not silently wrong.',
    'THE DILUENT. Balances the reaction against the Setup reaction volume, so the total always closes. If it turns red it has gone negative, which means the other components already exceed the reaction volume.',
    'PER-TUBE COMPONENTS. Anything marked N under "In mix?" is added to each reaction individually and is never scaled into the shared mix.',
    '',
    'This workbook is a calculation aid, not a validated system, and it makes no claim of ISO, GLP, GMP or 21 CFR 11 conformance. Verify critical volumes independently before you run anything that matters.',
  ].filter((x) => x !== '');
  notes.forEach((text, i) => {
    const c = wp.getCell(4 + i, 1);
    c.value = text;
    c.font = { name: FONT, size: 9, color: { argb: text.startsWith('This workbook') ? WARN : INK } };
    c.alignment = { wrapText: true, vertical: 'top' };
    wp.getRow(4 + i).height = text.length > 200 ? 56 : text.length > 100 ? 42 : 16;
  });
  page(wp, { docId, sheetName: 'About' });
  await wp.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // Open on the calculator, not on the Run Record.
  //
  // Run Record is deliberately a form: operator, date, lot numbers and signatures are all empty
  // because they get filled in at the bench. As sheet 1 that made the whole workbook read as blank
  // on opening, with the actual master mix two tabs away and unseen. The first thing you should see
  // is the thing you came for.
  const masterMixIndex = wb.worksheets.findIndex((w) => w.name === 'Master Mix');
  if (masterMixIndex >= 0) {
    wb.views = [{
      x: 0, y: 0, width: 24000, height: 18000,
      firstSheet: 0, activeTab: masterMixIndex, visibility: 'visible',
    }];
    // Exactly one sheet may claim the selected tab, or Excel flags the workbook as inconsistent.
    wb.worksheets.forEach((w, i) => {
      w.views = (w.views || []).map((v) => ({ ...v, tabSelected: i === masterMixIndex }));
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
