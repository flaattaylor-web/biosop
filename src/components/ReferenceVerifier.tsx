import React, { useState } from 'react';
import { BookCheck, Loader2, ExternalLink, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import type { SopDocument } from '../types';
import { verifyReferences, VerificationStatus } from '../client/api';

const STATUS: Record<VerificationStatus | 'NONE', { label: string; cls: string; Icon: React.ElementType }> = {
  VERIFIED: { label: 'Verified in registry', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', Icon: CheckCircle2 },
  MISMATCH: { label: 'Citation does not match the registry record', cls: 'bg-red-50 text-red-800 border-red-200', Icon: XCircle },
  NOT_FOUND: { label: 'Not found — may not exist', cls: 'bg-red-50 text-red-800 border-red-200', Icon: XCircle },
  RETRACTED: { label: 'RETRACTED — paper withdrawn', cls: 'bg-red-100 text-red-900 border-red-300 font-bold', Icon: XCircle },
  UNCHECKED: { label: 'Registry unreachable — unverified', cls: 'bg-slate-50 text-slate-700 border-slate-200', Icon: HelpCircle },
  NONE: { label: 'Not yet verified', cls: 'bg-amber-50 text-amber-800 border-amber-200', Icon: AlertTriangle },
};

/**
 * Model-recalled citations are hypotheses until a registry confirms them.
 * This panel checks every reference against Crossref/PubMed and writes the
 * status back onto the SOP so the audit and the Word export can show it.
 */
export const ReferenceVerifier: React.FC<{ sop: SopDocument; onSopUpdated?: (s: SopDocument) => void }> = ({ sop, onSopUpdated }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const refs = sop.references || [];

  const run = async () => {
    setBusy(true); setErr(null);
    try {
      const results = await verifyReferences(refs.map((r) => ({ citation: r.citation, doiOrUrl: r.doiOrUrl })));
      const updated: SopDocument = {
        ...sop,
        references: refs.map((r, i) => ({
          ...r,
          verificationStatus: results[i]?.verification.status,
          verificationNote: results[i]?.verification.note,
          resolvedTitle: results[i]?.verification.resolved?.title,
          canonicalCitation: results[i]?.verification.canonical,
          doiOrUrl: r.doiOrUrl || (results[i]?.verification.resolved?.doi ? `https://doi.org/${results[i].verification.resolved!.doi}` : r.doiOrUrl),
        })),
      };
      onSopUpdated?.(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const counts: Record<string, number> = {};
  for (const r of refs) { const k = r.verificationStatus || 'NONE'; counts[k] = (counts[k] || 0) + 1; }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2"><BookCheck className="w-5 h-5 text-slate-700" /><h3 className="font-semibold text-slate-800">Reference verification</h3></div>
        <button type="button" onClick={run} disabled={busy || refs.length === 0} className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Verify against Crossref / PubMed
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Citations produced by the model are unverified until checked here. A DOI that resolves to a <em>different</em> paper is flagged separately — that pattern is a common hallucination signature.
      </p>
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
      {refs.length > 0 && (
        <div className="text-xs text-slate-600 flex flex-wrap gap-2">
          {Object.entries(counts).map(([k, n]) => { const st = STATUS[k as keyof typeof STATUS]; return <span key={k} className={`px-2 py-0.5 rounded border ${st.cls}`}>{n} {st.label.toLowerCase()}</span>; })}
        </div>
      )}
      <ul className="space-y-2">
        {refs.map((r, i) => {
          const st = STATUS[(r.verificationStatus || 'NONE') as keyof typeof STATUS];
          const Icon = st.Icon;
          return (
            <li key={i} className={`border rounded p-2 text-sm ${st.cls}`}>
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-800">{r.citation}</div>
                  {r.canonicalCitation && r.verificationStatus === 'MISMATCH' && (
                    <div className="mt-1.5 text-[11px] text-slate-700 bg-white/70 border border-slate-200 rounded-md p-2">
                      <span className="font-semibold">Registry record — use this instead: </span>
                      {r.canonicalCitation}
                    </div>
                  )}
                  <div className="text-xs mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{st.label}</span>
                    {r.verificationNote && <span className="text-slate-600">— {r.verificationNote}</span>}
                    {r.doiOrUrl && r.verificationStatus === 'VERIFIED' && (
                      <a href={r.doiOrUrl.startsWith('http') ? r.doiOrUrl : `https://doi.org/${r.doiOrUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink className="w-3 h-3" /> open</a>
                    )}
                    {r.doiOrUrl && r.verificationStatus !== 'VERIFIED' && <span className="font-mono text-slate-500">{r.doiOrUrl}</span>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
