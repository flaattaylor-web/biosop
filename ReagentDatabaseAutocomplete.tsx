import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Snowflake,
  Thermometer,
  Sparkles,
  Layers,
  FlaskConical,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Package,
  BookOpen,
  Sliders,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { BiotechStockReagent, SelectedReagentConstraint } from '../types';
import { COMMON_BIOTECH_REAGENTS, COMMON_REAGENT_BUNDLES, ReagentBundlePreset } from '../data/commonReagents';

interface ReagentDatabaseAutocompleteProps {
  selectedReagents: SelectedReagentConstraint[];
  onChangeSelectedReagents: (reagents: SelectedReagentConstraint[]) => void;
  onApplyToAdditionalReqs?: (summaryText: string) => void;
  protocolTopic?: string;
}

const CATEGORIES = [
  'All Reagents',
  'Buffers & Salts',
  'Enzymes & Master Mixes',
  'Nucleotides & Cofactors',
  'Antibiotics & Selection',
  'Detergents & Additives',
  'Dyes, Stains & Ladders',
  'Transfection & Cell Culture'
] as const;

export const ReagentDatabaseAutocomplete: React.FC<ReagentDatabaseAutocompleteProps> = ({
  selectedReagents,
  onChangeSelectedReagents,
  onApplyToAdditionalReqs,
  protocolTopic
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Reagents');
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);
  const [showExplorerModal, setShowExplorerModal] = useState(false);
  const [showBundleDrawer, setShowBundleDrawer] = useState(false);
  const [activeReagentDetail, setActiveReagentDetail] = useState<BiotechStockReagent | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsOpenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered reagents for autocomplete search
  const filteredReagents = useMemo(() => {
    let list = COMMON_BIOTECH_REAGENTS;

    if (selectedCategory !== 'All Reagents') {
      list = list.filter((r) => r.category === selectedCategory);
    }

    if (!searchTerm.trim()) {
      return list.slice(0, 15);
    }

    const term = searchTerm.toLowerCase().trim();
    return list.filter((r) => {
      const matchName = r.name.toLowerCase().includes(term);
      const matchCategory = r.category.toLowerCase().includes(term);
      const matchCas = r.casNumber?.toLowerCase().includes(term);
      const matchSynonym = r.synonyms?.some((s) => s.toLowerCase().includes(term));
      const matchNotes = r.preparationNotes.toLowerCase().includes(term);
      return matchName || matchCategory || matchCas || matchSynonym || matchNotes;
    });
  }, [searchTerm, selectedCategory]);

  // Relevant suggested bundle based on topic keywords
  const relevantBundle = useMemo(() => {
    if (!protocolTopic) return null;
    const lower = protocolTopic.toLowerCase();
    return (
      COMMON_REAGENT_BUNDLES.find((bundle) =>
        bundle.targetProtocolKeywords.some((kw) => lower.includes(kw))
      ) || null
    );
  }, [protocolTopic]);

  const handleAddReagent = (reagent: BiotechStockReagent) => {
    // Check if already added
    if (selectedReagents.some((item) => item.reagentId === reagent.id)) {
      return;
    }

    const newConstraint: SelectedReagentConstraint = {
      reagentId: reagent.id,
      name: reagent.name,
      category: reagent.category,
      stockConc: reagent.standardStockConc,
      stockUnit: reagent.stockUnit,
      finalConc: reagent.recommendedFinalConc,
      finalUnit: reagent.finalUnit,
      storageCondition: reagent.storageCondition,
      storageTempBucket: reagent.storageTempBucket,
      preparationNotes: reagent.preparationNotes,
      notes: reagent.recommendedFinalDisplayString
    };

    onChangeSelectedReagents([...selectedReagents, newConstraint]);
    setSearchTerm('');
    setIsOpenDropdown(false);
  };

  const handleRemoveReagent = (reagentId: string) => {
    onChangeSelectedReagents(selectedReagents.filter((r) => r.reagentId !== reagentId));
  };

  const handleUpdateReagentField = (
    reagentId: string,
    field: 'stockConc' | 'stockUnit' | 'finalConc' | 'finalUnit' | 'notes',
    value: any
  ) => {
    onChangeSelectedReagents(
      selectedReagents.map((r) => {
        if (r.reagentId === reagentId) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleApplyBundle = (bundle: ReagentBundlePreset) => {
    const newItems: SelectedReagentConstraint[] = [];
    const currentIds = new Set(selectedReagents.map((r) => r.reagentId));

    bundle.reagentIds.forEach((id) => {
      if (!currentIds.has(id)) {
        const found = COMMON_BIOTECH_REAGENTS.find((r) => r.id === id);
        if (found) {
          newItems.push({
            reagentId: found.id,
            name: found.name,
            category: found.category,
            stockConc: found.standardStockConc,
            stockUnit: found.stockUnit,
            finalConc: found.recommendedFinalConc,
            finalUnit: found.finalUnit,
            storageCondition: found.storageCondition,
            storageTempBucket: found.storageTempBucket,
            preparationNotes: found.preparationNotes,
            notes: found.recommendedFinalDisplayString
          });
        }
      }
    });

    onChangeSelectedReagents([...selectedReagents, ...newItems]);
    setShowBundleDrawer(false);
  };

  const handleClearAll = () => {
    onChangeSelectedReagents([]);
  };

  // Keyboard navigation inside dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpenDropdown && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpenDropdown(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveHighlightIndex((prev) =>
        prev < filteredReagents.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredReagents.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredReagents[activeHighlightIndex]) {
        handleAddReagent(filteredReagents[activeHighlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpenDropdown(false);
    }
  };

  const getStorageBadge = (bucket: string, conditionText: string) => {
    switch (bucket) {
      case '-80°C':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-purple-100 text-purple-800 border border-purple-300">
            <Snowflake className="w-3 h-3 text-purple-600" />
            -80°C Ultra-Cold
          </span>
        );
      case '-20°C':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-100 text-blue-800 border border-blue-300">
            <Snowflake className="w-3 h-3 text-blue-600" />
            -20°C Freezer
          </span>
        );
      case '4°C':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-100 text-cyan-800 border border-cyan-300">
            <Thermometer className="w-3 h-3 text-cyan-600" />
            4°C Refrig
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-slate-100 text-slate-800 border border-slate-300">
            <Thermometer className="w-3 h-3 text-slate-600" />
            15–25°C Room Temp
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 bg-slate-900/90 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
      {/* Header & Feature Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Reagent Database Auto-Complete & Stock Solution Guide
              </h3>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-md font-mono font-bold">
                50+ Stock Solutions
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Instantly search common biotech stock reagents. Auto-suggests standard stock concentrations, recommended final working concentrations, and precise storage requirements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowBundleDrawer(!showBundleDrawer)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preset Cocktails ({COMMON_REAGENT_BUNDLES.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setShowExplorerModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Browse All Stocks</span>
          </button>
        </div>
      </div>

      {/* Suggested Bundle Alert if topic matches */}
      {relevantBundle && !selectedReagents.length && (
        <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 rounded-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="text-xs">
              <span className="text-indigo-300 font-bold">Detected Protocol Match: </span>
              <span className="text-white font-medium">{relevantBundle.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleApplyBundle(relevantBundle)}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Auto-Fill Reagent Set ({relevantBundle.reagentIds.length})
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setSelectedCategory(cat);
              setIsOpenDropdown(true);
            }}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors cursor-pointer border ${
              selectedCategory === cat
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Interactive Search Bar & Dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpenDropdown(true);
              setActiveHighlightIndex(0);
            }}
            onFocus={() => setIsOpenDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Type reagent name (e.g. Tris-HCl, Taq Polymerase, MgCl2, dNTPs, Ampicillin, DTT, PEI, Cas9)..."
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs pl-10 pr-24 py-2.5 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpenDropdown(!isOpenDropdown)}
              className="text-slate-400 hover:text-cyan-400 p-1 cursor-pointer"
            >
              {isOpenDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dropdown Results List */}
        {isOpenDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-800"
          >
            {filteredReagents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-mono">
                No matching biotech stock solutions found for "{searchTerm}".
              </div>
            ) : (
              filteredReagents.map((reagent, idx) => {
                const isSelected = selectedReagents.some((r) => r.reagentId === reagent.id);
                const isHighlighted = idx === activeHighlightIndex;

                return (
                  <div
                    key={reagent.id}
                    onMouseEnter={() => setActiveHighlightIndex(idx)}
                    onClick={() => handleAddReagent(reagent)}
                    className={`p-3 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isHighlighted ? 'bg-slate-800/90' : 'hover:bg-slate-900'
                    } ${isSelected ? 'opacity-60 bg-slate-900/50' : ''}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white font-sans">{reagent.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {reagent.category}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Added
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 font-mono">
                        <span>
                          Stock: <strong className="text-amber-400">{reagent.stockDisplayString}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Rec. Final: <strong className="text-emerald-400">{reagent.recommendedFinalDisplayString}</strong>
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-1">
                        {reagent.preparationNotes}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getStorageBadge(reagent.storageTempBucket, reagent.storageCondition)}
                      <button
                        type="button"
                        disabled={isSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddReagent(reagent);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isSelected ? 'In Protocol' : 'Add Stock'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Preset Cocktails Drawer */}
      {showBundleDrawer && (
        <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/40 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono">
                Standard Biotech Reagent Cocktails & Pre-Configured Bundles
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowBundleDrawer(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COMMON_REAGENT_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className="p-3 bg-slate-900 rounded-xl border border-slate-800 hover:border-indigo-500/60 transition-all flex flex-col justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{bundle.name}</span>
                    <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
                      {bundle.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {bundle.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {bundle.reagentIds.length} Reagents
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyBundle(bundle)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Load Bundle</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Reagents Table */}
      {selectedReagents.length > 0 ? (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                Configured Stock Reagents ({selectedReagents.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                (Sent as exact stoichiometry and storage rules to SOP Generator)
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 font-mono transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                <tr>
                  <th className="p-2.5 font-bold">Reagent Name</th>
                  <th className="p-2.5 font-bold">Stock Conc (C1)</th>
                  <th className="p-2.5 font-bold">Target Final Conc (C2)</th>
                  <th className="p-2.5 font-bold">Storage Spec</th>
                  <th className="p-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-[11px]">
                {selectedReagents.map((item) => (
                  <tr key={item.reagentId} className="hover:bg-slate-900/50">
                    <td className="p-2.5 font-sans">
                      <div className="font-bold text-white text-xs">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.category}</div>
                    </td>

                    {/* Stock Conc */}
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={item.stockConc}
                          onChange={(e) =>
                            handleUpdateReagentField(
                              item.reagentId,
                              'stockConc',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-400 font-bold text-xs focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          value={item.stockUnit}
                          onChange={(e) =>
                            handleUpdateReagentField(item.reagentId, 'stockUnit', e.target.value)
                          }
                          className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </td>

                    {/* Final Conc */}
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={item.finalConc}
                          onChange={(e) =>
                            handleUpdateReagentField(
                              item.reagentId,
                              'finalConc',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-bold text-xs focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          value={item.finalUnit}
                          onChange={(e) =>
                            handleUpdateReagentField(item.reagentId, 'finalUnit', e.target.value)
                          }
                          className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </td>

                    {/* Storage Condition */}
                    <td className="p-2.5">
                      <div className="space-y-1">
                        {getStorageBadge(item.storageTempBucket, item.storageCondition)}
                        <span className="block text-[10px] text-slate-400 line-clamp-1 max-w-xs font-sans">
                          {item.storageCondition}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveReagent(item.reagentId)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Remove reagent"
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
      ) : (
        <div className="p-3 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400 font-mono">
          No custom reagents selected. Use the search bar above or pick a pre-configured cocktail to specify exact stock solutions.
        </div>
      )}

      {/* Explorer Modal */}
      {showExplorerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Biotechnology Stock Solutions & Reagent Library
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Comprehensive recipes, stock concentrations, storage rules, and CAS reference numbers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExplorerModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COMMON_BIOTECH_REAGENTS.map((reagent) => {
                  const isAdded = selectedReagents.some((r) => r.reagentId === reagent.id);
                  return (
                    <div
                      key={reagent.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-white">{reagent.name}</h4>
                          {getStorageBadge(reagent.storageTempBucket, reagent.storageCondition)}
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                          <span className="text-amber-400 font-bold">Stock: {reagent.stockDisplayString}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-emerald-400 font-bold">Rec. Final: {reagent.recommendedFinalDisplayString}</span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          {reagent.preparationNotes}
                        </p>

                        <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-slate-800">
                          <div>Storage: {reagent.storageCondition}</div>
                          <div>Shelf Life: {reagent.shelfLife}</div>
                          {reagent.casNumber && <div>CAS: {reagent.casNumber}</div>}
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            handleAddReagent(reagent);
                          }}
                          disabled={isAdded}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                            isAdded
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isAdded ? 'Added' : 'Add to Protocol'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExplorerModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Close Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
