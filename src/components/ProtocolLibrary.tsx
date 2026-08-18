import React from 'react';
import { BookOpen, FileSpreadsheet, FileText, ArrowRight, ShieldCheck, Download, Sparkles } from 'lucide-react';
import { SopDocument, ProtocolSuggestion } from '../types';
import { AiProtocolSearch } from './AiProtocolSearch';

interface ProtocolLibraryProps {
  protocols: SopDocument[];
  onSelectProtocol: (protocol: SopDocument) => void;
  onOpenExcel: (protocol: SopDocument) => void;
  onOpenCrossTest: (protocol: SopDocument) => void;
  onApplySuggestionToGenerator?: (suggestion: ProtocolSuggestion) => void;
}

export const ProtocolLibrary: React.FC<ProtocolLibraryProps> = ({
  protocols,
  onSelectProtocol,
  onOpenExcel,
  onOpenCrossTest,
  onApplySuggestionToGenerator
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            Verified Standard Protocol Library
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">
          Validated Biotech SOPs & Master Mix Reaction Templates
        </h1>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
          Pre-validated Standard Operating Procedures and Excel reaction calculators cross-checked against Cold Spring Harbor, Nature Protocols, and peer-reviewed literature.
        </p>
      </div>

      {/* AI Protocol Search & Reasoning Section */}
      {onApplySuggestionToGenerator && (
        <AiProtocolSearch onApplySuggestionToGenerator={onApplySuggestionToGenerator} />
      )}

      {/* Protocol Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {protocols.map((sop) => (
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
                <h2 className="font-bold text-slate-900 text-base leading-snug">{sop.title}</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Category: {sop.category} | Version: {sop.version}</p>
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
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-mono border border-amber-200">
                  Literature Verified
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
        ))}
      </div>
    </div>
  );
};
