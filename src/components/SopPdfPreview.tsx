import React, { useState } from 'react';
import {
  Printer,
  X,
  Eye,
  Settings2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  Building2,
  ShieldCheck,
  QrCode,
  Sparkles,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { SopDocument } from '../types';
import { ensureReactionSheet } from '../utils/sheetUtils';

interface SopPdfPreviewProps {
  sop: SopDocument;
  numReactions: number;
  overflowPercent: number;
  overflowMultiplier: number;
  onClose: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
}

export type StationeryTheme = 'iso-clean' | 'clinical-core' | 'academic-emerald' | 'monochrome-glp';
export type WatermarkType = 'CONTROLLED_COPY' | 'GLP_COMPLIANT' | 'DRAFT_REVIEW' | 'APPROVED_SOP' | 'CONFIDENTIAL' | 'NONE';

export const SopPdfPreview: React.FC<SopPdfPreviewProps> = ({
  sop,
  numReactions,
  overflowPercent,
  overflowMultiplier,
  onClose,
  onExportWord,
  onExportExcel
}) => {
  // Customization controls
  const [theme, setTheme] = useState<StationeryTheme>('iso-clean');
  const [watermark, setWatermark] = useState<WatermarkType>('CONTROLLED_COPY');
  const [institutionName, setInstitutionName] = useState('Center for Advanced Genomics & Molecular Diagnostics');
  const [labSubtext, setLabSubtext] = useState('ISO 17025 / GLP Certified Core Laboratory • Facility ID: CLIA-99D2048123');
  const [docClassification, setDocClassification] = useState('Controlled Quality Document - Level 2');
  const [zoom, setZoom] = useState<number>(100);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showStepTables, setShowStepTables] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  const rxnSheet = ensureReactionSheet(sop);

  const handlePrint = () => {
    window.print();
  };

  const getWatermarkText = () => {
    switch (watermark) {
      case 'CONTROLLED_COPY':
        return 'OFFICIAL CONTROLLED COPY';
      case 'GLP_COMPLIANT':
        return 'GLP COMPLIANT PROCEDURE';
      case 'DRAFT_REVIEW':
        return 'DRAFT — FOR REVIEW ONLY';
      case 'APPROVED_SOP':
        return 'APPROVED QUALITY SOP';
      case 'CONFIDENTIAL':
        return 'CONFIDENTIAL — PROPRIETARY';
      case 'NONE':
      default:
        return '';
    }
  };

  const getHeaderBadgeColor = () => {
    switch (theme) {
      case 'clinical-core':
        return 'bg-red-900 text-white border-red-700';
      case 'academic-emerald':
        return 'bg-emerald-900 text-white border-emerald-700';
      case 'monochrome-glp':
        return 'bg-slate-900 text-white border-slate-700';
      case 'iso-clean':
      default:
        return 'bg-slate-900 text-white border-cyan-500';
    }
  };

  const getHeaderAccent = () => {
    switch (theme) {
      case 'clinical-core':
        return 'border-red-600 bg-red-50 text-red-900';
      case 'academic-emerald':
        return 'border-emerald-600 bg-emerald-50 text-emerald-900';
      case 'monochrome-glp':
        return 'border-slate-800 bg-slate-100 text-slate-900';
      case 'iso-clean':
      default:
        return 'border-cyan-600 bg-cyan-50 text-slate-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden animate-fade-in print:static print:bg-white print:z-auto">
      {/* Top Toolbar - Hidden on Print */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">Official Lab Stationery PDF Preview</h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] uppercase font-bold border border-cyan-500/40">
                Print / Save PDF Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Visualizing formatted paper layout for {sop.documentId} ({sop.title})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-1.5 font-bold text-cyan-300 min-w-[45px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white text-[10px] font-mono"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-cyan-950 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>

          <button
            onClick={onExportWord}
            className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Word</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Preview Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Customization Panel - Hidden on Print */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 p-4 space-y-5 overflow-y-auto shrink-0 text-xs text-slate-300 print:hidden">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Settings2 className="w-4 h-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider text-white text-[11px]">
              Lab Stationery Customizer
            </span>
          </div>

          {/* Theme Preset Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-200 block text-[11px]">
              Stationery Layout & Letterhead Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('iso-clean')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  theme === 'iso-clean'
                    ? 'bg-cyan-950/60 border-cyan-500 text-white'
                    : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-[11px]">ISO 9001 Clean</span>
                <span className="text-[10px] text-slate-400">Classic blue header grid & ISO seal</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('clinical-core')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  theme === 'clinical-core'
                    ? 'bg-red-950/60 border-red-500 text-white'
                    : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-[11px]">Clinical Diagnostics</span>
                <span className="text-[10px] text-slate-400">Deep red core headers & CLIA layout</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('academic-emerald')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  theme === 'academic-emerald'
                    ? 'bg-emerald-950/60 border-emerald-500 text-white'
                    : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-[11px]">Academic & Research</span>
                <span className="text-[10px] text-slate-400">Emerald institute seal & minimal grid</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('monochrome-glp')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  theme === 'monochrome-glp'
                    ? 'bg-slate-800 border-slate-400 text-white'
                    : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-[11px]">High-Contrast GLP</span>
                <span className="text-[10px] text-slate-400">Ink-saving monochrome print format</span>
              </button>
            </div>
          </div>

          {/* Watermark Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-200 block text-[11px]">
              Document Watermark Seal
            </label>
            <select
              value={watermark}
              onChange={(e) => setWatermark(e.target.value as WatermarkType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-cyan-500"
            >
              <option value="CONTROLLED_COPY">OFFICIAL CONTROLLED COPY</option>
              <option value="GLP_COMPLIANT">GLP COMPLIANT PROCEDURE</option>
              <option value="DRAFT_REVIEW">DRAFT — FOR REVIEW ONLY</option>
              <option value="APPROVED_SOP">APPROVED QUALITY SOP</option>
              <option value="CONFIDENTIAL">CONFIDENTIAL — PROPRIETARY</option>
              <option value="NONE">None (Clean Page)</option>
            </select>
          </div>

          {/* Institution / Lab Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 block text-[11px]">
              Institution / Organization Name
            </label>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-cyan-500 text-xs"
              placeholder="e.g. Broad Institute / Mayo Clinic"
            />
          </div>

          {/* Subtext / Certification Info */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 block text-[11px]">
              Facility Certification / Contact
            </label>
            <input
              type="text"
              value={labSubtext}
              onChange={(e) => setLabSubtext(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-cyan-500 text-xs"
              placeholder="e.g. ISO 17025 Certified • Facility ID 1092"
            />
          </div>

          {/* Classification Label */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 block text-[11px]">
              Document Quality Classification
            </label>
            <input
              type="text"
              value={docClassification}
              onChange={(e) => setDocClassification(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-cyan-500 text-xs"
              placeholder="e.g. Level 2 Controlled Document"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <label className="font-semibold text-slate-200 block text-[11px]">
              Page Element Toggles
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
              />
              <span className="text-slate-300">Show Compliance Sign-Off Block</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBarcode}
                onChange={(e) => setShowBarcode(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
              />
              <span className="text-slate-300">Show LIMS Barcode & QR Stamp</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showStepTables}
                onChange={(e) => setShowStepTables(e.target.checked)}
                className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
              />
              <span className="text-slate-300">Show Step Master Mix Recipe Tables</span>
            </label>
          </div>

          {/* Help Note */}
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl space-y-1 text-[11px] text-cyan-200">
            <p className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print Tip:</span>
            </p>
            <p className="text-[10px] text-cyan-300/80 leading-relaxed">
              When saving as PDF, enable <strong>"Background graphics"</strong> in your browser's print dialog to retain header colors and watermark seals.
            </p>
          </div>
        </aside>

        {/* Right Preview Sheet Canvas */}
        <main className="flex-1 bg-slate-900/60 p-6 overflow-auto flex justify-center items-start print:p-0 print:bg-white">
          <div
            className="transition-transform duration-200 origin-top print:transform-none"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {/* Standard Printable Paper Sheet (8.5" x 11" aspect ratio simulation) */}
            <div className="pdf-preview-sheet w-[816px] min-h-[1056px] bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-200 p-10 relative overflow-hidden font-sans print:w-full print:min-h-0 print:shadow-none print:border-none print:p-0">
              {/* WATERMARK OVERLAY */}
              {watermark !== 'NONE' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none">
                  <div className="transform -rotate-45 text-slate-200/40 font-mono font-black text-5xl tracking-widest uppercase text-center border-8 border-dashed border-slate-200/40 px-12 py-6 rounded-3xl">
                    {getWatermarkText()}
                  </div>
                </div>
              )}

              {/* SHEET CONTENT LAYER */}
              <div className="relative z-10 space-y-6">
                {/* 1. OFFICIAL LAB LETTERHEAD HEADER */}
                <div className={`border-2 rounded-xl p-5 space-y-4 ${getHeaderAccent()}`}>
                  <div className="flex items-start justify-between gap-4 border-b pb-4 border-slate-300">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-cyan-700 shrink-0" />
                        <h1 className="text-lg font-black tracking-tight uppercase text-slate-900">
                          {institutionName}
                        </h1>
                      </div>
                      <p className="text-[10px] font-mono font-medium text-slate-600 mt-0.5">
                        {labSubtext}
                      </p>
                    </div>

                    {showBarcode && (
                      <div className="flex items-center gap-2 shrink-0 bg-white p-2 rounded border border-slate-300 font-mono text-[9px] text-right">
                        <div>
                          <p className="font-bold text-slate-900">LIMS ID: {sop.documentId}</p>
                          <p className="text-slate-500">REV-{sop.version}</p>
                        </div>
                        <QrCode className="w-8 h-8 text-slate-800" />
                      </div>
                    )}
                  </div>

                  {/* Document Control Grid Table */}
                  <div className="grid grid-cols-4 gap-2 text-[11px] font-mono border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <div className="p-2 border-r border-b border-slate-200 bg-slate-50">
                      <span className="text-[9px] text-slate-500 uppercase block">Doc ID</span>
                      <span className="font-bold text-cyan-900">{sop.documentId}</span>
                    </div>
                    <div className="p-2 border-r border-b border-slate-200 bg-slate-50">
                      <span className="text-[9px] text-slate-500 uppercase block">Version</span>
                      <span className="font-bold text-slate-800">v{sop.version}</span>
                    </div>
                    <div className="p-2 border-r border-b border-slate-200 bg-slate-50">
                      <span className="text-[9px] text-slate-500 uppercase block">Effective Date</span>
                      <span className="font-bold text-slate-800">{sop.effectiveDate}</span>
                    </div>
                    <div className="p-2 border-b border-slate-200 bg-slate-50">
                      <span className="text-[9px] text-slate-500 uppercase block">Biosafety Level</span>
                      <span className="font-bold text-amber-700">{sop.biosafetyLevel}</span>
                    </div>

                    <div className="p-2 border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase block">Author</span>
                      <span className="font-semibold text-slate-800 truncate block">{sop.author}</span>
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase block">Reviewer / QA</span>
                      <span className="font-semibold text-slate-800 truncate block">{sop.reviewer || 'QA Officer'}</span>
                    </div>
                    <div className="p-2 border-r border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase block">Category</span>
                      <span className="font-semibold text-slate-800 truncate block">{sop.category}</span>
                    </div>
                    <div className="p-2">
                      <span className="text-[9px] text-slate-500 uppercase block">Batch Scale</span>
                      <span className="font-bold text-emerald-700">{numReactions} Rxns (+{overflowPercent}%)</span>
                    </div>
                  </div>
                </div>

                {/* SOP DOCUMENT TITLE HEADER */}
                <div className="bg-slate-900 text-white p-4 rounded-xl border-l-4 border-cyan-500 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-400 block">
                      STANDARD OPERATING PROCEDURE • {docClassification}
                    </span>
                    <h2 className="text-base font-bold text-white mt-0.5">{sop.title}</h2>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[10px] text-slate-300">
                    <p className="px-2 py-1 bg-cyan-900/60 rounded border border-cyan-700 font-bold text-cyan-200">
                      CONTROLLED PROCEDURE
                    </p>
                  </div>
                </div>

                {/* 2. SECTION 1: PURPOSE & OPERATIONAL SCOPE */}
                <section className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">1</span>
                    <span>1. PURPOSE & OPERATIONAL SCOPE</span>
                  </h3>
                  <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {sop.scope}
                  </p>
                </section>

                {/* 3. SECTION 2: SAFETY & PPE TABLE */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">2</span>
                    <span>2. BIOSAFETY HAZARDS & PERSONAL PROTECTIVE EQUIPMENT (PPE)</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Hazards list */}
                    <div className="border border-amber-300 bg-amber-50/60 rounded-lg p-2.5 space-y-1.5">
                      <p className="font-bold text-amber-900 text-[10px] uppercase font-mono border-b border-amber-200 pb-1">
                        Identified Chemical / Biological Hazards
                      </p>
                      {sop.hazards.map((h, i) => (
                        <div key={i} className="text-[11px] leading-tight">
                          <span className="font-bold text-amber-900">[{h.type}] {h.label}: </span>
                          <span className="text-amber-800">{h.description}</span>
                        </div>
                      ))}
                    </div>

                    {/* PPE List */}
                    <div className="border border-slate-300 bg-slate-50 rounded-lg p-2.5 space-y-1">
                      <p className="font-bold text-slate-900 text-[10px] uppercase font-mono border-b border-slate-200 pb-1">
                        Required PPE Checklist
                      </p>
                      {sop.ppeRequirements.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-800">
                            {p.required ? '☑' : '☐'} {p.item}
                          </span>
                          {p.notes && <span className="text-[10px] text-slate-500 italic">({p.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 4. SECTION 3: REAGENTS & EQUIPMENT */}
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">3</span>
                      <span>3. REQUIRED EQUIPMENT & REAGENT INVENTORY</span>
                    </div>
                    {sop.equipmentInventoryCheck && (
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        ✓ Hardware Checked ({sop.equipmentInventoryCheck.overallCompatibilityScore}% Ready)
                      </span>
                    )}
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5">
                      <p className="font-bold text-slate-900 text-[10px] uppercase font-mono border-b border-slate-200 pb-1">
                        Equipment & Instrumentation
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5 mt-1">
                        {sop.equipmentRequired.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5">
                      <p className="font-bold text-slate-900 text-[10px] uppercase font-mono border-b border-slate-200 pb-1">
                        Reagents & Solutions
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5 mt-1">
                        {sop.reagentsRequired.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* 5. SECTION 4: STEP-BY-STEP PROCEDURE */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">4</span>
                      <span>4. STEP-BY-STEP PROCEDURE & MASTER MIX RECIPES</span>
                    </div>
                    <span className="font-mono text-[10px] font-normal text-slate-600">
                      Scaled for {numReactions} Rxns (+{overflowPercent}%)
                    </span>
                  </h3>

                  <div className="space-y-3">
                    {sop.steps.map((step, sIdx) => {
                      const matchedStep = rxnSheet.stepByStepReactionSteps?.find(s => s.stepNumber === step.stepNumber);
                      const stepReagents = step.reagentsAndVolumes || matchedStep?.reagentsAndVolumes;

                      return (
                        <div key={sIdx} className="border border-slate-300 rounded-lg p-3 space-y-2 bg-white page-break-inside-avoid">
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                                STEP {step.stepNumber}
                              </span>
                              <h4 className="font-bold text-xs text-slate-900">{step.title}</h4>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[10px]">
                              {step.timingMinutes && (
                                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-900 font-bold rounded">
                                  ⏱️ {step.timingMinutes} min
                                </span>
                              )}
                              {step.tempCelsius && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded">
                                  🌡️ {step.tempCelsius}°C
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-800 leading-relaxed">{step.instruction}</p>

                          {/* Critical Checkpoint Warning */}
                          {step.criticalCheckpoint && (
                            <div className="p-2 bg-rose-50 border border-rose-300 rounded text-[11px] text-rose-900 font-medium">
                              ⚠️ <strong>CRITICAL CHECKPOINT:</strong> {step.criticalCheckpoint}
                            </div>
                          )}

                          {/* Step Master Mix Table */}
                          {showStepTables && stepReagents && stepReagents.length > 0 && (
                            <div className="mt-2 border border-slate-300 rounded overflow-hidden text-[10px] font-mono">
                              <div className="bg-slate-100 px-2 py-1 border-b border-slate-300 font-bold text-slate-800 flex justify-between">
                                <span>Master Mix Recipe (Step {step.stepNumber})</span>
                                <span>{numReactions} Rxns (+{overflowPercent}%)</span>
                              </div>
                              <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                  <tr>
                                    <th className="p-1">Reagent</th>
                                    <th className="p-1 text-right">1 Rxn</th>
                                    <th className="p-1 text-right font-bold text-emerald-900 bg-emerald-50">
                                      Total Master Mix
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {stepReagents.map((r, rIdx) => {
                                    const scaled = r.volPerRxnMicroliters * numReactions * overflowMultiplier;
                                    return (
                                      <tr key={rIdx}>
                                        <td className="p-1 font-sans">{r.reagentName}</td>
                                        <td className="p-1 text-right">{r.volPerRxnMicroliters.toFixed(2)} µL</td>
                                        <td className="p-1 text-right font-bold text-emerald-900 bg-emerald-50/50">
                                          {scaled >= 1000 ? `${(scaled / 1000).toFixed(3)} mL` : `${scaled.toFixed(1)} µL`}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 6. SECTION 5: QUALITY CONTROL & TROUBLESHOOTING */}
                <section className="space-y-2 page-break-inside-avoid">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center font-mono">5</span>
                    <span>5. QUALITY CONTROL & TROUBLESHOOTING MATRIX</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="border border-slate-200 bg-slate-50 rounded-lg p-2.5">
                      <p className="font-bold text-slate-900 text-[10px] uppercase font-mono border-b border-slate-200 pb-1">
                        Acceptance & QC Criteria
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5 mt-1">
                        {sop.qualityControl.map((qc, i) => (
                          <li key={i}>{qc}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-slate-300 rounded-lg overflow-hidden text-[10px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Observed Issue</th>
                            <th className="p-2 border-r border-slate-200">Root Cause</th>
                            <th className="p-2">Corrective Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {sop.troubleshooting.map((t, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="p-2 font-bold text-rose-800 border-r border-slate-200">{t.issue}</td>
                              <td className="p-2 text-slate-700 border-r border-slate-200">{t.cause}</td>
                              <td className="p-2 text-emerald-900 font-medium">{t.solution}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* 7. SECTION 6: FORMAL COMPLIANCE APPROVAL & SIGN-OFF BLOCK */}
                {showSignatures && (
                  <section className="pt-4 border-t-2 border-slate-400 space-y-3 page-break-inside-avoid">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-cyan-700" />
                        <span>6. DOCUMENT APPROVAL & COMPLIANCE SIGN-OFF</span>
                      </h3>
                      <span className="font-mono text-[9px] text-slate-500 uppercase">
                        ISO 17025 / GLP Document Control
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {/* Author */}
                      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2">
                        <p className="font-bold text-[10px] text-slate-600 uppercase font-mono">Prepared By (Author)</p>
                        <p className="font-semibold text-slate-900 text-xs">{sop.author}</p>
                        <div className="pt-4 border-b border-slate-400"></div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                          <span>Signature</span>
                          <span>Date: ____________</span>
                        </div>
                      </div>

                      {/* Technical Reviewer */}
                      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2">
                        <p className="font-bold text-[10px] text-slate-600 uppercase font-mono">Technical Reviewer</p>
                        <p className="font-semibold text-slate-900 text-xs">{sop.reviewerInfo?.name || sop.reviewer || 'QA Officer'}</p>
                        <div className="pt-4 border-b border-slate-400"></div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                          <span>Signature</span>
                          <span>Date: ____________</span>
                        </div>
                      </div>

                      {/* Quality Director */}
                      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2">
                        <p className="font-bold text-[10px] text-slate-600 uppercase font-mono">Quality / Lab Director</p>
                        <p className="font-semibold text-slate-900 text-xs">Dr. E. Vance, Director of Operations</p>
                        <div className="pt-4 border-b border-slate-400"></div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                          <span>Signature</span>
                          <span>Date: ____________</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* FOOTER DOCUMENT CONTROL STAMP */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <p>{institutionName} • Quality Management System</p>
                  <p>{sop.documentId} | Version {sop.version} | Page 1 of 1</p>
                  <p className="text-cyan-800 font-bold">UNCONTROLLED WHEN PRINTED</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
