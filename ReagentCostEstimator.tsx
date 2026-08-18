import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  Calculator,
  PieChart,
  Download,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  TrendingDown,
  Layers,
  Package,
  Clock,
  FlaskConical,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { ReactionSheet, ReagentCostItem, ConsumableCostItem, SopCostEstimation } from '../types';
import {
  REAGENT_PRICING_CATALOG,
  DEFAULT_LAB_CONSUMABLES,
  matchReagentPriceFromCatalog,
  CURRENCY_SYMBOLS
} from '../data/reagentPricingCatalog';

interface ReagentCostEstimatorProps {
  reactionSheet: ReactionSheet;
  numReactions: number;
  sampleCount: number;
  replicates: number;
  posControls: number;
  negControls: number;
  overflowPercent: number;
  onUpdateCostEstimation?: (costEst: SopCostEstimation) => void;
  className?: string;
}

export const ReagentCostEstimator: React.FC<ReagentCostEstimatorProps> = ({
  reactionSheet,
  numReactions,
  sampleCount,
  replicates,
  posControls,
  negControls,
  overflowPercent,
  onUpdateCostEstimation,
  className = ''
}) => {
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD'>('USD');
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '$';

  const [copied, setCopied] = useState(false);
  const [showConsumables, setShowConsumables] = useState(true);
  const [showLabor, setShowLabor] = useState(false);
  const [laborHours, setLaborHours] = useState(1.5);
  const [laborRatePerHour, setLaborRatePerHour] = useState(45.0);

  // Initialize Reagent Costs from Reaction Sheet components or matched catalog
  const [reagentCosts, setReagentCosts] = useState<ReagentCostItem[]>(() => {
    return reactionSheet.components.map((comp, idx) => {
      const match = matchReagentPriceFromCatalog(comp.name);
      return {
        id: comp.id || `reagent_${idx}_${Date.now()}`,
        name: comp.name,
        category: match.category,
        volPerRxnMicroliters: comp.volPerRxnMicroliters || 1.0,
        unitPricePerPackage: match.packagePrice,
        packageVolumeOrQuantity: match.effectiveVolumeMicroliters,
        packageUnit: 'µL',
        costPerMicroliter: match.costPerMicroliter,
        supplier: match.supplier,
        catalogNumber: match.catalogNumber,
        isIncluded: true,
        notes: match.notes
      };
    });
  });

  // Consumables State
  const [consumableCosts, setConsumableCosts] = useState<ConsumableCostItem[]>(() => {
    return DEFAULT_LAB_CONSUMABLES.map((c, idx) => ({
      id: `consumable_${idx}`,
      name: c.name,
      category: c.category,
      unitCost: c.unitCost,
      quantityPerRun: c.defaultMultiplier(numReactions, sampleCount),
      unit: c.unit,
      supplier: c.supplier,
      catalogNumber: c.catalogNumber,
      isIncluded: true
    }));
  });

  // Sync reagent list if reactionSheet.components changes significantly
  useEffect(() => {
    setReagentCosts((prev) => {
      // Map existing items or generate new ones
      return reactionSheet.components.map((comp, idx) => {
        const existing = prev.find((p) => p.name.toLowerCase() === comp.name.toLowerCase() || p.id === comp.id);
        if (existing) {
          return {
            ...existing,
            volPerRxnMicroliters: comp.volPerRxnMicroliters
          };
        }
        const match = matchReagentPriceFromCatalog(comp.name);
        return {
          id: comp.id || `reagent_${idx}_${Date.now()}`,
          name: comp.name,
          category: match.category,
          volPerRxnMicroliters: comp.volPerRxnMicroliters || 1.0,
          unitPricePerPackage: match.packagePrice,
          packageVolumeOrQuantity: match.effectiveVolumeMicroliters,
          packageUnit: 'µL',
          costPerMicroliter: match.costPerMicroliter,
          supplier: match.supplier,
          catalogNumber: match.catalogNumber,
          isIncluded: true,
          notes: match.notes
        };
      });
    });
  }, [reactionSheet.components]);

  // Update consumable default quantities when reaction count changes
  useEffect(() => {
    setConsumableCosts((prev) =>
      prev.map((c) => {
        const def = DEFAULT_LAB_CONSUMABLES.find((d) => d.name === c.name);
        if (def) {
          return {
            ...c,
            quantityPerRun: def.defaultMultiplier(numReactions, sampleCount)
          };
        }
        return c;
      })
    );
  }, [numReactions, sampleCount]);

  const overflowMultiplier = 1 + overflowPercent / 100;

  // ----------------------------------------------------
  // CALCULATIONS
  // ----------------------------------------------------
  const calculations = useMemo(() => {
    let totalReagentsCostPerRxn = 0;
    let totalReagentsCostForRun = 0;
    let totalReagentVolPerRxn = 0;
    let totalReagentVolForRun = 0;

    const itemized = reagentCosts.map((item) => {
      const volPerRxn = item.volPerRxnMicroliters || 0;
      const volForRun = volPerRxn * numReactions * overflowMultiplier;
      const costPerUl = item.packageVolumeOrQuantity > 0
        ? item.unitPricePerPackage / item.packageVolumeOrQuantity
        : item.costPerMicroliter;

      const singleRxnCost = item.isIncluded ? volPerRxn * costPerUl : 0;
      const runCost = item.isIncluded ? volForRun * costPerUl : 0;

      if (item.isIncluded) {
        totalReagentsCostPerRxn += singleRxnCost;
        totalReagentsCostForRun += runCost;
        totalReagentVolPerRxn += volPerRxn;
        totalReagentVolForRun += volForRun;
      }

      return {
        ...item,
        costPerMicroliter: costPerUl,
        volForRun,
        singleRxnCost,
        runCost
      };
    });

    // Calculate percentage shares
    const itemizedWithShares = itemized.map((item) => ({
      ...item,
      sharePercent: totalReagentsCostForRun > 0 ? (item.runCost / totalReagentsCostForRun) * 100 : 0
    }));

    // Consumables calculation
    const totalConsumablesCost = showConsumables
      ? consumableCosts.reduce((acc, c) => acc + (c.isIncluded ? c.unitCost * c.quantityPerRun : 0), 0)
      : 0;

    // Labor calculation
    const totalLaborCost = showLabor ? laborHours * laborRatePerHour : 0;

    // Grand total per run
    const grandTotalRunCost = totalReagentsCostForRun + totalConsumablesCost + totalLaborCost;

    // Cost per sample (dividing run cost by actual test samples)
    const costPerTestedSample = sampleCount > 0 ? grandTotalRunCost / sampleCount : grandTotalRunCost;
    const reagentCostPerSample = sampleCount > 0 ? totalReagentsCostForRun / sampleCount : totalReagentsCostForRun;

    // Identify top cost driver
    const sortedByCost = [...itemizedWithShares].sort((a, b) => b.runCost - a.runCost);
    const topCostDriver = sortedByCost.length > 0 && sortedByCost[0].runCost > 0 ? sortedByCost[0] : null;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    itemized.forEach((it) => {
      if (it.isIncluded && it.runCost > 0) {
        const cat = it.category || 'Other Reagents';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + it.runCost;
      }
    });

    return {
      itemizedReagents: itemizedWithShares,
      totalReagentsCostPerRxn,
      totalReagentsCostForRun,
      totalReagentVolPerRxn,
      totalReagentVolForRun,
      totalConsumablesCost,
      totalLaborCost,
      grandTotalRunCost,
      costPerTestedSample,
      reagentCostPerSample,
      topCostDriver,
      categoryTotals
    };
  }, [
    reagentCosts,
    consumableCosts,
    showConsumables,
    showLabor,
    laborHours,
    laborRatePerHour,
    numReactions,
    sampleCount,
    overflowMultiplier
  ]);

  // Handler to update an individual reagent field
  const handleUpdateReagent = (id: string, field: keyof ReagentCostItem, value: any) => {
    setReagentCosts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'unitPricePerPackage' || field === 'packageVolumeOrQuantity') {
            const price = field === 'unitPricePerPackage' ? Number(value) : item.unitPricePerPackage;
            const vol = field === 'packageVolumeOrQuantity' ? Number(value) : item.packageVolumeOrQuantity;
            updated.costPerMicroliter = vol > 0 ? price / vol : 0;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Add custom reagent
  const handleAddCustomReagent = () => {
    const newItem: ReagentCostItem = {
      id: `custom_reagent_${Date.now()}`,
      name: 'Custom Buffer / Reagent',
      category: 'Buffers & Salts',
      volPerRxnMicroliters: 2.5,
      unitPricePerPackage: 45.0,
      packageVolumeOrQuantity: 10000,
      packageUnit: 'µL',
      costPerMicroliter: 45.0 / 10000,
      supplier: 'In-House / Lab Stock',
      catalogNumber: 'CUSTOM-01',
      isIncluded: true,
      notes: 'Custom laboratory solution'
    };
    setReagentCosts([...reagentCosts, newItem]);
  };

  // Delete reagent
  const handleDeleteReagent = (id: string) => {
    setReagentCosts(reagentCosts.filter((r) => r.id !== id));
  };

  // Reset to default biotech pricing catalog
  const handleResetCatalog = () => {
    const resetList = reactionSheet.components.map((comp, idx) => {
      const match = matchReagentPriceFromCatalog(comp.name);
      return {
        id: comp.id || `reagent_${idx}_${Date.now()}`,
        name: comp.name,
        category: match.category,
        volPerRxnMicroliters: comp.volPerRxnMicroliters || 1.0,
        unitPricePerPackage: match.packagePrice,
        packageVolumeOrQuantity: match.effectiveVolumeMicroliters,
        packageUnit: 'µL' as const,
        costPerMicroliter: match.costPerMicroliter,
        supplier: match.supplier,
        catalogNumber: match.catalogNumber,
        isIncluded: true,
        notes: match.notes
      };
    });
    setReagentCosts(resetList);
  };

  // Update consumable field
  const handleUpdateConsumable = (id: string, field: keyof ConsumableCostItem, value: any) => {
    setConsumableCosts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Export CSV Report
  const handleExportCsv = () => {
    const rows = [
      ['BioSOP GLP - Reagent Cost Estimation & Budget Report'],
      ['Protocol Title', `"${reactionSheet.title}"`],
      ['Assay Target', `"${reactionSheet.assayType}"`],
      ['Sample Count', sampleCount],
      ['Technical Replicates', replicates],
      ['Positive Controls', posControls],
      ['Negative Controls (NTC)', negControls],
      ['Total Reactions (N)', numReactions],
      ['Master Mix Overflow', `${overflowPercent}%`],
      ['Currency', currency],
      [''],
      ['ITEMIZED REAGENT COSTS:'],
      [
        'Reagent Name',
        'Category',
        'Vol / 1 Rxn (uL)',
        `Vol / ${numReactions} Rxns +${overflowPercent}% (uL)`,
        'Unit Package Price ($)',
        'Package Size (uL)',
        'Calculated Cost / uL ($)',
        'Single Rxn Cost ($)',
        'Total Run Cost ($)',
        '% of Budget',
        'Supplier',
        'Catalog #'
      ],
      ...calculations.itemizedReagents.map((r) => [
        `"${r.name}"`,
        `"${r.category || 'General'}"`,
        r.volPerRxnMicroliters,
        r.volForRun.toFixed(2),
        r.unitPricePerPackage.toFixed(2),
        r.packageVolumeOrQuantity,
        r.costPerMicroliter.toFixed(6),
        r.singleRxnCost.toFixed(4),
        r.runCost.toFixed(2),
        `${r.sharePercent.toFixed(1)}%`,
        `"${r.supplier || ''}"`,
        `"${r.catalogNumber || ''}"`
      ]),
      [''],
      ['REAGENTS SUB-TOTAL:', '', calculations.totalReagentVolPerRxn.toFixed(2), calculations.totalReagentVolForRun.toFixed(2), '', '', '', calculations.totalReagentsCostPerRxn.toFixed(4), calculations.totalReagentsCostForRun.toFixed(2), '100%'],
      [''],
      ...(showConsumables ? [
        ['CONSUMABLES & PLASTICWARE BUDGET:'],
        ['Item Name', 'Category', 'Unit Cost ($)', 'Quantity / Run', 'Unit', 'Total Cost ($)', 'Supplier', 'Catalog #'],
        ...consumableCosts.filter((c) => c.isIncluded).map((c) => [
          `"${c.name}"`,
          c.category,
          c.unitCost.toFixed(2),
          c.quantityPerRun,
          c.unit,
          (c.unitCost * c.quantityPerRun).toFixed(2),
          `"${c.supplier || ''}"`,
          `"${c.catalogNumber || ''}"`
        ]),
        ['CONSUMABLES SUB-TOTAL:', '', '', '', '', calculations.totalConsumablesCost.toFixed(2)],
        ['']
      ] : []),
      ...(showLabor ? [
        ['LABOR BUDGET:'],
        ['Labor Role', 'Hours', 'Rate / Hour ($)', 'Total Labor ($)'],
        ['Bench Scientist / Technician', laborHours, laborRatePerHour.toFixed(2), calculations.totalLaborCost.toFixed(2)],
        ['']
      ] : []),
      ['SUMMARY TOTALS:'],
      ['Cost per Single Reaction', `${currencySymbol}${calculations.totalReagentsCostPerRxn.toFixed(3)}`],
      ['Total Reagent Cost per Run', `${currencySymbol}${calculations.totalReagentsCostForRun.toFixed(2)}`],
      ['Grand Total Run Budget (Reagents + Consumables + Labor)', `${currencySymbol}${calculations.grandTotalRunCost.toFixed(2)}`],
      ['Cost per Biological Sample Tested', `${currencySymbol}${calculations.costPerTestedSample.toFixed(2)} / sample`]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(reactionSheet.title || 'Reagent_Cost_Estimate').replace(/[^a-zA-Z0-9_-]/g, '_')}_Cost_Budget.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `=== REAGENT COST ESTIMATION: ${reactionSheet.title} ===
• Total Reactions: ${numReactions} (${sampleCount} samples × ${replicates}x + ${posControls} pos + ${negControls} neg + ${overflowPercent}% overflow)
• Single Reaction Cost: ${currencySymbol}${calculations.totalReagentsCostPerRxn.toFixed(3)} / rxn
• Total Reagent Run Cost: ${currencySymbol}${calculations.totalReagentsCostForRun.toFixed(2)} / run
• Cost per Biological Sample: ${currencySymbol}${calculations.costPerTestedSample.toFixed(2)} / sample
${showConsumables ? `• Consumables & Plasticware: +${currencySymbol}${calculations.totalConsumablesCost.toFixed(2)}\n` : ''}${showLabor ? `• Bench Labor (${laborHours}h @ ${currencySymbol}${laborRatePerHour}/h): +${currencySymbol}${calculations.totalLaborCost.toFixed(2)}\n` : ''}• Grand Total Run Budget: ${currencySymbol}${calculations.grandTotalRunCost.toFixed(2)}
${calculations.topCostDriver ? `• Top Cost Driver: ${calculations.topCostDriver.name} (${currencySymbol}${calculations.topCostDriver.runCost.toFixed(2)}, ${calculations.topCostDriver.sharePercent.toFixed(1)}% of total reagent budget)` : ''}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header & Controls */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                  Reagent Cost Estimation & Run Budget Planner
                </h2>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                  GLP Stoichiometry-Linked
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Calculates live reagent expenditures based on reaction volumes, sample scaling ({sampleCount} samples × {replicates}x + {posControls} pos + {negControls} neg = {numReactions} rxns), and commercial biotech catalogs (NEB, Thermo Fisher, IDT, Qiagen, Sigma).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Currency Selector */}
            <div className="flex items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 mr-2 font-mono text-[11px]">Currency:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="bg-slate-900 text-cyan-300 font-mono font-bold text-xs rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Copy cost summary text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Cost Sheet (.CSV)</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          {/* Card 1: Cost Per Reaction */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold block">
              Cost Per Single Reaction
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-cyan-400">
                {currencySymbol}{calculations.totalReagentsCostPerRxn.toFixed(3)}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ rxn</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans pt-0.5">
              Reagents for 1 well ({calculations.totalReagentVolPerRxn.toFixed(1)} µL)
            </p>
          </div>

          {/* Card 2: Total Reagent Cost for Run */}
          <div className="bg-gradient-to-br from-emerald-950/70 to-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-1 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-300 font-bold block">
                Total Reagent Cost (Run)
              </span>
              <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                {numReactions} Rxns (+{overflowPercent}%)
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">
                {currencySymbol}{calculations.totalReagentsCostForRun.toFixed(2)}
              </span>
              <span className="text-xs text-slate-300 font-mono">/ run</span>
            </div>
            <p className="text-[10px] text-emerald-200/80 font-sans pt-0.5">
              Total volume: {(calculations.totalReagentVolForRun / 1000).toFixed(2)} mL ({calculations.totalReagentVolForRun.toFixed(0)} µL)
            </p>
          </div>

          {/* Card 3: Cost Per Tested Sample */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold block">
              Cost Per Biological Sample
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-amber-400">
                {currencySymbol}{calculations.costPerTestedSample.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ sample</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans pt-0.5">
              {sampleCount} biological samples (factors in {replicates}x reps & controls)
            </p>
          </div>

          {/* Card 4: Grand Total (Reagents + Consumables) */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-purple-300 font-bold block">
                Grand Run Budget
              </span>
              <span className="text-[10px] text-purple-300 font-mono">All inclusive</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold font-mono text-purple-400">
                {currencySymbol}{calculations.grandTotalRunCost.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans pt-0.5">
              {showConsumables ? `+${currencySymbol}${calculations.totalConsumablesCost.toFixed(2)} plasticware` : 'Reagents only'}
              {showLabor ? ` + ${currencySymbol}${calculations.totalLaborCost.toFixed(2)} labor` : ''}
            </p>
          </div>
        </div>

        {/* Top Cost Driver & Pareto Budget Alert */}
        {calculations.topCostDriver && (
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-amber-300 font-bold font-mono">Top Cost Driver: </span>
                <span className="text-white font-semibold">{calculations.topCostDriver.name}</span>
                <span className="text-slate-400 text-[11px] ml-1.5">
                  ({currencySymbol}{calculations.topCostDriver.runCost.toFixed(2)} = <strong className="text-amber-400">{calculations.topCostDriver.sharePercent.toFixed(1)}%</strong> of reagent budget)
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 shrink-0 font-mono">
              Unit Rate: <strong className="text-cyan-300">{currencySymbol}{calculations.topCostDriver.costPerMicroliter.toFixed(4)}/µL</strong>
            </div>
          </div>
        )}
      </div>

      {/* Scaled Multi-Batch Projections */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Batch Scale-Up & Multi-Run Projections
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Projected reagent expenditures at different throughput levels</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Single Run (1x)', runs: 1, discount: '0%', badge: 'Pilot' },
            { label: 'Weekly Cohort (5x)', runs: 5, discount: '5% Bulk', badge: 'Standard' },
            { label: 'Monthly Study (20x)', runs: 20, discount: '12% Bulk', badge: 'High-Throughput' },
            { label: 'Annual Campaign (100x)', runs: 100, discount: '20% Bulk', badge: 'Production' }
          ].map((tier, idx) => {
            const rawCost = calculations.totalReagentsCostForRun * tier.runs;
            const discountFactor = idx === 0 ? 1 : idx === 1 ? 0.95 : idx === 2 ? 0.88 : 0.80;
            const discountedCost = rawCost * discountFactor;
            const totalSamples = sampleCount * tier.runs;

            return (
              <div
                key={tier.label}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-cyan-400 transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 font-sans">{tier.label}</span>
                  <span className="text-[9px] font-mono font-bold bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">
                    {tier.badge}
                  </span>
                </div>
                <div className="text-base font-extrabold font-mono text-slate-900 pt-1">
                  {currencySymbol}{discountedCost.toFixed(0)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{totalSamples} Samples</span>
                  {idx > 0 && <span className="text-emerald-600 font-bold">{tier.discount}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Itemized Reagents Cost Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-cyan-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                Itemized Reagent Cost Breakdown ({calculations.itemizedReagents.length} Components)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Edit unit prices, standard package volumes, suppliers, or toggle items to simulate cost changes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResetCatalog}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
              title="Reset all prices to standard biotech market catalog"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset Catalog Prices</span>
            </button>

            <button
              onClick={handleAddCustomReagent}
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg border border-cyan-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Reagent</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 text-center w-10">Inc</th>
                <th className="p-3">Reagent Component</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Vol / 1 Rxn</th>
                <th className="p-3 text-right">Run Vol ({numReactions} rxns)</th>
                <th className="p-3 text-right">Pkg Price ({currencySymbol})</th>
                <th className="p-3 text-right">Pkg Size (µL)</th>
                <th className="p-3 text-right">Cost / µL</th>
                <th className="p-3 text-right bg-emerald-50/80 text-emerald-950 font-bold">
                  Run Cost ({currencySymbol})
                </th>
                <th className="p-3 w-28 text-center">% Share</th>
                <th className="p-3">Supplier & Catalog #</th>
                <th className="p-3 text-center w-10">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {calculations.itemizedReagents.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    !item.isIncluded ? 'opacity-40 bg-slate-100/50 line-through' : ''
                  }`}
                >
                  {/* Checkbox Include */}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={item.isIncluded}
                      onChange={(e) => handleUpdateReagent(item.id, 'isIncluded', e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>

                  {/* Name */}
                  <td className="p-3 font-sans font-bold text-slate-900 min-w-[160px]">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateReagent(item.id, 'name', e.target.value)}
                      className="w-full bg-transparent font-semibold border-b border-transparent hover:border-slate-300 focus:border-cyan-500 focus:outline-none"
                    />
                  </td>

                  {/* Category */}
                  <td className="p-3 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {item.category || 'Reagent'}
                    </span>
                  </td>

                  {/* Vol / 1 rxn */}
                  <td className="p-3 text-right font-bold text-slate-800">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.volPerRxnMicroliters}
                      onChange={(e) =>
                        handleUpdateReagent(item.id, 'volPerRxnMicroliters', parseFloat(e.target.value) || 0)
                      }
                      className="w-16 p-1 border border-slate-200 rounded text-right font-bold text-cyan-900 bg-white"
                    />
                    <span className="text-[10px] text-slate-400 ml-1">µL</span>
                  </td>

                  {/* Run Vol */}
                  <td className="p-3 text-right text-slate-700 font-semibold">
                    {item.volForRun.toFixed(2)} µL
                  </td>

                  {/* Package Price */}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-slate-400">{currencySymbol}</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.unitPricePerPackage}
                        onChange={(e) =>
                          handleUpdateReagent(item.id, 'unitPricePerPackage', parseFloat(e.target.value) || 0)
                        }
                        className="w-16 p-1 border border-slate-200 rounded text-right font-mono bg-white"
                      />
                    </div>
                  </td>

                  {/* Package Size */}
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={item.packageVolumeOrQuantity}
                      onChange={(e) =>
                        handleUpdateReagent(item.id, 'packageVolumeOrQuantity', parseFloat(e.target.value) || 1)
                      }
                      className="w-16 p-1 border border-slate-200 rounded text-right font-mono bg-white"
                    />
                  </td>

                  {/* Cost per uL */}
                  <td className="p-3 text-right text-slate-500 font-mono text-[10px]">
                    {currencySymbol}{item.costPerMicroliter < 0.0001 ? item.costPerMicroliter.toExponential(2) : item.costPerMicroliter.toFixed(4)}
                  </td>

                  {/* Run Cost */}
                  <td className="p-3 text-right font-extrabold text-emerald-800 bg-emerald-50/60 font-mono">
                    {currencySymbol}{item.runCost.toFixed(2)}
                  </td>

                  {/* Share % Progress */}
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{item.sharePercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, item.sharePercent)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Supplier & Cat # */}
                  <td className="p-3 font-sans text-slate-600">
                    <input
                      type="text"
                      value={item.supplier ? `${item.supplier} (${item.catalogNumber || ''})` : ''}
                      onChange={(e) => handleUpdateReagent(item.id, 'supplier', e.target.value)}
                      placeholder="e.g. NEB M0492L"
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 focus:outline-none text-[10px]"
                    />
                  </td>

                  {/* Delete */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteReagent(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Remove component from cost estimate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Total Row */}
            <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs">
              <tr>
                <td colSpan={3} className="p-3.5 uppercase tracking-wider text-right text-slate-300">
                  Total Reagents Master Mix:
                </td>
                <td className="p-3.5 text-right text-cyan-300">
                  {calculations.totalReagentVolPerRxn.toFixed(2)} µL
                </td>
                <td className="p-3.5 text-right text-slate-200">
                  {calculations.totalReagentVolForRun.toFixed(1)} µL ({(calculations.totalReagentVolForRun / 1000).toFixed(2)} mL)
                </td>
                <td colSpan={3} className="p-3.5 text-right text-slate-400 font-sans text-[11px]">
                  Per Reaction Cost: <strong className="text-cyan-300 font-mono">{currencySymbol}{calculations.totalReagentsCostPerRxn.toFixed(3)}</strong>
                </td>
                <td className="p-3.5 text-right text-emerald-400 text-sm bg-slate-950 font-extrabold">
                  {currencySymbol}{calculations.totalReagentsCostForRun.toFixed(2)}
                </td>
                <td colSpan={3} className="p-3.5 text-[11px] text-slate-400 font-sans">
                  Ready for budget approval
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Consumables & Labware Section (Optional Add-on) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
              Consumables, Lab Plasticware & Filtration Budget (Optional)
            </h3>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={showConsumables}
              onChange={(e) => setShowConsumables(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-cyan-500"
            />
            <span>Include Plasticware in Grand Budget (+{currencySymbol}{calculations.totalConsumablesCost.toFixed(2)})</span>
          </label>
        </div>

        {showConsumables && (
          <div className="p-4 overflow-x-auto space-y-3">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-10">Inc</th>
                  <th className="p-2.5">Labware Item</th>
                  <th className="p-2.5 text-right">Unit Cost ({currencySymbol})</th>
                  <th className="p-2.5 text-right">Qty / Run</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5 text-right font-bold text-slate-900">Total Run Cost ({currencySymbol})</th>
                  <th className="p-2.5">Supplier & Catalog #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {consumableCosts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={c.isIncluded}
                        onChange={(e) => handleUpdateConsumable(c.id, 'isIncluded', e.target.checked)}
                        className="rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-2.5 font-sans font-medium text-slate-900">{c.name}</td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={c.unitCost}
                        onChange={(e) =>
                          handleUpdateConsumable(c.id, 'unitCost', parseFloat(e.target.value) || 0)
                        }
                        className="w-16 p-1 border border-slate-200 rounded text-right font-mono bg-white"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={c.quantityPerRun}
                        onChange={(e) =>
                          handleUpdateConsumable(c.id, 'quantityPerRun', parseInt(e.target.value) || 0)
                        }
                        className="w-16 p-1 border border-slate-200 rounded text-right font-mono bg-white"
                      />
                    </td>
                    <td className="p-2.5 text-slate-500 font-sans">{c.unit}</td>
                    <td className="p-2.5 text-right font-bold font-mono text-purple-700">
                      {currencySymbol}{(c.isIncluded ? c.unitCost * c.quantityPerRun : 0).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-slate-500 font-sans text-[10px]">
                      {c.supplier} ({c.catalogNumber || ''})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Labor & Bench Time (Optional Toggle) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
              Hands-On Bench Labor & Operator Time (Optional)
            </h3>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={showLabor}
              onChange={(e) => setShowLabor(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-cyan-500"
            />
            <span>Include Labor in Grand Budget (+{currencySymbol}{calculations.totalLaborCost.toFixed(2)})</span>
          </label>
        </div>

        {showLabor && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Estimated Bench Hands-On Time (Hours)</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={laborHours}
                onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-slate-50 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Scientist Hourly Rate ({currencySymbol}/hr)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={laborRatePerHour}
                onChange={(e) => setLaborRatePerHour(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold bg-slate-50 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Calculated Labor Total</span>
              <span className="text-base font-extrabold font-mono text-slate-900">
                {currencySymbol}{calculations.totalLaborCost.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cost Optimization & Recommendations Card */}
      <div className="p-4 bg-gradient-to-r from-cyan-950 to-slate-900 text-white rounded-2xl border border-cyan-500/30 space-y-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
            Biotech Cost Optimization & Miniaturization Insights
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Reaction Miniaturization:</span>
              <span className="text-[11px] text-slate-300">
                Reducing total reaction volume by 20% lowers total enzyme expenditure from {currencySymbol}{calculations.totalReagentsCostForRun.toFixed(2)} to {currencySymbol}{(calculations.totalReagentsCostForRun * 0.8).toFixed(2)} (saving {currencySymbol}{(calculations.totalReagentsCostForRun * 0.2).toFixed(2)} per run).
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Bulk Packaging & Aliquoting:</span>
              <span className="text-[11px] text-slate-300">
                Purchasing 5x enzyme or master mix multi-packs typically provides an 18–25% vendor discount, dropping cost per sample to ~{currencySymbol}{(calculations.costPerTestedSample * 0.8).toFixed(2)}.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
