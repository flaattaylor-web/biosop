/**
 * Single client for every server endpoint. Replaces the five copies of the
 * fetch-retry loop and blob-download helper that were scattered across components.
 */
import type { SopDocument } from '../types';

export interface GenerationProgress {
  chars: number;
  sectionsSeen: string[];
  percent: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly detail?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readError(res: Response, fallback: string): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(body?.error || fallback, res.status, body?.detail);
  } catch {
    return new ApiError(fallback, res.status);
  }
}

/** Only retry when the request never got a response — never on 4xx/5xx. */
async function fetchWithNetworkRetry(input: string, init: RequestInit, attempts = 2): Promise<Response> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      lastErr = e;
      if (i < attempts) await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  throw new ApiError('Network request failed. Please check your connection and try again.', undefined, String(lastErr));
}

/**
 * Streaming generation over Server-Sent Events (POST). Resolves with the
 * finished SOP; `onProgress` fires as sections of the document arrive.
 */
export async function generateSopStreaming(
  payload: Record<string, unknown>,
  onProgress: (p: GenerationProgress) => void,
  signal?: AbortSignal
): Promise<SopDocument> {
  const res = await fetch('/api/generate-sop/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) throw await readError(res, 'Failed to start generation.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: SopDocument | null = null;
  let error: ApiError | null = null;

  const handle = (event: string, dataStr: string) => {
    let data: unknown;
    try { data = JSON.parse(dataStr); } catch { return; }
    if (event === 'progress') onProgress(data as GenerationProgress);
    else if (event === 'done') result = (data as { sop: SopDocument }).sop;
    else if (event === 'error') {
      const d = data as { error?: string; detail?: string };
      error = new ApiError(d.error || 'Generation failed.', 500, d.detail);
    }
  };

  // Parse SSE frames: blocks separated by blank lines, each with `event:` and `data:` lines.
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let ev = 'message';
      const dataLines: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) handle(ev, dataLines.join('\n'));
    }
  }
  if (error) throw error;
  if (!result) throw new ApiError('The server closed the stream before the document was complete.');
  return result;
}

/** Non-streaming fallback (kept for environments where SSE is proxied badly). */
export async function generateSopBlocking(payload: Record<string, unknown>): Promise<SopDocument> {
  const res = await fetchWithNetworkRetry('/api/generate-sop', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!res.ok) throw await readError(res, 'Failed to generate SOP.');
  const data = await res.json();
  if (!data.success) throw new ApiError(data.error || 'Failed to generate SOP.');
  return data.sop as SopDocument;
}

// ---------------------------------------------------------------- persistence

export interface ProtocolSummary {
  id: string; documentId: string; title: string; category: string | null;
  currentVersion: string | null; currentVersionId: string | null; versionCount: number; createdAt: string; updatedAt: string;
}

export async function saveProtocol(sop: SopDocument, changeSummary?: string, actor?: string) {
  const res = await fetchWithNetworkRetry('/api/protocols', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(actor ? { 'x-actor': actor } : {}) },
    body: JSON.stringify({ sop, changeSummary }),
  });
  if (!res.ok) throw await readError(res, 'Failed to save protocol.');
  return (await res.json()) as { protocolId: string; versionId: string; version: string; created: boolean };
}

export async function listProtocols(): Promise<ProtocolSummary[]> {
  const res = await fetchWithNetworkRetry('/api/protocols', { method: 'GET' });
  if (!res.ok) throw await readError(res, 'Failed to list protocols.');
  return (await res.json()).protocols as ProtocolSummary[];
}

export async function loadProtocol(id: string): Promise<{ sop: SopDocument; version: string; versionId: string }> {
  const res = await fetchWithNetworkRetry(`/api/protocols/${encodeURIComponent(id)}`, { method: 'GET' });
  if (!res.ok) throw await readError(res, 'Failed to load protocol.');
  return res.json();
}

export async function listVersions(protocolId: string) {
  const res = await fetchWithNetworkRetry(`/api/protocols/${encodeURIComponent(protocolId)}/versions`, { method: 'GET' });
  if (!res.ok) throw await readError(res, 'Failed to list versions.');
  return (await res.json()).versions as { versionId: string; version: string; createdAt: string; createdBy: string | null; changeSummary: string | null }[];
}

export async function diffVersions(a: string, b: string) {
  const res = await fetchWithNetworkRetry(`/api/versions/${encodeURIComponent(a)}/diff/${encodeURIComponent(b)}`, { method: 'GET' });
  if (!res.ok) throw await readError(res, 'Failed to diff versions.');
  return (await res.json()).changes as { path: string; before: unknown; after: unknown }[];
}

export async function signVersion(versionId: string, input: { role: 'PREPARED' | 'REVIEWED' | 'APPROVED'; signerName: string; signerIdentifier?: string; meaning: string }) {
  const res = await fetchWithNetworkRetry(`/api/versions/${encodeURIComponent(versionId)}/sign`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  if (!res.ok) throw await readError(res, 'Failed to sign version.');
  return res.json();
}

export async function getSignatures(versionId: string) {
  const res = await fetchWithNetworkRetry(`/api/versions/${encodeURIComponent(versionId)}/signatures`, { method: 'GET' });
  if (!res.ok) throw await readError(res, 'Failed to load signatures.');
  return (await res.json()).signatures as { role: string; signerName: string; meaning: string; signedAt: string; stillValid: boolean }[];
}

export async function getAuditLog(entityId?: string) {
  const q = entityId ? `?entityId=${encodeURIComponent(entityId)}` : '';
  const res = await fetchWithNetworkRetry(`/api/audit${q}`, { method: 'GET' });
  if (!res.ok) throw await readError(res, 'Failed to load audit log.');
  return (await res.json()).entries as { id: number; ts: string; actor: string | null; action: string; field: string | null; old_value: string | null; new_value: string | null; detail: string | null }[];
}

// ---------------------------------------------------------------- literature

export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'UNCHECKED';
export interface VerifiedReference {
  citation: string; doiOrUrl?: string;
  verification: { status: VerificationStatus; confidence: number; note: string; canonical?: string; resolved?: { title: string; doi?: string; pmid?: string; url?: string; year?: number } };
}

export async function verifyReferences(references: { citation: string; doiOrUrl?: string }[]): Promise<VerifiedReference[]> {
  const res = await fetchWithNetworkRetry('/api/literature/verify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ references }),
  });
  if (!res.ok) throw await readError(res, 'Verification failed.');
  return (await res.json()).results;
}

export async function groundedSearch(query: string, organism?: string) {
  const res = await fetchWithNetworkRetry('/api/literature/search', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, organism }),
  });
  if (!res.ok) throw await readError(res, 'Search failed.');
  return res.json() as Promise<{ answer: string; sources: { uri: string; title: string; doi?: string; verification?: VerifiedReference['verification'] }[]; groundingAvailable: boolean }>;
}

// ---------------------------------------------------------------- exports

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(s: string): string {
  return (s || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
}

async function postForBlob(url: string, body: unknown, fallback: string): Promise<Blob> {
  const res = await fetchWithNetworkRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw await readError(res, fallback);
  return res.blob();
}

export async function exportLiveExcel(sop: SopDocument) {
  const blob = await postForBlob('/api/export-excel-live', { reactionSheet: sop.reactionSheet, sop }, 'Excel export failed.');
  downloadBlob(blob, `${safeFilename(sop.title)}_live.xlsx`);
}

export async function exportControlledWord(sop: SopDocument, versionId?: string, organisationName?: string) {
  const blob = await postForBlob('/api/export-word-controlled', { sop, versionId, organisationName }, 'Word export failed.');
  downloadBlob(blob, `${safeFilename(sop.documentId || 'SOP')}_v${safeFilename(sop.version || '1')}.docx`);
}

export async function fetchWorklists(sop: SopDocument, plate?: { rows: number; cols: number }) {
  const res = await fetchWithNetworkRetry('/api/worklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sop, plate }) });
  if (!res.ok) throw await readError(res, 'Failed to build worklists.');
  return res.json() as Promise<{
    files: { name: string; mime: string; content: string }[];
    summary: { reactionCount: number; masterMixTubeVolumeMicroliters: number; perTubeComponents: { name: string; volPerRxnMicroliters: number }[]; destinationWells: string[]; warnings: string[] };
    calculationFindings: { severity: string; code: string; message: string; remedy?: string }[];
  }>;
}

// ---------------------------------------------------------------- commercial kits

export async function discoverKitsOnWeb(query: string, vendorHint?: string) {
  const res = await fetchWithNetworkRetry('/api/kits/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, vendorHint }) });
  if (!res.ok) throw await readError(res, 'Kit discovery failed.');
  return res.json() as Promise<{ query: string; candidates: { url: string; title: string; vendorGuess?: string }[]; entries: import('../types').KitIndexEntry[]; errors: { url: string; error: string }[]; note: string }>;
}

export async function fetchReferenceDocument(url: string) {
  const res = await fetchWithNetworkRetry('/api/kits/reference-doc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  if (!res.ok) throw await readError(res, 'Could not fetch the reference document.');
  return res.json() as Promise<{ url: string; finalUrl: string; mimeType: string; text: string; base64?: string; bytes: number; status: number }>;
}
