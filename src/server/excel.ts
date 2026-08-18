import ExcelJS from 'exceljs';
import { ReactionSheet } from '../types';
import { matchReagentPriceFromCatalog, DEFAULT_LAB_CONSUMABLES } from '../data/reagentPricingCatalog';

export async function generateExcelWorkbook(reactionSheet: ReactionSheet): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BioSOP & Excel Reaction Sheet Generator';
  workbook.lastModifiedBy = 'Lab System';
  workbook.created = new Date();

  // ----------------------------------------------------
  // SHEET 1: Master Mix Calculator
  // ----------------------------------------------------
  const sheet1 = workbook.addWorksheet('Master Mix Calculator', {
    views: [{ showGridLines: true }]
  });

  // Title styling
  sheet1.mergeCells('A1:G1');
  const titleCell = sheet1.getCell('A1');
  titleCell.value = `REACTION SHEET: ${reactionSheet.title.toUpperCase()}`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Dark Slate
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 32;

  // Metadata block
  sheet1.getCell('A3').value = 'Assay Type:';
  sheet1.getCell('B3').value = reactionSheet.assayType;
  sheet1.getCell('D3').value = 'Single Rxn Vol (µL):';
  sheet1.getCell('E3').value = reactionSheet.reactionVolumeMicroliters;

  sheet1.getCell('A4').value = 'Default Rxn Count:';
  sheet1.getCell('B4').value = reactionSheet.defaultNumReactions;
  sheet1.getCell('D4').value = 'Overflow (%):';
  sheet1.getCell('E4').value = `${reactionSheet.defaultOverflowPercent}%`;

  ['A3', 'D3', 'A4', 'D4'].forEach((cellId) => {
    const cell = sheet1.getCell(cellId);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  });

  // Table Headers
  const headers = [
    'Order',
    'Component Name',
    'Stock Conc',
    'Final Conc',
    'Vol / 1 Rxn (µL)',
    `Vol / N Rxns (µL)`,
    'Storage & Notes'
  ];

  const headerRowIndex = 6;
  const headerRow = sheet1.getRow(headerRowIndex);
  headers.forEach((headerText, colIndex) => {
    const cell = headerRow.getCell(colIndex + 1);
    cell.value = headerText;
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }; // Medical Blue
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });
  headerRow.height = 24;

  // Add Components
  let startDataRow = 7;
  const numReactions = reactionSheet.defaultNumReactions;
  const overflowMultiplier = 1 + (reactionSheet.defaultOverflowPercent / 100);

  reactionSheet.components.forEach((comp, idx) => {
    const rowIdx = startDataRow + idx;
    const row = sheet1.getRow(rowIdx);

    const totalVol = comp.volPerRxnMicroliters * numReactions * overflowMultiplier;

    row.getCell(1).value = comp.pipettingOrder || idx + 1;
    row.getCell(2).value = comp.name;
    row.getCell(3).value = `${comp.stockConc} ${comp.stockUnit}`;
    row.getCell(4).value = `${comp.finalConc} ${comp.finalUnit}`;
    row.getCell(5).value = comp.volPerRxnMicroliters;
    row.getCell(6).value = Number(totalVol.toFixed(2));
    row.getCell(7).value = comp.notes ? `[${comp.storageTemp || 'Cold'}] ${comp.notes}` : (comp.storageTemp || 'Cold');

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'right' };
    row.getCell(6).alignment = { horizontal: 'right' };
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).numFmt = '#,##0.00';

    // Zebra striping
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 10 };
      if (!cell.fill?.type) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }
  });

  // Total Summary Row
  const totalRowIdx = startDataRow + reactionSheet.components.length;
  const totalRow = sheet1.getRow(totalRowIdx);
  totalRow.getCell(2).value = 'TOTAL VOLUME:';
  totalRow.getCell(2).font = { name: 'Arial', size: 11, bold: true };
  totalRow.getCell(2).alignment = { horizontal: 'right' };

  // Calculate sums
  const sumSingleVol = reactionSheet.components.reduce((acc, c) => acc + c.volPerRxnMicroliters, 0);
  const sumTotalVol = sumSingleVol * numReactions * overflowMultiplier;

  totalRow.getCell(5).value = Number(sumSingleVol.toFixed(2));
  totalRow.getCell(5).font = { name: 'Arial', size: 11, bold: true };
  totalRow.getCell(5).alignment = { horizontal: 'right' };
  totalRow.getCell(5).numFmt = '#,##0.00';

  totalRow.getCell(6).value = Number(sumTotalVol.toFixed(2));
  totalRow.getCell(6).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0284C7' } };
  totalRow.getCell(6).alignment = { horizontal: 'right' };
  totalRow.getCell(6).numFmt = '#,##0.00';

  for (let c = 1; c <= 7; c++) {
    const cell = totalRow.getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } }
    };
  }

  // Auto column widths
  sheet1.columns = [
    { width: 8 },  // Order
    { width: 34 }, // Component Name
    { width: 16 }, // Stock Conc
    { width: 16 }, // Final Conc
    { width: 18 }, // Vol / 1 Rxn
    { width: 20 }, // Vol / N Rxns
    { width: 38 }  // Notes
  ];

  // ----------------------------------------------------
  // SHEET 2: Step-by-Step Reaction Protocol & Conditions
  // ----------------------------------------------------
  if (reactionSheet.stepByStepReactionSteps && reactionSheet.stepByStepReactionSteps.length > 0) {
    const sheetSteps = workbook.addWorksheet('Reaction Steps & Conditions', { views: [{ showGridLines: true }] });

    sheetSteps.mergeCells('A1:G1');
    const sCell = sheetSteps.getCell('A1');
    sCell.value = `STEP-BY-STEP REACTION PROTOCOL & CONDITIONS`;
    sCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    sCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheetSteps.getRow(1).height = 28;

    const sHeaders = ['Step #', 'Step Name & Phase', 'Operating Conditions', 'Reagents & Amounts / Volumes', 'Instructions', 'Critical Checkpoints', 'Safety Warnings'];
    const sHeaderRow = sheetSteps.getRow(3);
    sHeaders.forEach((sh, i) => {
      const c = sHeaderRow.getCell(i + 1);
      c.value = sh;
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sHeaderRow.height = 24;

    reactionSheet.stepByStepReactionSteps.forEach((s, idx) => {
      const row = sheetSteps.getRow(4 + idx);
      row.getCell(1).value = s.stepNumber || idx + 1;
      row.getCell(2).value = `${s.stepName}\n[Phase: ${s.phase || 'Procedure'}]`;

      const condsText = [
        s.conditions || 'Standard Bench',
        s.tempCelsius !== undefined ? `Temp: ${s.tempCelsius}°C` : null,
        s.timingMinutes !== undefined ? `Time: ${s.timingMinutes} min` : null
      ].filter(Boolean).join('\n');
      row.getCell(3).value = condsText;

      const stepTotalVolSingle = (s.reagentsAndVolumes || []).reduce((sum, r) => sum + (r.volPerRxnMicroliters || 0), 0);
      const stepTotalVolScaled = stepTotalVolSingle * numReactions * overflowMultiplier;

      const reagentsList = (s.reagentsAndVolumes || [])
        .map((r) => `  • ${r.reagentName}: ${r.volPerRxnMicroliters} µL/rxn (${(r.volPerRxnMicroliters * numReactions * overflowMultiplier).toFixed(2)} µL for N=${numReactions})${r.finalAmountOrConc ? ` [${r.finalAmountOrConc}]` : ''}`)
        .join('\n');

      const reagentsText = s.reagentsAndVolumes && s.reagentsAndVolumes.length > 0
        ? `STEP MASTER MIX TOTAL: ${stepTotalVolScaled.toFixed(2)} µL (${stepTotalVolSingle.toFixed(2)} µL/rxn for N=${numReactions})\n${reagentsList}`
        : 'See Global Master Mix Table';

      row.getCell(4).value = reagentsText;

      row.getCell(5).value = s.instructions;
      row.getCell(6).value = s.criticalCheckpoint || '-';
      row.getCell(7).value = s.safetyWarning || '-';

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(5).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(6).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(7).alignment = { wrapText: true, vertical: 'top' };
    });

    sheetSteps.columns = [
      { width: 8 },
      { width: 28 },
      { width: 22 },
      { width: 36 },
      { width: 42 },
      { width: 28 },
      { width: 28 }
    ];
  }

  // ----------------------------------------------------
  // SHEET 3: Thermocycler & Incubation Protocol
  // ----------------------------------------------------
  if (reactionSheet.thermocyclerProfile && reactionSheet.thermocyclerProfile.length > 0) {
    const sheet2 = workbook.addWorksheet('Thermal Profile', { views: [{ showGridLines: true }] });

    sheet2.mergeCells('A1:F1');
    const tCell = sheet2.getCell('A1');
    tCell.value = `THERMOCYCLER / INCUBATION PROGRAM`;
    tCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    tCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet2.getRow(1).height = 28;

    const tHeaders = ['Step #', 'Phase / Action', 'Temp (°C)', 'Time (sec)', 'Cycles', 'Notes'];
    const tHeaderRow = sheet2.getRow(3);
    tHeaders.forEach((th, i) => {
      const c = tHeaderRow.getCell(i + 1);
      c.value = th;
      c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
      c.alignment = { horizontal: 'center' };
    });

    reactionSheet.thermocyclerProfile.forEach((step, idx) => {
      const row = sheet2.getRow(4 + idx);
      row.getCell(1).value = step.stepNumber || idx + 1;
      row.getCell(2).value = step.phase;
      row.getCell(3).value = step.tempCelsius;
      row.getCell(4).value = step.durationSeconds === 0 ? 'Hold' : step.durationSeconds;
      row.getCell(5).value = step.cycles || 1;
      row.getCell(6).value = step.notes || '';

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
    });

    sheet2.columns = [
      { width: 10 },
      { width: 28 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 35 }
    ];
  }

  // ----------------------------------------------------
  // SHEET 3: 96-Well Plate Layout
  // ----------------------------------------------------
  const sheet3 = workbook.addWorksheet('Plate Layout', { views: [{ showGridLines: true }] });
  sheet3.mergeCells('A1:M1');
  const pCell = sheet3.getCell('A1');
  pCell.value = '96-WELL REACTION PLATE MAP LAYOUT';
  pCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
  pCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Plate column numbers 1 to 12
  for (let col = 1; col <= 12; col++) {
    const c = sheet3.getCell(3, col + 1);
    c.value = col;
    c.font = { bold: true };
    c.alignment = { horizontal: 'center' };
  }

  const rowsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const mapping = reactionSheet.plateLayout?.wellMapping || {};

  rowsList.forEach((rLabel, rIdx) => {
    const rowNum = 4 + rIdx;
    const rCell = sheet3.getCell(rowNum, 1);
    rCell.value = rLabel;
    rCell.font = { bold: true };
    rCell.alignment = { horizontal: 'center' };

    for (let col = 1; col <= 12; col++) {
      const wellKey = `${rLabel}${col}`;
      const type = mapping[wellKey] || (col <= 8 && rIdx === 0 ? 'sample' : 'blank');
      const cell = sheet3.getCell(rowNum, col + 1);

      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };

      if (type === 'sample') {
        cell.value = `S${col}`;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }; // Light Blue
      } else if (type === 'control_pos') {
        cell.value = '+CTL';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green
        cell.font = { bold: true, color: { argb: 'FF15803D' } };
      } else if (type === 'control_neg') {
        cell.value = 'NTC';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
        cell.font = { bold: true, color: { argb: 'FFB91C1C' } };
      } else if (type === 'standard') {
        cell.value = `STD${col}`;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Light Yellow
      } else {
        cell.value = '-';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
  });

  sheet3.columns = [{ width: 6 }, ...Array(12).fill({ width: 9 })];

  // ----------------------------------------------------
  // SHEET 4: Reagent Cost Estimation & Budget
  // ----------------------------------------------------
  const sheet4 = workbook.addWorksheet('Reagent Cost & Budget', { views: [{ showGridLines: true }] });
  sheet4.mergeCells('A1:J1');
  const costTitleCell = sheet4.getCell('A1');
  costTitleCell.value = 'REAGENT COST ESTIMATION & RUN BUDGET PLANNER';
  costTitleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  costTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } }; // Dark Emerald
  costTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet4.getRow(1).height = 30;

  // Metadata block
  sheet4.getCell('A3').value = 'Protocol:';
  sheet4.getCell('B3').value = reactionSheet.title;
  sheet4.getCell('D3').value = 'Total Rxns (N):';
  sheet4.getCell('E3').value = numReactions;
  sheet4.getCell('G3').value = 'Overflow Buffer:';
  sheet4.getCell('H3').value = `${reactionSheet.defaultOverflowPercent}%`;

  ['A3', 'D3', 'G3'].forEach((id) => {
    sheet4.getCell(id).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
  });

  // Table headers
  const costHeaders = [
    '#',
    'Reagent Component',
    'Category',
    'Vol / 1 Rxn (µL)',
    `Run Vol (${numReactions} rxns µL)`,
    'Package Price ($)',
    'Package Size (µL)',
    'Cost / µL ($)',
    'Single Rxn Cost ($)',
    'Total Run Cost ($)',
    'Supplier & Catalog #'
  ];

  const cHeaderRow = sheet4.getRow(5);
  costHeaders.forEach((text, i) => {
    const cell = cHeaderRow.getCell(i + 1);
    cell.value = text;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Emerald 600
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });
  cHeaderRow.height = 24;

  const costStartRow = 6;
  reactionSheet.components.forEach((comp, idx) => {
    const rowIdx = costStartRow + idx;
    const row = sheet4.getRow(rowIdx);
    const match = matchReagentPriceFromCatalog(comp.name);

    const volPerRxn = comp.volPerRxnMicroliters || 1.0;
    const totalRunVol = volPerRxn * numReactions * overflowMultiplier;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = comp.name;
    row.getCell(3).value = match.category;
    row.getCell(4).value = volPerRxn;
    row.getCell(5).value = Number(totalRunVol.toFixed(2));
    row.getCell(6).value = match.packagePrice;
    row.getCell(7).value = match.effectiveVolumeMicroliters;
    
    // Formula for Cost/µL: =F{row}/G{row}
    row.getCell(8).value = { formula: `F${rowIdx}/G${rowIdx}`, result: match.costPerMicroliter };
    
    // Formula for Single Rxn Cost: =D{row}*H{row}
    row.getCell(9).value = { formula: `D${rowIdx}*H${rowIdx}`, result: volPerRxn * match.costPerMicroliter };

    // Formula for Total Run Cost: =E{row}*H{row}
    row.getCell(10).value = { formula: `E${rowIdx}*H${rowIdx}`, result: totalRunVol * match.costPerMicroliter };

    row.getCell(11).value = `${match.supplier} (${match.catalogNumber})`;

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(5).alignment = { horizontal: 'right' };
    row.getCell(6).alignment = { horizontal: 'right' };
    row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(8).alignment = { horizontal: 'right' };
    row.getCell(9).alignment = { horizontal: 'right' };
    row.getCell(10).alignment = { horizontal: 'right' };

    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(6).numFmt = '$#,##0.00';
    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).numFmt = '$#,##0.0000';
    row.getCell(9).numFmt = '$#,##0.000';
    row.getCell(10).numFmt = '$#,##0.00';

    row.getCell(10).font = { bold: true, color: { argb: 'FF065F46' } };
    row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };

    // Zebra striping
    if (idx % 2 === 1) {
      for (let c = 1; c <= 9; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
  });

  // Reagents Total Row
  const endCostRow = costStartRow + reactionSheet.components.length - 1;
  const totalCostRowIdx = endCostRow + 1;
  const totalCostRow = sheet4.getRow(totalCostRowIdx);

  totalCostRow.getCell(3).value = 'TOTAL REAGENT EXPENDITURE:';
  totalCostRow.getCell(4).value = { formula: `SUM(D${costStartRow}:D${endCostRow})` };
  totalCostRow.getCell(5).value = { formula: `SUM(E${costStartRow}:E${endCostRow})` };
  totalCostRow.getCell(9).value = { formula: `SUM(I${costStartRow}:I${endCostRow})` };
  totalCostRow.getCell(10).value = { formula: `SUM(J${costStartRow}:J${endCostRow})` };

  totalCostRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  totalCostRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  totalCostRow.getCell(4).numFmt = '#,##0.00 µL';
  totalCostRow.getCell(5).numFmt = '#,##0.00 µL';
  totalCostRow.getCell(9).numFmt = '$#,##0.000';
  totalCostRow.getCell(10).numFmt = '$#,##0.00';
  totalCostRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };

  sheet4.columns = [
    { width: 6 },
    { width: 28 },
    { width: 20 },
    { width: 15 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 32 }
  ];

  // Output buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(arrayBuffer as ArrayBuffer);
}
