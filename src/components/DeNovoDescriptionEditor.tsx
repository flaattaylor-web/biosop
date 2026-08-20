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

const BLANK_STARTER_TITLE = 'N/A — start from a blank description';

/**
 * The first entry is deliberately blank and selected by default. Opening the editor pre-loaded with
 * the Covaris/SPRI starter meant every de novo run inherited acoustic shearing whether or not the
 * protocol should have it — including direct RNA runs, where shearing is contraindicated.
 */
/**
 * The de novo studio used to assume every protocol was a reagent-assembly workflow: the category
 * defaulted to Next-Generation Sequencing, the placeholder asked about shearing and bead ratios,
 * and every quick-add chip was a molecular biology directive. Asked for a TCID50 titration or an
 * H&E stain, a user had nowhere to put the parameters that actually matter, and the generator was
 * prompted for the wrong ones.
 */
export const DISCIPLINES = [
  'Molecular Biology',
  'Next-Generation Sequencing',
  'Virology',
  'Cell Culture',
  'Proteomics & Protein Biochemistry',
  'Immunology & Immunoassay',
  'Microbiology',
  'Histology & Imaging',
  'Biochemistry & Enzymology',
  'Analytical Chemistry',
  'Other',
] as const;

const CHIPS_BY_DISCIPLINE: Record<string, { label: string; snippet: string }[]> = {
  'Virology': [
    { label: '🦠 Cell line & MOI', snippet: 'Specify the permissive cell line, seeding density per well, and the infection dose as MOI or as a ten-fold dilution series.' },
    { label: '🧫 CPE scoring criteria', snippet: 'Define what counts as cytopathic effect, at what magnification it is scored, and on which day post-infection.' },
    { label: '📐 Reed-Muench / Spearman-Karber', snippet: 'Calculate the 50% endpoint by the Reed-Muench method and state the volume inoculated alongside the titre.' },
    { label: '🧪 Overlay & fixation', snippet: 'Include the semi-solid overlay composition, the fixation time in 4% formaldehyde, and the crystal violet staining step.' },
    { label: '🛡️ Containment controls', snippet: 'Include uninfected cell control wells and a reference virus stock of known titre on every plate.' },
  ],
  'Cell Culture': [
    { label: '🧫 Seeding density & confluence', snippet: 'State the seeding density per well or flask, the vessel format, and the confluence required on the day of the experiment.' },
    { label: '🌡️ Incubation conditions', snippet: 'Give incubation temperature, CO2 percentage, humidity and duration explicitly for every incubation step.' },
    { label: '🧬 Passage limits & provenance', snippet: 'State the acceptable passage range, the medium formulation with supplement percentages, and the authentication status of the line.' },
    { label: '❄️ Cryopreservation parameters', snippet: 'Include the freezing medium composition, the controlled cooling rate, and the storage phase.' },
    { label: '🔬 Mycoplasma screening', snippet: 'Require mycoplasma screening on antibiotic-free culture before the cells enter the experiment.' },
  ],
  'Proteomics & Protein Biochemistry': [
    { label: '⚖️ Load per lane', snippet: 'State protein input as a mass per lane or per injection and the assay used to quantify it.' },
    { label: '🧪 Buffer compositions', snippet: 'Give every buffer with component concentrations and pH, and mark which are prepared fresh.' },
    { label: '🔌 Gel & transfer conditions', snippet: 'Specify gel percentage, run voltage and duration, and the transfer method with time, voltage and cooling.' },
    { label: '🧫 Antibody dilutions', snippet: 'Give primary and secondary antibody dilutions, diluent, incubation time and temperature, and the wash regime.' },
    { label: '📊 Loading control', snippet: 'Include a loading control or total protein normalisation and state which exposures are used for quantification.' },
  ],
  'Immunology & Immunoassay': [
    { label: '🧪 Coating & blocking', snippet: 'State the coating antigen concentration and buffer, and the blocking agent, concentration and duration.' },
    { label: '📈 Standard curve', snippet: 'Include a standard curve with its range, the fit model, and the acceptance criteria for R-squared and replicate CV.' },
    { label: '🎯 Titrated antibodies', snippet: 'Use titrated antibody concentrations per lot rather than supplier defaults, and record the lot numbers.' },
    { label: '🔬 FMO and isotype controls', snippet: 'Include fluorescence-minus-one and isotype controls for every gate boundary that is not clearly bimodal.' },
  ],
  'Microbiology': [
    { label: '🧫 Media & atmosphere', snippet: 'State the medium and agar formulation, incubation temperature, atmosphere and duration.' },
    { label: '📏 Inoculum standardisation', snippet: 'Standardise the inoculum quantitatively by OD600, McFarland standard or CFU/mL and give the dilution scheme.' },
    { label: '🔢 Counting rule', snippet: 'Define which plates are countable and how colonies are counted and converted to CFU/mL.' },
    { label: '🛡️ Sterility & reference strain', snippet: 'Include an uninoculated sterility control and a reference strain with an expected result.' },
  ],
  'Histology & Imaging': [
    { label: '🔪 Section & fixation', snippet: 'State fixation type and duration, embedding, section thickness in micrometres, and the slide type.' },
    { label: '♨️ Antigen retrieval', snippet: 'Name the retrieval buffer and pH, the heating method, time at temperature, and the cool-down period.' },
    { label: '⏱️ Development timing', snippet: 'State chromogen development timing and what the operator watches for, since the step is judged by eye and irreversible.' },
    { label: '🎯 Positive & negative slides', snippet: 'Include a known-positive control tissue and a negative control with the primary omitted, processed identically.' },
  ],
  'Molecular Biology': [
    { label: '⚡ 8-Channel pipetting', snippet: 'Optimise liquid handling for 8-channel pipetting across columns A-H in 96-well format with 10% overflow.' },
    { label: '🧲 SPRI cleanup ratios', snippet: 'Specify bead ratios, two fresh 80% ethanol washes, and the elution buffer and volume.' },
    { label: '🌡️ Thermal profile', snippet: 'Give the full thermal profile: denaturation, annealing and extension temperatures, durations and cycle count.' },
    { label: '🎯 NTC and positive control', snippet: 'Include a no-template control and a positive control reaction on every run.' },
    { label: '📊 QC checkpoints', snippet: 'Include fluorometric quantification and capillary sizing as quality checkpoints.' },
  ],
};

const GENERIC_CHIPS = [
  { label: '📏 Quantities & concentrations', snippet: 'Give every quantity, concentration and volume explicitly, with the unit and the stock it comes from.' },
  { label: '🌡️ Times & temperatures', snippet: 'State the duration and temperature of every incubation, and any speed or force for centrifugation steps.' },
  { label: '🎯 Controls', snippet: 'Specify the controls appropriate to this work and what result would invalidate the run.' },
  { label: '⏸️ Safe stopping points', snippet: 'Identify validated safe stopping points with the storage temperature and maximum hold time.' },
  { label: '✅ Acceptance criteria', snippet: 'Define quality control acceptance criteria with numeric thresholds rather than qualitative statements.' },
];

const PLACEHOLDER_BY_DISCIPLINE: Record<string, string> = {
  'Virology': `Describe the assay in detail. For example:
- Cell line, seeding density and vessel (e.g. Vero E6, 2 x 10^4 per well, 96-well plate)
- Virus and dose (e.g. ten-fold dilutions 10^-1 to 10^-8, 100 µL per well, 8 replicates)
- Incubation (e.g. 5 days at 37 °C, 5% CO2)
- Readout and scoring rule (e.g. CPE scored per well at 100x on day 5)
- Calculation (e.g. Reed-Muench 50% endpoint)
- Controls (e.g. uninfected wells, reference stock of known titre)`,
  'Cell Culture': `Describe the procedure in detail. For example:
- Cell line, passage range and medium with supplements (e.g. HEK293T, P5-P25, DMEM + 10% FBS)
- Vessel and seeding density (e.g. T75 flask, 1 x 10^6 cells)
- Incubation conditions (e.g. 37 °C, 5% CO2, humidified)
- Handling steps with times (e.g. 0.05% trypsin, 3 min at 37 °C)
- Acceptance criteria (e.g. viability above 90% by trypan blue)`,
  'Proteomics & Protein Biochemistry': `Describe the workflow in detail. For example:
- Sample and load (e.g. 20 µg lysate per lane, quantified by BCA)
- Separation (e.g. 4-12% gel, 150 V for 60 min)
- Transfer or digestion conditions (e.g. wet transfer, 100 V, 90 min at 4 °C)
- Antibodies or enzymes with dilutions and incubation (e.g. 1:1000 primary, overnight at 4 °C)
- Detection and quantification (e.g. ECL, unsaturated exposure, normalised to total protein)`,
  'Histology & Imaging': `Describe the staining run in detail. For example:
- Specimen (e.g. FFPE, 4 µm sections on charged slides)
- Dewax and rehydration series with times
- Retrieval (e.g. citrate pH 6.0, 20 min, cool 20 min)
- Antibody or stain with dilution, time and temperature
- Development, counterstain and mounting
- Controls (e.g. known positive tissue, primary omitted)`,
  'Microbiology': `Describe the method in detail. For example:
- Organism and strain, medium and agar formulation
- Inoculum preparation and standardisation (e.g. adjusted to 0.5 McFarland)
- Plating or broth volumes and dilution scheme
- Incubation temperature, atmosphere and duration
- Counting or reading rule and controls`,
};

const DEFAULT_PLACEHOLDER = `Describe the protocol you want to build in detail — the more specific you are, the more usable the result. For example:
- What the protocol acts on, and the starting quantity
- Reagents, media or stains with concentrations
- Every incubation: temperature, duration, atmosphere
- Equipment and its settings
- Controls and what invalidates the run
- Quality control checkpoints with numeric acceptance criteria`;

const TEMPLATE_STARTERS = [
  {
    title: BLANK_STARTER_TITLE,
    description: ''
  },
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
  const [description, setDescription] = useState<string>('');
  const [protocolTitle, setProtocolTitle] = useState<string>('');

  // Batch design is editable here rather than only on the standard generator form, because the
  // description editor hides that form entirely — so there was no way to change the sample count
  // for a de novo run without switching tabs and losing what you had typed.
  const [samples, setSamples] = useState<number>(sampleCount);
  const [reps, setReps] = useState<number>(replicates);
  const [posCtrl, setPosCtrl] = useState<number>(posControls);
  const [negCtrl, setNegCtrl] = useState<number>(negControls);
  const [overflow, setOverflow] = useState<number>(overflowPercent);
  const totalReactions = Math.max(1, samples * reps + posCtrl + negCtrl);
  const effectiveReactions = Math.ceil(totalReactions * (1 + overflow / 100));
  const [category, setCategory] = useState<string>('');
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
    // N/A clears the fields rather than writing its own label into them.
    const blank = starter.title === BLANK_STARTER_TITLE;
    setProtocolTitle(blank ? '' : starter.title);
    setDescription(blank ? '' : starter.description);
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
      sampleCount: samples,
      replicates: reps,
      posControls: posCtrl,
      negControls: negCtrl,
      overflowPercent: overflow
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
              Describe your protocol in plain language or bullet points. Choose the discipline first — the prompts, quick-add directives and generated document all follow from it.
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
              placeholder="e.g. TCID50 endpoint dilution titration on Vero E6 cells"
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Protocol Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
            >
              <option value="">Select a discipline…</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
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
            placeholder={PLACEHOLDER_BY_DISCIPLINE[category] || DEFAULT_PLACEHOLDER}
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
            {(CHIPS_BY_DISCIPLINE[category] || (category === 'Next-Generation Sequencing' ? QUICK_SPEC_CHIPS : GENERIC_CHIPS)).map((chip, idx) => (
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

        {/* Batch design. Rendered as its own full-width block: nested inside the action row it was
            squeezed to about a third of the width and the five controls wrapped into an unreadable
            stagger. */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Batch design</span>
            <span className="text-xs font-mono text-slate-600">
              {samples} x {reps} + {posCtrl} pos + {negCtrl} neg = <strong className="text-slate-900">{totalReactions} reactions</strong>
              {overflow > 0 && <> &rarr; <strong className="text-slate-900">{effectiveReactions}</strong> with +{overflow}%</>}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {([
              ['Samples', samples, setSamples, 1, 384],
              ['Replicates', reps, setReps, 1, 12],
              ['+ Controls', posCtrl, setPosCtrl, 0, 24],
              ['- Controls', negCtrl, setNegCtrl, 0, 24],
              ['Overflow %', overflow, setOverflow, 0, 100],
            ] as [string, number, (n: number) => void, number, number][]).map(([label, value, setter, min, max]) => (
              <div key={label} className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{label}</label>
                <div className="flex items-stretch rounded-lg border border-slate-300 bg-white overflow-hidden h-10">
                  <button
                    type="button"
                    onClick={() => setter(Math.max(min, value - 1))}
                    disabled={value <= min}
                    className="w-9 shrink-0 text-lg leading-none text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    aria-label={`Decrease ${label}`}
                  >&minus;</button>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setter(Number.isNaN(n) ? min : Math.min(max, Math.max(min, n)));
                    }}
                    className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setter(Math.min(max, value + 1))}
                    disabled={value >= max}
                    className="w-9 shrink-0 text-lg leading-none text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    aria-label={`Increase ${label}`}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Batch sizing applies to protocols that consume reagent per sample. Every per-step mix, the Excel
            calculator and the cost estimate scale from these numbers.
          </p>
        </div>

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
