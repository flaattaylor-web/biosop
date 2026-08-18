import React, { useEffect, useMemo, useState } from 'react';
import { Search, Globe, ExternalLink, FileText, ShieldCheck, ShieldAlert, Loader2, Plus, Trash2, Sparkles, X, BookOpen, Filter } from 'lucide-react';
import type { KitIndexEntry, SopDocument } from '../types';
import { loadKitIndex, searchKits, facets } from '../client/kitSearch';
import { localStore } from '../client/localStore';
import { discoverKitsOnWeb, fetchReferenceDocument, generateSopStreaming, ApiError, GenerationProgress } from '../client/api';
import { sanitizeAndValidateSop } from '../utils/sheetUtils';
import { CompanyKitRepository } from './CompanyKitRepository';

interface Props {
  allProtocols?: SopDocument[];
  onAddProtocol?: (sop: SopDocument) => void;
  onSelectKitSop: (sop: SopDocument) => void;
  onOpenExcel: (sop: SopDocument) => void;
  onOpenCrossTest: (sop: SopDocument) => void;
}

const VerifiedBadge: React.FC<{ kit: KitIndexEntry }> = ({ kit }) => (
  <span
    title={kit.verificationNote || ''}
    className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${kit.verified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}
  >
    {kit.verified ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
    {kit.verified ? 'verified on vendor page' : 'unverified'}
  </span>
);

const KitCard: React.FC<{ kit: KitIndexEntry; onOpen: () => void; mine?: boolean; onRemove?: () => void }> = ({ kit, onOpen, mine, onRemove }) => (
  <div className="border border-slate-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow flex flex-col gap-1.5">
    <div className="flex items-start justify-between gap-2">
      <button type="button" onClick={onOpen} className="text-left min-w-0">
        <div className="text-[11px] font-mono text-slate-500">{kit.vendorShort} · {kit.catalogNumbers.slice(0, 3).join(', ')}{kit.catalogNumbers.length > 3 ? ` +${kit.catalogNumbers.length - 3}` : ''}</div>
        <div className="font-medium text-slate-900 leading-snug">{kit.productName}</div>
      </button>
      {mine && onRemove && <button type="button" onClick={onRemove} title="Remove from My kits" className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
    </div>
    <div className="text-xs text-slate-600 line-clamp-2">{kit.description}</div>
    <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{kit.category}</span>
      <VerifiedBadge kit={kit} />
      {kit.protocolUrl && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100 inline-flex items-center gap-1"><FileText className="w-3 h-3" /> protocol</span>}
    </div>
  </div>
);

export const KitRepository: React.FC<Props> = (props) => {
  const [view, setView] = useState<'catalog' | 'curated'>('catalog');
  const [index, setIndex] = useState<KitIndexEntry[]>([]);
  const [mine, setMine] = useState<KitIndexEntry[]>([]);
  const [q, setQ] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selected, setSelected] = useState<KitIndexEntry | null>(null);
  const [web, setWeb] = useState<{ busy: boolean; result?: Awaited<ReturnType<typeof discoverKitsOnWeb>>; error?: string }>({ busy: false });
  const [gen, setGen] = useState<{ busy: boolean; status: string; progress?: GenerationProgress; error?: string }>({ busy: false, status: '' });

  useEffect(() => { loadKitIndex().then(setIndex); localStore.listKits().then(setMine).catch(() => setMine([])); }, []);

  const all = useMemo(() => [...mine, ...index], [mine, index]);
  const results = useMemo(() => searchKits(all, q, { vendor: vendor || undefined, category: category || undefined, verifiedOnly, limit: 300 }), [all, q, vendor, category, verifiedOnly]);
  const f = useMemo(() => facets(all), [all]);

  const searchWeb = async () => {
    if (q.trim().length < 3) return;
    setWeb({ busy: true });
    try {
      const r = await discoverKitsOnWeb(q.trim(), vendor || undefined);
      setWeb({ busy: false, result: r });
    } catch (e) {
      setWeb({ busy: false, error: e instanceof Error ? e.message : 'Web search failed.' });
    }
  };

  const addToMine = async (kit: KitIndexEntry) => {
    await localStore.putKit(kit);
    setMine(await localStore.listKits());
  };
  const removeFromMine = async (id: string) => {
    await localStore.removeKit(id);
    setMine(await localStore.listKits());
    if (selected?.id === id) setSelected(null);
  };

  /** Generate an SOP grounded on the manufacturer's own protocol document. */
  const generateFromKit = async (kit: KitIndexEntry) => {
    setGen({ busy: true, status: 'Fetching the manufacturer protocol document…' });
    try {
      let referenceText = '';
      let referenceAttachment: { mimeType: string; data: string; name?: string } | undefined;
      const docUrl = kit.protocolUrl || kit.productUrl;
      try {
        const doc = await fetchReferenceDocument(docUrl);
        if (doc.mimeType === 'application/pdf' && doc.base64) referenceAttachment = { mimeType: 'application/pdf', data: doc.base64, name: docUrl };
        else referenceText = doc.text;
        setGen({ busy: true, status: `Got the vendor document (${(doc.bytes / 1024).toFixed(0)} KB). Generating SOP grounded on it…` });
      } catch (e) {
        setGen({ busy: true, status: `Could not fetch the vendor document (${e instanceof Error ? e.message : 'error'}); generating from product metadata only…` });
      }
      const payload = {
        topic: `${kit.vendor} ${kit.productName} (${kit.catalogNumbers.join(' / ')}) — manufacturer protocol`,
        category: kit.category,
        additionalRequirements:
          `This SOP is for the commercial product "${kit.productName}" from ${kit.vendor} (catalog ${kit.catalogNumbers.join(', ')}). ` +
          `Storage: ${kit.storage || 'per manufacturer'}. ${kit.kitSize ? `Kit size: ${kit.kitSize}. ` : ''}` +
          `Follow the manufacturer's protocol exactly; do not substitute reagents. Reference URL: ${docUrl}`,
        referenceText,
        referenceAttachment,
        generationMode: 'literature_benchmark',
        isDeNovo: false,
        kit: { vendor: kit.vendor, catalogNumber: kit.catalogNumbers.join(' / '), officialDocUrl: docUrl, storageConditions: kit.storage, kitIncludes: [] },
      };
      const sop = await generateSopStreaming(payload, (p) => setGen((g) => ({ ...g, progress: p, status: p.sectionsSeen.length ? `Receiving: ${p.sectionsSeen[p.sectionsSeen.length - 1]}` : 'Model is composing…' })));
      const full = sanitizeAndValidateSop({ ...sop, id: sop.id || `kit-${kit.id}-${Date.now()}` });
      props.onAddProtocol?.(full);
      setGen({ busy: false, status: '' });
      setSelected(null);
      props.onSelectKitSop(full);
    } catch (e) {
      setGen({ busy: false, status: '', error: e instanceof ApiError ? e.message : (e instanceof Error ? e.message : 'Generation failed.') });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5" /> Commercial kit repository</h2>
          <p className="text-sm text-slate-600">{index.length.toLocaleString()} products from {f.vendors.length} vendors — every entry traced to a fetched vendor page. {mine.length > 0 && <>Plus <strong>{mine.length}</strong> in <em>My kits</em> (this browser).</>}</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          <button type="button" onClick={() => setView('catalog')} className={`px-3 py-1.5 ${view === 'catalog' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Catalog</button>
          <button type="button" onClick={() => setView('curated')} className={`px-3 py-1.5 ${view === 'curated' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Curated SOPs</button>
        </div>
      </div>

      {view === 'curated' && <CompanyKitRepository {...props} />}

      {view === 'catalog' && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && results.length === 0) void searchWeb(); }} placeholder="Search by product, catalog number, vendor, application… (e.g. Q5, 74104, SYBR one-step, bisulfite)" className="w-full border border-slate-300 rounded pl-8 pr-2 py-1.5 text-sm" />
              </div>
              <select value={vendor} onChange={(e) => setVendor(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm"><option value="">All vendors</option>{f.vendors.map(([v, n]) => <option key={v} value={v}>{v} ({n})</option>)}</select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm"><option value="">All categories</option>{f.categories.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}</select>
              <label className="text-sm text-slate-700 flex items-center gap-1"><input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> verified only</label>
              <button type="button" onClick={searchWeb} disabled={web.busy || q.trim().length < 3} title="Search the web for products not in the catalog. Uses AI + Google Search; the vendor page is fetched and the catalog number checked against it." className="px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
                {web.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} Find on the web
              </button>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1"><Filter className="w-3 h-3" /> {results.length} result{results.length === 1 ? '' : 's'}{q ? ` for “${q}”` : ''}. Not here? <button type="button" onClick={searchWeb} disabled={q.trim().length < 3} className="underline disabled:no-underline disabled:opacity-50">Find on the web</button> — the vendor page is fetched and the catalog number verified before anything is added.</div>
          </div>

          {web.error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{web.error}</div>}
          {web.result && (
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-800 flex items-center gap-2"><Globe className="w-4 h-4" /> Web results for “{web.result.query}” <span className="text-xs text-slate-500 font-normal">— {web.result.note}</span></div>
                <button type="button" onClick={() => setWeb({ busy: false })} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>
              {web.result.entries.length === 0 && <div className="text-sm text-slate-600">No single-product vendor pages could be extracted. {web.result.candidates.length > 0 && <>Pages consulted: {web.result.candidates.map((c) => <a key={c.url} href={c.url} target="_blank" rel="noreferrer" className="underline mr-2">{c.vendorGuess || new URL(c.url).host}</a>)}</>}</div>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {web.result.entries.map((k) => (
                  <div key={k.id} className="relative">
                    <KitCard kit={k} onOpen={() => setSelected(k)} />
                    <button type="button" onClick={() => addToMine(k)} className="absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded bg-slate-900 text-white flex items-center gap-1 hover:bg-slate-700"><Plus className="w-3 h-3" /> My kits</button>
                  </div>
                ))}
              </div>
              {web.result.errors.length > 0 && <div className="text-[11px] text-slate-500">Could not read {web.result.errors.length} page(s): {web.result.errors.map((e) => new URL(e.url).host).join(', ')}.</div>}
              <p className="text-[11px] text-slate-500">Discovered kits are stored only in this browser under <em>My kits</em>. Unverified entries mean the catalog number was not found in the fetched page — check before relying on them.</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {results.map((k) => <KitCard key={`${k.source}-${k.id}`} kit={k} onOpen={() => setSelected(k)} mine={k.source === 'discovered'} onRemove={k.source === 'discovered' ? () => removeFromMine(k.id) : undefined} />)}
          </div>
          {results.length === 0 && index.length > 0 && <div className="text-sm text-slate-600 text-center py-8">Nothing in the catalog matches. Try fewer words, or <button type="button" onClick={searchWeb} className="underline">find it on the web</button>.</div>}
          {index.length === 0 && <div className="text-sm text-slate-600 text-center py-8">Loading catalog…</div>}
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 p-2" onClick={() => !gen.busy && setSelected(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-slate-500">{selected.vendor} · {selected.catalogNumbers.join(', ')}</div>
                <h3 className="text-lg font-semibold text-slate-900">{selected.productName}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1"><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100">{selected.category}</span>{selected.subcategory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100">{selected.subcategory}</span>}<VerifiedBadge kit={selected} /></div>
              </div>
              <button type="button" onClick={() => !gen.busy && setSelected(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-700">{selected.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {selected.storage && <><dt className="text-slate-500">Storage</dt><dd>{selected.storage}</dd></>}
              {selected.kitSize && <><dt className="text-slate-500">Size</dt><dd>{selected.kitSize}</dd></>}
              {selected.keyParameters && Object.entries(selected.keyParameters).filter(([, v]) => v).map(([k, v]) => <React.Fragment key={k}><dt className="text-slate-500 capitalize">{k}</dt><dd>{v}</dd></React.Fragment>)}
              {selected.applications && selected.applications.length > 0 && <><dt className="text-slate-500">Applications</dt><dd>{selected.applications.join(', ')}</dd></>}
              <dt className="text-slate-500">Source</dt><dd className="text-xs">{selected.verificationNote || '—'} <span className="text-slate-400">({selected.retrievedAt})</span></dd>
            </dl>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href={selected.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"><ExternalLink className="w-3.5 h-3.5" /> Product page</a>
              {selected.protocolUrl && <a href={selected.protocolUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"><FileText className="w-3.5 h-3.5" /> Manufacturer protocol</a>}
              {selected.source === 'index' && !mine.some((m) => m.id === selected.id) && <button type="button" onClick={() => addToMine(selected)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"><Plus className="w-3.5 h-3.5" /> Add to My kits</button>}
              <button type="button" disabled={gen.busy} onClick={() => generateFromKit(selected)} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50">
                {gen.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Generate SOP from manufacturer protocol
              </button>
            </div>
            {(gen.busy || gen.error) && (
              <div className={`text-xs rounded p-2 border ${gen.error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-cyan-50 border-cyan-200 text-cyan-800'}`}>
                {gen.error || gen.status}
                {gen.progress && <div className="h-1 bg-cyan-100 rounded mt-1 overflow-hidden"><div className="h-full bg-cyan-600" style={{ width: `${gen.progress.percent}%` }} /></div>}
              </div>
            )}
            <p className="text-[11px] text-slate-500">Generation sends the product metadata and the fetched manufacturer document to the AI model. The resulting SOP is stamped with the vendor, catalog number and document URL, and goes through the same consistency audit as everything else.</p>
          </div>
        </div>
      )}
    </div>
  );
};
