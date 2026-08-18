import React, { useState } from 'react';
import { Bot, Download, AlertTriangle, Loader2 } from 'lucide-react';
import type { SopDocument } from '../types';
import { downloadBlob, safeFilename } from '../client/api';
import { buildWorklistsLocal } from '../client/exportsLocal';

const FORMAT_LABELS: Record<string, string> = {
  'opentrons_protocol.py': 'Opentrons (Python API v2)',
  'hamilton_worklist.csv': 'Hamilton (CSV worklist)',
  'tecan_worklist.gwl': 'Tecan EVOware (GWL)',
  'echo_picklist.csv': 'Echo picklist (CSV, nL)',
};

export const WorklistPanel: React.FC<{ sop: SopDocument }> = ({ sop }) => {
  const [plate, setPlate] = useState<'96' | '384'>('96');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof buildWorklistsLocal> | null>(null);

  const build = async () => {
    setLoading(true); setError(null);
    try {
      const r = buildWorklistsLocal(sop, plate === '384' ? { rows: 16, cols: 24 } : { rows: 8, cols: 12 });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build worklists.');
    } finally {
      setLoading(false);
    }
  };

  const dl = (f: { name: string; mime: string; content: string }) => {
    downloadBlob(new Blob([f.content], { type: f.mime }), `${safeFilename(sop.documentId || 'SOP')}_${f.name}`);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800">Instrument worklists</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-600">Plate</label>
          <select value={plate} onChange={(e) => setPlate(e.target.value as '96' | '384')} className="border border-slate-300 rounded px-2 py-1 text-sm">
            <option value="96">96-well</option>
            <option value="384">384-well</option>
          </select>
          <button type="button" onClick={build} disabled={loading} className="px-3 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Build
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Built in your browser — nothing is uploaded. Every file uses the same volumes as the reaction sheet and Excel export.
        Simulate Opentrons protocols before running them.
      </p>
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      {result && (
        <div className="space-y-3">
          <div className="text-xs text-slate-700 bg-slate-50 rounded p-2 font-mono">
            {result.summary.reactionCount} reactions · master mix {result.summary.masterMixTubeVolumeMicroliters} µL ·
            per tube: {result.summary.perTubeComponents.map((p) => `${p.name} ${p.volPerRxnMicroliters} µL`).join(', ') || 'none'} ·
            wells {result.summary.destinationWells[0]}–{result.summary.destinationWells[result.summary.destinationWells.length - 1]}
          </div>
          {(result.summary.warnings.length > 0 || result.calculationFindings.length > 0) && (
            <ul className="space-y-1">
              {[...result.summary.warnings.map((w) => ({ severity: 'WARNING', message: w })), ...result.calculationFindings].map((f, i) => (
                <li key={i} className="flex gap-2 text-xs text-amber-800"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{f.message}</li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.files.map((f) => (
              <button key={f.name} type="button" onClick={() => dl(f)} className="flex items-center justify-between border border-slate-200 rounded px-3 py-2 text-sm hover:bg-slate-50 text-left">
                <span>{FORMAT_LABELS[f.name] || f.name}</span>
                <Download className="w-4 h-4 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
