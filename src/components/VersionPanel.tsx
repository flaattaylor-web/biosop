import React, { useEffect, useState } from 'react';
import { History, PenLine, Save, CheckCircle2, AlertTriangle, Loader2, GitCompare } from 'lucide-react';
import type { SopDocument } from '../types';
import { protocolStorage } from '../client/storage';

type Version = Awaited<ReturnType<typeof protocolStorage.listVersions>>[number];
type Sig = Awaited<ReturnType<typeof protocolStorage.signatures>>[number];

export const VersionPanel: React.FC<{ sop: SopDocument; onSaved?: (versionId: string, version: string) => void }> = ({ sop, onSaved }) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [sigs, setSigs] = useState<Sig[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [changeSummary, setChangeSummary] = useState('');
  const [signer, setSigner] = useState({ role: 'REVIEWED' as 'PREPARED' | 'REVIEWED' | 'APPROVED', name: '', id: '', meaning: 'I have reviewed this procedure and confirm it is technically accurate.' });
  const [diff, setDiff] = useState<{ path: string; before: unknown; after: unknown }[] | null>(null);

  const refresh = async () => {
    try {
      const vs = await protocolStorage.listVersions(sop.id);
      setVersions(vs);
      const cur = vs[0]?.versionId ?? null;
      setCurrentVersionId(cur);
      setSigs(cur ? await protocolStorage.signatures(cur) : []);
    } catch {
      setVersions([]); setSigs([]); setCurrentVersionId(null);
    }
  };
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sop.id]);

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key); setMsg(null);
    try { setMsg({ kind: 'ok', text: await fn() }); await refresh(); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed.' }); }
    finally { setBusy(null); }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2"><History className="w-5 h-5 text-slate-700" /><h3 className="font-semibold text-slate-800">Versions, signatures & audit trail</h3><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">{protocolStorage.mode() === 'browser' ? 'stored in this browser' : 'shared server storage'}</span></div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-600 mb-1">Change summary</label>
          <input value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="What changed and why" className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
        </div>
        <button type="button" disabled={busy !== null} onClick={() => run('save', async () => {
          const r = await protocolStorage.save(sop, changeSummary || undefined);
          onSaved?.(r.versionId, r.version);
          return r.created ? `Saved as version ${r.version}.` : 'No changes since the last saved version — nothing new was created.';
        })} className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1">
          {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save version
        </button>
      </div>

      {msg && <div className={`text-sm rounded p-2 border ${msg.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{msg.text}</div>}

      {versions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">History</div>
          <ul className="text-sm divide-y divide-slate-100 border border-slate-100 rounded">
            {versions.map((v, i) => (
              <li key={v.versionId} className="flex items-center justify-between px-3 py-1.5">
                <span><span className="font-mono">v{v.version}</span> <span className="text-slate-500">— {v.changeSummary || 'no summary'}</span></span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  {new Date(v.createdAt).toLocaleString()}
                  {i > 0 && (
                    <button type="button" title="Diff against current" onClick={() => run('diff', async () => { setDiff(await protocolStorage.diffVersions(v.versionId, versions[0].versionId)); return `Showing changes from v${v.version} to v${versions[0].version}.`; })} className="text-slate-400 hover:text-slate-700"><GitCompare className="w-3.5 h-3.5" /></button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {diff && (
            <div className="mt-2 max-h-56 overflow-auto border border-slate-100 rounded text-xs font-mono">
              {diff.length === 0 && <div className="p-2 text-slate-500">No differences.</div>}
              {diff.map((d, i) => (
                <div key={i} className="px-2 py-1 border-b border-slate-50 last:border-0">
                  <div className="text-slate-500">{d.path}</div>
                  <div className="text-red-700 line-through break-all">{JSON.stringify(d.before)}</div>
                  <div className="text-emerald-700 break-all">{JSON.stringify(d.after)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentVersionId && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">Signatures on current version</div>
          {sigs.length === 0 && <div className="text-xs text-slate-500 mb-2">None yet.</div>}
          <ul className="text-sm space-y-1 mb-2">
            {sigs.map((s) => (
              <li key={s.role} className="flex items-center gap-2">
                {s.stillValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span className="font-mono text-xs">{s.role}</span> <span>{s.signerName}</span>
                <span className="text-xs text-slate-500">— {s.meaning} · {new Date(s.signedAt).toLocaleString()}</span>
                {!s.stillValid && <span className="text-xs text-red-700 font-semibold">content changed after signing</span>}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <select value={signer.role} onChange={(e) => setSigner({ ...signer, role: e.target.value as typeof signer.role })} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
              <option value="PREPARED">Prepared by</option><option value="REVIEWED">Reviewed by</option><option value="APPROVED">Approved by</option>
            </select>
            <input value={signer.name} onChange={(e) => setSigner({ ...signer, name: e.target.value })} placeholder="Full name" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
            <input value={signer.id} onChange={(e) => setSigner({ ...signer, id: e.target.value })} placeholder="Email / employee ID" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
            <button type="button" disabled={busy !== null || !signer.name.trim()} onClick={() => run('sign', async () => {
              await protocolStorage.sign(currentVersionId, { role: signer.role, signerName: signer.name, signerIdentifier: signer.id || undefined, meaning: signer.meaning });
              return `${signer.role} signature recorded.`;
            })} className="px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-1">
              <PenLine className="w-3.5 h-3.5" /> Sign
            </button>
          </div>
          <input value={signer.meaning} onChange={(e) => setSigner({ ...signer, meaning: e.target.value })} className="mt-2 w-full border border-slate-300 rounded px-2 py-1.5 text-xs" title="Meaning of signature (required)" />
          <p className="text-[11px] text-slate-500 mt-1">A signature binds to a hash of the document content. Editing the document afterwards invalidates it and this is shown, not hidden.</p>
        </div>
      )}
    </div>
  );
};
