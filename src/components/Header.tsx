import React from 'react';
import { Dna, FileSpreadsheet, FileText, FlaskConical, ShieldCheck, BookOpen, Download, Package } from 'lucide-react';
import { SopDocument } from '../types';

interface HeaderProps {
  activeTab: 'generator' | 'viewer' | 'excel' | 'crosstest' | 'library' | 'companyKits';
  setActiveTab: (tab: 'generator' | 'viewer' | 'excel' | 'crosstest' | 'library' | 'companyKits') => void;
  currentSop: SopDocument | null;
  onSelectSample: (id: string) => void;
  samples: SopDocument[];
  onExportExcel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentSop,
  onSelectSample,
  samples,
  onExportExcel
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('generator')}>
            <div className="p-2 bg-cyan-600 rounded-lg text-white shadow-md shadow-cyan-900/40">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">BioSOP</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-500/30">
                  v3.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Biotech SOP & Excel Reaction Sheet Generator
              </p>
            </div>
          </div>

          {/* Active protocol selector.
              Previously a 200px control holding option labels of 70+ characters — every entry read
              as "SOP-NEB-M04...". Now grouped by category, titled rather than prefixed with the
              document ID, and wide enough to read. */}
          <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 min-w-0">
            <FlaskConical className="w-4 h-4 text-cyan-400 shrink-0" />
            <label htmlFor="active-protocol" className="text-xs text-slate-300 font-medium whitespace-nowrap">
              Active protocol
            </label>
            <select
              id="active-protocol"
              value={currentSop?.id || ''}
              onChange={(e) => onSelectSample(e.target.value)}
              title={currentSop ? `${currentSop.documentId}: ${currentSop.title}` : undefined}
              className="bg-slate-900 text-sm text-cyan-200 font-medium px-2.5 py-1.5 rounded-md border border-slate-700 focus:outline-none focus:border-cyan-500 w-[clamp(18rem,32vw,34rem)] cursor-pointer"
            >
              {Object.entries(
                samples.reduce<Record<string, typeof samples>>((groups, sample) => {
                  const key = sample.category || 'Other protocols';
                  (groups[key] = groups[key] || []).push(sample);
                  return groups;
                }, {})
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, entries]) => (
                  <optgroup key={category} label={category}>
                    {entries.map((sample) => (
                      <option key={sample.id} value={sample.id} title={`${sample.documentId}: ${sample.title}`}>
                        {sample.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </div>

          {/* Actions */}
          {currentSop && (
            <button
              onClick={onExportExcel}
              className="hidden lg:flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
              title="Download formatted Microsoft Excel (.xlsx) sheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export .XLSX Sheet</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'generator'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>1. Create SOP & Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('viewer')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'viewer'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. SOP Document View</span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'excel'
                ? 'border-emerald-400 text-emerald-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>3. Excel Reaction Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('crosstest')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'crosstest'
                ? 'border-amber-400 text-amber-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>4. Literature Cross-Tester</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'library'
                ? 'border-indigo-400 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Protocol Library</span>
          </button>

          <button
            onClick={() => setActiveTab('companyKits')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'companyKits'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">Company Kit Repository</span>
          </button>
        </div>
      </div>
    </header>
  );
};
