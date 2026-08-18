import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Brain,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldAlert,
  Clock,
  ArrowRight,
  Layers,
  Dna,
  BookOpen,
  Loader2,
  ListFilter
} from 'lucide-react';
import { ProtocolSuggestion, SearchAndSuggestionResult, AiThoughtStep, BioSafetyLevel } from '../types';

interface AiProtocolSearchProps {
  onApplySuggestionToGenerator: (suggestion: ProtocolSuggestion) => void;
}

const PRESET_SEARCH_QUERIES = [
  'RT-qPCR viral RNA detection with SYBR Green master mix',
  'CRISPR-Cas9 RNP nucleofection in primary T cells',
  'Gibson Assembly 4-fragment vector construction',
  'High-yield His-tag protein purification with Ni-NTA',
  'Fast alkaline lysis plasmid miniprep protocol',
  'HEK293T transient transfection with PEI'
];

export const AiProtocolSearch: React.FC<AiProtocolSearchProps> = ({
  onApplySuggestionToGenerator
}) => {
  const [query, setQuery] = useState('');
  const [targetOrganism, setTargetOrganism] = useState('');
  const [categoryHint, setCategoryHint] = useState('Molecular Biology');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchAndSuggestionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedThoughtStep, setExpandedThoughtStep] = useState<number | null>(null);
  const [isThoughtChainOpen, setIsThoughtChainOpen] = useState(true);

  const handleRunAiSearch = async (queryToRun?: string) => {
    const searchQuery = queryToRun || query;
    if (!searchQuery.trim()) {
      setErrorMsg('Please enter a protocol query or select a preset query.');
      return;
    }

    setErrorMsg('');
    setIsSearching(true);

    try {
      let response: Response | null = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await fetch('/api/search-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: searchQuery,
              targetOrganism: targetOrganism.trim() || undefined,
              categoryHint: categoryHint !== 'All Categories' ? categoryHint : undefined
            })
          });
          if (response.ok) break;
        } catch (fErr) {
          console.warn(`[Search Attempt ${attempt}] Network error:`, fErr);
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!response) {
        throw new Error('Network connection failed. Please check connection and try again.');
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to search and generate protocol suggestions.');
      }

      setSearchResult(data.result);
      setIsThoughtChainOpen(true);
    } catch (err: any) {
      console.error('AI Protocol Search Error:', err);
      setErrorMsg(err.message || 'An error occurred during AI protocol reasoning.');
    } finally {
      setIsSearching(false);
    }
  };

  const getCategoryBadgeStyle = (category: AiThoughtStep['category']) => {
    switch (category) {
      case 'INTENT_PARSING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'STOICHIOMETRY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'BIOSAFETY_QC':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LITERATURE_SYNTHESIS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RECOMMENDATION':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getCategoryLabel = (category: AiThoughtStep['category']) => {
    switch (category) {
      case 'INTENT_PARSING':
        return '1. Intent & Goal Parsing';
      case 'STOICHIOMETRY':
        return '2. Stoichiometry & Kinetic Reasoning';
      case 'BIOSAFETY_QC':
        return '3. Biosafety & Quality Control Audit';
      case 'LITERATURE_SYNTHESIS':
        return '4. Literature Standard Synthesis';
      case 'RECOMMENDATION':
        return '5. Tailored Protocol Formulation';
      default:
        return category;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-xl text-white shadow-md">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">AI Protocol Search & Reasoning Engine</h2>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                AI Thought Function
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ask AI to analyze your protocol requirements, output an explicit step-by-step reasoning chain, and suggest 99% accurate validated SOP parameters.
            </p>
          </div>
        </div>
      </div>

      {/* Query Search Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunAiSearch()}
              placeholder="e.g. Fast RT-qPCR for viral RNA detection with SYBR Green master mix..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Target Organism / Host */}
          <div className="md:col-span-3">
            <input
              type="text"
              value={targetOrganism}
              onChange={(e) => setTargetOrganism(e.target.value)}
              placeholder="Host/Organism (e.g. HEK293T, E. coli)"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={categoryHint}
              onChange={(e) => setCategoryHint(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 text-slate-800 transition-all"
            >
              <option value="All Categories">All Categories</option>
              <option value="Molecular Biology">Molecular Biology</option>
              <option value="Genomics & Sequencing">Genomics & Sequencing</option>
              <option value="Cell Culture & Transfection">Cell Culture & Transfection</option>
              <option value="Protein Biochemistry">Protein Biochemistry</option>
              <option value="Microbiology & Fermentation">Microbiology & Fermentation</option>
              <option value="Synthetic Biology & CRISPR">Synthetic Biology & CRISPR</option>
            </select>
          </div>
        </div>

        {/* Presets Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Quick Presets:
          </span>
          {PRESET_SEARCH_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(preset);
                handleRunAiSearch(preset);
              }}
              className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => handleRunAiSearch()}
            disabled={isSearching}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing AI Thought Reasoning...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Analyze Query with AI Thought Function</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message Display */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* AI Search Loading State */}
      {isSearching && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-900/60 shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
              <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-cyan-300">AI Chain of Thought Active</h3>
              <p className="text-xs text-slate-300">Evaluating stoichiometric conditions, kinetics, BSL hazards, and literature standards...</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-xs text-indigo-200 font-mono bg-indigo-900/40 p-2.5 rounded-xl border border-indigo-800/50 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Phase 1/5: Parsing natural language user intent & constraints...</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono p-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span>Phase 2/5: Calculating reaction master mix stoichiometry C1*V1 = C2*V2...</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono p-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span>Phase 3/5: Benchmarking against Cold Spring Harbor & Nature Protocols...</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Search Results & Thought Function Display */}
      {searchResult && !isSearching && (
        <div className="space-y-6 pt-2">
          {/* AI Chain of Thought Drawer */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 overflow-hidden shadow-md">
            {/* Thought Drawer Header */}
            <button
              onClick={() => setIsThoughtChainOpen(!isThoughtChainOpen)}
              className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-900 hover:bg-slate-800/80 transition-colors text-left cursor-pointer border-b border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                      AI Thought Process Chain
                    </span>
                    <span className="text-[10px] bg-indigo-900/60 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-700/50">
                      5/5 Scientific Reasoning Phases Complete
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    Query: "{searchResult.query}"
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{isThoughtChainOpen ? 'Hide Reasoning' : 'Show Reasoning'}</span>
                {isThoughtChainOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Thought Drawer Content */}
            {isThoughtChainOpen && (
              <div className="p-5 sm:p-6 space-y-4 bg-slate-950/60">
                {/* Analysis Overview */}
                <div className="bg-indigo-950/50 border border-indigo-800/60 p-4 rounded-xl text-xs text-indigo-200 leading-relaxed">
                  <p className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Executive Reasoning Summary:
                  </p>
                  {searchResult.overallAnalysisSummary}
                </div>

                {/* Step-by-Step Thought Steps Grid */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                    Step-by-Step Scientific Thought Process:
                  </h4>

                  {searchResult.thoughtSteps.map((step) => {
                    const isExpanded = expandedThoughtStep === step.stepNumber;
                    return (
                      <div
                        key={step.stepNumber}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 space-y-2"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedThoughtStep(isExpanded ? null : step.stepNumber)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-xs font-bold flex items-center justify-center">
                              {step.stepNumber}
                            </span>
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${getCategoryBadgeStyle(step.category)}`}>
                              {getCategoryLabel(step.category)}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{step.title}</span>
                          </div>

                          <span className="text-xs text-slate-400 font-mono">
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed pl-8">
                          {step.detail}
                        </p>

                        {step.keyFactors && step.keyFactors.length > 0 && (
                          <div className="pl-8 flex flex-wrap gap-1.5 pt-1">
                            {step.keyFactors.map((factor, fIdx) => (
                              <span
                                key={fIdx}
                                className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono"
                              >
                                {factor}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Protocol Suggestions Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-indigo-600" />
                  <span>AI Recommended Protocol Suggestions</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select a reasoned suggestion below to pre-fill the SOP & Reaction Sheet generator instantly.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                {searchResult.suggestions.length} Tailored Suggestions
              </span>
            </div>

            {/* Suggestions Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {searchResult.suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Match Score & BSL */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {sug.matchScore}% Match
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {sug.biosafetyLevel}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{sug.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Category: {sug.category} | Host: {sug.targetHostOrOrganism}
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {sug.description}
                    </p>

                    {/* Scientific Rationale */}
                    <div className="text-[11px] bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-xl text-indigo-900 leading-normal">
                      <span className="font-bold block text-indigo-950 mb-0.5">Scientific Rationale:</span>
                      {sug.scientificRationale}
                    </div>

                    {/* Reagents & Duration */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Est. Duration: {sug.estimatedDuration}</span>
                      </div>

                      <div className="text-slate-500 font-mono text-[10px] truncate">
                        Key Reagents: {sug.keyReagents.slice(0, 3).join(', ')}...
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-3 border-t border-slate-100">
                    <button
                      onClick={() => onApplySuggestionToGenerator(sug)}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate SOP from Suggestion</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
