import { generateSopStreaming, generateSopBlocking, ApiError, GenerationProgress } from '../client/api';
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Dna,
  ShieldAlert,
  BookCheck,
  FlaskConical,
  Loader2,
  ArrowRight,
  Atom,
  BookOpen,
  Zap,
  FileText,
  Upload,
  Layers,
  CheckCircle2,
  FileCode,
  Copy,
  Trash2,
  HelpCircle,
  Brain,
  Search
} from 'lucide-react';
import { SopDocument, ProtocolSuggestion, SelectedReagentConstraint, DeNovoProtocolBlueprint } from '../types';
import { AiProtocolSearch } from './AiProtocolSearch';
import { ReagentDatabaseAutocomplete } from './ReagentDatabaseAutocomplete';
import { DeNovoDescriptionEditor } from './DeNovoDescriptionEditor';

interface SopGeneratorProps {
  onSopGenerated: (sop: SopDocument) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  initialSuggestion?: ProtocolSuggestion | null;
}

const BENCHMARK_PRESETS = [
  'Illumina DNA Prep with Covaris Acoustic Shearing & SPRI Bead Size Selection',
  'RT-qPCR SYBR Green One-Step RNA Quantification Assay (8-Channel Pipetting)',
  'Whole Genome Sequencing (WGS) Library Prep with Normalization & Shearing',
  'CRISPR-Cas9 Gene Knockout via Nucleofection RNP',
  'His-Tag Recombinant Protein Purification using Ni-NTA Resin',
  'HEK293T Transient Transfection with Polyethylenimine (PEI)',
  'Bacterial Expression and IPTG Induction of Recombinant Enzymes',
  'Agarose Gel Electrophoresis & DNA Fragment Purification'
];

const DE_NOVO_PRESETS = [
  'De Novo Covaris Acoustic Shearing & Automated NGS Library Prep',
  'De Novo Cell-Free Synthetic Biology & Protein Synthesis (CFPS)',
  'De Novo Cas13 RNA-Targeting Fluorometric Diagnostic Assay',
  'De Novo Prime Editing PE6 RNP Transfection in Primary T Cells',
  'De Novo mRNA-Lipid Nanoparticle (LNP) Encapsulation & Microfluidic Assembly',
  'De Novo Single-Cell Spatial Transcriptomics Barcoding Library Prep',
  'De Novo Light-Gated Optogenetic Gene Expression Controller'
];

const SOP_TEMPLATE_PRESETS = [
  {
    id: 'iso_9001',
    name: 'ISO 9001 GLP Quality Management Template',
    templateName: 'ISO 9001 GLP Standard Format',
    content: `=== ISO 9001 GLP QUALITY MANAGEMENT SOP TEMPLATE ===
1.0 POLICY & PURPOSE
- Primary Operational Objective: {{TOPIC}}
- Compliance Governance: ISO 9001 Quality Management & Good Laboratory Practice (GLP)

2.0 SCOPE & RESPONSIBILITIES
- Laboratory Scope: {{CATEGORY}} / Target Host System: {{HOST}}
- Personnel Authorization & Training Requirements

3.0 HEALTH, SAFETY & ENVIRONMENTAL (HSE) CONTROLS
- Biosafety Level: {{BSL}}
- Mandatory Chemical & Biological Hazard Analysis
- Personal Protective Equipment (PPE) Matrix

4.0 EQUIPMENT & REAGENT SPECIFICATIONS
- Calibrated Equipment List
- Reagents, Buffer Stock Concentrations & Master Mix Calculations

5.0 STEP-BY-STEP OPERATIONAL PROCEDURE
- Sequential Procedure Execution with Time & Temperature Controls
- Critical Quality Checkpoints & Safety Warnings

6.0 QUALITY CONTROL & TROUBLESHOOTING
- Performance Criteria & Acceptable Range
- Actionable Troubleshooting Matrix

7.0 REFERENCES & DOCUMENT REVISION
- Literature Benchmark Citations
- Document Revision History`
  },
  {
    id: 'fda_21cfr',
    name: 'FDA 21 CFR Part 11 QA Regulatory Template',
    templateName: 'FDA 21 CFR Part 11 QA Format',
    content: `=== FDA 21 CFR PART 11 COMPLIANCE SOP TEMPLATE ===
[HEADER: CONTROLLED QA DOCUMENT - CONFIDENTIAL]

SECTION A: REGULATORY PURPOSE & SCOPE
- Document Control ID & Scope: {{TOPIC}}
- Regulatory Classification: FDA 21 CFR / BSL: {{BSL}}

SECTION B: PERSONNEL QUALIFICATIONS & SIGN-OFFS
- Requestor & Quality Assurance Approval Matrix

SECTION C: HAZARDOUS MATERIAL SAFETY & PPE
- Chemical/Biological Risk Assessment
- Protective Equipment Requirements

SECTION D: REAGENT PREPARATION & MASTER MIX STOICHIOMETRY
- Reagents, Stock Solutions, and Pipetting Orders
- Step-by-Step Master Mix Calculations

SECTION E: VALIDATED EXPERIMENTAL PROCEDURE
- Chronological Steps with Temperature & Timing Restrictions
- Critical In-Process Checkpoints

SECTION F: ACCEPTANCE CRITERIA & DEVIATION HANDLING
- Quality Control Acceptance Benchmarks
- Deviation Investigation & Troubleshooting Pairs`
  },
  {
    id: 'academic',
    name: 'Academic Research Lab Protocol Sheet',
    templateName: 'Academic Research Lab Format',
    content: `=== ACADEMIC RESEARCH LAB PROTOCOL TEMPLATE ===
• Title: {{TOPIC}}
• Target System: {{HOST}} ({{CATEGORY}})
• Safety Level: {{BSL}}

1. BACKGROUND & EXPERIMENTAL OVERVIEW
2. REAGENTS, BUFFERS & MASTER MIX SETUP
3. BENCH PROTOCOL & PROCEDURE STEPS
4. TROUBLESHOOTING & QUALITY CONTROLS
5. REFERENCES & CITATIONS`
  },
  {
    id: 'biotech_rd',
    name: 'Biotech Startup R&D Rapid Execution SOP',
    templateName: 'Biotech R&D Rapid Execution Format',
    content: `=== BIOTECH R&D RAPID EXECUTION TEMPLATE ===
• PROTOCOL NAME: {{TOPIC}}
• HOST / MODEL: {{HOST}} | BSL: {{BSL}}
• REAGENT PREPARATION & MASTER MIX PIPETTING GUIDE
• STEP-BY-STEP BENCH PROCEDURE
• SAFETY CHECKPOINTS & TROUBLESHOOTING`
  }
];

export const SopGenerator: React.FC<SopGeneratorProps> = ({
  onSopGenerated,
  isLoading,
  setIsLoading,
  initialSuggestion
}) => {
  const [showSearchSection, setShowSearchSection] = useState<boolean>(false);
  const [generationMode, setGenerationMode] = useState<'literature_benchmark' | 'de_novo'>('de_novo');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Molecular Biology');
  const [biosafetyLevel, setBiosafetyLevel] = useState('BSL-1');
  const [targetHost, setTargetHost] = useState('E. coli BL21 / Mammalian Cells');
  const [additionalReqs, setAdditionalReqs] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusStep, setStatusStep] = useState<string>('');
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  /** Real streaming generation with live section progress; falls back to the blocking endpoint if SSE fails to start. */
  const runGeneration = async (payload: Record<string, unknown>): Promise<SopDocument> => {
    setProgress({ chars: 0, sectionsSeen: [], percent: 0 });
    setStatusStep('Contacting model…');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      return await generateSopStreaming(payload, (p) => {
        setProgress(p);
        const last = p.sectionsSeen[p.sectionsSeen.length - 1];
        setStatusStep(last ? `Receiving: ${last} (${p.sectionsSeen.length} sections so far)` : 'Model is composing the document…');
      }, controller.signal);
    } catch (e) {
      // Only fall back when the stream could not START (e.g. proxy strips SSE). Real generation errors propagate.
      if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
        setStatusStep('Streaming unavailable — using standard request…');
        return await generateSopBlocking(payload);
      }
      throw e;
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const handleApplySuggestion = (sug: ProtocolSuggestion) => {
    setTopic(sug.suggestedTopic || sug.title);
    setCategory(sug.suggestedCategory || sug.category);
    setBiosafetyLevel(sug.biosafetyLevel || 'BSL-1');
    setTargetHost(sug.targetHostOrOrganism || 'E. coli / Mammalian Cells');
    setAdditionalReqs(sug.suggestedAdditionalReqs || sug.scientificRationale);
    if (sug.sampleCountDefault) setSampleCount(sug.sampleCountDefault);
    setShowSearchSection(false);
  };

  useEffect(() => {
    if (initialSuggestion) {
      handleApplySuggestion(initialSuggestion);
    }
  }, [initialSuggestion]);

  // Sample Count & Auto-Scaling State
  const [sampleCount, setSampleCount] = useState<number>(8);
  const [replicates, setReplicates] = useState<number>(1);
  const [posControls, setPosControls] = useState<number>(1);
  const [negControls, setNegControls] = useState<number>(1);
  const [overflowPercent, setOverflowPercent] = useState<number>(10);

  // De Novo View Tab (Description Editor vs Form Matrix)
  const [deNovoTab, setDeNovoTab] = useState<'description_editor' | 'form_matrix'>('description_editor');

  // Biotech Reagent Database Stock Solution Constraints State
  const [selectedReagents, setSelectedReagents] = useState<SelectedReagentConstraint[]>([]);

  // SOP Template Input Studio State
  const [useCustomTemplate, setUseCustomTemplate] = useState<boolean>(false);
  const [sopTemplateText, setSopTemplateText] = useState<string>('');
  const [sopTemplateMode, setSopTemplateMode] = useState<'match_structure' | 'fill_placeholders'>('fill_placeholders');
  const [customTemplateName, setCustomTemplateName] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Requestor & Reviewer Information (Blank defaults for manual filling)
  const [requestorName, setRequestorName] = useState('');
  const [requestorDept, setRequestorDept] = useState('');
  const [requestorEmail, setRequestorEmail] = useState('');
  const [dateRequested, setDateRequested] = useState('');

  const [reviewerName, setReviewerName] = useState('');
  const [reviewerRole, setReviewerRole] = useState('');
  const [dateReviewed, setDateReviewed] = useState('');
  const [reviewStatus, setReviewStatus] = useState('Pending Review');
  const [reviewerComments, setReviewerComments] = useState('');

  const handleApplyPresetTemplate = (preset: typeof SOP_TEMPLATE_PRESETS[0]) => {
    setSopTemplateText(preset.content);
    setCustomTemplateName(preset.templateName);
    setUseCustomTemplate(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setCustomTemplateName(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setSopTemplateText(text);
        setUseCustomTemplate(true);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // The de novo description editor runs its own generation through
    // handleGenerateDeNovoFromEditor and keeps its title/description in local state. Any submit
    // that reaches here while it is open would start a second, standard generation from stale
    // fields — or reject it as "no topic". Ignore it.
    if (generationMode === 'de_novo' && deNovoTab === 'description_editor') return;
    if (!topic.trim()) {
      setErrorMsg('Please specify a protocol topic or select a preset.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setStatusStep('Starting generation…');

    try {

      const requestPayload = {
        topic,
        category,
        targetOrganismOrHost: targetHost,
        biosafetyLevel,
        additionalRequirements: additionalReqs,
        referenceText,
        generationMode,
        isDeNovo: generationMode === 'de_novo',
        sopTemplateText: useCustomTemplate ? sopTemplateText : '',
        sopTemplateMode: useCustomTemplate ? sopTemplateMode : 'fill_placeholders',
        customTemplateName: useCustomTemplate ? customTemplateName : '',
        sampleCount,
        replicates,
        posControls,
        negControls,
        overflowPercent,
        selectedReagents
      };

      const generatedFromServer = await runGeneration(requestPayload);
      const data = { sop: generatedFromServer };

      // Attach manual Requestor & Reviewer Info
      const generatedSop: SopDocument = {
        ...data.sop,
        isDeNovo: generationMode === 'de_novo',
        generationMode,
        customTemplateApplied: useCustomTemplate && !!sopTemplateText.trim(),
        customTemplateName: useCustomTemplate ? (customTemplateName || 'Custom Institutional Format') : undefined,
        requestorInfo: {
          name: requestorName,
          department: requestorDept,
          emailOrRole: requestorEmail,
          dateRequested: dateRequested
        },
        reviewerInfo: {
          name: reviewerName,
          titleOrRole: reviewerRole,
          dateReviewed: dateReviewed,
          status: reviewStatus,
          comments: reviewerComments
        }
      };

      onSopGenerated(generatedSop);
    } catch (err: any) {
      console.error('Generation error:', err);
      const msg = err.message || '';
      const cleanMsg = msg.includes('Failed to fetch')
        ? 'Network request failed. Please check your network connection and try again.'
        : msg || 'An error occurred during protocol generation.';
      // err.detail carries the reason Gemini itself gave; show it so a quota problem is not
      // mistaken for a transient one.
      const detail: string | undefined = typeof err?.detail === 'string' ? err.detail : undefined;
      setErrorMsg(detail && !cleanMsg.includes(detail) ? `${cleanMsg} (Gemini said: ${detail})` : cleanMsg);
    } finally {
      setIsLoading(false);
      setStatusStep('');
    }
  };

  const handleGenerateDeNovoFromEditor = async (params: {
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
  }) => {
    setTopic(params.topic);
    setCategory(params.category);
    setTargetHost(params.targetHost);
    setBiosafetyLevel(params.biosafetyLevel);
    setAdditionalReqs(params.additionalReqs);
    setSampleCount(params.sampleCount);
    setReplicates(params.replicates);
    setPosControls(params.posControls);
    setNegControls(params.negControls);
    setOverflowPercent(params.overflowPercent);

    setErrorMsg(null);
    setIsLoading(true);
    setStatusStep('Starting de novo generation…');

    try {

      const requestPayload = {
        topic: params.topic,
        category: params.category,
        targetOrganismOrHost: params.targetHost,
        biosafetyLevel: params.biosafetyLevel,
        additionalRequirements: params.additionalReqs,
        referenceText,
        generationMode: 'de_novo',
        isDeNovo: true,
        sopTemplateText: useCustomTemplate ? sopTemplateText : '',
        sopTemplateMode: useCustomTemplate ? sopTemplateMode : 'fill_placeholders',
        customTemplateName: useCustomTemplate ? customTemplateName : '',
        sampleCount: params.sampleCount,
        replicates: params.replicates,
        posControls: params.posControls,
        negControls: params.negControls,
        overflowPercent: params.overflowPercent,
        selectedReagents: params.selectedReagents || selectedReagents
      };

      const generatedFromServer = await runGeneration(requestPayload);
      const data = { sop: generatedFromServer };

      const generatedSop: SopDocument = {
        ...data.sop,
        isDeNovo: true,
        generationMode: 'de_novo',
        deNovoBlueprint: params.blueprint,
        customTemplateApplied: useCustomTemplate && !!sopTemplateText.trim(),
        customTemplateName: useCustomTemplate ? (customTemplateName || 'Custom Institutional Format') : undefined,
        requestorInfo: {
          name: requestorName,
          department: requestorDept,
          emailOrRole: requestorEmail,
          dateRequested: dateRequested
        },
        reviewerInfo: {
          name: reviewerName,
          titleOrRole: reviewerRole,
          dateReviewed: dateReviewed,
          status: reviewStatus,
          comments: reviewerComments
        }
      };

      onSopGenerated(generatedSop);
    } catch (err: any) {
      console.error('De Novo generation error:', err);
      setErrorMsg(err.message || 'An error occurred during protocol generation.');
    } finally {
      setIsLoading(false);
      setStatusStep('');
    }
  };

  const activePresets = generationMode === 'de_novo' ? DE_NOVO_PRESETS : BENCHMARK_PRESETS;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-full border border-cyan-500/30">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Biotech Laboratory Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Generate Standard Operating Procedures Across the Life Sciences
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Create validated SOPs or synthesize groundbreaking <strong>de novo</strong> cutting-edge protocols from first-principles biochemistry and peer-reviewed literature. Automatically calculates master mixes for each step of the reaction.
          </p>
        </div>
      </div>

      {/* Main Generator Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-600" />
            <h2 className="font-semibold text-slate-900">Protocol Specification Studio</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSearchSection(!showSearchSection)}
              className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showSearchSection ? 'Close AI Search' : 'AI Protocol Search & Reasoning'}</span>
            </button>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">Gemini 3.6 Flash Engine</span>
          </div>
        </div>

        {/* AI Thought & Search Drawer inside Generator */}
        {showSearchSection && (
          <div className="p-6 border-b border-indigo-100 bg-indigo-50/20">
            <AiProtocolSearch onApplySuggestionToGenerator={handleApplySuggestion} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Generation Error</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* DE NOVO vs BENCHMARK MODE SELECTOR */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Select Protocol Generation Strategy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* De Novo Mode Option */}
              <div
                onClick={() => setGenerationMode('de_novo')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  generationMode === 'de_novo'
                    ? 'border-purple-600 bg-purple-50/40 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${generationMode === 'de_novo' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Atom className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">De Novo Cutting-Edge Protocol</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-md">
                        Novel R&D (99%+ Accuracy)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Describe what you want to build in plain English or bullet points. Pick your discipline and the generator asks for the parameters that discipline actually specifies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Standard Benchmark Option */}
              <div
                onClick={() => setGenerationMode('literature_benchmark')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  generationMode === 'literature_benchmark'
                    ? 'border-cyan-600 bg-cyan-50/40 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${generationMode === 'literature_benchmark' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Literature Benchmark SOP</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-md border border-cyan-200">
                        Standard GLP
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Generates a standard ISO/GLP compliant SOP for established workflows (PCR, Cloning, Transfection, Ni-NTA Purification) directly aligned with published peer-reviewed benchmarks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DE NOVO DESCRIPTION STUDIO TAB BAR (When in de_novo mode) */}
          {generationMode === 'de_novo' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between bg-purple-50/80 p-1.5 rounded-xl border border-purple-200">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeNovoTab('description_editor')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      deNovoTab === 'description_editor'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                    <span>De Novo Protocol Description & Architecture Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeNovoTab('form_matrix')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      deNovoTab === 'form_matrix'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Standard Matrix Form</span>
                  </button>
                </div>

                <span className="text-[11px] font-mono font-semibold text-purple-700 pr-2 hidden sm:inline">
                  99%+ Verified Accuracy
                </span>
              </div>

              {deNovoTab === 'description_editor' && (
                <DeNovoDescriptionEditor
                  onGenerateDeNovoSop={handleGenerateDeNovoFromEditor}
                  isLoading={isLoading}
                  sampleCount={sampleCount}
                  replicates={replicates}
                  posControls={posControls}
                  negControls={negControls}
                  overflowPercent={overflowPercent}
                />
              )}
            </div>
          )}

          {/* Hide form inputs if in de novo description editor mode */}
          {!(generationMode === 'de_novo' && deNovoTab === 'description_editor') && (
            <>
              {/* Preset Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {generationMode === 'de_novo' ? 'Cutting-Edge De Novo Topics:' : 'Standard Literature Presets:'}
                  </label>
                  <span className="text-xs text-slate-400 font-mono">Click to auto-fill</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(preset)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                        topic === preset
                          ? generationMode === 'de_novo'
                            ? 'bg-purple-100 border-purple-400 text-purple-900 font-semibold shadow-xs'
                            : 'bg-cyan-50 border-cyan-400 text-cyan-800 font-semibold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {generationMode === 'de_novo' && <Zap className="w-3 h-3 text-purple-600 shrink-0" />}
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

          {/* Topic / Title Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Protocol Title or Experimental Target <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                generationMode === 'de_novo'
                  ? 'e.g. De Novo Cell-Free Express System for High-Yield Enzyme Production'
                  : 'e.g. Taq DNA Polymerase 50uL PCR Setup or CRISPR Cas9 Knockout in HEK293'
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm font-medium"
              required
            />
          </div>

          {/* Grid Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:border-cyan-500 bg-white"
              >
                <option value="Molecular Biology">Molecular Biology</option>
                <option value="Genome Editing">Genome Editing (CRISPR)</option>
                <option value="Protein Biochemistry">Protein Biochemistry</option>
                <option value="Cell Culture & Transfection">Cell Culture & Transfection</option>
                <option value="Next-Gen Sequencing">Next-Gen Sequencing (NGS)</option>
                <option value="Synthetic Biology">Synthetic Biology & Cloning</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Biosafety Level (BSL)
              </label>
              <select
                value={biosafetyLevel}
                onChange={(e) => setBiosafetyLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:border-cyan-500 bg-white"
              >
                <option value="BSL-1">BSL-1 (Standard Lab)</option>
                <option value="BSL-2">BSL-2 (Human Cell Lines / Viral Vectors)</option>
                <option value="BSL-3">BSL-3 (High-Risk Pathogens)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Host / Model System
              </label>
              <input
                type="text"
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                placeholder="e.g. HEK293T, E. coli BL21, Primary T Cells"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Sample Count & Auto-Scaling Parameters Card */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 rounded-2xl border border-slate-700 text-white space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                    Sample Count & Reaction Auto-Scaling Setup
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Specify sample size & replicates. SOP step master mixes & companion reaction sheet will auto-scale to batch size.
                  </p>
                </div>
              </div>

              {/* Live Formula Badge */}
              <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-cyan-500/40 text-right shrink-0">
                <span className="block text-[10px] font-mono text-cyan-300 uppercase tracking-wider">Batch Capacity</span>
                <span className="text-sm font-bold text-white font-mono">
                  {(sampleCount * replicates) + posControls + negControls} Reaction Wells
                </span>
              </div>
            </div>

            {/* Quick Sample Size Presets */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Quick Sample Presets:
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSampleCount(8);
                    setReplicates(1);
                    setPosControls(1);
                    setNegControls(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                    sampleCount === 8 && replicates === 1
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  8 Samples (10 rxns)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSampleCount(16);
                    setReplicates(2);
                    setPosControls(1);
                    setNegControls(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                    sampleCount === 16 && replicates === 2
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  16 Samples in Duplicate (34 rxns)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSampleCount(24);
                    setReplicates(1);
                    setPosControls(1);
                    setNegControls(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                    sampleCount === 24 && replicates === 1
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  24 Samples (26 rxns)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSampleCount(92);
                    setReplicates(1);
                    setPosControls(2);
                    setNegControls(2);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                    sampleCount === 92
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  96-Well Plate (92 + 4 CTL)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSampleCount(368);
                    setReplicates(1);
                    setPosControls(8);
                    setNegControls(8);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                    sampleCount === 368
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  384-Well Plate (368 + 16 CTL)
                </button>
              </div>
            </div>

            {/* Detailed Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              {/* Sample Count S */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Sample Count (S)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSampleCount(Math.max(1, sampleCount - 1))}
                    className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-white text-xs transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={1536}
                    value={sampleCount}
                    onChange={(e) => setSampleCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center bg-slate-900 border border-slate-700 rounded-lg py-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSampleCount(sampleCount + 1)}
                    className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-white text-xs transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Technical Replicates */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Technical Replicates
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setReplicates(1)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-colors border ${
                      replicates === 1
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplicates(2)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-colors border ${
                      replicates === 2
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    2x
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplicates(3)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-colors border ${
                      replicates === 3
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    3x
                  </button>
                </div>
              </div>

              {/* Control Reaction Wells */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Control Reactions
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">+CTL:</span>
                    <input
                      type="number"
                      min={0}
                      value={posControls}
                      onChange={(e) => setPosControls(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent text-xs text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-rose-400 font-mono font-bold">NTC:</span>
                    <input
                      type="number"
                      min={0}
                      value={negControls}
                      onChange={(e) => setNegControls(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent text-xs text-white font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Pipetting Overflow Buffer */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-bold text-slate-300">
                    Pipetting Dead Vol
                  </label>
                  <span className="text-cyan-400 font-mono font-bold">+{overflowPercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={5}
                  value={overflowPercent}
                  onChange={(e) => setOverflowPercent(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-2"
                />
              </div>
            </div>

            {/* Formula Explanation */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/80">
              <span className="text-cyan-400 font-bold">Auto-Scaling Formula:</span>
              <span>
                N = ({sampleCount} samples × {replicates}x rep) + {posControls} + {negControls} = <strong className="text-white">{ (sampleCount * replicates) + posControls + negControls } total reactions</strong> (+{overflowPercent}% excess buffer)
              </span>
            </div>
          </div>

          {/* Reagent Database Auto-Complete & Biotech Stock Solutions Configuration */}
          <ReagentDatabaseAutocomplete
            selectedReagents={selectedReagents}
            onChangeSelectedReagents={setSelectedReagents}
            protocolTopic={topic}
          />

          {/* Requestor Information & Reviewer Information Section */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Requestor & Reviewer Compliance Details (Optional / Manual Filling)
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Not Auto-Filled</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requestor Block */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider text-cyan-800">
                  Requestor Information
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Requestor Name</label>
                    <input
                      type="text"
                      value={requestorName}
                      onChange={(e) => setRequestorName(e.target.value)}
                      placeholder="e.g. Dr. Jane Doe"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Department / Lab Unit</label>
                    <input
                      type="text"
                      value={requestorDept}
                      onChange={(e) => setRequestorDept(e.target.value)}
                      placeholder="e.g. Molecular Virology Lab 4"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Email / Role</label>
                      <input
                        type="text"
                        value={requestorEmail}
                        onChange={(e) => setRequestorEmail(e.target.value)}
                        placeholder="j.doe@lab.org"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Date Requested</label>
                      <input
                        type="date"
                        value={dateRequested}
                        onChange={(e) => setDateRequested(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviewer Block */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider text-amber-800">
                  Reviewer / Quality Assurance
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Reviewer Name</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Dr. Alex Smith"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Title / Role</label>
                      <input
                        type="text"
                        value={reviewerRole}
                        onChange={(e) => setReviewerRole(e.target.value)}
                        placeholder="QA Director"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Review Status</label>
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none bg-white font-medium"
                      >
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Revision Requested">Revision Requested</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Review Date</label>
                      <input
                        type="date"
                        value={dateReviewed}
                        onChange={(e) => setDateReviewed(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Reviewer Notes</label>
                      <input
                        type="text"
                        value={reviewerComments}
                        onChange={(e) => setReviewerComments(e.target.value)}
                        placeholder="e.g. Approved for BSL-1"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional SOP Template Input Studio */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 text-white space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                    Custom Institutional SOP Template Studio
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Upload or paste your organization's custom SOP format to match structure or place generated protocol info directly into template fields.
                  </p>
                </div>
              </div>

              {/* Enable Toggle */}
              <label className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 px-3 py-1.5 rounded-xl border border-slate-600 cursor-pointer transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={useCustomTemplate}
                  onChange={(e) => setUseCustomTemplate(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-white font-mono">
                  {useCustomTemplate ? 'TEMPLATE ENABLED' : 'ENABLE CUSTOM TEMPLATE'}
                </span>
              </label>
            </div>

            {useCustomTemplate && (
              <div className="space-y-4 pt-1 animate-fadeIn">
                {/* Quick Template Presets */}
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-mono font-bold text-slate-300 block">
                    Select Standard Template Preset or Upload File:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SOP_TEMPLATE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPresetTemplate(preset)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                          customTemplateName === preset.templateName
                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold shadow-xs'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/70 hover:border-slate-600'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="block font-semibold text-[11px] text-white">{preset.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">Click to auto-fill layout</span>
                        </div>
                        <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload Option */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-sans">
                      Upload custom SOP template file (<span className="font-mono text-cyan-300">.txt, .md, .doc, .json</span>):
                    </span>
                  </div>

                  <label className="inline-flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Choose File...'}</span>
                    <input
                      type="file"
                      accept=".txt,.md,.markdown,.doc,.docx,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Mode Selector */}
                <div className="space-y-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 font-mono block">
                    Template Alignment Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setSopTemplateMode('fill_placeholders')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        sopTemplateMode === 'fill_placeholders'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="templateMode"
                        checked={sopTemplateMode === 'fill_placeholders'}
                        onChange={() => setSopTemplateMode('fill_placeholders')}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block text-white">Direct Placeholder Injection</span>
                        <p className="text-[10px] text-slate-300 leading-normal">
                          Places all generated protocol variables, steps, master mixes, and safety data directly into template fields/placeholders.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => setSopTemplateMode('match_structure')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        sopTemplateMode === 'match_structure'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="templateMode"
                        checked={sopTemplateMode === 'match_structure'}
                        onChange={() => setSopTemplateMode('match_structure')}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block text-white">Match Template Structure & Headings</span>
                        <p className="text-[10px] text-slate-300 leading-normal">
                          Structures the generated SOP headings, numbering, and order to mirror your template structure.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Name & Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Template Name & Custom Format Definition
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSopTemplateText('');
                        setCustomTemplateName('');
                        setUploadedFileName('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Template</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={customTemplateName}
                    onChange={(e) => setCustomTemplateName(e.target.value)}
                    placeholder="Custom Template Name (e.g. Acme Biotech ISO 9001 Format)"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />

                  <textarea
                    rows={6}
                    value={sopTemplateText}
                    onChange={(e) => setSopTemplateText(e.target.value)}
                    placeholder={`Paste your institutional SOP template or section structure here...\n\nExample:\n=== ACME BIOTECH QA TEMPLATE ===\n1.0 PURPOSE: {{TOPIC}}\n2.0 SAFETY & PPE\n3.0 MASTER MIX CALCULATIONS\n4.0 STEP-BY-STEP PROCEDURE\n5.0 TROUBLESHOOTING & QUALITY CONTROL`}
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-emerald-300 font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 font-mono">
                    Tip: Use tokens like <code className="text-cyan-300">{"{{TOPIC}}"}</code>, <code className="text-cyan-300">{"{{BSL}}"}</code>, <code className="text-cyan-300">{"{{HOST}}"}</code> or simply paste plain template section headings.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Reference Literature / Text Paste */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Reference Literature / Benchmark Protocol Context (Optional)
              </label>
              <span className="text-xs text-slate-400">Paste paper abstract, DOI, or reagent kit protocol</span>
            </div>
            <textarea
              rows={3}
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="Paste relevant peer-reviewed method, commercial kit instructions (e.g. NEB, ThermoFisher), or Cold Spring Harbor protocol notes..."
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Specific Reagent Constraints or Master Mix Parameters (Optional)
            </label>
            <input
              type="text"
              value={additionalReqs}
              onChange={(e) => setAdditionalReqs(e.target.value)}
              placeholder="e.g. Total volume 25uL, 10% master mix overflow, use MgCl2 2.5mM, exclude DMSO"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-300 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-cyan-900/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Protocol & Excel Sheet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate SOP & Excel Reaction Sheet</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {isLoading && statusStep && (
              <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Dna className="w-4 h-4 text-cyan-600 animate-spin flex-shrink-0" />
                    <span className="truncate">{statusStep}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { abortRef.current?.abort(); setIsLoading(false); setStatusStep(''); setProgress(null); }}
                    className="text-cyan-700 hover:text-cyan-900 underline flex-shrink-0"
                  >
                    Cancel
                  </button>
                </div>
                {progress && (
                  <>
                    <div className="h-1.5 bg-cyan-100 rounded overflow-hidden">
                      <div className="h-full bg-cyan-600 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {progress.sectionsSeen.map((sec) => (
                        <span key={sec} className="px-1.5 py-0.5 rounded bg-white border border-cyan-200 text-[10px]">{sec}</span>
                      ))}
                      {progress.chars > 0 && <span className="text-[10px] text-cyan-600 ml-auto font-mono">{(progress.chars / 1000).toFixed(1)}k chars</span>}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
