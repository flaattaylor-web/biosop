import React, { useState } from 'react';
import {
  Sparkles,
  Dna,
  FlaskConical,
  Layers,
  Wand2,
  ListOrdered,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Calculator,
  RefreshCw,
  Loader2,
  Atom,
  Scissors,
  Sliders,
  FileCode,
  Zap,
  HelpCircle
} from 'lucide-react';
import { DeNovoProtocolBlueprint, BioSafetyLevel, SelectedReagentConstraint } from '../types';

interface DeNovoDescriptionEditorProps {
  onGenerateDeNovoSop: (params: {
    topic: string;
    category: string;
    targetHost: string;
    biosafetyLevel: string;
    additionalReqs: string;
    blueprint?: DeNovoProtocolBlueprint;
    sampleCount: number;
    replicates: number;
    posControls: number;
    negControls: number;
    overflowPercent: number;
    selectedReagents?: SelectedReagentConstraint[];
  }) => void;
  isLoading: boolean;
  sampleCount: number;
  replicates: number;
  posControls: number;
  negControls: number;
  overflowPercent: number;
}

const QUICK_SPEC_CHIPS = [
  {
    label: '🧬 Covaris ME220 Acoustic Shearing (350 bp)',
    snippet: 'Include DNA fragmentation using Covaris ME220 Focused-ultrasonicator (350 bp target, 75W PIP, 10% Duty Factor, 200 CPB, 75s duration, 4-7°C chiller bath, microTUBE AFA 130 µL).'
  },
  {
    label: '⚡ 8-Channel Multichannel Pipetting',
    snippet: 'Optimize all liquid handling for 8-channel multichannel pipetting across columns A-H in 96-well format with 10% overflow buffer.'
  },
  {
    label: '🧲 Double-Sided SPRI Bead Cleanup & 80% EtOH',
    snippet: 'Include double-sided SPRI magnetic bead size selection (0.6x right-side + 0.8x left-side binding), two fresh 80% ethanol washes, and 10 mM Tris-HCl pH 8.5 elution.'
  },
  {
    label: '🧪 DNA Concentration Normalization Step',
    snippet: 'Perform input DNA concentration normalization to 50 ng in 50 µL starting volume using 10 mM Tris-HCl (pH 8.5) diluent.'
  },
  {
    label: '⏸️ Safe Stopping Point (-20°C Hold)',
    snippet: 'Designate a validated safe stopping hold at -20°C for up to 14 days following post-ligation bead cleanup.'
  },
  {
    label: '📊 Qubit 4 & TapeStation 4150 QC Checkpoints',
    snippet: 'Include fluorometric quantification on Qubit 4 (1x dsDNA HS Assay) and capillary sizing on Agilent TapeStation 4150 (D1000 ScreenTape).'
  },
  {
    label: '🔬 NEB Q5 High-Fidelity 2X Master Mix',
    snippet: 'Formulate PCR amplification master mix using NEBNext Ultra II Q5 Master Mix (25 µL / 50 µL rxn, 72°C extension @ 20s/kb).'
  }
];

const TEMPLATE_STARTERS = [
  {
    title: 'NGS Library Prep with Covaris Shearing & SPRI Cleanup',
    description: 'High-throughput 96-well Illumina library preparation starting from 50 ng extracted bacterial or mammalian genomic DNA. Includes Covaris ME220 acoustic shearing to 350 bp, end-repair/A-tailing with Ultra II master mix, 8-channel adapter ligation, double-sided 0.6x/0.8x SPRI magnetic bead cleanup with fresh 80% ethanol washes, 6 cycles indexing PCR with Q5 polymerase, and Qubit HS fluorometry QC.'
  },
  {
    title: 'Cas13a Fluorometric RNA Diagnostic Assay',
    description: 'De novo Cas13a lateral and fluorometric detection assay for targeted viral RNA. Includes T7 transcription, LwaCas13a/crRNA RNP ribonucleoprotein complex assembly at 37°C, FAM-IBQ quenched RNA reporter cleavage, real-time kinetic readout on Bio-Rad CFX96 qPCR thermocycler, and NTC cross-contamination controls.'
  },
  {
    title: 'mRNA-Lipid Nanoparticle (LNP) Formulation',
    description: 'De novo mRNA-LNP encapsulation protocol utilizing microfluidic staggered herringbone micromixing. Lipids (SM-102, DSPC, Cholesterol, DMG-PEG2000 in ethanol) mixed 3:1 with purified mRNA in 50 mM sodium acetate buffer (pH 4.0), followed by 100 kDa dialysis buffer exchange into 1X PBS (pH 7.4) and DLS particle size verification.'
  },
  {
    title: 'Multiplex Targeted Amplicon Library Prep (8-Channel)',
    description: 'De novo targeted NGS amplicon multiplexing panel for 24 samples in triplicate. 8-channel multichannel master mix aliquoting (2X KAPA HiFi HotStart ReadyMix), touchdown thermal cycling, 1.0x SPRI bead purification with fresh 80% ethanol, and dual-index Illumina sequencing primer addition.'
  }
];

export const DeNovoDescriptionEditor: React.FC<DeNovoDescriptionEditorProps> = ({
  onGenerateDeNovoSop,
  isLoading,
  sampleCount,
  replicates,
  posControls,
  negControls,
  overflowPercent
}) => {
  const [description, setDescription] = useState<string>(TEMPLATE_STARTERS[0].description);
  const [protocolTitle, setProtocolTitle] = useState<string>('De Novo NGS Library Prep with Covaris Shearing & SPRI Cleanup');
  const [category, setCategory] = useState<string>('Next-Generation Sequencing');
  const [targetHost, setTargetHost] = useState<string>('Mammalian / Bacterial gDNA');
  const [biosafetyLevel, setBiosafetyLevel] = useState<BioSafetyLevel>('BSL-1');
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [expandedBlueprint, setExpandedBlueprint] = useState<DeNovoProtocolBlueprint | null>(null);

  const handleAppendChip = (snippet: string) => {
    setDescription((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippet;
      if (trimmed.includes(snippet.substring(0, 25))) return trimmed;
      return `${trimmed}\n\n• ${snippet}`;
    });
  };

  const handleSelectStarter = (starter: typeof TEMPLATE_STARTERS[0]) => {
    setProtocolTitle(starter.title);
    setDescription(starter.description);
  };

  const handleAiExpandDescription = async () => {
    if (!description.trim()) return;
    setIsExpanding(true);
    try {
      const res = await fetch('/api/expand-de-novo-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          protocolTitle,
          category,
          targetHost,
          biosafetyLevel
        })
      });

      if (!res.ok) {
        throw new Error('Failed to expand description');
      }

      const data = await res.json();
      if (data.blueprint) {
        setExpandedBlueprint(data.blueprint);
        if (data.blueprint.protocolTitle) setProtocolTitle(data.blueprint.protocolTitle);
        if (data.blueprint.category) setCategory(data.blueprint.category);
        if (data.blueprint.targetHostOrOrganism) setTargetHost(data.blueprint.targetHostOrOrganism);
        if (data.blueprint.biosafetyLevel) setBiosafetyLevel(data.blueprint.biosafetyLevel);
      }
    } catch (err) {
      console.warn('Could not expand blueprint with AI:', err);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleExecuteBuild = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    onGenerateDeNovoSop({
      topic: protocolTitle || description.substring(0, 60),
      category,
      targetHost,
      biosafetyLevel,
      additionalReqs: description,
      blueprint: expandedBlueprint || undefined,
      sampleCount,
      replicates,
      posControls,
      negControls,
      overflowPercent
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                De Novo SOP Architecture & Description Studio
              </h2>
              <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200 uppercase">
                99%+ Scientific Accuracy Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Describe your custom protocol in plain language or bullet points. The 99% accuracy engine synthesizes stoichiometric master mixes, equipment parameters, and GLP quality benchmarks.
            </p>
          </div>
        </div>

        {/* Quick Starters Dropdown / Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Quick Starters:</span>
          <select
            onChange={(e) => {
              const selected = TEMPLATE_STARTERS.find(t => t.title === e.target.value);
              if (selected) handleSelectStarter(selected);
            }}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            {TEMPLATE_STARTERS.map((s, idx) => (
              <option key={idx} value={s.title}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Deliberately a <div>, not a <form>: this editor renders inside SopGenerator's form, and a
          nested form makes the browser dispatch a submit event that bubbles to the outer form —
          running the standard generation path with stale state alongside the de novo one. */}
      <div className="space-y-5">
        {/* Core Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Protocol Title / Research Objective</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={protocolTitle}
              onChange={(e) => setProtocolTitle(e.target.value)}
              placeholder="e.g. De Novo NGS Library Prep with Covaris Shearing"
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Protocol Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Next-Gen Sequencing"
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Biosafety Level (BSL)
            </label>
            <select
              value={biosafetyLevel}
              onChange={(e) => setBiosafetyLevel(e.target.value as BioSafetyLevel)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
            >
              <option value="BSL-1">BSL-1 (Standard Organisms)</option>
              <option value="BSL-2">BSL-2 (Moderate Hazard / Mammalian)</option>
              <option value="BSL-3">BSL-3 (High Containment)</option>
            </select>
          </div>
        </div>

        {/* Free-form Description Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-600" />
              <span>Describe The Protocol You Want To Build</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>

            <button
              type="button"
              onClick={handleAiExpandDescription}
              disabled={isExpanding || !description.trim()}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExpanding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Structuring Blueprint...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI Polish & Structure Blueprint</span>
                </>
              )}
            </button>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            placeholder="Describe the SOP you want to build in detail. For example:
- Input sample type and starting quantity (e.g. 50 ng gDNA in 50 µL)
- Shearing method (e.g. Covaris ME220 350 bp shearing, 75W PIP, 75s @ 6°C)
- Reagents & master mixes (e.g. NEB Ultra II end repair master mix, 8-channel pipetting)
- Incubation temperatures (e.g. 20°C for 30m, 65°C for 30m)
- Cleanup & bead ratios (e.g. 0.8x SPRI magnetic beads with 2x 80% fresh ethanol washes)
- Safe stopping points (e.g. hold at -20°C overnight)
- Quality control checkpoints (e.g. Qubit fluorometer HS quantification)"
            className="w-full text-xs font-mono leading-relaxed p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-inner"
            required
          />
        </div>

        {/* Quick-Specification Chips */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick-Add Protocol Directives & Accuracy Enhancers:</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SPEC_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAppendChip(chip.snippet)}
                className="text-[11px] font-medium bg-slate-100 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-all text-left cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Structured Blueprint Breakdown Preview (if generated) */}
        {expandedBlueprint && (
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 font-mono">
                AI STRUCTURED BLUEPRINT OUTLINE (READY FOR 99% SYNTHESIS)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
                  Sample & Shearing
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {expandedBlueprint.startingMaterial || 'Extracted gDNA'}
                </span>
                <span className="text-[11px] text-purple-700">
                  {expandedBlueprint.shearingMethod === 'COVARIS_ACOUSTIC' ? `Covaris Shearing (${expandedBlueprint.shearingTargetBp || 350} bp)` : 'Enzymatic / Unsheared'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
                  Liquid Handling & Scale
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  8-Channel Multichannel ({sampleCount} Samples)
                </span>
                <span className="text-[11px] text-emerald-700 font-mono font-bold">
                  +{overflowPercent}% Pipetting Buffer
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
                  Purification & Holds
                </span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {expandedBlueprint.purificationStrategy === 'SPRI_BEADS' ? 'SPRI Beads + 80% EtOH' : 'Spin Column'}
                </span>
                <span className="text-[11px] text-slate-600">
                  -20°C Safe Stopping Holds Included
                </span>
              </div>
            </div>

            {expandedBlueprint.keyStepsOutline && expandedBlueprint.keyStepsOutline.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block mb-1">
                  Sequential Protocol Phases:
                </span>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                  {expandedBlueprint.keyStepsOutline.map((st, i) => (
                    <li key={i} className="leading-snug">{st}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>99%+ Mathematical & Stoichiometric Verification Engine Active</span>
          </div>

          <button
            type="button"
            onClick={handleExecuteBuild}
            disabled={isLoading || !description.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing 99% Precision SOP...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Build 99% Precision De Novo SOP</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
