import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Download, Upload, Trash2, Lock, Server, HardDrive, Loader2, Info } from 'lucide-react';
import { localStore, encryptVault, decryptVault, VaultFile, EncryptedVaultFile } from '../client/localStore';
import { getStorageMode, setStorageMode, StorageMode } from '../client/storage';
import { downloadBlob } from '../client/api';

/**
 * Shows the user exactly where their data is and what leaves the browser,
 * and gives them backup / restore / wipe controls.
 */
export const DataPrivacyPanel: React.FC<{ onStorageModeChange?: (m: StorageMode) => void }> = ({ onStorageModeChange }) => {
  const [mode, setMode] = useState<StorageMode>(getStorageMode());
  const [stats, setStats] = useState<{ protocols: number; versions: number; signatures: number; audit: number; approxBytes: number } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => localStore.stats().then(setStats).catch(() => setStats(null));
  useEffect(() => { void refresh(); }, []);

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key); setMsg(null);
    try { setMsg({ kind: 'ok', text: await fn() }); await refresh(); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed.' }); }
    finally { setBusy(null); }
  };

  const changeMode = (m: StorageMode) => { setStorageMode(m); setMode(m); onStorageModeChange?.(m); };

  const exportVault = () => run('export', async () => {
    const vault = await localStore.exportVault();
    const stamp = new Date().toISOString().slice(0, 10);
    if (passphrase.trim()) {
      const enc = await encryptVault(vault, passphrase);
      downloadBlob(new Blob([JSON.stringify(enc)], { type: 'application/json' }), `biosop-vault-${stamp}.encrypted.json`);
      return `Encrypted backup downloaded (${vault.protocols.length} protocols, ${vault.versions.length} versions). Keep the passphrase — it cannot be recovered.`;
    }
    downloadBlob(new Blob([JSON.stringify(vault)], { type: 'application/json' }), `biosop-vault-${stamp}.json`);
    return `Backup downloaded (${vault.protocols.length} protocols, ${vault.versions.length} versions). It is NOT encrypted — add a passphrase above to encrypt.`;
  });

  const importVault = (file: File) => run('import', async () => {
    const text = await file.text();
    let parsed = JSON.parse(text) as VaultFile | EncryptedVaultFile;
    if ((parsed as EncryptedVaultFile).format === 'biosop-vault-encrypted') {
      if (!passphrase.trim()) throw new Error('This backup is encrypted — enter its passphrase first.');
      parsed = await decryptVault(parsed as EncryptedVaultFile, passphrase);
    }
    const counts = await localStore.importVault(parsed as VaultFile);
    return `Imported ${counts.protocols} protocols, ${counts.versions} versions, ${counts.signatures} signatures. Existing records were not overwritten. Reload to see them.`;
  });

  const wipe = () => run('wipe', async () => { await localStore.wipe(); setConfirmWipe(false); return 'All locally stored protocols, versions, signatures and audit entries were deleted from this browser.'; });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-slate-700" /><h3 className="font-semibold text-slate-800">Data & privacy</h3></div>

      <div className="grid sm:grid-cols-2 gap-2">
        <button type="button" onClick={() => changeMode('browser')} className={`text-left border rounded p-3 ${mode === 'browser' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2 font-medium text-sm"><HardDrive className="w-4 h-4" /> This browser only (default)</div>
          <div className="text-xs text-slate-600 mt-1">Protocols, versions, signatures and audit log stay in this browser profile. Nothing is written to any server.</div>
        </button>
        <button type="button" onClick={() => changeMode('server')} className={`text-left border rounded p-3 ${mode === 'server' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
          <div className="flex items-center gap-2 font-medium text-sm"><Server className="w-4 h-4" /> Shared team storage</div>
          <div className="text-xs text-slate-600 mt-1">Save to the server database so colleagues on the same deployment see the same protocols. Requires the deployment to have a database configured.</div>
        </button>
      </div>

      <div className="text-xs text-slate-700 bg-slate-50 rounded p-3 space-y-1">
        <div className="flex items-center gap-1 font-semibold"><Info className="w-3.5 h-3.5" /> What leaves this browser</div>
        <ul className="list-disc pl-5 space-y-0.5">
          <li><span className="font-medium">AI generation / cross-test / kit lookup:</span> the topic, requirements, reference text and, for cross-test, the SOP are sent to the server, which forwards them to Google’s Gemini API. On Google’s paid API tier prompts are not used for training; on the free tier they may be.</li>
          <li><span className="font-medium">Reference verification:</span> only citation strings go to Crossref / PubMed via the server.</li>
          <li><span className="font-medium">Everything else — saving, exports (Excel, Word), worklists, calculators, audit —</span> runs in this browser. No upload.</li>
        </ul>
      </div>

      {stats && (
        <div className="text-xs text-slate-600 font-mono">
          Local vault: {stats.protocols} protocols · {stats.versions} versions · {stats.signatures} signatures · {stats.audit} audit entries · ~{(stats.approxBytes / 1024).toFixed(0)} KB
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" />
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Optional passphrase — encrypts backups (AES-256-GCM)" className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm" autoComplete="new-password" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy !== null} onClick={exportVault} className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1">
            {busy === 'export' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Back up vault
          </button>
          <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
            {busy === 'import' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Restore / merge backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importVault(f); e.target.value = ''; }} />
          {!confirmWipe ? (
            <button type="button" disabled={busy !== null} onClick={() => setConfirmWipe(true)} className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50 flex items-center gap-1 ml-auto">
              <Trash2 className="w-3.5 h-3.5" /> Delete all local data
            </button>
          ) : (
            <span className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-red-700">Delete everything stored in this browser?</span>
              <button type="button" onClick={wipe} className="px-2 py-1 rounded bg-red-600 text-white text-xs">Yes, delete</button>
              <button type="button" onClick={() => setConfirmWipe(false)} className="px-2 py-1 rounded border text-xs">Cancel</button>
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500">Browser storage is per device and per browser profile, and clearing site data removes it. Back up regularly; an encrypted backup can be restored on any machine with the passphrase.</p>
      </div>

      {msg && <div className={`text-sm rounded p-2 border ${msg.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{msg.text}</div>}
    </div>
  );
};
