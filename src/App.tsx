import React, { useState } from 'react';
import { Header } from './components/Header';
import { SopGenerator } from './components/SopGenerator';
import { SopViewer } from './components/SopViewer';
import { ReactionSheetViewer } from './components/ReactionSheetViewer';
import { LiteratureCrossTester } from './components/LiteratureCrossTester';
import { ProtocolLibrary } from './components/ProtocolLibrary';
import { KitRepository } from './components/KitRepository';
import { SAMPLE_SOPS } from './data/sampleProtocols';
import { SopDocument, ReactionSheet, ProtocolSuggestion } from './types';
import { ensureReactionSheet, sanitizeAndValidateSop } from './utils/sheetUtils';
import { protocolStorage } from './client/storage';
import { exportLiveExcelLocal } from './client/exportsLocal';
import { DataPrivacyPanel } from './components/DataPrivacyPanel';
import { useEffect } from 'react';

/**
 * A generated document with an unexpected shape used to take the whole application down: React
 * unmounts the tree on an uncaught render error, so the user saw a blank white page with no way
 * back. The header stays outside this boundary, so a bad protocol costs that one view rather than
 * the whole session.
 */
interface BoundaryProps { children: React.ReactNode; onReset: () => void }
interface BoundaryState { error: Error | null }

/**
 * React.Component is described explicitly here rather than through its generic signature, because
 * this project does not install @types/react — without that package the class members are untyped
 * and tsc rejects every use of this.props/this.state. Declaring the base shape keeps the type check
 * meaningful either way. (Adding @types/react is the better long-term fix; it also makes tsc check
 * the rest of the UI, which it currently does not.)
 */
const ErrorBoundaryBase = (React as unknown as {
  Component: new (props: BoundaryProps) => {
    props: BoundaryProps;
    state: BoundaryState;
    context: unknown;
    refs: Record<string, unknown>;
    setState(next: BoundaryState): void;
    forceUpdate(callback?: () => void): void;
    render(): React.ReactNode;
  };
}).Component;

class RenderErrorBoundary extends ErrorBoundaryBase {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Render error in protocol view:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
          <h2 className="text-lg font-bold text-red-900">This protocol could not be displayed</h2>
          <p className="text-sm text-red-800">
            Something in the generated document has a shape this view cannot render, so it was stopped before it
            took the rest of the page with it. Your other protocols are unaffected.
          </p>
          <pre className="text-xs bg-white/70 border border-red-200 rounded p-3 overflow-x-auto text-red-900">
            {this.state.error.message}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { this.setState({ error: null }); this.props.onReset(); }}
              className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 cursor-pointer"
            >
              Back to the protocol library
            </button>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-800 text-sm font-semibold hover:bg-red-100 cursor-pointer"
            >
              Try rendering again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'viewer' | 'excel' | 'crosstest' | 'library' | 'companyKits'>('companyKits');
  const [protocols, setProtocols] = useState<SopDocument[]>(() => SAMPLE_SOPS.map(sanitizeAndValidateSop));
  const [currentSop, setCurrentSop] = useState<SopDocument>(() => sanitizeAndValidateSop(SAMPLE_SOPS[0]));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProtocolSuggestion | null>(null);
  /** null = unknown, false = no API server reachable (e.g. opened as a static file). */
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => { if (!cancelled) setServerOnline(r.ok); })
      .catch(() => { if (!cancelled) setServerOnline(false); });
    return () => { cancelled = true; };
  }, []);

  // Load persisted protocols on boot (merged ahead of the bundled samples).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await protocolStorage.list();
        if (!saved.length || cancelled) return;
        const loaded = await Promise.all(saved.map((p) => protocolStorage.load(p.id).then((r) => r.sop).catch(() => null)));
        if (cancelled) return;
        const fromDb = loaded.filter((x): x is SopDocument => !!x).map(sanitizeAndValidateSop);
        setProtocols((prev) => {
          const ids = new Set(fromDb.map((p) => p.id));
          return [...fromDb, ...prev.filter((p) => !ids.has(p.id))];
        });
      } catch {
        // Persistence unavailable — keep in-memory samples only.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** Best-effort autosave. Failures are logged, never block the UI. */
  const persist = (sop: SopDocument, summary: string) => {
    protocolStorage.save(sop, summary).catch((e) => console.warn('Autosave failed:', e));
  };

  const handleApplySuggestionToGenerator = (sug: ProtocolSuggestion) => {
    setSelectedSuggestion(sug);
    setActiveTab('generator');
  };

  // When user selects a sample from header or library
  const handleSelectSample = (id: string) => {
    const found = protocols.find((p) => p.id === id);
    if (found) {
      setCurrentSop(sanitizeAndValidateSop(found));
      setActiveTab('viewer');
    }
  };

  // When a new SOP is generated by AI
  const handleSopGenerated = (newSop: SopDocument) => {
    const fullSop = sanitizeAndValidateSop(newSop);
    setProtocols((prev) => [fullSop, ...prev]);
    setCurrentSop(fullSop);
    setActiveTab('viewer');
    persist(fullSop, 'Generated');
  };

  // When SOP is auto-fixed or manually updated
  const handleSopUpdated = (updatedSop: SopDocument) => {
    const fullSop = sanitizeAndValidateSop(updatedSop);
    setProtocols((prev) =>
      prev.map((p) => (p.id === fullSop.id ? fullSop : p))
    );
    setCurrentSop(fullSop);
    persist(fullSop, 'Edited');
  };

  // When Reaction Sheet is edited directly
  const handleUpdateSheet = (updatedSheet: ReactionSheet) => {
    const updatedSop: SopDocument = {
      ...currentSop,
      reactionSheet: updatedSheet
    };
    handleSopUpdated(updatedSop);
  };

  // Direct Excel Export trigger from header
  const handleHeaderExportExcel = async () => {
    try {
      await exportLiveExcelLocal({ ...currentSop, reactionSheet: ensureReactionSheet(currentSop) });
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel file.');
    }
  };

  const activeReactionSheet = ensureReactionSheet(currentSop);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col antialiased">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSop={currentSop}
        onSelectSample={handleSelectSample}
        samples={protocols}
        onExportExcel={handleHeaderExportExcel}
      />

      {serverOnline === false && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
          <strong>Offline mode</strong> — no API server reachable. Everything except AI generation and reference verification still
          works: browse and edit protocols, calculators, the consistency audit, saving to this browser, Excel/Word export and
          instrument worklists. For AI features run the server:
          <code className="mx-1 px-1 rounded bg-amber-100">npm install &amp;&amp; npm run dev</code>
          then open <code className="px-1 rounded bg-amber-100">http://localhost:3000</code>.
        </div>
      )}
      <main className="flex-1 pb-12">
        <RenderErrorBoundary onReset={() => setActiveTab('library')}>
        {activeTab === 'generator' && (
          <SopGenerator
            onSopGenerated={handleSopGenerated}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            initialSuggestion={selectedSuggestion}
          />
        )}

        {activeTab === 'viewer' && (
          <SopViewer
            sop={currentSop}
            onGoToExcel={() => setActiveTab('excel')}
            onGoToCrossTest={() => setActiveTab('crosstest')}
            onSopUpdated={handleSopUpdated}
          />
        )}

        {activeTab === 'excel' && (
          <ReactionSheetViewer
            reactionSheet={activeReactionSheet}
            onUpdateSheet={handleUpdateSheet}
            sopAuditReport={currentSop.auditReport}
          />
        )}

        {activeTab === 'crosstest' && (
          <LiteratureCrossTester
            currentSop={currentSop}
            onSopUpdated={handleSopUpdated}
          />
        )}

        {activeTab === 'library' && (
          <div className="max-w-6xl mx-auto px-4 pt-6"><DataPrivacyPanel /></div>
        )}
        {activeTab === 'library' && (
          <ProtocolLibrary
            protocols={protocols}
            onSelectProtocol={(p) => {
              setCurrentSop(p);
              setActiveTab('viewer');
            }}
            onOpenExcel={(p) => {
              setCurrentSop(p);
              setActiveTab('excel');
            }}
            onOpenCrossTest={(p) => {
              setCurrentSop(p);
              setActiveTab('crosstest');
            }}
            onApplySuggestionToGenerator={handleApplySuggestionToGenerator}
          />
        )}

        {activeTab === 'companyKits' && (
          <KitRepository
            allProtocols={protocols}
            onAddProtocol={(newSop) => {
              setProtocols((prev) => [newSop, ...prev]);
            }}
            onSelectKitSop={(p) => {
              setCurrentSop(p);
              setActiveTab('viewer');
            }}
            onOpenExcel={(p) => {
              setCurrentSop(p);
              setActiveTab('excel');
            }}
            onOpenCrossTest={(p) => {
              setCurrentSop(p);
              setActiveTab('crosstest');
            }}
          />
        )}
        </RenderErrorBoundary>
      </main>

      {/* Subtle Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-slate-400 text-xs text-center font-mono">
        <p>BioSOP & Reaction Sheet Generator • Automated consistency checks are not a substitute for qualified scientific review</p>
      </footer>
    </div>
  );
}
