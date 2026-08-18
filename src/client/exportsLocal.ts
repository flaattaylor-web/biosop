/**
 * Exports that run entirely in the browser. The SOP never leaves the machine.
 * Uses the same generators as the server (they are runtime-agnostic), so a file
 * made here is byte-for-byte the same design as one made by /api/export-*.
 */
import type { SopDocument } from '../types';
import { generateLiveExcelWorkbook } from '../server/excelLive';
import { generateControlledWordDocument } from '../server/wordControlled';
import { calculateReaction, calculateMasterMix, totalReactions, ComponentInput } from '../core/reactionMath';
import { buildWorklists } from '../core/worklists';
import { downloadBlob, safeFilename } from './api';
import { protocolStorage } from './storage';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function exportLiveExcelLocal(sop: SopDocument): Promise<void> {
  const sheet = sop.reactionSheet;
  if (!sheet || !Array.isArray(sheet.components)) throw new Error('This protocol has no reaction sheet to export.');
  const bytes = await generateLiveExcelWorkbook(sheet, sop);
  downloadBlob(new Blob([bytes as BlobPart], { type: XLSX_MIME }), `${safeFilename(sop.title)}_live.xlsx`);
}

export async function exportControlledWordLocal(sop: SopDocument, versionId?: string, organisationName?: string): Promise<void> {
  // If no version was named, use the current saved version of this protocol (if any) so its signatures appear.
  let vid = versionId;
  if (!vid) {
    try { vid = (await protocolStorage.load(sop.id)).versionId; } catch { vid = undefined; }
  }
  const signatures = vid ? await protocolStorage.signatures(vid).catch(() => []) : [];
  const bytes = await generateControlledWordDocument(sop, {
    signatures: signatures as Parameters<typeof generateControlledWordDocument>[1]['signatures'],
    organisationName,
  });
  downloadBlob(new Blob([bytes as BlobPart], { type: DOCX_MIME }), `${safeFilename(sop.documentId || 'SOP')}_v${safeFilename(sop.version || '1')}.docx`);
}

export function buildWorklistsLocal(sop: SopDocument, plate?: { rows: number; cols: number }) {
  const sheet = sop.reactionSheet;
  if (!sop || !sheet || !Array.isArray(sheet.components) || sheet.components.length === 0) {
    throw new Error('A protocol with reaction components is required.');
  }
  const inputs: ComponentInput[] = sheet.components.map((c) => ({
    id: c.id, name: c.name, stockConc: c.stockConc, stockUnit: c.stockUnit, finalConc: c.finalConc, finalUnit: c.finalUnit,
    volPerRxnMicroliters: c.volPerRxnMicroliters, pipettingOrder: c.pipettingOrder, role: c.role, molecularWeight: c.molecularWeight,
  }));
  const calc = calculateReaction(inputs, { targetVolumeMicroliters: sheet.reactionVolumeMicroliters || 50 });
  const design = { sampleCount: sheet.sampleCount ?? sheet.defaultNumReactions ?? 8, replicates: sheet.replicates ?? 1, posControls: sheet.posControls ?? 0, negControls: sheet.negControls ?? 0, overflowPercent: sheet.defaultOverflowPercent ?? 10 };
  const mm = calculateMasterMix(calc, design);
  const n = totalReactions(design) || sheet.defaultNumReactions || 8;
  const bundle = buildWorklists(calc, mm, { rows: plate?.rows ?? 8, cols: plate?.cols ?? 12, reactionCount: n }, { protocolTitle: sop.title, documentId: sop.documentId, version: sop.version });
  return {
    files: [
      { name: 'opentrons_protocol.py', mime: 'text/x-python', content: bundle.opentronsPy },
      { name: 'hamilton_worklist.csv', mime: 'text/csv', content: bundle.hamiltonCsv },
      { name: 'tecan_worklist.gwl', mime: 'text/plain', content: bundle.tecanGwl },
      { name: 'echo_picklist.csv', mime: 'text/csv', content: bundle.echoCsv },
    ],
    summary: bundle.summary,
    calculationFindings: [...calc.findings, ...mm.findings],
  };
}
