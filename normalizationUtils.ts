import ExcelJS from 'exceljs';
import { parseLocaleNumber } from '../core/units';
import {
  DnaNormalizationConfig,
  DnaNormalizationResult,
  DnaNormalizationSample
} from '../types';

export const DEFAULT_NORMALIZATION_CONFIG: DnaNormalizationConfig = {
  mode: 'TARGET_MASS_AND_VOLUME',
  targetMassNg: 100, // 100 ng input (standard for NGS library prep / enzymatics)
  targetVolumeUl: 25.0, // 25 µL starting volume for protocol
  targetConcNgPerUl: 4.0, // 100 ng / 25 µL = 4.0 ng/µL
  diluentName: '10 mM Tris-HCl pH 8.5 / Nuclease-Free Water',
  minPipettingVolumeUl: 1.0,
  maxSampleVolumeUl: 50.0
};

/**
 * Standard 96-well plate well coordinate generator (A1..A12, B1..B12, ..., H1..H12)
 */
export function getStandard96WellPositions(): string[] {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const wells: string[] = [];
  for (const r of rows) {
    for (let c = 1; c <= 12; c++) {
      wells.push(`${r}${c}`);
    }
  }
  return wells;
}

/**
 * Recalculate a single sample's normalization values
 */
export function calculateSampleNormalization(
  sample: {
    id: string;
    sampleId: string;
    wellPosition: string;
    initialConcNgPerUl: number;
    initialVolumeUl?: number;
    notes?: string;
  },
  config: DnaNormalizationConfig
): DnaNormalizationSample {
  const initConc = Math.max(0, sample.initialConcNgPerUl);
  const targetVol = Math.max(0.1, config.targetVolumeUl);

  let targetMass = config.targetMassNg;
  let targetConc = config.targetConcNgPerUl;

  if (config.mode === 'TARGET_MASS_AND_VOLUME') {
    targetMass = Math.max(0.1, config.targetMassNg);
    targetConc = targetMass / targetVol;
  } else {
    targetConc = Math.max(0.01, config.targetConcNgPerUl);
    targetMass = targetConc * targetVol;
  }

  // Handle zero concentration
  if (initConc <= 0) {
    return {
      id: sample.id,
      sampleId: sample.sampleId,
      wellPosition: sample.wellPosition,
      initialConcNgPerUl: 0,
      initialVolumeUl: sample.initialVolumeUl,
      targetMassNg: targetMass,
      targetVolumeUl: targetVol,
      sampleVolumeUl: targetVol,
      bufferVolumeUl: 0,
      finalConcNgPerUl: 0,
      finalMassNg: 0,
      status: 'TOO_DILUTE',
      warning: 'Zero/undetectable DNA concentration measured. Quantification required.',
      notes: sample.notes
    };
  }

  // Raw theoretical sample volume required: V_sample = Target_Mass / C_init
  const rawSampleVol = targetMass / initConc;

  // Case 1: Sample is too dilute (required volume exceeds total starting volume of reaction)
  if (rawSampleVol > targetVol) {
    const maxSampleVol = targetVol;
    const finalMass = initConc * maxSampleVol;
    const finalConc = initConc;

    return {
      id: sample.id,
      sampleId: sample.sampleId,
      wellPosition: sample.wellPosition,
      initialConcNgPerUl: initConc,
      initialVolumeUl: sample.initialVolumeUl,
      targetMassNg: targetMass,
      targetVolumeUl: targetVol,
      sampleVolumeUl: Number(maxSampleVol.toFixed(2)),
      bufferVolumeUl: 0,
      finalConcNgPerUl: Number(finalConc.toFixed(2)),
      finalMassNg: Number(finalMass.toFixed(1)),
      status: 'TOO_DILUTE',
      warning: `Too dilute (${initConc.toFixed(1)} ng/µL). Max volume (${targetVol} µL) yields ${finalMass.toFixed(1)} ng of target ${targetMass} ng. Use SpeedVac/beads to concentrate.`,
      notes: sample.notes
    };
  }

  // Case 2: Sample is very concentrated (requires < min pipetting volume e.g. < 1.0 µL)
  if (rawSampleVol < config.minPipettingVolumeUl) {
    const minVol = config.minPipettingVolumeUl;
    const bufferVol = Math.max(0, targetVol - minVol);
    const finalMass = initConc * minVol;
    const finalConc = finalMass / targetVol;

    return {
      id: sample.id,
      sampleId: sample.sampleId,
      wellPosition: sample.wellPosition,
      initialConcNgPerUl: initConc,
      initialVolumeUl: sample.initialVolumeUl,
      targetMassNg: targetMass,
      targetVolumeUl: targetVol,
      sampleVolumeUl: Number(minVol.toFixed(2)),
      bufferVolumeUl: Number(bufferVol.toFixed(2)),
      finalConcNgPerUl: Number(finalConc.toFixed(2)),
      finalMassNg: Number(finalMass.toFixed(1)),
      status: 'HIGH_CONC_PREDILUTE',
      warning: `High concentration (${initConc.toFixed(1)} ng/µL) needs ${rawSampleVol.toFixed(2)} µL (< ${config.minPipettingVolumeUl} µL). Perform 1:10 pre-dilution or use ${minVol} µL.`,
      notes: sample.notes
    };
  }

  // Case 3: Insufficient volume available in stock tube
  if (sample.initialVolumeUl !== undefined && rawSampleVol > sample.initialVolumeUl) {
    const bufferVol = Math.max(0, targetVol - rawSampleVol);
    return {
      id: sample.id,
      sampleId: sample.sampleId,
      wellPosition: sample.wellPosition,
      initialConcNgPerUl: initConc,
      initialVolumeUl: sample.initialVolumeUl,
      targetMassNg: targetMass,
      targetVolumeUl: targetVol,
      sampleVolumeUl: Number(rawSampleVol.toFixed(2)),
      bufferVolumeUl: Number(bufferVol.toFixed(2)),
      finalConcNgPerUl: Number(targetConc.toFixed(2)),
      finalMassNg: Number(targetMass.toFixed(1)),
      status: 'INSUFFICIENT_VOLUME',
      warning: `Required volume (${rawSampleVol.toFixed(1)} µL) exceeds available stock volume (${sample.initialVolumeUl} µL).`,
      notes: sample.notes
    };
  }

  // Case 4: Perfectly normalized
  const sampleVol = Number(rawSampleVol.toFixed(2));
  const bufferVol = Number(Math.max(0, targetVol - sampleVol).toFixed(2));
  const finalMass = Number((initConc * sampleVol).toFixed(1));
  const finalConc = Number((finalMass / targetVol).toFixed(2));

  return {
    id: sample.id,
    sampleId: sample.sampleId,
    wellPosition: sample.wellPosition,
    initialConcNgPerUl: initConc,
    initialVolumeUl: sample.initialVolumeUl,
    targetMassNg: targetMass,
    targetVolumeUl: targetVol,
    sampleVolumeUl: sampleVol,
    bufferVolumeUl: bufferVol,
    finalConcNgPerUl: finalConc,
    finalMassNg: finalMass,
    status: 'NORMALIZED',
    notes: sample.notes
  };
}

/**
 * Recalculate full normalization result dataset
 */
export function recalculateAllNormalization(
  rawSamples: Array<{
    id?: string;
    sampleId: string;
    wellPosition: string;
    initialConcNgPerUl: number;
    initialVolumeUl?: number;
    notes?: string;
  }>,
  config: DnaNormalizationConfig
): DnaNormalizationResult {
  const samples: DnaNormalizationSample[] = rawSamples.map((s, idx) => {
    return calculateSampleNormalization(
      {
        id: s.id || `smp-${idx + 1}`,
        sampleId: s.sampleId || `Sample_${idx + 1}`,
        wellPosition: s.wellPosition || `A${(idx % 12) + 1}`,
        initialConcNgPerUl: s.initialConcNgPerUl,
        initialVolumeUl: s.initialVolumeUl,
        notes: s.notes
      },
      config
    );
  });

  const totalSamples = samples.length;
  const normalizedCount = samples.filter((s) => s.status === 'NORMALIZED').length;
  const tooDiluteCount = samples.filter((s) => s.status === 'TOO_DILUTE').length;
  const highConcCount = samples.filter((s) => s.status === 'HIGH_CONC_PREDILUTE').length;

  const totalDiluentNeededUl = Number(
    samples.reduce((acc, s) => acc + s.bufferVolumeUl, 0).toFixed(1)
  );
  const totalSampleVolumeNeededUl = Number(
    samples.reduce((acc, s) => acc + s.sampleVolumeUl, 0).toFixed(1)
  );

  const averageInputConcNgPerUl =
    totalSamples > 0
      ? Number((samples.reduce((acc, s) => acc + s.initialConcNgPerUl, 0) / totalSamples).toFixed(1))
      : 0;

  return {
    config,
    samples,
    totalSamples,
    normalizedCount,
    tooDiluteCount,
    highConcCount,
    totalDiluentNeededUl,
    totalSampleVolumeNeededUl,
    averageInputConcNgPerUl
  };
}

/**
 * Parse uploaded Excel (.xlsx, .xls) or CSV / TSV file into normalization samples
 */
export async function parseUploadedSpreadsheet(file: File): Promise<{
  samples: Array<{
    sampleId: string;
    wellPosition: string;
    initialConcNgPerUl: number;
    initialVolumeUl?: number;
    notes?: string;
  }>;
  fileName: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  // exceljs replaces the SheetJS `xlsx` package, which carried an unpatched
  // prototype-pollution advisory in exactly this code path (reading user files).
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Spreadsheet file has no worksheets.');

  const rawRows: any[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const vals = row.values as any[]; // 1-based; index 0 is undefined
    const cells: any[] = [];
    for (let c = 1; c < vals.length; c++) {
      let v = vals[c];
      if (v && typeof v === 'object') {
        if ('result' in v) v = (v as { result: unknown }).result;
        else if ('richText' in v) v = (v as { richText: { text: string }[] }).richText.map((t) => t.text).join('');
        else if ('text' in v) v = (v as { text: string }).text;
        else if (v instanceof Date) v = v.toISOString();
      }
      cells.push(v);
    }
    rawRows.push(cells);
  });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Spreadsheet file is empty.');
  }

  // Find header row (search first 10 rows for columns matching sample / conc)
  let headerRowIdx = -1;
  let idColIdx = -1;
  let concColIdx = -1;
  let wellColIdx = -1;
  let volColIdx = -1;

  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').toLowerCase().trim();

      if (
        val.includes('sample') ||
        val.includes('name') ||
        val.includes('tube') ||
        val === 'id' ||
        val === 'sample_id'
      ) {
        if (idColIdx === -1) idColIdx = c;
      }

      if (
        val.includes('conc') ||
        val.includes('ng/ul') ||
        val.includes('ng/µl') ||
        val.includes('qubit') ||
        val.includes('nanodrop') ||
        val.includes('[dna]') ||
        val.includes('dna conc')
      ) {
        if (concColIdx === -1) concColIdx = c;
      }

      if (val.includes('well') || val.includes('position') || val.includes('pos')) {
        if (wellColIdx === -1) wellColIdx = c;
      }

      if (
        val.includes('volume') ||
        val.includes('vol') ||
        val.includes('stock vol') ||
        val.includes('ul') ||
        val.includes('µl')
      ) {
        if (volColIdx === -1 && c !== concColIdx) volColIdx = c;
      }
    }

    if (idColIdx !== -1 && concColIdx !== -1) {
      headerRowIdx = r;
      break;
    }
  }

  // If no explicit headers matched, assume Col 0 = Sample ID, Col 1 = Conc, Col 2 = Well
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    idColIdx = 0;
    concColIdx = 1;
    wellColIdx = 2;
  }

  const default96Wells = getStandard96WellPositions();
  const parsedSamples: Array<{
    sampleId: string;
    wellPosition: string;
    initialConcNgPerUl: number;
    initialVolumeUl?: number;
    notes?: string;
  }> = [];

  let sampleIndex = 0;
  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawId = row[idColIdx];
    const rawConc = row[concColIdx];
    const rawWell = wellColIdx !== -1 ? row[wellColIdx] : undefined;
    const rawVol = volColIdx !== -1 ? row[volColIdx] : undefined;

    if (rawId === undefined && rawConc === undefined) continue;

    const sampleId = String(rawId || `Sample_${sampleIndex + 1}`).trim();
    const concParsedMaybe = parseLocaleNumber(rawConc as string | number);
    const concParsed = concParsedMaybe === null ? NaN : concParsedMaybe;
    if (isNaN(concParsed) && !sampleId) continue;

    const initialConcNgPerUl = isNaN(concParsed) ? 0 : Math.max(0, concParsed);
    const wellPosition =
      rawWell && String(rawWell).trim().length > 0
        ? String(rawWell).trim().toUpperCase()
        : default96Wells[sampleIndex % default96Wells.length];

    const volParsed = rawVol !== undefined ? parseFloat(String(rawVol).replace(/[^0-9.-]/g, '')) : undefined;
    const initialVolumeUl = !isNaN(volParsed as number) ? (volParsed as number) : undefined;

    parsedSamples.push({
      sampleId,
      wellPosition,
      initialConcNgPerUl,
      initialVolumeUl,
      notes: `Imported from ${file.name}`
    });

    sampleIndex++;
  }

  if (parsedSamples.length === 0) {
    throw new Error('No valid sample concentration rows found in the uploaded file.');
  }

  return {
    samples: parsedSamples,
    fileName: file.name
  };
}

/**
 * Pre-built sample datasets for quick testing and demonstrations
 */
export const SAMPLE_NORMALIZATION_PRESETS: Array<{
  name: string;
  description: string;
  targetMassNg: number;
  targetVolumeUl: number;
  samples: Array<{ sampleId: string; wellPosition: string; initialConcNgPerUl: number; initialVolumeUl?: number }>;
}> = [
  {
    name: '96-Well Genomic DNA Cohort (Illumina WGS Prep)',
    description: '96 clinical genomic DNA samples with varied Qubit yields (8 to 145 ng/µL) normalized to 100 ng in 25 µL.',
    targetMassNg: 100,
    targetVolumeUl: 25,
    samples: getStandard96WellPositions().map((well, idx) => {
      // Deterministic spread of concentrations with some dilute, some ideal, some high
      const concs = [
        45.2, 78.6, 22.4, 110.5, 33.1, 95.4, 12.8, 64.0, 18.2, 88.3, 52.1, 142.0,
        3.5, 58.9, 82.1, 41.3, 99.0, 29.4, 76.5, 15.0, 68.2, 104.1, 49.0, 31.8
      ];
      const baseConc = concs[idx % concs.length];
      const jitter = ((idx * 7) % 15) - 7;
      const initialConcNgPerUl = Math.max(2.5, Number((baseConc + jitter).toFixed(1)));
      return {
        sampleId: `G-DNA_${String(idx + 1).padStart(3, '0')}`,
        wellPosition: well,
        initialConcNgPerUl,
        initialVolumeUl: 50
      };
    })
  },
  {
    name: '24-Sample NGS Amplicon Library (Target 50 ng in 20 µL)',
    description: '24 PCR amplicon samples normalized to 50 ng in 20 µL for Illumina/Oxford Nanopore library prep.',
    targetMassNg: 50,
    targetVolumeUl: 20,
    samples: Array.from({ length: 24 }).map((_, idx) => {
      const well = getStandard96WellPositions()[idx];
      const concs = [18.4, 32.1, 54.0, 8.2, 85.6, 42.0, 25.5, 62.8, 12.0, 94.2, 38.7, 19.5];
      const initialConcNgPerUl = concs[idx % concs.length];
      return {
        sampleId: `AMP-LIB_${String(idx + 1).padStart(2, '0')}`,
        wellPosition: well,
        initialConcNgPerUl,
        initialVolumeUl: 35
      };
    })
  },
  {
    name: '8-Sample Diagnostic Screening Strip (Target 100 ng in 25 µL)',
    description: '8-tube PCR strip (Wells A1–H1) for quick standard reaction setup.',
    targetMassNg: 100,
    targetVolumeUl: 25,
    samples: ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'].map((well, idx) => {
      const concs = [42.5, 68.0, 8.4, 95.2, 31.0, 115.0, 52.4, 21.8];
      return {
        sampleId: `DIAG-SMP_${idx + 1}`,
        wellPosition: well,
        initialConcNgPerUl: concs[idx],
        initialVolumeUl: 30
      };
    })
  }
];

/**
 * Export normalized worklist to formatted CSV for automated liquid handlers
 */
export function generateWorklistCsv(result: DnaNormalizationResult): string {
  const headers = [
    'Sample_ID',
    'Well_Position',
    'Initial_Conc_ng_uL',
    'Target_Mass_ng',
    'Target_Volume_uL',
    'Sample_Volume_uL',
    'Diluent_Volume_uL',
    'Diluent_Reagent',
    'Final_Conc_ng_uL',
    'Final_Mass_ng',
    'Status',
    'Warnings'
  ];

  const rows = result.samples.map((s) => [
    `"${s.sampleId}"`,
    s.wellPosition,
    s.initialConcNgPerUl.toFixed(2),
    s.targetMassNg.toFixed(1),
    s.targetVolumeUl.toFixed(1),
    s.sampleVolumeUl.toFixed(2),
    s.bufferVolumeUl.toFixed(2),
    `"${result.config.diluentName}"`,
    s.finalConcNgPerUl.toFixed(2),
    s.finalMassNg.toFixed(1),
    s.status,
    `"${s.warning || 'OK'}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export full Excel (.XLSX) workbook with visual formatting and 8-channel multichannel guide
 */
export async function generateWorklistXlsx(result: DnaNormalizationResult): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();

  // Sheet 1: Normalization Worklist
  const dataRows = [
    ['DNA CONCENTRATION NORMALIZATION WORKLIST & BENCH PIPETTING GUIDE'],
    ['Generated by BioSOP Precision Normalization Engine', '', '', '', 'Date:', new Date().toLocaleDateString()],
    [],
    ['TARGET SPECIFICATIONS:'],
    ['Target Mass (ng):', result.config.targetMassNg, '', 'Target Starting Vol (µL):', result.config.targetVolumeUl],
    ['Target Concentration (ng/µL):', (result.config.targetMassNg / result.config.targetVolumeUl).toFixed(2), '', 'Diluent Buffer:', result.config.diluentName],
    ['Total Samples:', result.totalSamples, '', 'Total Diluent Needed (µL):', result.totalDiluentNeededUl],
    [],
    [
      'Sample ID',
      'Well',
      'Initial Conc (ng/µL)',
      'Target Mass (ng)',
      'Target Vol (µL)',
      'Sample Vol to Add (µL)',
      'Diluent Vol to Add (µL)',
      'Final Conc (ng/µL)',
      'Final Mass (ng)',
      'Status',
      'Pipetting Guidance & Notes'
    ],
    ...result.samples.map((s) => [
      s.sampleId,
      s.wellPosition,
      s.initialConcNgPerUl,
      s.targetMassNg,
      s.targetVolumeUl,
      s.sampleVolumeUl,
      s.bufferVolumeUl,
      s.finalConcNgPerUl,
      s.finalMassNg,
      s.status,
      s.warning || 'Ready for reaction setup'
    ])
  ];

  const ws = wb.addWorksheet('Normalization Worklist');
  ws.addRows(dataRows);
  ws.columns = [18, 8, 18, 16, 16, 22, 22, 18, 16, 20, 45].map((w) => ({ width: w }));

  // Sheet 2: 96-Well Plate Layout (8x12 grid)
  const plateRows: any[][] = [
    ['96-WELL PLATE SAMPLE CONCENTRATION & NORMALIZATION MATRIX'],
    ['Well volumes indicate: [Sample µL] + [Diluent µL] = Total µL'],
    []
  ];

  const colsHeader = ['Row / Col', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  plateRows.push(colsHeader);

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const sampleMap = new Map<string, DnaNormalizationSample>();
  result.samples.forEach((s) => sampleMap.set(s.wellPosition.toUpperCase(), s));

  for (const r of rows) {
    const rowData: any[] = [`Row ${r}`];
    for (let c = 1; c <= 12; c++) {
      const wellId = `${r}${c}`;
      const smp = sampleMap.get(wellId);
      if (smp) {
        rowData.push(`${smp.sampleId}\n${smp.initialConcNgPerUl} ng/µL\n(${smp.sampleVolumeUl} + ${smp.bufferVolumeUl} µL)`);
      } else {
        rowData.push('EMPTY');
      }
    }
    plateRows.push(rowData);
  }

  const plateWs = wb.addWorksheet('96-Well Plate Layout');
  plateWs.addRows(plateRows);
  plateWs.columns = [{ width: 10 }, ...Array.from({ length: 12 }, () => ({ width: 20 }))];

  const wbOut = await wb.xlsx.writeBuffer();
  return new Uint8Array(wbOut as ArrayBuffer);
}
