import React, { useMemo, useState } from 'react';
import { BookOpen, FileSpreadsheet, FileText, ShieldCheck, Search, X } from 'lucide-react';
import { SopDocument, ProtocolSuggestion } from '../types';
import { AiProtocolSearch } from './AiProtocolSearch';

interface ProtocolLibraryProps {
  protocols: SopDocument[];
  onSelectProtocol: (protocol: SopDocument) => void;
  onOpenExcel: (protocol: SopDocument) => void;
  onOpenCrossTest: (protocol: SopDocument) => void;
  onApplySuggestionToGenerator?: (suggestion: ProtocolSuggestion) => void;
}

type Source = 'all' | 'reference' | 'kit' | 'mine';

const SOURCE_LABELS: Record<Source, string> = {
  all: 'All',
  reference: 'Reference methods',
  kit: 'Kit SOPs',
  mine: 'Yours',
};

/**
 * Where a document came from. The library mixes three populations that a reader should not have to
 * tell apart by squinting at the author line: vendor kit SOPs, reference methods transcribed from
 * published practice, and whatever the user generated or edited themselves.
 */
function sourceOf(sop: SopDocument): Exclude<Source, 'all'> {
  if (sop.companyKitInfo) return 'kit';
  if (sop.author && sop.author.startsWith('Reference method')) return 'reference';
  return 'mine';
}

/**
 * The card used to print "Literature Verified" on every document unconditionally, including ones
 * whose citations had never been checked and ones with no citations at all. That is the same class
 * of unearned assurance the audit rewrite removed from the score, so it is reported honestly here:
 * a reference counts as verified only once /api/literature/verify has said so.
 */
function citationState(sop: SopDocument): { label: string; tone: string } {
  const refs = sop.references || [];
  if (!refs.length) return { label: 'No references', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
  const verified = refs.filter((r) => r.verificationStatus === 'VERIFIED').length;
  const retracted = refs.filter((r) => r.verificationStatus === 'RETRACTED').length;
  if (retracted) return { label: `${retracted} retracted`, tone: 'bg-red-100 text-red-900 border-red-300 font-bold' };
  const bad = refs.filter((r) => r.verificationStatus === 'MISMATCH' || r.verificationStatus === 'NOT_FOUND').length;
  if (bad) return { label: `${bad} reference${bad > 1 ? 's' : ''} failed check`, tone: 'bg-red-50 text-red-800 border-red-200' };
  if (verified === refs.length) return { label: `${refs.length} verified`, tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (verified) return { label: `${verified}/${refs.length} verified`, tone: 'bg-amber-50 text-amber-800 border-amber-200' };
  return { label: `${refs.length} reference${refs.length > 1 ? 's' : ''}, unchecked`, tone: 'bg-slate-100 text-slate-600 border-slate-200' };
}

function haystack(sop: SopDocument): string {
  return [
    sop.title,
    sop.category,
    sop.documentId,
    sop.scope,
    sop.biosafetyLevel,
    sop.companyKitInfo?.vendor,
    sop.companyKitInfo?.catalogNumber,
    ...(sop.reagentsRequired || []),
    ...(sop.equipmentRequired || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export const ProtocolLibrary: React.FC<ProtocolLibraryProps> = ({
  protocols,
  onSelectProtocol,
  onOpenExcel,
  onOpenCrossTest,
  onApplySuggestionToGenerator,
}) => {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<Source>('all');
  const [discipline, setDiscipline] = useState<string>('all');
  const [showAllChips, setShowAllChips] = useState(false);

  const sourceCounts = useMemo(() => {
    const c: Record<string, number> = { all: protocols.length, reference: 0, kit: 0, mine: 0 };
    protocols.forEach((p) => { c[sourceOf(p)] += 1; });
    return c;
  }, [protocols]);

  // Disciplines are derived from the documents rather than hardcoded, so a new category in the
  // library, or one on a user's own document, appears here without a code change.
  const disciplines = useMemo(() => {
    const pool = source === 'all' ? protocols : protocols.filter((p) => sourceOf(p) === source);
    const counts = new Map<string, number>();
    pool.forEach((p) => counts.set(p.category, (counts.get(p.category) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [protocols, source]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    return protocols.filter((p) => {
      if (source !== 'all' && sourceOf(p) !== source) return false;
      if (discipline !== 'all' && p.category !== discipline) return false;
      if (!terms.length) return true;
      const h = haystack(p);
      return terms.every((t) => h.includes(t));
    });
  }, [protocols, query, source, discipline]);

  // Grouped so 180+ documents read as a set of disciplines rather than one undifferentiated scroll.
  const grouped = useMemo(() => {
    const m = new Map<string, SopDocument[]>();
    results.forEach((p) => {
      const list = m.get(p.category);
      if (list) list.push(p); else m.set(p.category, [p]);
    });
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [results]);

  // Kit SOPs carry vendor-oriented categories of their own, so "All" spans far more than the
  // reference library's disciplines and the tail is mostly one- and two-document buckets. Show the
  // dense ones and put the rest behind a toggle rather than opening with a wall of chips.
  const CHIP_LIMIT = 12;
  const visibleChips = showAllChips
    ? disciplines
    : (() => {
        const head = disciplines.slice(0, CHIP_LIMIT);
        // A chip selected from the tail must not vanish when the list collapses.
        if (discipline !== 'all' && !head.some(([n]) => n === discipline)) {
          const sel = disciplines.find(([n]) => n === discipline);
          if (sel) return [...head, sel];
        }
        return head;
      })();
  const hiddenChipCount = disciplines.length - visibleChips.length;

  const filtersActive = query.trim() !== '' || source !== 'all' || discipline !== 'all';
  const clearAll = () => { setQuery(''); setSource('all'); setDiscipline('all'); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            Protocol Library
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">
          {protocols.length} protocols across {disciplines.length} disciplines
        </h1>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
          Vendor kit SOPs, reference methods transcribed from published standard practice, and your own
          documents. Reference methods carry primary citations; every document, whatever its origin, must be
          reviewed and adapted to your own cells, agents and institutional rules before use.
        </p>
      </div>

      {/* AI Protocol Search & Reasoning Section */}
      {onApplySuggestionToGenerator && (
        <AiProtocolSearch onApplySuggestionToGenerator={onApplySuggestionToGenerator} />
      )}

      {/* Search and filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, discipline, document ID, scope, reagents, equipment, vendor, catalog number"
            aria-label="Search protocols"
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Source */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSource(s); setDiscipline('all'); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                source === s
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {SOURCE_LABELS[s]}
              <span className={`ml-1.5 font-mono ${source === s ? 'text-slate-300' : 'text-slate-400'}`}>
                {sourceCounts[s] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Discipline */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => setDiscipline('all')}
            className={`mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              discipline === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            All disciplines
          </button>
          {visibleChips.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setDiscipline(name === discipline ? 'all' : name)}
              className={`mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                discipline === name
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {name}
              <span className={`ml-1.5 font-mono ${discipline === name ? 'text-indigo-200' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          ))}
          {hiddenChipCount > 0 && (
            <button
              onClick={() => setShowAllChips(true)}
              className="mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-dashed border-slate-400 text-slate-600 hover:border-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              +{hiddenChipCount} more
            </button>
          )}
          {showAllChips && disciplines.length > CHIP_LIMIT && (
            <button
              onClick={() => setShowAllChips(false)}
              className="mt-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-dashed border-slate-400 text-slate-600 hover:border-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Show fewer
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-600 font-medium">
            {results.length === protocols.length
              ? `Showing all ${protocols.length}`
              : `${results.length} of ${protocols.length} protocols`}
          </p>
          {filtersActive && (
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {results.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-2xl">
          <p className="text-sm font-semibold text-slate-700">Nothing matches those filters.</p>
          <p className="text-xs text-slate-500 mt-1">
            Try a shorter search, or use the AI protocol search above to generate what is missing.
          </p>
          <button
            onClick={clearAll}
            className="mt-4 text-xs font-semibold bg-slate-900 text-white px-3.5 py-2 rounded-xl cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {grouped.map(([category, docs]) => (
        <section key={category} className="space-y-4">
          <div className="flex items-baseline gap-3 border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-900">{category}</h2>
            <span className="text-xs font-mono text-slate-500">{docs.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {docs.map((sop) => {
              const cite = citationState(sop);
              const src = sourceOf(sop);
              return (
                <div
                  key={sop.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-700 px-2.5 py-0.5 bg-cyan-50 rounded border border-cyan-200">
                        {sop.documentId}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {sop.biosafetyLevel}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{sop.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {SOURCE_LABELS[src]}
                        {sop.companyKitInfo?.vendor ? ` · ${sop.companyKitInfo.vendor}` : ''} · Version {sop.version}
                      </p>
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {sop.scope}
                    </p>

                    {/* Highlights */}
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                        {sop.steps.length} Steps
                      </span>
                      {sop.reactionSheet && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-mono font-semibold border border-emerald-200">
                          {sop.reactionSheet.components.length} Reaction Components
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded font-mono border ${cite.tone}`}>
                        {cite.label}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectProtocol(sop)}
                      className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View SOP Document</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {sop.reactionSheet && (
                        <button
                          onClick={() => onOpenExcel(sop)}
                          className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200 cursor-pointer"
                          title="Open Excel Master Mix Calculator"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onOpenCrossTest(sop)}
                        className="p-2 text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200 cursor-pointer"
                        title="Run Literature Cross-Test Audit"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
