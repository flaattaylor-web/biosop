import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  FileSpreadsheet,
  HelpCircle,
  BookOpen,
  Play,
  RotateCcw,
  Download,
  RefreshCw,
  UserCheck,
  Calculator,
  FlaskConical,
  PauseCircle,
  Layers,
  ListOrdered,
  Eye,
  DollarSign
} from 'lucide-react';
import { SopDocument, SopStep } from '../types';
import { ensureReactionSheet } from '../utils/sheetUtils';
import { SopPdfPreview } from './SopPdfPreview';
import { EquipmentInventorySection } from './EquipmentInventorySection';
import { AuditReportCard } from './AuditReportCard';
import { exportControlledWordLocal, exportLiveExcelLocal } from '../client/exportsLocal';
import { VersionPanel } from './VersionPanel';
import { WorklistPanel } from './WorklistPanel';
import { ReferenceVerifier } from './ReferenceVerifier';
import { matchReagentPriceFromCatalog } from '../data/reagentPricingCatalog';

interface SopViewerProps {
  sop: SopDocument;
  onGoToExcel: () => void;
  onGoToCrossTest: () => void;
  onSopUpdated?: (sop: SopDocument) => void;
}

export const SopViewer: React.FC<SopViewerProps> = ({
  sop,
  onGoToExcel,
  onGoToCrossTest,
  onSopUpdated
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTimerStep, setActiveTimerStep] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const [exportingWord, setExportingWord] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const [currentSopDoc, setCurrentSopDoc] = useState<SopDocument>(sop);

  React.useEffect(() => {
    setCurrentSopDoc(sop);
  }, [sop]);

  // Live editable state for Requestor and Reviewer Info
  const [reqName, setReqName] = useState(sop.requestorInfo?.name || '');
  const [reqDept, setReqDept] = useState(sop.requestorInfo?.department || '');
  const [reqEmail, setReqEmail] = useState(sop.requestorInfo?.emailOrRole || '');
  const [reqDate, setReqDate] = useState(sop.requestorInfo?.dateRequested || '');

  const [revName, setRevName] = useState(sop.reviewerInfo?.name || '');
  const [revRole, setRevRole] = useState(sop.reviewerInfo?.titleOrRole || '');
  const [revDate, setRevDate] = useState(sop.reviewerInfo?.dateReviewed || '');
  const [revStatus, setRevStatus] = useState(sop.reviewerInfo?.status || 'Pending Review');
  const [revComments, setRevComments] = useState(sop.reviewerInfo?.comments || '');

  // Reaction Master Mix Scaling State for SOP Steps
  const rxnSheet = ensureReactionSheet(sop);
  const [sampleCount, setSampleCount] = useState<number>(rxnSheet.sampleCount || 8);
  const [replicates, setReplicates] = useState<number>(rxnSheet.replicates || 1);
  const [posControls, setPosControls] = useState<number>(rxnSheet.posControls || 1);
  const [negControls, setNegControls] = useState<number>(rxnSheet.negControls || 1);
  const [overflowPercent, setOverflowPercent] = useState<number>(rxnSheet.defaultOverflowPercent || 10);

  const numReactions = Math.max(1, (sampleCount * replicates) + posControls + negControls);
  const overflowMultiplier = 1 + (overflowPercent / 100);

  const quickReagentSingleCost = (rxnSheet.components || []).reduce((acc, comp) => {
    const match = matchReagentPriceFromCatalog(comp.name);
    return acc + (comp.volPerRxnMicroliters || 0) * match.costPerMicroliter;
  }, 0);
  const quickReagentRunCost = quickReagentSingleCost * numReactions * overflowMultiplier;

  const getUpdatedSop = (): SopDocument => {
    return {
      ...currentSopDoc,
      requestorInfo: {
        name: reqName,
        department: reqDept,
        emailOrRole: reqEmail,
        dateRequested: reqDate
      },
      reviewerInfo: {
        name: revName,
        titleOrRole: revRole,
        dateReviewed: revDate,
        status: revStatus,
        comments: revComments
      }
    };
  };

  const handleExportWord = async () => {
    setExportingWord(true);
    try {
      // Built in the browser: the SOP is not uploaded anywhere to make this file.
      await exportControlledWordLocal(getUpdatedSop());
    } catch (err) {
      console.error('Word export error:', err);
      alert('Failed to build Word document.');
    } finally {
      setExportingWord(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      // Live-formula workbook, built in the browser.
      await exportLiveExcelLocal({ ...sop, reactionSheet: ensureReactionSheet(sop) });
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Failed to build Excel file.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Step Timer logic
  const startTimer = (stepNum: number, minutes: number) => {
    setActiveTimerStep(stepNum);
    setTimeLeft(minutes * 60);
    setTimerRunning(true);
  };

  React.useEffect(() => {
    let interval: any = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
      // Play soft beep or notification if possible
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const copyAsMarkdown = () => {
    const md = `
# STANDARD OPERATING PROCEDURE: ${sop.title}
**Document ID:** ${sop.documentId} | **Version:** ${sop.version} | **Effective Date:** ${sop.effectiveDate}
**Author:** ${sop.author} | **Category:** ${sop.category}
**Biosafety Level:** ${sop.biosafetyLevel}

## 1. PURPOSE & SCOPE
${sop.scope}

## 2. SAFETY & PPE
${sop.hazards.map((h) => `- **[${h.type}] ${h.label}:** ${h.description}`).join('\n')}
${sop.ppeRequirements.map((p) => `- ${p.required ? '[REQUIRED]' : '[OPTIONAL]'} ${p.item} ${p.notes ? `(${p.notes})` : ''}`).join('\n')}

## 3. REAGENTS & EQUIPMENT
### Equipment:
${sop.equipmentRequired.map((e) => `- ${e}`).join('\n')}

### Reagents:
${sop.reagentsRequired.map((r) => `- ${r}`).join('\n')}

## 4. STEP-BY-STEP PROCEDURE
${sop.steps
  .map(
    (s) =>
      `### Step ${s.stepNumber}: ${s.title}\n${s.instruction}\n${
        s.timingMinutes ? `*Duration:* ${s.timingMinutes} mins` : ''
      } ${s.tempCelsius ? `| *Temp:* ${s.tempCelsius}°C` : ''}\n${
        s.criticalCheckpoint ? `> ⚠️ **CRITICAL CHECKPOINT:** ${s.criticalCheckpoint}\n` : ''
      }`
  )
  .join('\n')}

## 5. QUALITY CONTROL & TROUBLESHOOTING
### Quality Control:
${sop.qualityControl.map((qc) => `- ${qc}`).join('\n')}

### Troubleshooting:
${sop.troubleshooting.map((t) => `- **Issue:** ${t.issue}\n  - **Cause:** ${t.cause}\n  - **Solution:** ${t.solution}`).join('\n')}

## 6. REFERENCES
${sop.references.map((r) => `- ${r.citation} ${r.doiOrUrl ? `[${r.doiOrUrl}]` : ''}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-mono border border-slate-200">
            {sop.documentId}
          </span>
          <span className="text-xs text-slate-500 font-medium">v{sop.version}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportWord}
            disabled={exportingWord}
            className="flex items-center gap-1.5 text-xs bg-cyan-700 hover:bg-cyan-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            {exportingWord ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export Word (.DOCX)</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            {exportingExcel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>Export Excel (.XLSX)</span>
          </button>

          <button
            onClick={copyAsMarkdown}
            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
          </button>

          <button
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer border border-cyan-500/40"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>PDF / Stationery Preview</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>

          <button
            onClick={onGoToExcel}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Interactive Calculator</span>
          </button>

          <button
            onClick={onGoToCrossTest}
            className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cross-Test vs Literature</span>
          </button>
        </div>
      </div>

      {/* 99%+ ACCURACY AUDIT CERTIFICATE */}
      <AuditReportCard report={sop.auditReport} />
      <div className="mt-4"><ReferenceVerifier sop={sop} onSopUpdated={onSopUpdated} /></div>
      <div className="mt-4"><WorklistPanel sop={sop} /></div>
      <div className="mt-4"><VersionPanel sop={sop} /></div>

      {/* Main ISO/GLP Standard Operating Procedure Document Sheet */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden print:shadow-none print:border-none">
        {/* ISO Document Header Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 border-b-4 border-cyan-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold font-mono flex items-center gap-2">
                <span>Standard Operating Procedure (SOP)</span>
                {sop.customTemplateApplied && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 text-[10px] uppercase font-mono">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span>Template Matched: {sop.customTemplateName || 'Custom SOP Format'}</span>
                  </span>
                )}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1 leading-snug">
                {sop.title}
              </h1>
            </div>

            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shrink-0 text-right font-mono text-xs space-y-1">
              <p className="text-cyan-300 font-bold">{sop.documentId}</p>
              <p className="text-slate-400">Version: {sop.version}</p>
              <p className="text-slate-400">Date: {sop.effectiveDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4 text-xs">
            <div>
              <span className="text-slate-400 block">Category</span>
              <span className="font-semibold text-slate-200">{sop.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Author</span>
              <span className="font-semibold text-slate-200">{sop.author}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Reviewer</span>
              <span className="font-semibold text-slate-200">{revName || sop.reviewer || 'QA Department'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Sample Batch Capacity</span>
              <span className="font-semibold text-cyan-300 font-mono">
                {sop.reactionSheet?.sampleCount || 8} Samples ({numReactions} rxns)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Est. Reagent Run Cost</span>
              <button
                onClick={onGoToExcel}
                className="font-bold text-emerald-400 font-mono flex items-center gap-1 hover:underline cursor-pointer"
                title="Open Interactive Cost Estimator"
              >
                <DollarSign className="w-3 h-3" />
                <span>${quickReagentRunCost.toFixed(2)} (${quickReagentSingleCost.toFixed(3)}/rxn)</span>
              </button>
            </div>
            <div>
              <span className="text-slate-400 block">Biosafety Classification</span>
              <span
                className={`inline-block font-bold px-2 py-0.5 rounded mt-0.5 ${
                  sop.biosafetyLevel === 'BSL-2'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : sop.biosafetyLevel === 'BSL-3'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {sop.biosafetyLevel}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8 text-slate-800 text-sm">
          {/* Section: Requestor & Reviewer Compliance Sign-off */}
          <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Requestor & Reviewer Sign-Off Metadata
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Editable Compliance Record</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Requestor Metadata */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                <p className="font-bold text-cyan-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                  Requestor Information
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Requestor Name</label>
                    <input
                      type="text"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="Fill requestor name"
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Department / Lab</label>
                    <input
                      type="text"
                      value={reqDept}
                      onChange={(e) => setReqDept(e.target.value)}
                      placeholder="Fill department"
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Email / Role</label>
                    <input
                      type="text"
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      placeholder="Fill email or role"
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Date Requested</label>
                    <input
                      type="date"
                      value={reqDate}
                      onChange={(e) => setReqDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Reviewer Metadata */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                <p className="font-bold text-amber-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                  Reviewer & QA Approval
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Reviewer Name</label>
                    <input
                      type="text"
                      value={revName}
                      onChange={(e) => setRevName(e.target.value)}
                      placeholder="Fill reviewer name"
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Title / Role</label>
                    <input
                      type="text"
                      value={revRole}
                      onChange={(e) => setRevRole(e.target.value)}
                      placeholder="Fill title or QA role"
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Review Status</label>
                    <select
                      value={revStatus}
                      onChange={(e) => setRevStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-semibold focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Pending Review">Pending Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Revision Requested">Revision Requested</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block font-semibold">Date Reviewed</label>
                    <input
                      type="date"
                      value={revDate}
                      onChange={(e) => setRevDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block font-semibold">Reviewer Comments</label>
                  <input
                    type="text"
                    value={revComments}
                    onChange={(e) => setRevComments(e.target.value)}
                    placeholder="Fill review notes or approval conditions"
                    className="w-full bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-800 text-[11px] focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </section>
          {/* Section 1: Purpose & Scope */}
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Purpose & Operational Scope</span>
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              {sop.scope}
            </p>
          </section>

          {/* Section 2: Safety Hazards & PPE */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
              <span>Biosafety Hazards & Personal Protective Equipment (PPE)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hazards Cards */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Identified Risk Factors:</p>
                {sop.hazards.map((hazard, i) => (
                  <div
                    key={i}
                    className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase font-mono">[{hazard.type}] {hazard.label}</span>
                      <p className="text-xs text-amber-800 mt-0.5">{hazard.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* PPE List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Required PPE Checklist:</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  {sop.ppeRequirements.map((ppe, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${ppe.required ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="font-medium text-slate-800">{ppe.item}</span>
                      </div>
                      {ppe.notes && <span className="text-[11px] text-slate-500 italic">({ppe.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Reagents & Equipment Required */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Required Equipment & Reagent Inventory</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Equipment & Hardware:</p>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {getUpdatedSop().equipmentRequired.map((eq, i) => (
                    <li key={i}>{eq}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Reagents & Solutions:</p>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {getUpdatedSop().reagentsRequired.map((re, i) => (
                    <li key={i}>{re}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Hardware Inventory Compatibility & Substitution Analysis */}
            <EquipmentInventorySection
              sop={getUpdatedSop()}
              onUpdateSop={(updated) => setCurrentSopDoc(updated)}
            />
          </section>

          {/* Active Step Timer Widget (if running) */}
          {activeTimerStep !== null && (
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-cyan-500 flex items-center justify-between shadow-lg sticky top-20 z-40">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-cyan-400 animate-spin" />
                <div>
                  <p className="text-xs text-slate-400 font-mono">STEP {activeTimerStep} BENCH INCUBATION TIMER</p>
                  <p className="text-2xl font-bold font-mono text-cyan-300">{formatTimer(timeLeft)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg"
                >
                  {timerRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setActiveTimerStep(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Section 4: Step-by-Step Execution Protocol */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Step-by-Step Execution Protocol & Scaled Master Mixes</span>
              </h2>

              <button
                onClick={onGoToExcel}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-lg border border-cyan-200 transition-colors cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Open Full Master Mix Calculator Tab</span>
              </button>
            </div>

            {/* Interactive Batch Reaction Scaler Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider block">
                      Live Batch Reaction Master Mix Scaler
                    </span>
                    <span className="text-[11px] text-slate-300">
                      Adjust reaction parameters to automatically recalculate per-step master mixes below.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 px-3 py-1 rounded-xl border border-cyan-500/40 text-right shrink-0">
                  <span className="text-[9px] uppercase font-mono text-cyan-300 block">Total Batch Capacity</span>
                  <span className="text-xs font-extrabold text-white font-mono">
                    {numReactions} Reactions (+{overflowPercent}% Buffer)
                  </span>
                </div>
              </div>

              {/* Presets and Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs">
                {/* Sample Count */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Samples (S)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSampleCount(Math.max(1, sampleCount - 1))}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-white font-bold text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={sampleCount}
                      onChange={(e) => setSampleCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center bg-slate-900 border border-slate-700 rounded py-0.5 text-xs text-white font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setSampleCount(sampleCount + 1)}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-white font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Technical Replicates */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Replicates (R)
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReplicates(r)}
                        className={`flex-1 py-1 rounded text-xs font-mono font-bold transition-colors border ${
                          replicates === r
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Controls
                  </label>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                    <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      <span className="text-emerald-400 font-bold">+C:</span>
                      <input
                        type="number"
                        min={0}
                        value={posControls}
                        onChange={(e) => setPosControls(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-transparent text-white font-bold focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      <span className="text-rose-400 font-bold">NTC:</span>
                      <input
                        type="number"
                        min={0}
                        value={negControls}
                        onChange={(e) => setNegControls(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-transparent text-white font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Overflow % */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Overflow</span>
                    <span className="text-cyan-400 font-mono">+{overflowPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={5}
                    value={overflowPercent}
                    onChange={(e) => setOverflowPercent(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 mt-1"
                  />
                </div>

                {/* Presets dropdown / Quick buttons */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 flex flex-col justify-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Presets
                  </label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '8') { setSampleCount(8); setReplicates(1); setPosControls(1); setNegControls(1); }
                      if (val === '16_2x') { setSampleCount(16); setReplicates(2); setPosControls(1); setNegControls(1); }
                      if (val === '24') { setSampleCount(24); setReplicates(1); setPosControls(1); setNegControls(1); }
                      if (val === '96') { setSampleCount(92); setReplicates(1); setPosControls(2); setNegControls(2); }
                      if (val === '384') { setSampleCount(368); setReplicates(1); setPosControls(8); setNegControls(8); }
                    }}
                    className="w-full bg-slate-900 text-cyan-300 font-mono font-bold text-xs py-1 px-2 rounded border border-slate-700 focus:outline-none"
                  >
                    <option value="8">8 Samples (10 rxns)</option>
                    <option value="16_2x">16 Samples 2x (34 rxns)</option>
                    <option value="24">24 Samples (26 rxns)</option>
                    <option value="96">96-Well Plate (96 rxns)</option>
                    <option value="384">384-Well Plate (384 rxns)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Steps Rendering */}
            <div className="space-y-4">
              {sop.steps.map((step, sIdx) => {
                const isCompleted = completedSteps[step.stepNumber];
                const matchedStep = rxnSheet.stepByStepReactionSteps?.find(s => s.stepNumber === step.stepNumber);
                const stepReagents = step.reagentsAndVolumes || matchedStep?.reagentsAndVolumes;

                // Detect stopping point / pause point
                const stoppingPointText = step.stoppingPoint || matchedStep?.stoppingPoint || (() => {
                  const combined = `${step.title} ${step.instruction}`.toLowerCase();
                  if (combined.includes('stopping point') || combined.includes('pause point')) {
                    return step.instruction;
                  }
                  if (combined.includes('store at') || combined.includes('hold at') || combined.includes('overnight') || combined.includes('-20°c') || combined.includes('-80°c')) {
                    return 'Safe Stopping Point: Samples/reagents can be stored at specified temperature overnight or long-term.';
                  }
                  return null;
                })();

                // Check if step is master mix creation step and lacks specific stepReagents
                const isMasterMixStep = !stepReagents && `${step.title} ${step.instruction}`.toLowerCase().match(/(master mix|reaction mix|reagent preparation|prepare mix|reaction setup)/i);

                return (
                  <div
                    key={step.stepNumber || sIdx}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-50 border-slate-300 opacity-70'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 w-full">
                        <button
                          onClick={() => toggleStep(step.stepNumber)}
                          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:border-cyan-500'
                          }`}
                        >
                          {isCompleted ? <Check className="w-4 h-4" /> : step.stepNumber}
                        </button>

                        <div className="space-y-3 w-full">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                                STEP {step.stepNumber}
                              </span>
                              {matchedStep?.phase && (
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded">
                                  {matchedStep.phase}
                                </span>
                              )}
                            </div>
                            <h3 className={`font-bold text-sm text-slate-900 mt-1 ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                              {step.title}
                            </h3>
                            <p className="text-xs text-slate-700 leading-relaxed mt-1.5">{step.instruction}</p>
                          </div>

                          {/* PER-STEP MASTER MIX CALCULATOR TABLE */}
                          {(stepReagents && stepReagents.length > 0) ? (
                            <div className="bg-slate-900 text-white rounded-xl border border-slate-800 overflow-hidden text-xs space-y-0">
                              <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="font-mono font-bold text-emerald-400 uppercase text-[10px] tracking-wider">
                                    Step {step.stepNumber} Master Mix Calculator ({numReactions} Reactions +{overflowPercent}% Buffer)
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Total Step Vol: {(stepReagents.reduce((acc, r) => acc + r.volPerRxnMicroliters, 0) * numReactions * overflowMultiplier).toFixed(1)} µL
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-950/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                    <tr>
                                      <th className="p-2">Component / Reagent</th>
                                      <th className="p-2 text-right">Vol / 1 Rxn</th>
                                      <th className="p-2 text-right bg-emerald-950/40 text-emerald-300 font-bold">
                                        Master Mix ({numReactions} Rxns +{overflowPercent}%)
                                      </th>
                                      <th className="p-2">Final Conc / Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                                    {stepReagents.map((rItem, rIdx) => {
                                      const scaledVol = rItem.volPerRxnMicroliters * numReactions * overflowMultiplier;
                                      return (
                                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-900/20'}>
                                          <td className="p-2 font-sans font-semibold text-slate-200 flex items-center gap-1.5">
                                            <FlaskConical className="w-3 h-3 text-cyan-400 shrink-0" />
                                            <span>{rItem.reagentName}</span>
                                          </td>
                                          <td className="p-2 text-right text-slate-300">
                                            {rItem.volPerRxnMicroliters.toFixed(2)} µL
                                          </td>
                                          <td className="p-2 text-right font-bold text-emerald-400 bg-emerald-950/30">
                                            {scaledVol >= 1000 ? `${(scaledVol / 1000).toFixed(3)} mL` : `${scaledVol.toFixed(1)} µL`}
                                          </td>
                                          <td className="p-2 text-slate-400 font-sans text-[10px]">
                                            {rItem.finalAmountOrConc || rItem.notes || '-'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : isMasterMixStep ? (
                            /* Fallback to global reaction components scaled for step 1/master mix setup */
                            <div className="bg-slate-900 text-white rounded-xl border border-slate-800 overflow-hidden text-xs space-y-0">
                              <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="font-mono font-bold text-emerald-400 uppercase text-[10px] tracking-wider">
                                    Global Reaction Master Mix ({numReactions} Reactions +{overflowPercent}% Buffer)
                                  </span>
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-950/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                    <tr>
                                      <th className="p-2">Component</th>
                                      <th className="p-2 text-right">Vol / 1 Rxn</th>
                                      <th className="p-2 text-right bg-emerald-950/40 text-emerald-300 font-bold">
                                        Total Master Mix Vol ({numReactions} Rxns +{overflowPercent}%)
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                                    {rxnSheet.components.map((c, cIdx) => {
                                      const scaledVol = c.volPerRxnMicroliters * numReactions * overflowMultiplier;
                                      return (
                                        <tr key={cIdx} className={cIdx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-900/20'}>
                                          <td className="p-2 font-sans font-semibold text-slate-200">{c.name}</td>
                                          <td className="p-2 text-right text-slate-300">{c.volPerRxnMicroliters.toFixed(2)} µL</td>
                                          <td className="p-2 text-right font-bold text-emerald-400 bg-emerald-950/30">
                                            {scaledVol >= 1000 ? `${(scaledVol / 1000).toFixed(3)} mL` : `${scaledVol.toFixed(1)} µL`}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}

                          {/* STOPPING POINT / BENCH STORAGE HOLD CALLOUT */}
                          {stoppingPointText && (
                            <div className="p-3 bg-gradient-to-r from-indigo-900/90 to-purple-900/90 text-white border border-indigo-500/50 rounded-xl flex items-start gap-2.5 shadow-xs">
                              <PauseCircle className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                                  ⏸️ SAFE STOPPING POINT / BENCH HOLD
                                </span>
                                <span className="text-xs text-indigo-100 font-sans leading-snug block mt-0.5">
                                  {stoppingPointText}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Critical Checkpoint Warning */}
                          {step.criticalCheckpoint && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-rose-900">CRITICAL CHECKPOINT: </span>
                                <span>{step.criticalCheckpoint}</span>
                              </div>
                            </div>
                          )}

                          {/* Safety Warning */}
                          {step.safetyWarning && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{step.safetyWarning}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step Timing & Temperature Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {step.timingMinutes && (
                          <button
                            onClick={() => startTimer(step.stepNumber, step.timingMinutes!)}
                            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-lg hover:bg-cyan-100 cursor-pointer shadow-2xs"
                            title="Start step timer"
                          >
                            <Clock className="w-3.5 h-3.5 text-cyan-600" />
                            <span>{step.timingMinutes} min</span>
                          </button>
                        )}
                        {step.tempCelsius && (
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {step.tempCelsius}°C
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 5: Quality Control & Troubleshooting */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">5</span>
              <span>Quality Control & Troubleshooting Matrix</span>
            </h2>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quality Assurance Criteria:</p>
                <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                  {sop.qualityControl.map((qc, i) => (
                    <li key={i}>{qc}</li>
                  ))}
                </ul>
              </div>

              {/* Troubleshooting Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 border-b border-slate-200">Observed Deviation / Issue</th>
                      <th className="p-3 border-b border-slate-200">Probable Root Cause</th>
                      <th className="p-3 border-b border-slate-200">Corrective Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sop.troubleshooting.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-rose-700">{t.issue}</td>
                        <td className="p-3 text-slate-600">{t.cause}</td>
                        <td className="p-3 text-emerald-800 font-medium">{t.solution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 6: Literature References */}
          <section className="space-y-2 pt-2 border-t border-slate-200">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-600" />
              <span>Literature & Protocol Citations</span>
            </h2>
            <ul className="space-y-1 text-xs text-slate-600 font-mono">
              {sop.references.map((ref, idx) => (
                <li key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-800">{ref.citation}</p>
                  {ref.doiOrUrl && (
                    <a
                      href={ref.doiOrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-600 hover:underline text-[11px] block mt-0.5"
                    >
                      {ref.doiOrUrl}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* PDF / Official Lab Stationery Preview Modal Overlay */}
      {showPdfPreview && (
        <SopPdfPreview
          sop={getUpdatedSop()}
          numReactions={numReactions}
          overflowPercent={overflowPercent}
          overflowMultiplier={overflowMultiplier}
          onClose={() => setShowPdfPreview(false)}
          onExportWord={handleExportWord}
          onExportExcel={handleExportExcel}
        />
      )}
    </div>
  );
};
