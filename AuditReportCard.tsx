import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion, ChevronDown, ChevronUp, AlertTriangle, XCircle, Info, CheckCircle2 } from 'lucide-react';
import type { AuditReport, AuditDimension } from '../core/auditor';

/**
 * Replaces AccuracyAuditCard, whose score was clamped to 99.0–99.9 and which
 * printed ISO/GLP claims the code never checked.
 *
 * This card:
 *   - shows a score that can be low, and a verdict that can be FAIL
 *   - shows COVERAGE (how much could actually be checked) next to the score
 *   - lists what each dimension DID and DID NOT verify
 *   - renders the scope statement verbatim
 */

const VERDICT_STYLE: Record<AuditReport['verdict'], { bg: string; text: string; border: string; label: string; Icon: React.ElementType }> = {
  PASS: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Consistency check passed', Icon: ShieldCheck },
  PASS_WITH_WARNINGS: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Passed with warnings', Icon: ShieldAlert },
  FAIL: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', label: 'Consistency check FAILED', Icon: XCircle },
  INSUFFICIENT_DATA: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Insufficient data to assess', Icon: ShieldQuestion },
};

function ScoreBar({ score, coverage }: { score: number | null; coverage: number }) {
  if (score === null) return <span className="text-xs text-slate-400 font-mono">n/a</span>;
  const color = score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 bg-slate-200 rounded overflow-hidden" title={`Coverage ${(coverage * 100).toFixed(0)}%`}>
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{score}</span>
      <span className="text-[10px] text-slate-400 font-mono w-9" title="Fraction of items this dimension could actually check">{(coverage * 100).toFixed(0)}%</span>
    </div>
  );
}

function FindingIcon({ severity }: { severity: string }) {
  if (severity === 'ERROR') return <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />;
  if (severity === 'WARNING') return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />;
  return <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />;
}

const DimensionRow: React.FC<{ d: AuditDimension }> = ({ d }) => {
  const [open, setOpen] = useState(d.findings.some((f) => f.severity === 'ERROR'));
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-2 text-left hover:bg-slate-50 px-1 rounded">
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-sm font-medium text-slate-800 truncate">{d.label}</span>
          {d.findings.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{d.findings.length}</span>
          )}
        </div>
        <ScoreBar score={d.score} coverage={d.coverage} />
      </button>
      {open && (
        <div className="pl-7 pr-2 pb-3 space-y-2">
          <p className="text-xs text-slate-600"><span className="font-semibold">Checked:</span> {d.whatWasChecked}</p>
          {d.findings.length > 0 && (
            <ul className="space-y-1">
              {d.findings.map((f, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <FindingIcon severity={f.severity} />
                  <span className="text-slate-700">
                    {f.message}
                    {f.remedy && <span className="text-slate-500"> — {f.remedy}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {d.notChecked.length > 0 && (
            <p className="text-[11px] text-slate-500 italic">
              <span className="font-semibold not-italic">Not checked:</span> {d.notChecked.join('; ')}.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const AuditReportCard: React.FC<{ report?: AuditReport | null; compact?: boolean }> = ({ report, compact }) => {
  const [showScope, setShowScope] = useState(false);

  if (!report) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex items-center gap-2">
        <ShieldQuestion className="w-4 h-4" /> No consistency check has been run on this document.
      </div>
    );
  }

  const v = VERDICT_STYLE[report.verdict];
  const Icon = v.Icon;

  return (
    <div className={`rounded-lg border ${v.border} ${v.bg} overflow-hidden`}>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className={`w-7 h-7 ${v.text}`} />
          <div>
            <div className={`font-semibold ${v.text}`}>{v.label}</div>
            <div className="text-xs text-slate-600">
              {report.errorCount} error{report.errorCount === 1 ? '' : 's'}, {report.warningCount} warning{report.warningCount === 1 ? '' : 's'}
              {' · '}checked {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-slate-800 leading-none">
            {report.overallScore === null ? '—' : report.overallScore}
            <span className="text-sm text-slate-400 font-normal">/100</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1" title="How much of the document the automated check was able to examine">
            coverage {(report.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {!compact && (
        <div className="bg-white border-t border-slate-200 px-3 py-1">
          {report.dimensions.map((d) => <DimensionRow key={d.key} d={d} />)}
        </div>
      )}

      <div className="bg-white border-t border-slate-200 px-4 py-2">
        <button type="button" onClick={() => setShowScope((s) => !s)} className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> What this check does and does not mean {showScope ? '▴' : '▾'}
        </button>
        {showScope && (
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{report.scopeStatement}</p>
        )}
      </div>
    </div>
  );
};
