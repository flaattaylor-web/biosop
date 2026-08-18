/**
 * The API, as a Hono app. Runs unchanged on Node (server.ts) and on Cloudflare
 * Workers (src/worker.ts). Everything runtime-specific is injected:
 *   - `store`   : ProtocolStore (better-sqlite3 on Node, D1 on Cloudflare)
 *   - config    : via getEnv() (process.env or Worker bindings)
 */
import { Hono, Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { ProtocolStore, SignatureRole } from './db';
import type { SopDocument, ReactionSheet } from '../types';
import {
  generateSopAndReactionSheet, generateSopAndReactionSheetStream, crossTestAgainstLiterature, autoFixSopFromLiterature,
  searchAndSuggestProtocols, expandDeNovoDescription, SopGenerationParams,
} from './gemini';
import { generateExcelWorkbook } from './excel';
import { generateWordDocument } from './word';
import { generateLiveExcelWorkbook } from './excelLive';
import { generateControlledWordDocument } from './wordControlled';
import { verifyAllReferences, resolveDoi, RegistryUnreachableError } from './literature';
import { groundedLiteratureSearch } from './groundedSearch';
import { calculateReaction, calculateMasterMix, totalReactions, ComponentInput } from '../core/reactionMath';
import { buildWorklists } from '../core/worklists';
import { getEnv } from './env';
import { discoverKits, fetchReferenceDoc } from './kits';

export type AppEnv = { Variables: { store: ProtocolStore | null } };

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function safeName(s: string | undefined, fallback: string): string {
  return (s || fallback).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function isBusy(msg: string): boolean {
  return /503|UNAVAILABLE|high demand|429|resource_exhausted|Overloaded/i.test(msg);
}

function aiErrorMessage(error: unknown, fallback: string): { status: 500 | 503; message: string } {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (/GEMINI_API_KEY/.test(msg)) return { status: 503, message: 'AI service is not configured on the server (GEMINI_API_KEY missing).' };
  if (isBusy(msg)) return { status: 503, message: 'The AI model is currently busy. Please try again in a moment.' };
  return { status: 500, message: msg || fallback };
}

// ---------------------------------------------------------------- rate limit (in-memory, per isolate/process)
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < t) { buckets.set(key, { count: 1, resetAt: t + windowMs }); return false; }
  b.count++;
  return b.count > limit;
}
function clientKey(c: Context): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'anon';
}

function toInputs(sheet: ReactionSheet): ComponentInput[] {
  return (sheet.components || []).map((c) => ({
    id: c.id, name: c.name, stockConc: c.stockConc, stockUnit: c.stockUnit, finalConc: c.finalConc, finalUnit: c.finalUnit,
    volPerRxnMicroliters: c.volPerRxnMicroliters, pipettingOrder: c.pipettingOrder, role: c.role, molecularWeight: c.molecularWeight,
  }));
}

export interface AppOptions {
  /** Called per request; return the store for this runtime (Node: one shared instance; Workers: built from c.env.DB). */
  /** Return null when this deployment has no server-side database (browser-only storage). */
  resolveStore: (c: Context<AppEnv>) => ProtocolStore | null;
}

export function createApp(opts: AppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('store', opts.resolveStore(c));
    await next();
  });

  // ---------------------------------------------------------------- guards on AI endpoints
  const AI_PATHS = ['/api/generate-sop', '/api/generate-sop/stream', '/api/cross-test', '/api/auto-fix', '/api/search-suggestions', '/api/expand-de-novo-description', '/api/literature/search', '/api/kits/discover'];
  app.use('*', async (c, next) => {
    if (!AI_PATHS.includes(new URL(c.req.url).pathname)) return next();
    const token = getEnv('BIOSOP_API_TOKEN');
    if (token && c.req.header('authorization') !== `Bearer ${token}`) return c.json({ error: 'Unauthorized.' }, 401);
    const limit = Number(getEnv('AI_RATE_LIMIT_PER_10MIN') || 30);
    if (rateLimited(clientKey(c), limit, 10 * 60 * 1000)) return c.json({ error: 'Too many requests. Please slow down.' }, 429);
    return next();
  });

  app.get('/api/health', (c) => c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: getEnv('BIOSOP_RUNTIME') || 'node',
    serverStorage: c.get('store') !== null,
    aiConfigured: !!getEnv('GEMINI_API_KEY'),
  }));

  /** Persistence routes need a store; without one, say so clearly (the UI defaults to browser storage anyway). */
  const needStore = (c: Context<AppEnv>): ProtocolStore | Response => {
    const s = c.get('store');
    return s ?? c.json({ error: 'This deployment has no server-side database; protocols are stored in each user\'s browser. Configure D1 (see DEPLOY.md) to enable shared team storage.' }, 501);
  };

  // ---------------------------------------------------------------- generation
  app.post('/api/generate-sop', async (c) => {
    try {
      const params = (await c.req.json()) as SopGenerationParams;
      if (!params?.topic) return c.json({ error: 'Topic is required.' }, 400);
      const sop = await generateSopAndReactionSheet(params);
      return c.json({ success: true, sop });
    } catch (e) {
      console.error('generate-sop', e);
      const { status, message } = aiErrorMessage(e, 'Failed to generate SOP and reaction sheet.');
      return c.json({ error: message }, status);
    }
  });

  const SECTION_MARKERS: [string, string][] = [
    ['"title"', 'Title & metadata'], ['"scope"', 'Scope'], ['"hazards"', 'Hazard assessment'], ['"ppeRequirements"', 'PPE'],
    ['"equipmentRequired"', 'Equipment'], ['"reagentsRequired"', 'Reagents'], ['"steps"', 'Procedure steps'],
    ['"qualityControl"', 'Quality control'], ['"troubleshooting"', 'Troubleshooting'], ['"references"', 'References'],
    ['"reactionSheet"', 'Reaction sheet'], ['"components"', 'Reaction components'], ['"thermocyclerProfile"', 'Thermal profile'],
  ];

  app.post('/api/generate-sop/stream', async (c) => {
    const params = (await c.req.json().catch(() => null)) as SopGenerationParams | null;
    if (!params?.topic) return c.json({ error: 'Topic is required.' }, 400);
    c.header('X-Accel-Buffering', 'no');
    c.header('Cache-Control', 'no-cache, no-transform');
    return streamSSE(c, async (stream) => {
      const seen = new Set<string>();
      let lastEmit = 0;
      const ac = new AbortController();
      stream.onAbort(() => ac.abort());
      try {
        const sop = await generateSopAndReactionSheetStream(params, (_d, acc) => {
          for (const [m, label] of SECTION_MARKERS) if (!seen.has(label) && acc.includes(m)) seen.add(label);
          const t = Date.now();
          if (t - lastEmit > 250) {
            lastEmit = t;
            void stream.writeSSE({ event: 'progress', data: JSON.stringify({ chars: acc.length, sectionsSeen: [...seen], percent: Math.min(95, Math.round((seen.size / SECTION_MARKERS.length) * 100)) }) });
          }
        }, ac.signal);
        await stream.writeSSE({ event: 'progress', data: JSON.stringify({ chars: -1, sectionsSeen: [...seen], percent: 100 }) });
        await stream.writeSSE({ event: 'done', data: JSON.stringify({ sop }) });
      } catch (e) {
        console.error('generate-sop/stream', e);
        const { message } = aiErrorMessage(e, 'Generation failed.');
        const detail = e instanceof Error && !/GEMINI_API_KEY/.test(e.message) ? e.message.slice(0, 300) : undefined;
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: message, detail }) });
      }
    });
  });

  app.post('/api/cross-test', async (c) => {
    try {
      const { sop, referenceLiteratureOrSop } = await c.req.json();
      if (!sop || !referenceLiteratureOrSop) return c.json({ error: 'SOP and reference literature text are required.' }, 400);
      return c.json({ success: true, result: await crossTestAgainstLiterature({ sop, referenceLiteratureOrSop }) });
    } catch (e) { const r = aiErrorMessage(e, 'Failed to run literature cross-test.'); return c.json({ error: r.message }, r.status); }
  });

  app.post('/api/auto-fix', async (c) => {
    try {
      const { sop, discrepancies } = await c.req.json();
      if (!sop || !discrepancies) return c.json({ error: 'SOP and discrepancies are required.' }, 400);
      return c.json({ success: true, sop: await autoFixSopFromLiterature({ sop, discrepancies }) });
    } catch (e) { const r = aiErrorMessage(e, 'Failed to auto-fix SOP.'); return c.json({ error: r.message }, r.status); }
  });

  app.post('/api/search-suggestions', async (c) => {
    try {
      const { query, targetOrganism, categoryHint } = await c.req.json();
      if (!query || typeof query !== 'string') return c.json({ error: 'Search query is required.' }, 400);
      return c.json({ success: true, result: await searchAndSuggestProtocols({ query, targetOrganism, categoryHint }) });
    } catch (e) { const r = aiErrorMessage(e, 'Failed to execute protocol search.'); return c.json({ error: r.message }, r.status); }
  });

  app.post('/api/expand-de-novo-description', async (c) => {
    try {
      const { description, protocolTitle, category, targetHost, biosafetyLevel } = await c.req.json();
      if (!description || typeof description !== 'string') return c.json({ error: 'Protocol description is required.' }, 400);
      return c.json({ success: true, blueprint: await expandDeNovoDescription({ description, protocolTitle, category, targetHost, biosafetyLevel }) });
    } catch (e) { const r = aiErrorMessage(e, 'Failed to expand de novo description.'); return c.json({ error: r.message }, r.status); }
  });

  // ---------------------------------------------------------------- exports
  const sendFile = (c: Context, bytes: Uint8Array, mime: string, filename: string) =>
    c.body(bytes, 200, { 'Content-Type': mime, 'Content-Disposition': `attachment; filename="${filename}"` });

  app.post('/api/export-excel', async (c) => {
    try {
      const sheet = (await c.req.json()) as ReactionSheet;
      if (!sheet?.components) return c.json({ error: 'Valid ReactionSheet object is required.' }, 400);
      return sendFile(c, await generateExcelWorkbook(sheet), XLSX_MIME, `${safeName(sheet.title, 'Reaction_Sheet')}.xlsx`);
    } catch (e) { console.error('export-excel', e); return c.json({ error: 'Failed to generate Excel file.' }, 500); }
  });

  app.post('/api/export-word', async (c) => {
    try {
      const sop = (await c.req.json()) as SopDocument;
      if (!sop?.title) return c.json({ error: 'Valid SopDocument object is required.' }, 400);
      return sendFile(c, await generateWordDocument(sop), DOCX_MIME, `${safeName(sop.documentId, 'SOP')}_${safeName(sop.title, 'Document')}.docx`);
    } catch (e) { console.error('export-word', e); return c.json({ error: 'Failed to generate Word document.' }, 500); }
  });

  app.post('/api/export-excel-live', async (c) => {
    try {
      const { reactionSheet, sop } = (await c.req.json()) as { reactionSheet?: ReactionSheet; sop?: SopDocument };
      const sheet = reactionSheet || sop?.reactionSheet;
      if (!sheet || !Array.isArray(sheet.components)) return c.json({ error: 'A reactionSheet with components is required.' }, 400);
      return sendFile(c, await generateLiveExcelWorkbook(sheet, sop), XLSX_MIME, `${safeName(sheet.title, 'Reaction_Sheet')}_live.xlsx`);
    } catch (e) { console.error('export-excel-live', e); return c.json({ error: 'Failed to generate Excel file.' }, 500); }
  });

  app.post('/api/export-word-controlled', async (c) => {
    try {
      const { sop, versionId, organisationName } = (await c.req.json()) as { sop?: SopDocument; versionId?: string; organisationName?: string };
      if (!sop?.title) return c.json({ error: 'A SopDocument is required.' }, 400);
      const store = c.get('store');
      const signatures = versionId && store ? await store.verifySignatures(versionId) : [];
      const bytes = await generateControlledWordDocument(sop, { signatures, organisationName });
      return sendFile(c, bytes, DOCX_MIME, `${safeName(sop.documentId, 'SOP')}_v${(sop.version || '1').replace(/[^0-9.]/g, '')}.docx`);
    } catch (e) { console.error('export-word-controlled', e); return c.json({ error: 'Failed to generate Word document.' }, 500); }
  });

  // ---------------------------------------------------------------- worklists
  app.post('/api/worklists', async (c) => {
    try {
      const { sop, plate } = (await c.req.json()) as { sop?: SopDocument; plate?: { rows?: number; cols?: number; wells?: string[] } };
      const sheet = sop?.reactionSheet;
      if (!sop || !sheet || !Array.isArray(sheet.components) || sheet.components.length === 0) {
        return c.json({ error: 'A SOP with a reactionSheet containing components is required.' }, 400);
      }
      const calc = calculateReaction(toInputs(sheet), { targetVolumeMicroliters: sheet.reactionVolumeMicroliters || 50 });
      const design = { sampleCount: sheet.sampleCount ?? sheet.defaultNumReactions ?? 8, replicates: sheet.replicates ?? 1, posControls: sheet.posControls ?? 0, negControls: sheet.negControls ?? 0, overflowPercent: sheet.defaultOverflowPercent ?? 10 };
      const mm = calculateMasterMix(calc, design);
      const n = totalReactions(design) || sheet.defaultNumReactions || 8;
      const bundle = buildWorklists(calc, mm, { rows: plate?.rows ?? 8, cols: plate?.cols ?? 12, wells: plate?.wells, reactionCount: n }, { protocolTitle: sop.title, documentId: sop.documentId, version: sop.version });
      return c.json({
        files: [
          { name: 'opentrons_protocol.py', mime: 'text/x-python', content: bundle.opentronsPy },
          { name: 'hamilton_worklist.csv', mime: 'text/csv', content: bundle.hamiltonCsv },
          { name: 'tecan_worklist.gwl', mime: 'text/plain', content: bundle.tecanGwl },
          { name: 'echo_picklist.csv', mime: 'text/csv', content: bundle.echoCsv },
        ],
        summary: bundle.summary,
        calculationFindings: [...calc.findings, ...mm.findings],
      });
    } catch (e) { console.error('worklists', e); return c.json({ error: 'Failed to build worklists.' }, 500); }
  });

  // ---------------------------------------------------------------- persistence
  const actorOf = (c: Context) => { const h = c.req.header('x-actor'); return h ? h.slice(0, 120) : undefined; };

  app.get('/api/protocols', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try { return c.json({ protocols: await store.listProtocols() }); }
    catch (e) { console.error('GET protocols', e); return c.json({ error: 'Failed to list protocols.' }, 500); }
  });

  app.post('/api/protocols', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try {
      const body = (await c.req.json()) as { sop?: SopDocument; changeSummary?: string } | SopDocument;
      const sop = (body as { sop?: SopDocument }).sop ?? (body as SopDocument);
      const changeSummary = (body as { changeSummary?: string }).changeSummary;
      if (!sop || typeof sop !== 'object' || !sop.id || !sop.title) return c.json({ error: 'A SOP with id and title is required.' }, 400);
      const result = await store.saveProtocol(sop, { actor: actorOf(c), changeSummary });
      return c.json({ success: true, ...result });
    } catch (e) { console.error('POST protocols', e); return c.json({ error: 'Failed to save protocol.' }, 500); }
  });

  app.get('/api/protocols/:id', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try {
      const loaded = await store.getProtocol(c.req.param('id'));
      return loaded ? c.json(loaded) : c.json({ error: 'Protocol not found.' }, 404);
    } catch (e) { console.error('GET protocol', e); return c.json({ error: 'Failed to load protocol.' }, 500); }
  });

  app.delete('/api/protocols/:id', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try {
      const ok = await store.archiveProtocol(c.req.param('id'), actorOf(c));
      return ok ? c.json({ success: true }) : c.json({ error: 'Protocol not found or already archived.' }, 404);
    } catch (e) { console.error('DELETE protocol', e); return c.json({ error: 'Failed to archive protocol.' }, 500); }
  });

  app.get('/api/protocols/:id/versions', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try { return c.json({ versions: await store.listVersions(c.req.param('id')) }); }
    catch (e) { console.error('GET versions', e); return c.json({ error: 'Failed to list versions.' }, 500); }
  });

  app.get('/api/versions/:versionId', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try {
      const v = await store.getVersion(c.req.param('versionId'));
      return v ? c.json(v) : c.json({ error: 'Version not found.' }, 404);
    } catch (e) { console.error('GET version', e); return c.json({ error: 'Failed to load version.' }, 500); }
  });

  app.get('/api/versions/:a/diff/:b', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try {
      const d = await store.diffVersions(c.req.param('a'), c.req.param('b'));
      return d ? c.json({ changes: d, count: d.length }) : c.json({ error: 'One or both versions not found.' }, 404);
    } catch (e) { console.error('GET diff', e); return c.json({ error: 'Failed to diff versions.' }, 500); }
  });

  app.post('/api/versions/:versionId/sign', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try {
      const { role, signerName, signerIdentifier, meaning } = (await c.req.json()) as { role?: SignatureRole; signerName?: string; signerIdentifier?: string; meaning?: string };
      if (!role || !signerName || !meaning) return c.json({ error: 'role, signerName and meaning are required.' }, 400);
      const sig = await store.addSignature({ versionId: c.req.param('versionId'), role, signerName, signerIdentifier, meaning, actor: actorOf(c) });
      return c.json({ success: true, signature: sig });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to sign version.';
      if (/not found/i.test(msg)) return c.json({ error: msg }, 404);
      if (/already exists|required|invalid/i.test(msg)) return c.json({ error: msg }, 400);
      console.error('POST sign', e); return c.json({ error: 'Failed to sign version.' }, 500);
    }
  });

  app.get('/api/versions/:versionId/signatures', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try { return c.json({ signatures: await store.verifySignatures(c.req.param('versionId')) }); }
    catch (e) { console.error('GET signatures', e); return c.json({ error: 'Failed to load signatures.' }, 500); }
  });

  app.get('/api/audit', async (c) => {
    const store = needStore(c); if (store instanceof Response) return store;
    try {
      const entityId = c.req.query('entityId') || undefined;
      const limit = Number(c.req.query('limit')) || 200;
      return c.json({ entries: await store.getAuditLog(entityId, limit) });
    } catch (e) { console.error('GET audit', e); return c.json({ error: 'Failed to load audit log.' }, 500); }
  });

  // ---------------------------------------------------------------- commercial kits
  /** Web discovery: grounded search → fetch vendor pages → extract + verify. */
  app.post('/api/kits/discover', async (c) => {
    try {
      const { query, vendorHint } = (await c.req.json()) as { query?: string; vendorHint?: string };
      if (!query || typeof query !== 'string' || query.trim().length < 3) return c.json({ error: 'A search query is required.' }, 400);
      return c.json(await discoverKits(query.trim().slice(0, 200), vendorHint?.slice(0, 60)));
    } catch (e) { const r = aiErrorMessage(e, 'Kit discovery failed.'); return c.json({ error: r.message }, r.status); }
  });

  /**
   * Fetch a manufacturer protocol page/PDF so the client can attach it to a
   * generation request. Returns text for HTML, base64 for PDF. Never stored.
   */
  app.post('/api/kits/reference-doc', async (c) => {
    try {
      const { url } = (await c.req.json()) as { url?: string };
      if (!url) return c.json({ error: 'url is required.' }, 400);
      const doc = await fetchReferenceDoc(url);
      return c.json({ url: doc.url, finalUrl: doc.finalUrl, mimeType: doc.mimeType, text: doc.text, base64: doc.base64, bytes: doc.bytes, status: doc.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Fetch failed.';
      return c.json({ error: `Could not fetch the reference document: ${msg}` }, 502);
    }
  });

  // ---------------------------------------------------------------- literature
  app.post('/api/literature/verify', async (c) => {
    try {
      const refs = ((await c.req.json())?.references ?? []) as { citation: string; doiOrUrl?: string }[];
      if (!Array.isArray(refs) || refs.length === 0) return c.json({ error: 'references[] is required.' }, 400);
      if (refs.length > 50) return c.json({ error: 'At most 50 references per request.' }, 400);
      return c.json({ results: await verifyAllReferences(refs) });
    } catch (e) { console.error('literature/verify', e); return c.json({ error: 'Verification failed.' }, 500); }
  });

  app.post('/api/literature/search', async (c) => {
    try {
      const { query, organism } = (await c.req.json()) as { query?: string; organism?: string };
      if (!query || typeof query !== 'string') return c.json({ error: 'query is required.' }, 400);
      return c.json(await groundedLiteratureSearch({ query, organism }));
    } catch (e) { const r = aiErrorMessage(e, 'Literature search failed.'); return c.json({ error: r.message }, r.status); }
  });

  app.get('/api/literature/doi/*', async (c) => {
    try {
      const doi = decodeURIComponent(new URL(c.req.url).pathname.replace(/^\/api\/literature\/doi\//, ''));
      if (!doi) return c.json({ error: 'DOI is required.' }, 400);
      const rec = await resolveDoi(doi);
      return rec ? c.json(rec) : c.json({ error: 'DOI not found in Crossref.' }, 404);
    } catch (e) {
      if (e instanceof RegistryUnreachableError) return c.json({ error: e.message }, 502);
      console.error('literature/doi', e); return c.json({ error: 'DOI resolution failed.' }, 500);
    }
  });

  return app;
}
