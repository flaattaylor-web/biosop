import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sliders,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Info,
  Grid,
  List,
  Layers,
  ArrowRight,
  ClipboardPaste,
  ShieldCheck,
  Zap,
  Check
} from 'lucide-react';
import {
  DnaNormalizationConfig,
  DnaNormalizationResult,
  DnaNormalizationSample,
  ReactionSheet,
  SopDocument
} from '../types';
import {
  DEFAULT_NORMALIZATION_CONFIG,
  recalculateAllNormalization,
  parseUploadedSpreadsheet,
  SAMPLE_NORMALIZATION_PRESETS,
  generateWorklistCsv,
  generateWorklistXlsx,
  getStandard96WellPositions,
  calculateSampleNormalization
} from '../utils/normalizationUtils';

interface DnaNormalizationCalculatorProps {
  sop?: SopDocument;
  reactionSheet?: ReactionSheet;
  onApplyToProtocol?: (result: DnaNormalizationResult) => void;
}

export const DnaNormalizationCalculator: React.FC<DnaNormalizationCalculatorProps> = ({
  sop,
  reactionSheet,
  onApplyToProtocol
}) => {
  // Preset default from active reaction sheet if starting volume is defined
  const initialConfig: DnaNormalizationConfig = useMemo(() => {
    const defaultVol = reactionSheet?.reactionVolumeMicroliters || 25.0;
    return {
      ...DEFAULT_NORMALIZATION_CONFIG,
      targetVolumeUl: defaultVol,
      targetMassNg: 100,
      targetConcNgPerUl: 100 / defaultVol
    };
  }, [reactionSheet?.reactionVolumeMicroliters]);

  const [config, setConfig] = useState<DnaNormalizationConfig>(initialConfig);
  const [samples, setSamples] = useState<Array<{
    sampleId: string;
    wellPosition: string;
    initialConcNgPerUl: number;
    initialVolumeUl?: number;
    notes?: string;
  }>>(() => {
    // If SOP or ReactionSheet already has normalization data, use it
    if (reactionSheet?.dnaNormalization?.samples) {
      return reactionSheet.dnaNormalization.samples;
    }
    if (sop?.dnaNormalization?.samples) {
      return sop.dnaNormalization.samples;
    }
    // Default to preset 24-sample library
    return SAMPLE_NORMALIZATION_PRESETS[1].samples;
  });

  const [activeTab, setActiveTab] = useState<'matrix' | 'table' | 'paste' | 'summary'>('matrix');
  const [selectedWell, setSelectedWell] = useState<string | null>('A1');
  const [pasteText, setPasteText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute live normalization results
  const normResult: DnaNormalizationResult = useMemo(() => {
    return recalculateAllNormalization(samples, config);
  }, [samples, config]);

  // Handle configuration changes
  const handleConfigChange = (field: keyof DnaNormalizationConfig, value: any) => {
    const updated = { ...config, [field]: value };
    if (field === 'targetMassNg' || field === 'targetVolumeUl') {
      const mass = field === 'targetMassNg' ? parseFloat(value) || 100 : config.targetMassNg;
      const vol = field === 'targetVolumeUl' ? parseFloat(value) || 25 : config.targetVolumeUl;
      updated.targetConcNgPerUl = Number((mass / vol).toFixed(2));
    } else if (field === 'targetConcNgPerUl') {
      const conc = parseFloat(value) || 4.0;
      updated.targetMassNg = Number((conc * config.targetVolumeUl).toFixed(1));
    }
    setConfig(updated);
  };

  // Handle File Upload (.xlsx, .csv, .tsv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    try {
      const parsed = await parseUploadedSpreadsheet(file);
      setSamples(parsed.samples);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to parse spreadsheet file.');
    }
  };

  // Handle Paste from Clipboard / Excel
  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    setUploadError(null);

    try {
      const lines = pasteText.trim().split(/\r?\n/);
      const newSamples: Array<{
        sampleId: string;
        wellPosition: string;
        initialConcNgPerUl: number;
        initialVolumeUl?: number;
      }> = [];

      const defaultWells = getStandard96WellPositions();

      lines.forEach((line, idx) => {
        const parts = line.split(/[\t,;]+/).map((p) => p.trim());
        if (parts.length === 0 || !parts[0]) return;

        // Header check
        if (idx === 0 && (parts[0].toLowerCase().includes('sample') || parts[0].toLowerCase().includes('name'))) {
          return;
        }

        let sampleId = `Sample_${idx + 1}`;
        let conc = 0;
        let well = defaultWells[idx % defaultWells.length];

        if (parts.length === 1) {
          // Just concentration
          conc = parseFloat(parts[0].replace(/[^0-9.-]/g, '')) || 0;
        } else if (parts.length === 2) {
          // ID + Conc OR Well + Conc
          if (/^[A-H][0-9]{1,2}$/i.test(parts[0])) {
            well = parts[0].toUpperCase();
            conc = parseFloat(parts[1].replace(/[^0-9.-]/g, '')) || 0;
          } else {
            sampleId = parts[0];
            conc = parseFloat(parts[1].replace(/[^0-9.-]/g, '')) || 0;
          }
        } else {
          // ID + Well + Conc OR ID + Conc + Vol
          sampleId = parts[0];
          if (/^[A-H][0-9]{1,2}$/i.test(parts[1])) {
            well = parts[1].toUpperCase();
            conc = parseFloat(parts[2].replace(/[^0-9.-]/g, '')) || 0;
          } else {
            conc = parseFloat(parts[1].replace(/[^0-9.-]/g, '')) || 0;
          }
        }

        newSamples.push({
          sampleId,
          wellPosition: well,
          initialConcNgPerUl: Math.max(0, conc)
        });
      });

      if (newSamples.length === 0) {
        throw new Error('No valid sample concentration rows detected in pasted text.');
      }

      setSamples(newSamples);
      setPasteText('');
      setActiveTab('matrix');
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process pasted data.');
    }
  };

  // Preset loader
  const handleLoadPreset = (presetIndex: number) => {
    const preset = SAMPLE_NORMALIZATION_PRESETS[presetIndex];
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      targetMassNg: preset.targetMassNg,
      targetVolumeUl: preset.targetVolumeUl,
      targetConcNgPerUl: Number((preset.targetMassNg / preset.targetVolumeUl).toFixed(2))
    }));
    setSamples(preset.samples);
  };

  // Sample Row Modifier
  const handleUpdateSampleField = (idx: number, field: string, val: any) => {
    setSamples((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleAddBlankSample = () => {
    const nextIdx = samples.length;
    const defaultWells = getStandard96WellPositions();
    setSamples((prev) => [
      ...prev,
      {
        sampleId: `Sample_${nextIdx + 1}`,
        wellPosition: defaultWells[nextIdx % defaultWells.length],
        initialConcNgPerUl: 50.0,
        initialVolumeUl: 40
      }
    ]);
  };

  const handleDeleteSample = (idx: number) => {
    setSamples((prev) => prev.filter((_, i) => i !== idx));
  };

  // Export Worklist CSV
  const handleDownloadCsv = () => {
    const csvContent = generateWorklistCsv(normResult);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DNA_Normalization_Worklist_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Worklist XLSX
  const handleDownloadXlsx = async () => {
    const u8 = await generateWorklistXlsx(normResult);
    const blob = new Blob([u8 as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DNA_Normalization_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply to active protocol
  const handleApplyToActiveProtocol = () => {
    if (onApplyToProtocol) {
      onApplyToProtocol(normResult);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3000);
    }
  };

  // 96-well Map lookup
  const wellMap = useMemo(() => {
    const map = new Map<string, DnaNormalizationSample>();
    normResult.samples.forEach((s) => map.set(s.wellPosition.toUpperCase(), s));
    return map;
  }, [normResult.samples]);

  const selectedSampleData = selectedWell ? wellMap.get(selectedWell.toUpperCase()) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-0 text-slate-100">
      {/* HEADER BAR */}
      <div className="p-5 bg-gradient-to-r from-slate-850 via-slate-900 to-indigo-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-inner">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-base text-white tracking-wide">
                DNA / RNA Concentration Normalization Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                XLSX / CSV Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automates starting mass & volume normalization for Covaris shearing, NGS library prep, and PCR reactions
            </p>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv,.tsv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            Import .XLSX / .CSV
          </button>

          <button
            onClick={handleDownloadXlsx}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export .XLSX
          </button>

          <button
            onClick={handleDownloadCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Export .CSV
          </button>

          {onApplyToProtocol && (
            <button
              onClick={handleApplyToActiveProtocol}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md ${
                appliedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-900/40'
              }`}
            >
              {appliedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Applied to Protocol!
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Apply Samples to SOP ({normResult.totalSamples} Wells)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ERROR BANNER IF ANY */}
      {uploadError && (
        <div className="p-3 bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* CONFIGURATION BAR */}
      <div className="p-4 bg-slate-850/90 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        {/* TARGET MASS */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Target DNA Input Mass</span>
            <span className="font-mono text-cyan-400 font-bold">{config.targetMassNg} ng</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.1"
              max="5000"
              step="5"
              value={config.targetMassNg}
              onChange={(e) => handleConfigChange('targetMassNg', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            />
            <span className="text-slate-400 font-mono text-[11px]">ng</span>
          </div>
        </div>

        {/* TARGET STARTING VOLUME */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Target Starting Volume</span>
            <span className="font-mono text-cyan-400 font-bold">{config.targetVolumeUl} µL</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="200"
              step="1"
              value={config.targetVolumeUl}
              onChange={(e) => handleConfigChange('targetVolumeUl', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            />
            <span className="text-slate-400 font-mono text-[11px]">µL</span>
          </div>
        </div>

        {/* CALCULATED TARGET CONCENTRATION */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Target Concentration</span>
            <span className="font-mono text-emerald-400 font-bold">
              {(config.targetMassNg / config.targetVolumeUl).toFixed(2)} ng/µL
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0.01"
              max="500"
              step="0.5"
              value={config.targetConcNgPerUl}
              onChange={(e) => handleConfigChange('targetConcNgPerUl', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-slate-400 font-mono text-[11px]">ng/µL</span>
          </div>
        </div>

        {/* DILUENT BUFFER SELECTOR */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Diluent / Elution Buffer
          </label>
          <select
            value={config.diluentName}
            onChange={(e) => handleConfigChange('diluentName', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-sans text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
          >
            <option value="10 mM Tris-HCl pH 8.5 / Nuclease-Free Water">10 mM Tris-HCl pH 8.5 (EB)</option>
            <option value="Nuclease-Free Water (ddH2O)">Nuclease-Free Water (ddH2O)</option>
            <option value="Low-EDTA TE Buffer (10 mM Tris, 0.1 mM EDTA)">Low-EDTA TE Buffer (pH 8.0)</option>
            <option value="Standard 1X TE Buffer (pH 8.0)">Standard 1X TE Buffer (pH 8.0)</option>
          </select>
        </div>
      </div>

      {/* QUICK PRESET BAR & STATS */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Sample Presets:
          </span>
          {SAMPLE_NORMALIZATION_PRESETS.map((preset, idx) => (
            <button
              key={preset.name}
              onClick={() => handleLoadPreset(idx)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-mono transition"
            >
              {preset.name.split(' ')[0]} ({preset.samples.length} Wells)
            </button>
          ))}
        </div>

        {/* SUMMARY PILLS */}
        <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Total Wells: <strong className="text-white">{normResult.totalSamples}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
            Normalized: <strong>{normResult.normalizedCount}</strong>
          </span>
          {normResult.tooDiluteCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Too Dilute: <strong>{normResult.tooDiluteCount}</strong>
            </span>
          )}
          {normResult.highConcCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
              High Conc (Pre-dilute): <strong>{normResult.highConcCount}</strong>
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            Total Diluent: <strong>{normResult.totalDiluentNeededUl} µL</strong>
          </span>
        </div>
      </div>

      {/* VIEW TABS */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-800 bg-slate-850/50">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-t border-x flex items-center gap-2 transition ${
            activeTab === 'matrix'
              ? 'bg-slate-900 border-slate-700 text-cyan-400 border-b-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          96-Well Plate Layout & Heatmap
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-t border-x flex items-center gap-2 transition ${
            activeTab === 'table'
              ? 'bg-slate-900 border-slate-700 text-cyan-400 border-b-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Sample Worklist Table ({normResult.totalSamples})
        </button>

        <button
          onClick={() => setActiveTab('paste')}
          className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-t border-x flex items-center gap-2 transition ${
            activeTab === 'paste'
              ? 'bg-slate-900 border-slate-700 text-cyan-400 border-b-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          Paste from Excel / Qubit
        </button>
      </div>

      {/* TAB 1: 96-WELL PLATE HEATMAP */}
      {activeTab === 'matrix' && (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 96-WELL GRID */}
            <div className="lg:col-span-3 overflow-x-auto">
              <div className="min-w-[620px] bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                {/* Column Headers 1-12 */}
                <div className="grid grid-cols-13 gap-1 mb-1 text-center font-mono text-[10px] font-bold text-slate-400">
                  <div></div>
                  {Array.from({ length: 12 }).map((_, c) => (
                    <div key={c + 1} className="py-1 bg-slate-900 rounded">
                      {c + 1}
                    </div>
                  ))}
                </div>

                {/* Rows A-H */}
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((rowLetter) => (
                  <div key={rowLetter} className="grid grid-cols-13 gap-1 mb-1 items-center">
                    <div className="text-center font-mono text-[10px] font-bold text-slate-400 py-2 bg-slate-900 rounded">
                      {rowLetter}
                    </div>

                    {Array.from({ length: 12 }).map((_, c) => {
                      const wellId = `${rowLetter}${c + 1}`;
                      const smp = wellMap.get(wellId);
                      const isSelected = selectedWell === wellId;

                      let wellStyle = 'bg-slate-900/60 border-slate-800 text-slate-600';
                      if (smp) {
                        if (smp.status === 'NORMALIZED') {
                          wellStyle = 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900';
                        } else if (smp.status === 'TOO_DILUTE') {
                          wellStyle = 'bg-amber-950/80 border-amber-500/70 text-amber-300 hover:bg-amber-900';
                        } else if (smp.status === 'HIGH_CONC_PREDILUTE') {
                          wellStyle = 'bg-indigo-950/80 border-indigo-500/70 text-indigo-300 hover:bg-indigo-900';
                        } else {
                          wellStyle = 'bg-rose-950/80 border-rose-600/60 text-rose-300 hover:bg-rose-900';
                        }
                      }

                      return (
                        <button
                          key={wellId}
                          onClick={() => setSelectedWell(wellId)}
                          className={`h-11 rounded-lg border flex flex-col items-center justify-center p-0.5 transition relative font-mono text-[10px] ${wellStyle} ${
                            isSelected ? 'ring-2 ring-cyan-400 shadow-lg scale-105 z-10' : ''
                          }`}
                        >
                          <span className="text-[9px] font-bold opacity-75">{wellId}</span>
                          {smp ? (
                            <span className="font-bold text-[10px] leading-tight">
                              {smp.initialConcNgPerUl.toFixed(0)} <span className="text-[8px]">ng</span>
                            </span>
                          ) : (
                            <span className="text-[8px] opacity-40">-</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* LEGEND BAR */}
                <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3 border-t border-slate-850 text-[11px]">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-400"></span>
                      <span className="text-slate-300">Normalized ({config.targetMassNg} ng in {config.targetVolumeUl} µL)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-600 border border-amber-400"></span>
                      <span className="text-slate-300">Too Dilute (Max Vol Used)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-indigo-600 border border-indigo-400"></span>
                      <span className="text-slate-300">High Conc (&lt; 1 µL Pipette)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700"></span>
                      <span className="text-slate-500">Empty Well</span>
                    </div>
                  </div>
                  <span className="text-slate-400 italic text-[10px]">
                    Click any well to inspect exact pipetting volumes
                  </span>
                </div>
              </div>
            </div>

            {/* SELECTED WELL DETAIL INSPECTOR CARD */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center border border-cyan-500/30 text-sm">
                    {selectedWell || 'A1'}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Well Detail</h4>
                    <span className="text-[10px] text-slate-400">
                      {selectedSampleData ? selectedSampleData.sampleId : 'Empty Well'}
                    </span>
                  </div>
                </div>
                {selectedSampleData && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      selectedSampleData.status === 'NORMALIZED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : selectedSampleData.status === 'TOO_DILUTE'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    }`}
                  >
                    {selectedSampleData.status}
                  </span>
                )}
              </div>

              {selectedSampleData ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-lg space-y-2 border border-slate-800">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Initial Measured Conc:</span>
                      <strong className="text-white font-mono text-sm">
                        {selectedSampleData.initialConcNgPerUl} ng/µL
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Target Input Mass:</span>
                      <span className="font-mono text-cyan-300">{selectedSampleData.targetMassNg} ng</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Target Starting Vol:</span>
                      <span className="font-mono text-cyan-300">{selectedSampleData.targetVolumeUl} µL</span>
                    </div>
                  </div>

                  {/* PIPETTING INSTRUCTIONS BOX */}
                  <div className="p-3.5 bg-gradient-to-br from-slate-900 to-slate-850 rounded-xl border border-cyan-500/30 space-y-2">
                    <h5 className="font-bold text-[11px] uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Bench Pipetting Recipe
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Sample DNA</span>
                        <strong className="text-base text-cyan-300">
                          {selectedSampleData.sampleVolumeUl} µL
                        </strong>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Diluent Buffer</span>
                        <strong className="text-base text-emerald-300">
                          {selectedSampleData.bufferVolumeUl} µL
                        </strong>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-800 font-mono">
                      Total Volume: {selectedSampleData.targetVolumeUl} µL (Yields{' '}
                      {selectedSampleData.finalMassNg} ng @ {selectedSampleData.finalConcNgPerUl} ng/µL)
                    </div>
                  </div>

                  {/* WARNING / GUIDANCE */}
                  {selectedSampleData.warning && (
                    <div className="p-2.5 bg-amber-950/60 border border-amber-800/80 rounded-lg text-amber-200 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{selectedSampleData.warning}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Select an active well in the 96-well grid to view stoichiometry and pipetting volumes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAMPLE WORKLIST TABLE */}
      {activeTab === 'table' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {normResult.samples.length} sample normalization calculations. Values update dynamically.
            </span>
            <button
              onClick={handleAddBlankSample}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sample Row
            </button>
          </div>

          <div className="overflow-x-auto max-h-[480px] rounded-xl border border-slate-800 shadow-inner">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-850 text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">Well</th>
                  <th className="p-2.5">Sample ID</th>
                  <th className="p-2.5 text-right">Initial Conc (ng/µL)</th>
                  <th className="p-2.5 text-right">Target Mass (ng)</th>
                  <th className="p-2.5 text-right">Target Vol (µL)</th>
                  <th className="p-2.5 text-right font-bold text-cyan-300">Sample Vol (µL)</th>
                  <th className="p-2.5 text-right font-bold text-emerald-300">Buffer Vol (µL)</th>
                  <th className="p-2.5 text-right">Final Conc (ng/µL)</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono text-[11px]">
                {normResult.samples.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-800/60 transition">
                    <td className="p-2.5 font-bold text-slate-300">
                      <input
                        type="text"
                        value={s.wellPosition}
                        onChange={(e) => handleUpdateSampleField(idx, 'wellPosition', e.target.value)}
                        className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                      />
                    </td>
                    <td className="p-2.5 text-white font-sans font-medium">
                      <input
                        type="text"
                        value={s.sampleId}
                        onChange={(e) => handleUpdateSampleField(idx, 'sampleId', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white text-xs"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={s.initialConcNgPerUl}
                        onChange={(e) =>
                          handleUpdateSampleField(idx, 'initialConcNgPerUl', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right text-cyan-300"
                      />
                    </td>
                    <td className="p-2.5 text-right text-slate-400">{s.targetMassNg.toFixed(0)}</td>
                    <td className="p-2.5 text-right text-slate-400">{s.targetVolumeUl.toFixed(1)}</td>
                    <td className="p-2.5 text-right font-bold text-cyan-300 text-xs">
                      {s.sampleVolumeUl.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-300 text-xs">
                      {s.bufferVolumeUl.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right text-slate-300">{s.finalConcNgPerUl.toFixed(2)}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          s.status === 'NORMALIZED'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : s.status === 'TOO_DILUTE'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-indigo-950 text-indigo-300 border-indigo-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleDeleteSample(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                        title="Delete sample"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT PASTE */}
      {activeTab === 'paste' && (
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4 text-cyan-400" />
              Copy-Paste from Excel, Google Sheets, Qubit Fluorometer, or NanoDrop
            </h4>
            <p className="text-slate-400">
              Paste columns directly from your spreadsheet. Supported formats:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
              <li><strong>[Sample_ID] [Concentration_ng_uL]</strong> (e.g. <code>Sample_1 45.2</code>)</li>
              <li><strong>[Well] [Concentration_ng_uL]</strong> (e.g. <code>A1 45.2</code>)</li>
              <li><strong>[Sample_ID] [Well] [Concentration_ng_uL]</strong> (e.g. <code>SMP-01 A1 45.2</code>)</li>
            </ul>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={`Sample_1\t45.2\nSample_2\t78.6\nSample_3\t22.4\nSample_4\t110.5`}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 font-mono text-xs text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none placeholder:text-slate-600"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPasteText('')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
            >
              Clear
            </button>
            <button
              onClick={handleApplyPaste}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Process & Apply Normalization Matrix
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
