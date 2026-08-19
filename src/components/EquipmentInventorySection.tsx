import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Check
} from 'lucide-react';
import {
  SopDocument,
  EquipmentInventoryCheck,
  EquipmentMatchItem,
  LabEquipmentItem,
  EquipmentSubstitution
} from '../types';
import { DEFAULT_LAB_EQUIPMENT_INVENTORY } from '../data/labEquipmentInventory';
import { checkEquipmentInventory, applyEquipmentSubstitution } from '../utils/equipmentCheck';

interface EquipmentInventorySectionProps {
  sop: SopDocument;
  onUpdateSop?: (updatedSop: SopDocument) => void;
}

export const EquipmentInventorySection: React.FC<EquipmentInventorySectionProps> = ({
  sop,
  onUpdateSop
}) => {
  const [inventory, setInventory] = useState<LabEquipmentItem[]>(DEFAULT_LAB_EQUIPMENT_INVENTORY);
  const [showManager, setShowManager] = useState(false);
  const [expandedMatchIndex, setExpandedMatchIndex] = useState<number | null>(null);
  const [appliedSubstitutions, setAppliedSubstitutions] = useState<string[]>([]);

  // Calculate or retrieve current equipment check
  const equipCheck: EquipmentInventoryCheck =
    sop.equipmentInventoryCheck || checkEquipmentInventory(sop.equipmentRequired || [], inventory);

  const handleToggleStatus = (id: string, newStatus: LabEquipmentItem['status']) => {
    const updatedInventory = inventory.map((item) =>
      item.id === id ? { ...item, status: newStatus } : item
    );
    setInventory(updatedInventory);

    // Re-check SOP against updated lab inventory
    if (onUpdateSop) {
      const newCheck = checkEquipmentInventory(sop.equipmentRequired || [], updatedInventory);
      onUpdateSop({
        ...sop,
        equipmentInventoryCheck: newCheck
      });
    }
  };

  const handleApplySubstitution = (originalReq: string, sub: EquipmentSubstitution) => {
    if (!onUpdateSop) return;
    const updated = applyEquipmentSubstitution(sop, originalReq, sub);
    setAppliedSubstitutions((prev) => [...prev, originalReq]);
    onUpdateSop(updated);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (score >= 75) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  };

  const getImpactBadge = (impact: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (impact) {
      case 'LOW':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">Low Workflow Impact</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700 font-mono">Medium Parameter Adjustment</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-700 font-mono">High Protocol Shift</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-0">
      {/* SECTION HEADER BAR */}
      <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Lab Hardware Inventory & Substitution Check</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getScoreBadgeColor(equipCheck.overallCompatibilityScore)}`}>
                {equipCheck.overallCompatibilityScore}% Hardware Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Verifying required protocol hardware against facility inventory & suggesting instrument workarounds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManager(!showManager)}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showManager ? 'Hide Lab Inventory' : 'Manage Lab Hardware'}</span>
          </button>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-400">Inventory Status:</span>
          <span className="text-emerald-400 font-bold">{equipCheck.availableCount} Available</span>
          <span className="text-slate-600">|</span>
          <span className={equipCheck.missingCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
            {equipCheck.missingCount} Missing / Maintenance
          </span>
        </div>
        <p className="text-slate-400 text-[11px] italic">{equipCheck.substitutionSummary}</p>
      </div>

      {/* LAB HARDWARE MANAGER DRAWER (IF OPEN) */}
      {showManager && (
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <span>Facility Lab Hardware Inventory ({inventory.length} Instruments)</span>
            </h4>
            <span className="text-[10px] text-slate-400">Toggle status to test protocol compatibility dynamically</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <p className="font-bold text-white text-[11px] leading-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.manufacturer} • {item.location}</p>
                  </div>
                  <select
                    value={item.status}
                    onChange={(e) => handleToggleStatus(item.id, e.target.value as LabEquipmentItem['status'])}
                    className={`text-[10px] font-mono font-bold rounded px-1.5 py-0.5 border focus:outline-none cursor-pointer ${
                      item.status === 'AVAILABLE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : item.status === 'MAINTENANCE'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-rose-950 text-rose-300 border-rose-700'
                    }`}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="IN_USE">IN USE</option>
                    <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 truncate">{item.specifications}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REQUIRED INSTRUMENTS & SUBSTITUTIONS TABLE */}
      <div className="p-4 space-y-3">
        <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider flex items-center justify-between">
          <span>Protocol Required Instruments ({equipCheck.totalRequired})</span>
          <span className="text-[10px] text-slate-500 font-normal">
            Click any missing instrument to view suggested hardware substitutions
          </span>
        </h4>

        <div className="space-y-2">
          {equipCheck.equipmentMatches.map((match, idx) => {
            const isExpanded = expandedMatchIndex === idx;
            const sub = match.suggestedSubstitution;
            const wasApplied = appliedSubstitutions.includes(match.requiredEquipment);

            return (
              <div
                key={idx}
                className={`border rounded-xl transition-all overflow-hidden ${
                  match.isAvailable
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-amber-950/20 border-amber-800/60'
                }`}
              >
                {/* ITEM HEADER BAR */}
                <div
                  onClick={() => !match.isAvailable && setExpandedMatchIndex(isExpanded ? null : idx)}
                  className={`p-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer ${
                    !match.isAvailable ? 'hover:bg-amber-950/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {match.isAvailable ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    )}
                    <div>
                      <p className="font-bold text-xs text-white flex items-center gap-2">
                        <span>{match.requiredEquipment}</span>
                        {wasApplied && (
                          <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Substitution Applied
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {match.isAvailable ? (
                          <span className="text-emerald-400 font-medium">
                            Matched to: {match.matchedInventoryName}
                          </span>
                        ) : (
                          <span className="text-amber-300 font-medium">
                            {sub
                              ? `Hardware Missing / Maintenance — Substitution Available (${sub.compatibilityScore}% match)`
                              : 'Hardware Missing / Maintenance — no catalogued substitute; this instrument is required'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    {match.isAvailable ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        AVAILABLE IN LAB
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          SUBSTITUTION NEEDED
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* SUBSTITUTION DETAILS ACCORDION */}
                {(!match.isAvailable || isExpanded) && sub && (
                  <div className="p-3.5 bg-slate-950 border-t border-amber-800/40 space-y-3 text-xs text-slate-300">
                    <div className="flex flex-wrap items-start justify-between gap-3 bg-amber-950/40 p-3 rounded-lg border border-amber-800/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-amber-200 text-xs uppercase tracking-wider">
                            Suggested Hardware Substitution:
                          </span>
                          {getImpactBadge(sub.impactLevel)}
                        </div>
                        <p className="font-bold text-white text-sm pl-6 flex items-center gap-1.5">
                          <span>{match.requiredEquipment}</span>
                          <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-cyan-300">{sub.alternativeEquipment}</span>
                        </p>
                      </div>

                      {onUpdateSop && !wasApplied && (
                        <button
                          type="button"
                          onClick={() => handleApplySubstitution(match.requiredEquipment, sub)}
                          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-md shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Apply Substitution to SOP</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      {/* Adjustment notes */}
                      <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                        <p className="font-bold text-amber-400 uppercase font-mono text-[10px]">
                          Operational Adjustment Notes
                        </p>
                        <p className="text-slate-300 leading-relaxed">{sub.adjustmentNotes}</p>
                      </div>

                      {/* Parameter adjustments */}
                      {sub.parameterAdjustments && sub.parameterAdjustments.length > 0 && (
                        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                          <p className="font-bold text-cyan-400 uppercase font-mono text-[10px]">
                            Required Parameter Modifications
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                            {sub.parameterAdjustments.map((p, pIdx) => (
                              <li key={pIdx}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
