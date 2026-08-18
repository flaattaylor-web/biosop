import { generateSopBlocking } from '../client/api';
import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Tag,
  Thermometer,
  Sparkles,
  Building2,
  Loader2,
  PlusCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { COMPANY_KIT_SOPS } from '../data/companyKits';
import { SopDocument } from '../types';
import { sanitizeAndValidateSop } from '../utils/sheetUtils';

interface CompanyKitRepositoryProps {
  allProtocols?: SopDocument[];
  onAddProtocol?: (sop: SopDocument) => void;
  onSelectKitSop: (sop: SopDocument) => void;
  onOpenExcel: (sop: SopDocument) => void;
  onOpenCrossTest: (sop: SopDocument) => void;
}

const VENDORS = [
  'All Vendors',
  'NEB',
  'Illumina',
  '10x Genomics',
  'Thermo Fisher',
  'QIAGEN',
  'Takara',
  'Zymo Research',
  'Agilent',
  'Bio-Rad',
  'PacBio',
  'Oxford Nanopore',
  'Promega',
  'Twist Bioscience',
  'Beckman Coulter',
  'KAPA Biosystems',
  'Lucigen'
];

const CATEGORIES = [
  'All Categories',
  'Spatial Transcriptomics & In Situ Sequencing',
  'Single-Cell Multiomics & Epigenetics',
  'NGS & Single Cell Sequencing',
  'NGS Library Preparation & Sequencing',
  'Droplet Digital PCR (ddPCR) & Diagnostics',
  'CRISPR & Genome Editing',
  'RNA & Epigenomics Purification',
  'Protein & Western Blot Analysis',
  'Cell Viability & Reporter Assays',
  'Reverse Transcription & qPCR',
  'High-Fidelity PCR & Cloning',
  'Seamless DNA Assembly & Cloning',
  'DNA Cleanup & Gel Extraction',
  'Plasmid Isolation & Purification',
  'End-Point PCR & Screening'
];

const POPULAR_KIT_PULLS = [
  { vendor: '10x Genomics', name: 'Visium Spatial Gene Expression', cat: '1000184' },
  { vendor: '10x Genomics', name: 'Chromium Single Cell 3\' v3.1', cat: '1000268' },
  { vendor: '10x Genomics', name: 'Single Cell Multiome ATAC + GEX', cat: '1000283' },
  { vendor: 'Illumina', name: 'NovaSeq X Series Flow Cell Reagents', cat: '20085595' },
  { vendor: 'NEB', name: 'NEBNext Ultra II DNA Library Prep', cat: 'E7645' },
  { vendor: 'NEB', name: 'NEBNext Ultra II FS DNA (Enzymatic)', cat: 'E7805' },
  { vendor: 'Bio-Rad', name: 'ddPCR EvaGreen Supermix', cat: '1864034' },
  { vendor: 'Bio-Rad', name: 'Trans-Blot Turbo RTA Western Blot', cat: '1704272' },
  { vendor: 'Thermo Fisher', name: 'PureLink HiPure Plasmid Maxiprep', cat: 'K210016' },
  { vendor: 'Thermo Fisher', name: 'TaqPath COVID-19/Multiplex RT-PCR', cat: 'A48003' },
  { vendor: 'Thermo Fisher', name: 'TOPO TA Cloning for Sequencing', cat: 'K457502' },
  { vendor: 'QIAGEN', name: 'DNeasy Blood & Tissue Kit', cat: '69504' },
  { vendor: 'QIAGEN', name: 'QIAquick Gel Extraction Kit', cat: '28704' },
  { vendor: 'QIAGEN', name: 'QIAGEN RNeasy Mini Kit', cat: '74104' },
  { vendor: 'Zymo Research', name: 'Zymo-Seq RiboFree Total RNA', cat: 'R3000' },
  { vendor: 'Zymo Research', name: 'EZ DNA Methylation-Gold Kit', cat: 'D5005' },
  { vendor: 'Twist Bioscience', name: 'Twist Human Core Exome Enrichment', cat: '102026' },
  { vendor: 'Promega', name: 'Dual-Luciferase Reporter (DLR) Assay', cat: 'E1910' },
  { vendor: 'Promega', name: 'CellTiter-Glo 2.0 Viability Assay', cat: 'G9241' },
  { vendor: 'Agilent', name: '2100 Bioanalyzer HS DNA Kit', cat: '5067-4626' },
  { vendor: 'Agilent', name: 'TapeStation HS D1000 ScreenTape', cat: '5067-5584' },
  { vendor: 'NEB', name: 'EnGen Cas9 NLS RNP Cleavage', cat: 'M0646' },
  { vendor: 'Lucigen', name: 'MasterPure Complete DNA/RNA Kit', cat: 'MC85200' },
  { vendor: 'Beckman Coulter', name: 'AMPure XP Purification Beads', cat: 'A63881' }
];

export const CompanyKitRepository: React.FC<CompanyKitRepositoryProps> = ({
  allProtocols = [],
  onAddProtocol,
  onSelectKitSop,
  onOpenExcel,
  onOpenCrossTest
}) => {
  const [selectedVendor, setSelectedVendor] = useState('All Vendors');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Pull / Synthesis State
  const [customKitInput, setCustomKitInput] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthStatusMsg, setSynthStatusMsg] = useState<string | null>(null);
  const [synthError, setSynthError] = useState<string | null>(null);

  // Combine pre-built kits with any dynamic protocols that have companyKitInfo
  const kitList = useMemo(() => {
    const combinedMap = new Map<string, SopDocument>();

    // Add static company kits
    COMPANY_KIT_SOPS.forEach((kit) => combinedMap.set(kit.id, kit));

    // Add user protocols that match company kit criteria or have companyKitInfo
    allProtocols.forEach((p) => {
      if (p.companyKitInfo || p.documentId.toLowerCase().includes('sop-neb') || p.id.startsWith('neb-')) {
        combinedMap.set(p.id, p);
      }
    });

    return Array.from(combinedMap.values());
  }, [allProtocols]);

  const filteredKits = useMemo(() => {
    return kitList.filter((kit) => {
      const matchVendor =
        selectedVendor === 'All Vendors' ||
        kit.companyKitInfo?.vendor === selectedVendor ||
        (selectedVendor === 'NEB' && kit.title.toLowerCase().includes('neb'));

      const matchCategory = selectedCategory === 'All Categories' || kit.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        kit.title.toLowerCase().includes(q) ||
        kit.documentId.toLowerCase().includes(q) ||
        (kit.companyKitInfo?.catalogNumber && kit.companyKitInfo.catalogNumber.toLowerCase().includes(q)) ||
        (kit.companyKitInfo?.vendor && kit.companyKitInfo.vendor.toLowerCase().includes(q)) ||
        kit.scope.toLowerCase().includes(q);

      return matchVendor && matchCategory && matchSearch;
    });
  }, [kitList, selectedVendor, selectedCategory, searchQuery]);

  const handlePullCommercialKit = async (kitNameOrCat: string) => {
    const query = kitNameOrCat.trim();
    if (!query) return;

    setIsSynthesizing(true);
    setSynthStatusMsg(`Retrieving manufacturer specifications & building SOP for "${query}"...`);
    setSynthError(null);

    try {
      const prompt = `Generate a publication-grade Standard Operating Procedure (SOP) and companion Reaction Master Mix Sheet for the commercial biotech kit or polymerase: "${query}". Include vendor, catalog number, storage conditions, step-by-step instructions with exact timings and temperatures, hazards/PPE, quality control, troubleshooting, and a complete reaction sheet with all required buffer components and thermocycler profile.`;

      // Previously POSTed to /api/generate, which does not exist (fell through to the SPA and crashed on .json()).
      const generated = await generateSopBlocking({
        topic: `${query} — manufacturer kit protocol`,
        category: 'Commercial Kit',
        additionalRequirements: prompt,
        generationMode: 'literature_benchmark',
        isDeNovo: false,
      });
      const data = { sop: generated };

      const sanitized = sanitizeAndValidateSop(data.sop);

      // Ensure companyKitInfo is present if missing
      if (!sanitized.companyKitInfo) {
        const qUpper = query.toUpperCase();
        const vendor = qUpper.includes('NEB')
          ? 'NEB'
          : qUpper.includes('ILLUMINA')
          ? 'Illumina'
          : qUpper.includes('THERMO')
          ? 'Thermo Fisher'
          : qUpper.includes('QIAGEN')
          ? 'QIAGEN'
          : qUpper.includes('TAKARA')
          ? 'Takara'
          : qUpper.includes('KAPA')
          ? 'KAPA Biosystems'
          : qUpper.includes('PACBIO')
          ? 'PacBio'
          : qUpper.includes('ONT') || qUpper.includes('NANOPORE')
          ? 'Oxford Nanopore'
          : 'Other';

        sanitized.companyKitInfo = {
          vendor,
          catalogNumber: query.match(/[A-Z0-9]{4,10}/i)?.[0] || 'CAT-GENERIC',
          storageConditions: '-20°C',
          kitIncludes: ['Reaction Buffer', 'Master Mix', 'Nuclease-Free Water']
        };
      }

      if (onAddProtocol) {
        onAddProtocol(sanitized);
      }

      setSynthStatusMsg(`Successfully pulled & created SOP for "${sanitized.title}" (Cat #${sanitized.companyKitInfo?.catalogNumber})!`);
      setCustomKitInput('');
      onSelectKitSop(sanitized);
    } catch (err: any) {
      console.error('Kit synthesis error:', err);
      setSynthError(err.message || 'Error pulling commercial kit SOP from manufacturer specs.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const getVendorBadgeStyle = (vendor?: string) => {
    switch (vendor) {
      case 'NEB':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Illumina':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case '10x Genomics':
        return 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200';
      case 'Thermo Fisher':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'QIAGEN':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Takara':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Zymo Research':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Agilent':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Bio-Rad':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Promega':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'Beckman Coulter':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'KAPA Biosystems':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'PacBio':
        return 'bg-violet-50 text-violet-800 border-violet-200';
      case 'Oxford Nanopore':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
              Commercial Kit & Polymerase Repository
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Validated SOPs & Master Mix Reaction Sheets for Commercial Biotech Kits
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Pre-configured Standard Operating Procedures and interactive Excel Master Mix Calculators modeled directly after manufacturer protocols from <strong>NEB, Thermo Fisher, QIAGEN, Takara, Promega, and KAPA Biosystems</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Major Manufacturers Indexed
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              <Tag className="w-3.5 h-3.5 text-amber-400" /> Catalog Numbers & Manuals Linked
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Interactive Master Mix Sheets
            </span>
          </div>
        </div>
      </div>

      {/* AI Commercial Kit Lookup & Pull Widget */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-indigo-800/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Pull Any Commercial Kit or Catalog # SOP</h2>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-2.5 py-1 rounded-lg">
            On-Demand Manufacturer Synthesis
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Need an SOP for a specific NEB product or kit not listed below? Type the product name or catalog number (e.g. <code>NEB M0530</code>, <code>NEB E7645</code>, <code>QIAGEN 69504</code>, <code>Thermo K1641</code>) to generate its complete SOP and reaction sheet instantly.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full">
            <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={customKitInput}
              onChange={(e) => setCustomKitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePullCommercialKit(customKitInput);
              }}
              placeholder="Enter Kit Name or Catalog # (e.g. NEB M0530, Phusion, QIAGEN 69504)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl focus:bg-slate-900 focus:border-cyan-400 text-white placeholder-slate-400 transition-all"
            />
          </div>

          <button
            onClick={() => handlePullCommercialKit(customKitInput)}
            disabled={isSynthesizing || !customKitInput.trim()}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Pulling Kit...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Pull Commercial SOP</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Pull Suggestions */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Popular Manufacturer Kits Ready to Pull:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {POPULAR_KIT_PULLS.map((item) => (
              <button
                key={item.cat}
                onClick={() => handlePullCommercialKit(`${item.vendor} ${item.name} Cat #${item.cat}`)}
                disabled={isSynthesizing}
                className="text-[11px] bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="text-cyan-400 font-bold">{item.vendor}</span>
                <span>{item.name}</span>
                <span className="text-amber-400 font-mono text-[10px]">#{item.cat}</span>
              </button>
            ))}
          </div>
        </div>

        {synthStatusMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{synthStatusMsg}</span>
          </div>
        )}

        {synthError && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{synthError}</span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by kit name, catalog # (e.g. M0492, E2621, 74104), or enzyme..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-6">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 text-slate-800 transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendor Chips */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Filter by Manufacturer / Brand:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {VENDORS.map((vendor) => {
              const isSelected = selectedVendor === vendor;
              return (
                <button
                  key={vendor}
                  onClick={() => setSelectedVendor(vendor)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {vendor}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kit Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1">
          <span>Showing {filteredKits.length} Commercial Kit SOPs</span>
          {selectedVendor !== 'All Vendors' && (
            <span className="text-indigo-600 font-semibold">Vendor Filter: {selectedVendor}</span>
          )}
        </div>

        {filteredKits.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No matching company kits found</h3>
            <p className="text-xs text-slate-500">Try searching for the catalog number or click "Pull Commercial SOP" above.</p>
            <button
              onClick={() => {
                setSelectedVendor('All Vendors');
                setSelectedCategory('All Categories');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 font-semibold underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredKits.map((sop) => {
              const kitInfo = sop.companyKitInfo;
              const vendorName = kitInfo?.vendor || (sop.title.toLowerCase().includes('neb') ? 'NEB' : 'Commercial');

              return (
                <div
                  key={sop.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Vendor & Catalog Number */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border font-mono ${getVendorBadgeStyle(vendorName)}`}>
                          {vendorName}
                        </span>
                        {kitInfo?.catalogNumber && (
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Cat #{kitInfo.catalogNumber}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {sop.biosafetyLevel || 'BSL-1'}
                      </span>
                    </div>

                    {/* Title & Category */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{sop.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Category: {sop.category} | Version: {sop.version}
                      </p>
                    </div>

                    {/* Scope Summary */}
                    <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {sop.scope}
                    </p>

                    {/* Kit Details Box */}
                    {kitInfo && (
                      <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl space-y-1.5 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                          <Thermometer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Storage: {kitInfo.storageConditions}</span>
                        </div>

                        {kitInfo.kitIncludes && kitInfo.kitIncludes.length > 0 && (
                          <div className="text-[11px] text-slate-600">
                            <span className="font-medium text-slate-800">Kit Includes: </span>
                            {kitInfo.kitIncludes.join(' • ')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reaction Component Highlights */}
                    {sop.reactionSheet && (
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-mono font-semibold border border-emerald-200 flex items-center gap-1">
                          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                          {sop.reactionSheet.components.length} Master Mix Components
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                          {sop.steps.length} Protocol Steps
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectKitSop(sop)}
                      className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Kit SOP</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {sop.reactionSheet && (
                        <button
                          onClick={() => onOpenExcel(sop)}
                          className="flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-colors border border-emerald-200 cursor-pointer font-semibold"
                          title="Open Master Mix Reaction Calculator"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Master Mix</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenCrossTest(sop)}
                        className="p-2 text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200 cursor-pointer"
                        title="Audit against literature standards"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>

                      {kitInfo?.officialDocUrl && (
                        <a
                          href={kitInfo.officialDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                          title="View Official Manufacturer Web Manual"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
