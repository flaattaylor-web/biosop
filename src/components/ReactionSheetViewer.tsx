import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  Layers,
  Calculator,
  Grid,
  Check,
  RefreshCw,
  ListOrdered,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  FlaskConical,
  Info,
  Atom,
  Zap,
  Users,
  Scale,
  Sliders,
  PauseCircle,
  DollarSign,
  PieChart
} from 'lucide-react';
import { ReactionSheet, ReagentComponent, ThermocyclerStep, StepByStepReactionStep, SopCostEstimation, DnaNormalizationResult } from '../types';
import { ReagentCostEstimator } from './ReagentCostEstimator';
import { DnaNormalizationCalculator } from './DnaNormalizationCalculator';
import { AuditReportCard } from './AuditReportCard';
import { generateLiveExcelWorkbook } from '../server/excelLive';
import { matchReagentPriceFromCatalog } from '../data/reagentPricingCatalog';

interface ReactionSheetViewerProps {
  reactionSheet: ReactionSheet;
  onUpdateSheet: (updatedSheet: ReactionSheet) => void;
  sopAuditReport?: import('../core/auditor').AuditReport;
}

export const ReactionSheetViewer: React.FC<ReactionSheetViewerProps> = ({
  reactionSheet,
  onUpdateSheet,
  sopAuditReport
}) => {
  const [numReactions, setNumReactions] = useState<number>(reactionSheet.defaultNumReactions || 10);
  const [sampleCount, setSampleCount] = useState<number>(
    reactionSheet.sampleCount ?? Math.max(1, (reactionSheet.defaultNumReactions || 10) - 2)
  );
  const [replicates, setReplicates] = useState<number>(reactionSheet.replicates ?? 1);
  const [posControls, setPosControls] = useState<number>(reactionSheet.posControls ?? 1);
  const [negControls, setNegControls] = useState<number>(reactionSheet.negControls ?? 1);
  const [extraWells, setExtraWells] = useState<number>(0);

  const [overflowPercent, setOverflowPercent] = useState<number>(reactionSheet.defaultOverflowPercent || 10);

  useEffect(() => {
    if (reactionSheet) {
      const sCount = reactionSheet.sampleCount ?? Math.max(1, (reactionSheet.defaultNumReactions || 10) - 2);
      const reps = reactionSheet.replicates ?? 1;
      const pos = reactionSheet.posControls ?? 1;
      const neg = reactionSheet.negControls ?? 1;
      const calculatedTotal = (sCount * reps) + pos + neg;

      setSampleCount(sCount);
      setReplicates(reps);
      setPosControls(pos);
      setNegControls(neg);
      setExtraWells(0);
      setNumReactions(reactionSheet.defaultNumReactions || calculatedTotal);
      if (reactionSheet.defaultOverflowPercent !== undefined) {
        setOverflowPercent(reactionSheet.defaultOverflowPercent);
      }
    }
  }, [reactionSheet]);
  const [exporting, setExporting] = useState<boolean>(false);
  const [activePlateWell, setActivePlateWell] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [activeViewTab, setActiveViewTab] = useState<'both' | 'mix' | 'cost' | 'norm'>('both');

  // Step Reagent Inline Editing state
  const [addingToStepIdx, setAddingToStepIdx] = useState<number | null>(null);
  const [stepReagentName, setStepReagentName] = useState('');
  const [stepReagentVol, setStepReagentVol] = useState('1.0');
  const [stepReagentNotes, setStepReagentNotes] = useState('');

  // Auto-calculate Total Reactions when Sample parameters change
  const updateScalingFromSampleInputs = (
    sCount: number,
    reps: number,
    pos: number,
    neg: number,
    extra: number
  ) => {
    const safeSamples = Math.max(1, sCount);
    const safeReps = Math.max(1, reps);
    const safePos = Math.max(0, pos);
    const safeNeg = Math.max(0, neg);
    const safeExtra = Math.max(0, extra);

    setSampleCount(safeSamples);
    setReplicates(safeReps);
    setPosControls(safePos);
    setNegControls(safeNeg);
    setExtraWells(safeExtra);

    const calculatedTotal = (safeSamples * safeReps) + safePos + safeNeg + safeExtra;
    setNumReactions(calculatedTotal);

    onUpdateSheet({
      ...reactionSheet,
      defaultNumReactions: calculatedTotal,
      sampleCount: safeSamples,
      replicates: safeReps,
      posControls: safePos,
      negControls: safeNeg,
      defaultOverflowPercent: overflowPercent
    });
  };

  // When total reactions slider or input is manually adjusted
  const handleDirectTotalReactionsChange = (newTotal: number) => {
    const safeTotal = Math.max(1, newTotal);
    setNumReactions(safeTotal);
    const availableForSamples = safeTotal - posControls - negControls - extraWells;
    const calcSamples = Math.max(1, Math.floor(availableForSamples / replicates));
    setSampleCount(calcSamples);

    onUpdateSheet({
      ...reactionSheet,
      defaultNumReactions: safeTotal,
      sampleCount: calcSamples,
      replicates,
      posControls,
      negControls,
      defaultOverflowPercent: overflowPercent
    });
  };

  // Sample Presets
  const applySamplePreset = (preset: {
    samples: number;
    reps: number;
    pos: number;
    neg: number;
    extra?: number;
  }) => {
    updateScalingFromSampleInputs(
      preset.samples,
      preset.reps,
      preset.pos,
      preset.neg,
      preset.extra || 0
    );
  };

  const toggleStepCompleted = (stepNum: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }));
  };

  const handleAddReagentToStep = (stepIdx: number) => {
    if (!stepReagentName.trim()) return;
    const vol = parseFloat(stepReagentVol) || 1.0;
    const updatedSteps = [...(reactionSheet.stepByStepReactionSteps || [])];
    const step = updatedSteps[stepIdx];
    const newReagents = [
      ...(step.reagentsAndVolumes || []),
      {
        reagentName: stepReagentName.trim(),
        volPerRxnMicroliters: vol,
        finalAmountOrConc: 'As specified',
        notes: stepReagentNotes.trim() || 'Added at bench'
      }
    ];
    const newStepVol = newReagents.reduce((acc, r) => acc + (r.volPerRxnMicroliters || 0), 0);
    updatedSteps[stepIdx] = {
      ...step,
      reagentsAndVolumes: newReagents,
      stepMasterMixVolumeMicroliters: newStepVol
    };
    onUpdateSheet({
      ...reactionSheet,
      stepByStepReactionSteps: updatedSteps
    });
    setAddingToStepIdx(null);
    setStepReagentName('');
    setStepReagentVol('1.0');
    setStepReagentNotes('');
  };

  const handleDeleteStepReagent = (stepIdx: number, reagentIdx: number) => {
    const updatedSteps = [...(reactionSheet.stepByStepReactionSteps || [])];
    const step = updatedSteps[stepIdx];
    const newReagents = (step.reagentsAndVolumes || []).filter((_, idx) => idx !== reagentIdx);
    const newStepVol = newReagents.reduce((acc, r) => acc + (r.volPerRxnMicroliters || 0), 0);
    updatedSteps[stepIdx] = {
      ...step,
      reagentsAndVolumes: newReagents,
      stepMasterMixVolumeMicroliters: newStepVol
    };
    onUpdateSheet({
      ...reactionSheet,
      stepByStepReactionSteps: updatedSteps
    });
  };

  const handleUpdateStepReagentVol = (stepIdx: number, reagentIdx: number, newVolStr: string) => {
    const vol = parseFloat(newVolStr) || 0;
    const updatedSteps = [...(reactionSheet.stepByStepReactionSteps || [])];
    const step = updatedSteps[stepIdx];
    const newReagents = [...(step.reagentsAndVolumes || [])];
    if (newReagents[reagentIdx]) {
      newReagents[reagentIdx] = {
        ...newReagents[reagentIdx],
        volPerRxnMicroliters: vol
      };
    }
    const newStepVol = newReagents.reduce((acc, r) => acc + (r.volPerRxnMicroliters || 0), 0);
    updatedSteps[stepIdx] = {
      ...step,
      reagentsAndVolumes: newReagents,
      stepMasterMixVolumeMicroliters: newStepVol
    };
    onUpdateSheet({
      ...reactionSheet,
      stepByStepReactionSteps: updatedSteps
    });
  };

  const overflowMultiplier = 1 + overflowPercent / 100;

  // Total volume calculation per single reaction
  const singleRxnTotalVol = reactionSheet.components.reduce(
    (acc, comp) => acc + (comp.volPerRxnMicroliters || 0),
    0
  );

  // Total master mix volume for N reactions + overflow
  const masterMixTotalVol = singleRxnTotalVol * numReactions * overflowMultiplier;

  // Quick reagent cost estimation calculation
  const quickEstimatedSingleCost = reactionSheet.components.reduce((acc, comp) => {
    const match = matchReagentPriceFromCatalog(comp.name);
    return acc + (comp.volPerRxnMicroliters || 0) * match.costPerMicroliter;
  }, 0);
  const quickEstimatedRunCost = quickEstimatedSingleCost * numReactions * overflowMultiplier;

  // Download Native XLSX Excel Spreadsheet
  const handleExportXlsx = async () => {
    setExporting(true);
    try {
      const sheetToExport: ReactionSheet = {
        ...reactionSheet,
        defaultNumReactions: numReactions,
        defaultOverflowPercent: overflowPercent
      };
      // Live-formula workbook built in the browser (nothing uploaded).
      const bytes = await generateLiveExcelWorkbook(sheetToExport);
      const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(reactionSheet.title || 'Reaction_Sheet').replace(/[^a-zA-Z0-9_-]/g, '_')}_live.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to build Excel file.');
    } finally {
      setExporting(false);
    }
  };

  // Download CSV Spreadsheet
  const handleExportCsv = () => {
    const csvRows = [
      ['Order', 'Component Name', 'Stock Conc', 'Final Conc', 'Vol / 1 Rxn (uL)', `Vol / ${numReactions} Rxns + ${overflowPercent}% Overflow (uL)`, 'Storage & Notes'],
      ...reactionSheet.components.map((c, i) => [
        c.pipettingOrder || i + 1,
        `"${c.name}"`,
        `"${c.stockConc} ${c.stockUnit}"`,
        `"${c.finalConc} ${c.finalUnit}"`,
        c.volPerRxnMicroliters,
        (c.volPerRxnMicroliters * numReactions * overflowMultiplier).toFixed(2),
        `"${c.notes || ''}"`
      ]),
      ['', 'TOTAL REACTION VOLUME:', '', '', singleRxnTotalVol.toFixed(2), masterMixTotalVol.toFixed(2), '']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reactionSheet.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update component volume or details
  const updateComponent = (index: number, field: keyof ReagentComponent, value: any) => {
    const updatedComponents = [...reactionSheet.components];
    updatedComponents[index] = {
      ...updatedComponents[index],
      [field]: value
    };
    onUpdateSheet({
      ...reactionSheet,
      components: updatedComponents
    });
  };

  // Add new reaction component
  const addComponent = () => {
    const newComp: ReagentComponent = {
      id: `c_${Date.now()}`,
      name: 'New Solution / Reagent',
      stockConc: 10,
      stockUnit: 'mM',
      finalConc: 1,
      finalUnit: 'mM',
      volPerRxnMicroliters: 1.0,
      pipettingOrder: reactionSheet.components.length + 1,
      storageTemp: '4°C'
    };
    onUpdateSheet({
      ...reactionSheet,
      components: [...reactionSheet.components, newComp]
    });
  };

  // Delete reaction component
  const deleteComponent = (index: number) => {
    const updated = reactionSheet.components.filter((_, idx) => idx !== index);
    onUpdateSheet({
      ...reactionSheet,
      components: updated
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
              Interactive Master Mix & Excel Calculator
            </span>
            {(reactionSheet.isDeNovo || reactionSheet.generationMode === 'de_novo') && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-600/30 text-purple-300 text-[11px] font-bold rounded-full border border-purple-500/40 ml-2">
                <Atom className="w-3.5 h-3.5 text-purple-400" />
                <span>De Novo Protocol</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">{reactionSheet.title}</h1>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
            <span>Assay Target: <strong className="text-slate-200">{reactionSheet.assayType}</strong></span>
            <span>•</span>
            <span>Single Rxn Vol: <strong className="text-slate-200">{singleRxnTotalVol.toFixed(1)} µL</strong></span>
            <span>•</span>
            <button
              onClick={() => setActiveViewTab('cost')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono font-bold transition-colors cursor-pointer"
              title="Click to open full Cost Estimation breakdown"
            >
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span>Est. Run Budget: ${quickEstimatedRunCost.toFixed(2)} (${quickEstimatedSingleCost.toFixed(3)}/rxn)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportXlsx}
            disabled={exporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export Native Excel (.XLSX)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* SAMPLE NUMBER & SCALING AUTO-CALCULATOR PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />
              <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                Sample Count Auto-Scaling & Reaction Calculator
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Specify your experimental sample size, technical replicates, and controls. All per-step and global master mix volumes scale automatically.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => applySamplePreset({ samples: 8, reps: 1, pos: 1, neg: 1 })}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-semibold transition-all cursor-pointer ${
                sampleCount === 8 && replicates === 1 && posControls === 1 && negControls === 1
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              8 Samples (10 rxns)
            </button>

            <button
              type="button"
              onClick={() => applySamplePreset({ samples: 16, reps: 2, pos: 1, neg: 1 })}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-semibold transition-all cursor-pointer ${
                sampleCount === 16 && replicates === 2 && posControls === 1 && negControls === 1
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              16 Samples 2x (34 rxns)
            </button>

            <button
              type="button"
              onClick={() => applySamplePreset({ samples: 24, reps: 1, pos: 1, neg: 1 })}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-semibold transition-all cursor-pointer ${
                sampleCount === 24 && replicates === 1 && posControls === 1 && negControls === 1
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              24 Samples (26 rxns)
            </button>

            <button
              type="button"
              onClick={() => applySamplePreset({ samples: 92, reps: 1, pos: 2, neg: 2 })}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-semibold transition-all cursor-pointer ${
                sampleCount === 92 && replicates === 1 && posControls === 2 && negControls === 2
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              96-Well Plate (96 rxns)
            </button>

            <button
              type="button"
              onClick={() => applySamplePreset({ samples: 368, reps: 1, pos: 8, neg: 8 })}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-semibold transition-all cursor-pointer ${
                sampleCount === 368 && replicates === 1 && posControls === 8 && negControls === 8
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              384-Well Plate
            </button>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Sample Count Input */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Sample Count (S)</span>
              <span className="font-mono text-cyan-700 font-extrabold">{sampleCount}</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateScalingFromSampleInputs(sampleCount - 1, replicates, posControls, negControls, extraWells)}
                className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={384}
                value={sampleCount}
                onChange={(e) => updateScalingFromSampleInputs(parseInt(e.target.value) || 1, replicates, posControls, negControls, extraWells)}
                className="w-full text-center py-1 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => updateScalingFromSampleInputs(sampleCount + 1, replicates, posControls, negControls, extraWells)}
                className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
            <span className="text-[10px] text-slate-400 block text-center">Test biological samples</span>
          </div>

          {/* Technical Replicates */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Replicates (R)</span>
              <span className="font-mono text-cyan-700 font-extrabold">{replicates}x</span>
            </label>
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              {[
                { label: '1x', val: 1 },
                { label: '2x', val: 2 },
                { label: '3x', val: 3 }
              ].map((rep) => (
                <button
                  key={rep.val}
                  type="button"
                  onClick={() => updateScalingFromSampleInputs(sampleCount, rep.val, posControls, negControls, extraWells)}
                  className={`py-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                    replicates === rep.val
                      ? 'bg-cyan-600 text-white border-cyan-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {rep.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 block text-center">Singlicate / Duplicate / Triplicate</span>
          </div>

          {/* Positive Controls */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
              <span>+ Controls</span>
              <span className="font-mono font-extrabold text-emerald-700">{posControls}</span>
            </label>
            <input
              type="number"
              min={0}
              max={32}
              value={posControls}
              onChange={(e) => updateScalingFromSampleInputs(sampleCount, replicates, parseInt(e.target.value) || 0, negControls, extraWells)}
              className="w-full text-center py-1 font-mono font-bold text-emerald-900 bg-emerald-50/60 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-emerald-600/80 block text-center">Positive reference wells</span>
          </div>

          {/* Negative Controls (NTC) */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
              <span>- Controls (NTC)</span>
              <span className="font-mono font-extrabold text-rose-700">{negControls}</span>
            </label>
            <input
              type="number"
              min={0}
              max={32}
              value={negControls}
              onChange={(e) => updateScalingFromSampleInputs(sampleCount, replicates, posControls, parseInt(e.target.value) || 0, extraWells)}
              className="w-full text-center py-1 font-mono font-bold text-rose-900 bg-rose-50/60 border border-rose-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <span className="text-[10px] text-rose-600/80 block text-center">No template control wells</span>
          </div>

          {/* Master Mix Overflow % */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
              <span>Overflow (%)</span>
              <span className="font-mono font-extrabold text-amber-700">+{overflowPercent}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={30}
              step={5}
              value={overflowPercent}
              onChange={(e) => setOverflowPercent(Number(e.target.value))}
              className="w-full accent-amber-600 h-2 bg-amber-100 rounded-lg cursor-pointer mt-1"
            />
            <span className="text-[10px] text-amber-700/80 block text-center">Pipetting loss buffer</span>
          </div>
        </div>

        {/* Dynamic Formula Breakdown & Total Reaction Scaling Badge */}
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                AUTO-SCALING FORMULA BREAKDOWN
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Total Reactions N = ({sampleCount} Samples × {replicates}x) + {posControls} Pos + {negControls} NTC + {extraWells} Extra = <span className="font-bold text-cyan-300">{numReactions} Total Reaction Wells</span>
            </p>
          </div>

          {/* Total Master Mix Output Badge */}
          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-lg border border-slate-800 shrink-0">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">
                Single Rxn Vol
              </span>
              <span className="font-mono text-xs font-bold text-slate-200">
                {singleRxnTotalVol.toFixed(1)} µL
              </span>
            </div>
            <div className="text-slate-600 font-mono text-sm">×</div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-mono block font-bold">
                {numReactions} Rxns (+{overflowPercent}%)
              </span>
              <span className="font-mono text-base font-extrabold text-emerald-400">
                {masterMixTotalVol.toFixed(1)} µL
              </span>
              <span className="text-[10px] text-slate-400 font-mono ml-1">
                ({(masterMixTotalVol / 1000).toFixed(2)} mL)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 99%+ ACCURACY AUDIT CERTIFICATE */}
      <AuditReportCard report={sopAuditReport} compact />

      {/* VIEW SUB-TAB NAVIGATION BAR */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveViewTab('both')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'both'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Comprehensive View (All)</span>
          </button>

          <button
            onClick={() => setActiveViewTab('mix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'mix'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>1. Master Mix & Conditions</span>
          </button>

          <button
            onClick={() => setActiveViewTab('cost')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'cost'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>2. Reagent Cost Estimation & Budget</span>
            <span className="text-[10px] bg-emerald-950/30 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
              ${quickEstimatedRunCost.toFixed(2)}
            </span>
          </button>

          <button
            onClick={() => setActiveViewTab('norm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === 'norm'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
            }`}
          >
            <Atom className="w-4 h-4 text-purple-400" />
            <span>3. DNA Normalization & Shearing Matrix</span>
            {reactionSheet.dnaNormalization && (
              <span className="text-[10px] bg-purple-950/40 text-purple-200 px-1.5 py-0.5 rounded font-mono font-bold">
                {reactionSheet.dnaNormalization.samples.length} Samples
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono pr-2">
          <span>{numReactions} Wells Active</span>
        </div>
      </div>

      {/* DNA NORMALIZATION & SHEARING CALCULATOR (When 'norm' or 'both') */}
      {(activeViewTab === 'norm' || activeViewTab === 'both') && (
        <DnaNormalizationCalculator
          initialData={reactionSheet.dnaNormalization}
          onApplyToProtocol={(result: DnaNormalizationResult) => {
            const validSamples = result.samples.filter((s) => s.sampleId && s.sampleId.trim() !== '');
            const newSampleCount = Math.max(1, validSamples.length);
            updateScalingFromSampleInputs(newSampleCount, replicates, posControls, negControls, extraWells);
            onUpdateSheet({
              ...reactionSheet,
              sampleCount: newSampleCount,
              dnaNormalization: result
            });
          }}
        />
      )}

      {/* COST ESTIMATION TOOL (When 'cost' or 'both') */}
      {(activeViewTab === 'cost' || activeViewTab === 'both') && (
        <ReagentCostEstimator
          reactionSheet={reactionSheet}
          numReactions={numReactions}
          sampleCount={sampleCount}
          replicates={replicates}
          posControls={posControls}
          negControls={negControls}
          overflowPercent={overflowPercent}
          onUpdateCostEstimation={(costEst) => {
            onUpdateSheet({
              ...reactionSheet,
              costEstimation: costEst
            });
          }}
        />
      )}

      {/* MASTER MIX & CONDITIONS SECTIONS (When 'mix' or 'both') */}
      {(activeViewTab === 'mix' || activeViewTab === 'both') && (
        <>
          {/* STEP-BY-STEP REACTION PROTOCOL (CONDITIONS, STEPS & VOLUMES) */}
          {reactionSheet.stepByStepReactionSteps && reactionSheet.stepByStepReactionSteps.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-cyan-600" />
                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                  Step-by-Step Reaction Protocol & Conditions
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Sequential bench execution checklist built directly from the SOP. Includes operational conditions, target temperatures, and pipetting volumes scaled for {numReactions} reactions (+{overflowPercent}% overflow).
              </p>
            </div>

            {/* Checklist progress badge */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">
                Progress:{' '}
                <span className="font-mono text-cyan-700">
                  {Object.values(completedSteps).filter(Boolean).length} / {reactionSheet.stepByStepReactionSteps.length} Steps Completed
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {reactionSheet.stepByStepReactionSteps.map((step: StepByStepReactionStep, sIdx: number) => {
              const isDone = !!completedSteps[step.stepNumber || sIdx + 1];

              return (
                <div
                  key={step.stepNumber || sIdx}
                  className={`rounded-xl border transition-all ${
                    isDone
                      ? 'bg-emerald-50/40 border-emerald-200 opacity-80'
                      : 'bg-slate-50/50 border-slate-200 hover:border-cyan-300 shadow-2xs'
                  }`}
                >
                  {/* Step Header Bar */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/60 bg-white/80 rounded-t-xl">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleStepCompleted(step.stepNumber || sIdx + 1)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white hover:border-cyan-500 text-transparent'
                        }`}
                        title="Mark step complete"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-900 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
                            STEP {step.stepNumber || sIdx + 1}
                          </span>
                          <span className="text-xs font-mono uppercase tracking-wider text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                            {step.phase || 'Procedure'}
                          </span>
                        </div>
                        <h3 className={`text-sm font-bold mt-1 ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {step.stepName}
                        </h3>
                      </div>
                    </div>

                    {/* Conditions Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {step.tempCelsius !== undefined && (
                        <div className="flex items-center gap-1 bg-sky-50 text-sky-800 font-mono font-semibold px-2.5 py-1 rounded-lg border border-sky-200">
                          <Thermometer className="w-3.5 h-3.5 text-sky-600" />
                          <span>{step.tempCelsius}°C</span>
                        </div>
                      )}

                      {step.timingMinutes !== undefined && (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-800 font-mono font-semibold px-2.5 py-1 rounded-lg border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{step.timingMinutes} min</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200">
                        <Info className="w-3.5 h-3.5 text-slate-500" />
                        <span>{step.conditions || 'Standard Bench'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step Details & Per-Step Master Mix Calculator */}
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {step.instructions}
                    </p>

                    {/* PER-STEP MASTER MIX CALCULATOR SUMMARY CARD */}
                    {(() => {
                      const stepSingleVol = (step.reagentsAndVolumes || []).reduce((acc, r) => acc + (r.volPerRxnMicroliters || 0), 0);
                      const stepMasterMixScaled = stepSingleVol * numReactions * overflowMultiplier;

                      return (
                        <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Calculator className="w-4 h-4 text-emerald-400" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                                STEP {step.stepNumber || sIdx + 1} MASTER MIX CALCULATOR
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-sans">
                              Master mix volume for this step across {numReactions} reactions (+{overflowPercent}% overflow)
                            </p>
                          </div>

                          <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-2 rounded-lg border border-slate-700/80">
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-mono text-slate-400 block">Single Rxn Aliquot</span>
                              <span className="font-mono text-xs font-bold text-slate-200">{stepSingleVol.toFixed(2)} µL</span>
                            </div>
                            <div className="text-slate-500 font-mono text-xs">→</div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-mono text-emerald-400 block font-bold">Scaled Master Mix Total</span>
                              <span className="font-mono text-sm font-extrabold text-emerald-400">{stepMasterMixScaled.toFixed(2)} µL</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Reagents & Volumes Table for this step */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                      <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-cyan-600" />
                          <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                            Step Reagents & Stoichiometry Breakdown
                          </span>
                        </div>

                        <button
                          onClick={() => setAddingToStepIdx(addingToStepIdx === sIdx ? null : sIdx)}
                          className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-lg border border-cyan-200 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Component to Step</span>
                        </button>
                      </div>

                      {/* Inline Form to Add Reagent to Step */}
                      {addingToStepIdx === sIdx && (
                        <div className="p-3 bg-cyan-50/60 border-b border-cyan-200 space-y-2">
                          <span className="text-[11px] font-bold text-cyan-900 block">
                            Add New Reagent to Step {step.stepNumber || sIdx + 1}:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={stepReagentName}
                              onChange={(e) => setStepReagentName(e.target.value)}
                              placeholder="Reagent Name (e.g. 10x Buffer)"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={stepReagentVol}
                              onChange={(e) => setStepReagentVol(e.target.value)}
                              placeholder="Vol / 1 Rxn (µL)"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <input
                              type="text"
                              value={stepReagentNotes}
                              onChange={(e) => setStepReagentNotes(e.target.value)}
                              placeholder="Notes (e.g. Keep on ice)"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setAddingToStepIdx(null)}
                              className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddReagentToStep(sIdx)}
                              className="px-3 py-1 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-500 shadow-xs"
                            >
                              Add Reagent
                            </button>
                          </div>
                        </div>
                      )}

                      {step.reagentsAndVolumes && step.reagentsAndVolumes.length > 0 ? (
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Reagent / Component</th>
                              <th className="p-2.5 text-right">Vol / 1 Rxn</th>
                              <th className="p-2.5 text-right bg-emerald-50 text-emerald-900 font-bold">
                                Step Master Mix Vol ({numReactions} Rxns +{overflowPercent}%)
                              </th>
                              <th className="p-2.5">Final Conc / Amount</th>
                              <th className="p-2.5">Handling Notes</th>
                              <th className="p-2.5 text-center w-10">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {step.reagentsAndVolumes.map((rv, rIdx) => {
                              const totalStepVol = rv.volPerRxnMicroliters * numReactions * overflowMultiplier;
                              return (
                                <tr key={rIdx} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-sans font-semibold text-slate-900 flex items-center gap-1.5">
                                    <FlaskConical className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                    <span>{rv.reagentName}</span>
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={rv.volPerRxnMicroliters}
                                      onChange={(e) => handleUpdateStepReagentVol(sIdx, rIdx, e.target.value)}
                                      className="w-16 px-1.5 py-0.5 text-right rounded border border-slate-200 focus:border-cyan-500 text-xs font-mono font-bold bg-white"
                                    />
                                    <span className="ml-1 text-[10px] text-slate-400">µL</span>
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-emerald-700 bg-emerald-50/40">
                                    {totalStepVol.toFixed(2)} µL
                                  </td>
                                  <td className="p-2.5 text-slate-600 font-sans">
                                    {rv.finalAmountOrConc || '-'}
                                  </td>
                                  <td className="p-2.5 text-slate-500 font-sans text-[11px]">
                                    {rv.notes || 'Aliquoted as directed'}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => handleDeleteStepReagent(sIdx, rIdx)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                      title="Remove reagent from step"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500 italic">
                          No specific reagents defined for this step yet. Click "Add Component to Step" above to add pipetting components.
                        </div>
                      )}
                    </div>

                    {/* Safety, Stopping Point, and Critical Checkpoints */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      {step.stoppingPoint ? (
                        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-2.5 rounded-lg flex items-start gap-2 col-span-1 md:col-span-2">
                          <PauseCircle className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-indigo-200 block">
                              ⏸️ SAFE STOPPING POINT / BENCH HOLD:
                            </span>
                            <span className="text-[11px] leading-snug font-sans text-indigo-100">{step.stoppingPoint}</span>
                          </div>
                        </div>
                      ) : (() => {
                        const combined = `${step.stepName} ${step.instructions}`.toLowerCase();
                        if (combined.includes('stopping point') || combined.includes('pause point') || combined.includes('store at') || combined.includes('hold at') || combined.includes('overnight')) {
                          return (
                            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-2.5 rounded-lg flex items-start gap-2 col-span-1 md:col-span-2">
                              <PauseCircle className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-indigo-200 block">
                                  ⏸️ SAFE STOPPING POINT / BENCH HOLD:
                                </span>
                                <span className="text-[11px] leading-snug font-sans text-indigo-100">
                                  {step.instructions}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {step.criticalCheckpoint && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-2.5 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[11px] uppercase tracking-wider block text-rose-700">
                              Critical Quality Checkpoint:
                            </span>
                            <span className="text-[11px] leading-snug">{step.criticalCheckpoint}</span>
                          </div>
                        </div>
                      )}

                      {step.safetyWarning && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg flex items-start gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[11px] uppercase tracking-wider block text-amber-800">
                              Hazard & Safety Precaution:
                            </span>
                            <span className="text-[11px] leading-snug">{step.safetyWarning}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Master Mix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-cyan-600" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Reagent Component & Master Mix Spreadsheet Table
            </h2>
          </div>

          <button
            onClick={addComponent}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reagent Component</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="p-3 text-center">Order</th>
                <th className="p-3">Component Name</th>
                <th className="p-3">Stock Conc.</th>
                <th className="p-3">Target Conc.</th>
                <th className="p-3 text-right">Vol / 1 Rxn (µL)</th>
                <th className="p-3 text-right bg-emerald-50 text-emerald-900">
                  Vol / {numReactions} Rxns (+{overflowPercent}%)
                </th>
                <th className="p-3">Storage / Notes</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reactionSheet.components.map((comp, idx) => {
                const totalCompVol = comp.volPerRxnMicroliters * numReactions * overflowMultiplier;
                return (
                  <tr key={comp.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center font-mono font-semibold text-slate-500">
                      {comp.pipettingOrder || idx + 1}
                    </td>

                    {/* Component Name */}
                    <td className="p-3 font-medium text-slate-900">
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => updateComponent(idx, 'name', e.target.value)}
                        className="w-full bg-transparent font-semibold border-b border-transparent hover:border-slate-300 focus:border-cyan-500 focus:outline-none"
                      />
                    </td>

                    {/* Stock Conc */}
                    <td className="p-3 font-mono text-slate-700">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={comp.stockConc}
                          onChange={(e) => updateComponent(idx, 'stockConc', Number(e.target.value))}
                          className="w-16 p-1 border border-slate-200 rounded text-right"
                        />
                        <span className="text-[11px] text-slate-500">{comp.stockUnit}</span>
                      </div>
                    </td>

                    {/* Final Conc */}
                    <td className="p-3 font-mono text-slate-700">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={comp.finalConc}
                          onChange={(e) => updateComponent(idx, 'finalConc', Number(e.target.value))}
                          className="w-16 p-1 border border-slate-200 rounded text-right"
                        />
                        <span className="text-[11px] text-slate-500">{comp.finalUnit}</span>
                      </div>
                    </td>

                    {/* Vol per 1 rxn */}
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      <input
                        type="number"
                        step="0.01"
                        value={comp.volPerRxnMicroliters}
                        onChange={(e) => updateComponent(idx, 'volPerRxnMicroliters', Number(e.target.value))}
                        className="w-20 p-1 border border-slate-200 rounded text-right font-bold text-cyan-800"
                      />
                    </td>

                    {/* Total Vol for N rxns */}
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {totalCompVol.toFixed(2)} µL
                    </td>

                    {/* Storage & Notes */}
                    <td className="p-3 text-slate-600">
                      <input
                        type="text"
                        value={comp.notes || ''}
                        onChange={(e) => updateComponent(idx, 'notes', e.target.value)}
                        placeholder="Add storage temp or notes"
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 focus:outline-none text-[11px]"
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => deleteComponent(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Delete component"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Row */}
            <tfoot className="bg-slate-900 text-white font-mono font-bold">
              <tr>
                <td colSpan={4} className="p-3.5 text-right uppercase tracking-wider text-xs">
                  Total Reaction Master Mix Volume:
                </td>
                <td className="p-3.5 text-right text-cyan-300 text-sm">
                  {singleRxnTotalVol.toFixed(2)} µL
                </td>
                <td className="p-3.5 text-right text-emerald-400 text-base bg-slate-950">
                  {masterMixTotalVol.toFixed(2)} µL
                </td>
                <td colSpan={2} className="p-3.5 text-xs text-slate-400 font-sans">
                  Ready for pipetting
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Thermocycler / Incubation Profile */}
      {reactionSheet.thermocyclerProfile && reactionSheet.thermocyclerProfile.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Thermocycler / Incubation Thermal Profile
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center">Step #</th>
                  <th className="p-3">Phase / Action</th>
                  <th className="p-3 text-center">Temperature (°C)</th>
                  <th className="p-3 text-center">Duration (sec)</th>
                  <th className="p-3 text-center">Cycles</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {reactionSheet.thermocyclerProfile.map((step, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-bold text-slate-500">{step.stepNumber || idx + 1}</td>
                    <td className="p-3 font-sans font-semibold text-slate-900">{step.phase}</td>
                    <td className="p-3 text-center text-cyan-800 font-bold">{step.tempCelsius}°C</td>
                    <td className="p-3 text-center text-slate-700">
                      {step.durationSeconds === 0 ? 'Hold' : `${step.durationSeconds}s (${(step.durationSeconds / 60).toFixed(1)}m)`}
                    </td>
                    <td className="p-3 text-center text-amber-700 font-bold">{step.cycles || 1}x</td>
                    <td className="p-3 font-sans text-slate-600 text-[11px]">{step.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 96-Well Reaction Plate Grid Map */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-600" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              96-Well Plate Reaction Mapping Visualizer
            </h2>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan-100 border border-cyan-400 rounded-xs" /> Sample</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 border border-emerald-400 rounded-xs" /> +Control</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-100 border border-rose-400 rounded-xs" /> NTC (-Control)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-100 border border-amber-400 rounded-xs" /> Standard</span>
          </div>
        </div>

        {/* Plate Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-13 gap-1 text-[11px] font-mono text-center">
              {/* Header col row */}
              <div className="font-bold text-slate-400">/</div>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="font-bold text-slate-600 py-1">{i + 1}</div>
              ))}

              {/* Rows A through H */}
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((rowLabel, rIdx) => (
                <React.Fragment key={rowLabel}>
                  <div className="font-bold text-slate-600 flex items-center justify-center">{rowLabel}</div>
                  {Array.from({ length: 12 }, (_, colIdx) => {
                    const wellKey = `${rowLabel}${colIdx + 1}`;
                    const wellIndex = rIdx * 12 + colIdx;

                    const totalSampleWells = sampleCount * replicates;
                    const posStart = totalSampleWells;
                    const negStart = posStart + posControls;
                    const extraStart = negStart + negControls;
                    const totalFilled = extraStart + extraWells;

                    let bgStyle = 'bg-slate-50 border-slate-200 text-slate-300';
                    let label = '-';

                    if (wellIndex < totalSampleWells) {
                      bgStyle = 'bg-cyan-100/80 border-cyan-300 text-cyan-900 font-bold';
                      const sampleNum = Math.floor(wellIndex / replicates) + 1;
                      const repLetter = String.fromCharCode(65 + (wellIndex % replicates));
                      label = replicates > 1 ? `S${sampleNum}${repLetter}` : `S${sampleNum}`;
                    } else if (wellIndex < negStart) {
                      bgStyle = 'bg-emerald-100/80 border-emerald-400 text-emerald-900 font-bold';
                      label = posControls > 1 ? `+C${wellIndex - posStart + 1}` : '+CTL';
                    } else if (wellIndex < extraStart) {
                      bgStyle = 'bg-rose-100/80 border-rose-400 text-rose-900 font-bold';
                      label = negControls > 1 ? `NTC${wellIndex - negStart + 1}` : 'NTC';
                    } else if (wellIndex < totalFilled) {
                      bgStyle = 'bg-amber-100/80 border-amber-400 text-amber-900 font-bold';
                      label = `EXT${wellIndex - extraStart + 1}`;
                    }

                    return (
                      <button
                        key={wellKey}
                        onClick={() => setActivePlateWell(wellKey)}
                        className={`h-9 border rounded-md flex flex-col items-center justify-center text-[10px] transition-all hover:scale-105 cursor-pointer ${bgStyle}`}
                        title={`Well ${wellKey}: ${label}`}
                      >
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
