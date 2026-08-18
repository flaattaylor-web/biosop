/**
 * Controlled-document Word export.
 *
 * What the previous export lacked and a documentation reviewer will look for:
 *   - running header with document ID / version / effective date on every page
 *   - footer with "Page X of Y" and an "uncontrolled when printed" statement
 *   - Prepared / Reviewed / Approved signature block (with e-signature records
 *     when present in the DB)
 *   - revision history table
 *   - references section (previously generated but never rendered)
 *   - repeating table header rows across page breaks
 *   - the reaction calculation, with provenance, rather than raw model output
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  HeadingLevel, Header, Footer, PageNumber, BorderStyle, ShadingType, TableLayoutType, PageBreak,
} from 'docx';
import type { SopDocument } from '../types';
import { calculateReaction, calculateMasterMix, totalReactions, ComponentInput } from '../core/reactionMath';
import { auditProtocol } from '../core/auditor';
import type { SignatureRecord } from './db';

const FONT = 'Arial';
const NAVY = '0F172A';
const GREY = '64748B';
const HEAD_FILL = 'E2E8F0';

function text(t: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}): TextRun {
  return new TextRun({ text: t, font: FONT, bold: opts.bold, size: opts.size ?? 20, color: opts.color, italics: opts.italics });
}

function para(t: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacingAfter?: number } = {}): Paragraph {
  return new Paragraph({
    children: [text(t, opts)],
    alignment: opts.align,
    spacing: { after: opts.spacingAfter ?? 120 },
  });
}

function heading(t: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({ text: t, heading: level, spacing: { before: 240, after: 120 } });
}

function cell(content: string | Paragraph[], opts: { bold?: boolean; fill?: string; width?: number; size?: number } = {}): TableCell {
  const children = typeof content === 'string'
    ? [new Paragraph({ children: [text(content, { bold: opts.bold, size: opts.size ?? 18 })] })]
    : content;
  return new TableCell({
    children,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function table(headers: string[], rows: string[][], widths?: number[]): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((h, i) => cell(h, { bold: true, fill: HEAD_FILL, width: widths?.[i] })),
      }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c ?? '', { width: widths?.[i] })) })),
    ],
  });
}

function toInputs(sop: SopDocument): ComponentInput[] {
  return (sop.reactionSheet?.components || []).map((c) => ({
    id: c.id, name: c.name, stockConc: c.stockConc, stockUnit: c.stockUnit, finalConc: c.finalConc, finalUnit: c.finalUnit,
    volPerRxnMicroliters: c.volPerRxnMicroliters, pipettingOrder: c.pipettingOrder,
    role: (c as { role?: ComponentInput['role'] }).role, molecularWeight: (c as { molecularWeight?: number }).molecularWeight,
  }));
}

export interface ControlledDocOptions {
  signatures?: SignatureRecord[];
  organisationName?: string;
  /** Marks the printout as a draft. Default true unless an APPROVED signature exists. */
  isDraft?: boolean;
}

export async function generateControlledWordDocument(sop: SopDocument, opts: ControlledDocOptions = {}): Promise<Uint8Array> {
  const sigs = opts.signatures || [];
  const approved = sigs.find((s) => s.role === 'APPROVED' && s.stillValid);
  const isDraft = opts.isDraft ?? !approved;
  const org = opts.organisationName || '';

  const sheet = sop.reactionSheet;
  const calc = sheet ? calculateReaction(toInputs(sop), { targetVolumeMicroliters: sheet.reactionVolumeMicroliters || 50 }) : null;
  const design = sheet ? {
    sampleCount: sheet.sampleCount ?? sheet.defaultNumReactions ?? 8, replicates: sheet.replicates ?? 1,
    posControls: sheet.posControls ?? 0, negControls: sheet.negControls ?? 0, overflowPercent: sheet.defaultOverflowPercent ?? 10,
  } : null;
  const mm = calc && design ? calculateMasterMix(calc, design) : null;
  const audit = auditProtocol(sop, calc);

  const children: (Paragraph | Table)[] = [];

  // ---- Title block ----
  children.push(new Paragraph({ children: [text(sop.title || 'Standard Operating Procedure', { bold: true, size: 36, color: NAVY })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }));
  children.push(para('Standard Operating Procedure', { size: 22, color: GREY, align: AlignmentType.CENTER, spacingAfter: 240 }));
  if (isDraft) {
    children.push(para('DRAFT — NOT APPROVED FOR USE', { bold: true, size: 24, color: 'B91C1C', align: AlignmentType.CENTER, spacingAfter: 240 }));
  }

  children.push(table(
    ['Field', 'Value', 'Field', 'Value'],
    [
      ['Document ID', sop.documentId || '', 'Version', sop.version || ''],
      ['Effective date', sop.effectiveDate || '', 'Category', sop.category || ''],
      ['Biosafety level', sop.biosafetyLevel || '', 'Author', sop.author || ''],
      ['Organisation', org, 'Status', isDraft ? 'Draft' : 'Approved'],
    ],
    [18, 32, 18, 32]
  ));

  // ---- Signature block ----
  children.push(heading('Approvals', HeadingLevel.HEADING_2));
  const roles: SignatureRecord['role'][] = ['PREPARED', 'REVIEWED', 'APPROVED'];
  children.push(table(
    ['Role', 'Name', 'Identifier', 'Meaning of signature', 'Date / time (UTC)', 'Integrity'],
    roles.map((role) => {
      const s = sigs.find((x) => x.role === role);
      const label = role.charAt(0) + role.slice(1).toLowerCase() + ' by';
      return s
        ? [label, s.signerName, s.signerIdentifier || '', s.meaning, s.signedAt, s.stillValid ? 'Content unchanged since signing' : 'CONTENT CHANGED AFTER SIGNING']
        : [label, '', '', '', '', 'Not signed'];
    }),
    [14, 18, 14, 26, 16, 12]
  ));
  children.push(para(
    'Electronic signatures above are recorded with the signer’s name, the meaning of the signature, and a timestamp, ' +
    'and are bound to a cryptographic hash of the document content at the time of signing.',
    { size: 16, color: GREY, italics: true }
  ));

  // ---- Purpose & scope ----
  children.push(heading('1. Purpose and Scope'));
  children.push(para(sop.scope || 'Not specified.'));

  // ---- Safety ----
  children.push(heading('2. Safety'));
  children.push(para(`Biosafety level: ${sop.biosafetyLevel || 'not specified'}.`, { bold: true }));
  if (sop.hazards?.length) {
    children.push(table(['Hazard', 'Type', 'Description'], sop.hazards.map((h) => [h.label, h.type, h.description]), [25, 15, 60]));
  }
  if (sop.ppeRequirements?.length) {
    children.push(para('Personal protective equipment', { bold: true }));
    children.push(table(['Item', 'Required', 'Notes'], sop.ppeRequirements.map((p) => [p.item, p.required ? 'Yes' : 'Optional', p.notes || '']), [35, 15, 50]));
  }

  // ---- Materials ----
  children.push(heading('3. Equipment and Materials'));
  if (sop.equipmentRequired?.length) {
    children.push(para('Equipment', { bold: true }));
    for (const e of sop.equipmentRequired) children.push(new Paragraph({ children: [text(e)], bullet: { level: 0 } }));
  }
  if (sop.reagentsRequired?.length) {
    children.push(para('Reagents', { bold: true }));
    for (const r of sop.reagentsRequired) children.push(new Paragraph({ children: [text(r)], bullet: { level: 0 } }));
  }

  // ---- Reaction setup (computed) ----
  if (sheet && calc && mm) {
    children.push(heading('4. Reaction Setup'));
    children.push(para(
      `Single reaction volume: ${calc.targetVolumeMicroliters} µL. Design: ${design!.sampleCount} samples × ${design!.replicates} ` +
      `replicate(s) + ${design!.posControls} positive + ${design!.negControls} negative control(s) = ${totalReactions(design!)} reactions, ` +
      `prepared with ${mm.overflowPercent}% overflow (${mm.effectiveReactions} effective reactions).`
    ));
    const ordered = [...calc.components].sort((a, b) =>
      (sheet.components.find((c) => c.id === a.id)?.pipettingOrder ?? 99) - (sheet.components.find((c) => c.id === b.id)?.pipettingOrder ?? 99));
    children.push(table(
      ['#', 'Component', 'Stock', 'Final', 'µL / rxn', 'µL for run', 'Basis'],
      ordered.map((c) => {
        const src = sheet.components.find((x) => x.id === c.id);
        const line = mm.lines.find((l) => l.id === c.id);
        return [
          String(src?.pipettingOrder ?? ''), c.name,
          src ? `${src.stockConc} ${src.stockUnit}` : '', src ? `${src.finalConc} ${src.finalUnit}` : '',
          c.volPerRxnMicroliters.toFixed(2),
          line && line.includedInMix ? line.volForRunMicroliters.toFixed(2) : 'per tube',
          c.provenance === 'COMPUTED' ? 'Computed (C₁V₁=C₂V₂)' : 'As specified — not independently verified',
        ];
      }),
      [5, 27, 13, 13, 10, 12, 20]
    ));
    children.push(para(
      `Master mix: ${mm.masterMixVolumePerReaction} µL per reaction, ${mm.masterMixTotalVolume} µL total. ` +
      `Dispense ${mm.masterMixVolumePerReaction} µL per tube, then add ${mm.perSampleVolumePerReaction} µL of per-tube component(s).`,
      { bold: true }
    ));
    const fs = [...calc.findings, ...mm.findings];
    if (fs.length) {
      children.push(para('Calculation findings', { bold: true, color: 'B91C1C' }));
      for (const f of fs) children.push(new Paragraph({ children: [text(`${f.severity}: ${f.message}${f.remedy ? ` — ${f.remedy}` : ''}`, { size: 18 })], bullet: { level: 0 } }));
    }
    if (sheet.thermocyclerProfile?.length) {
      children.push(para('Thermal profile', { bold: true }));
      children.push(table(
        ['Step', 'Phase', 'Temp (°C)', 'Duration (s)', 'Cycles', 'Notes'],
        sheet.thermocyclerProfile.map((s) => [String(s.stepNumber), s.phase, s.tempCelsius !== undefined ? String(s.tempCelsius) : '', String(s.durationSeconds), String(s.cycles ?? 1), s.notes || '']),
        [8, 30, 12, 14, 10, 26]
      ));
    }
  }

  // ---- Procedure ----
  children.push(heading(`${sheet ? 5 : 4}. Procedure`));
  for (const s of sop.steps || []) {
    const conds: string[] = [];
    if (s.tempCelsius !== undefined && s.tempCelsius !== null) conds.push(`${s.tempCelsius} °C`);
    if (s.timingMinutes !== undefined && s.timingMinutes !== null) conds.push(`${s.timingMinutes} min`);
    children.push(new Paragraph({
      children: [text(`${s.stepNumber}. ${s.title}`, { bold: true }), ...(conds.length ? [text(`   [${conds.join(', ')}]`, { color: GREY, size: 18 })] : [])],
      spacing: { before: 160, after: 40 }, keepNext: true,
    }));
    children.push(para(s.instruction || ''));
    if (s.criticalCheckpoint) children.push(para(`Critical checkpoint: ${s.criticalCheckpoint}`, { italics: true, color: '1D4ED8', size: 18 }));
    if (s.safetyWarning) children.push(para(`Safety: ${s.safetyWarning}`, { bold: true, color: 'B91C1C', size: 18 }));
    if (s.stoppingPoint) children.push(para(`Safe stopping point: ${s.stoppingPoint}`, { italics: true, color: GREY, size: 18 }));
  }

  // ---- QC / troubleshooting ----
  const n0 = sheet ? 6 : 5;
  children.push(heading(`${n0}. Quality Control`));
  for (const q of sop.qualityControl || []) children.push(new Paragraph({ children: [text(q)], bullet: { level: 0 } }));
  if (sop.troubleshooting?.length) {
    children.push(heading(`${n0 + 1}. Troubleshooting`));
    children.push(table(['Issue', 'Probable cause', 'Corrective action'], sop.troubleshooting.map((t) => [t.issue, t.cause, t.solution]), [30, 35, 35]));
  }

  // ---- References (previously never rendered) ----
  children.push(heading(`${n0 + 2}. References`));
  const refs = sop.references || [];
  if (!refs.length) children.push(para('None.'));
  for (const r of refs) {
    const status = (r as { verificationStatus?: string }).verificationStatus;
    const badge = status === 'VERIFIED' ? ' [verified in registry]' : status === 'NOT_FOUND' ? ' [NOT FOUND — unverifiable]' : status === 'MISMATCH' ? ' [DOI MISMATCH — check]' : ' [not verified]';
    children.push(new Paragraph({
      children: [text(r.citation), ...(r.doiOrUrl ? [text(` ${r.doiOrUrl}`, { color: '1D4ED8' })] : []), text(badge, { color: status === 'VERIFIED' ? '166534' : 'B91C1C', size: 16 })],
      bullet: { level: 0 },
    }));
  }

  // ---- Audit summary ----
  children.push(heading(`${n0 + 3}. Automated Consistency Check`));
  children.push(para(
    `Verdict: ${audit.verdict}${audit.overallScore !== null ? ` (score ${audit.overallScore}/100, coverage ${(audit.confidence * 100).toFixed(0)}%)` : ''}. ` +
    `${audit.errorCount} error(s), ${audit.warningCount} warning(s).`, { bold: true }));
  children.push(para(audit.scopeStatement, { size: 16, color: GREY, italics: true }));
  children.push(table(
    ['Dimension', 'Score', 'What was checked'],
    audit.dimensions.map((d) => [d.label, d.score === null ? 'n/a' : String(d.score), d.whatWasChecked]),
    [25, 10, 65]
  ));

  // ---- Revision history ----
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(heading(`${n0 + 4}. Revision History`));
  const rev = sop.revisionHistory?.length ? sop.revisionHistory : [{ version: sop.version || '1.0', date: sop.effectiveDate || '', changes: 'Initial issue', author: sop.author || '' }];
  children.push(table(['Version', 'Date', 'Author', 'Summary of changes'], rev.map((r) => [r.version, r.date, r.author, r.changes]), [12, 16, 22, 50]));

  // ---- Assemble ----
  const doc = new Document({
    creator: 'BioSOP Generator',
    title: sop.title,
    description: `${sop.documentId} v${sop.version}`,
    styles: {
      default: { document: { run: { font: FONT, size: 20 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: NAVY, font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: NAVY, font: FONT }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              text(`${sop.documentId || 'SOP'}  •  v${sop.version || '1.0'}  •  Effective ${sop.effectiveDate || '—'}`, { size: 16, color: GREY }),
              text(`${org ? '  •  ' + org : ''}`, { size: 16, color: GREY }),
              text(isDraft ? '  •  DRAFT' : '', { size: 16, color: 'B91C1C', bold: true }),
            ],
            alignment: AlignmentType.LEFT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 4 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                text('Uncontrolled when printed. Verify the current version in the document management system before use.  ', { size: 14, color: GREY, italics: true }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                text('Page ', { size: 16, color: GREY }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY }),
                text(' of ', { size: 16, color: GREY }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children,
    }],
  });

  // toBlob works in Node, browsers and Workers alike (toBuffer needs Node's Buffer).
  return new Uint8Array(await (await Packer.toBlob(doc)).arrayBuffer());
}
