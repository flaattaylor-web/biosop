import { getEnv } from './env';
/**
 * Literature verification against public registries (Crossref, PubMed).
 *
 * The point of this module is to stop presenting model-recalled citations as
 * facts. Every reference gets a status:
 *   VERIFIED   — a registry record exists AND its title matches the citation
 *   MISMATCH   — the DOI exists but points at a DIFFERENT paper (a classic
 *                hallucination signature: real-looking DOI, wrong content)
 *   NOT_FOUND  — the registry was reachable and has no such record
 *   UNCHECKED  — the registry could not be reached; we make no claim
 *
 * "NOT_FOUND" and "UNCHECKED" are deliberately distinct. Never report a paper as
 * non-existent because of a network error.
 */

export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'UNCHECKED';

export interface ResolvedRecord {
  doi?: string;
  pmid?: string;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  url?: string;
  source: 'crossref' | 'pubmed';
}

export interface VerificationResult {
  status: VerificationStatus;
  /** 0-1: how strongly the resolved record matches the citation text. */
  confidence: number;
  resolved?: ResolvedRecord;
  /** The registry's own citation string, ready to paste over a wrong one. */
  canonical?: string;
  note: string;
}

/** Formats a registry record the way it should have been cited. */
export function formatCanonical(rec: ResolvedRecord): string {
  const authors = rec.authors.length > 3 ? `${rec.authors.slice(0, 3).join(', ')}, et al.` : rec.authors.join(', ');
  const bits = [authors, rec.year ? `(${rec.year}).` : '', `${rec.title}.`, rec.journal ? `${rec.journal}.` : ''];
  const line = bits.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return rec.doi ? `${line} https://doi.org/${rec.doi}` : line;
}

export class RegistryUnreachableError extends Error {
  constructor(public readonly registry: string, cause?: unknown) {
    super(`${registry} could not be reached${cause instanceof Error ? `: ${cause.message}` : ''}`);
    this.name = 'RegistryUnreachableError';
  }
}

/** Injectable transport so the logic is testable without network access. */
export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const UA = () => `BioSOP-Generator/1.0 (mailto:${getEnv('LITERATURE_CONTACT_EMAIL') || 'biosop-generator@example.com'})`;

let transport: FetchLike = (url, init) => fetch(url, { headers: init?.headers }) as unknown as ReturnType<FetchLike>;

/** Test hook. */
export function _setTransport(f: FetchLike | null): void {
  transport = f ?? ((url, init) => fetch(url, { headers: init?.headers }) as unknown as ReturnType<FetchLike>);
}

// ---------------------------------------------------------------------------
// Rate limiting for NCBI (max 3 req/s without a key, 10 with)
// ---------------------------------------------------------------------------

const ncbiKey = () => getEnv('NCBI_API_KEY');
const ncbiMinIntervalMs = () => (ncbiKey() ? 100 : 340);
let ncbiChain: Promise<void> = Promise.resolve();
let ncbiLast = 0;

function ncbiThrottle<T>(fn: () => Promise<T>): Promise<T> {
  const run = ncbiChain.then(async () => {
    const wait = Math.max(0, ncbiLast + ncbiMinIntervalMs() - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    ncbiLast = Date.now();
  });
  ncbiChain = run.catch(() => undefined);
  return run.then(fn);
}

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

const STOP = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'for', 'to', 'by', 'with', 'from', 'at', 'is', 'as', 'its', 'via', 'using']);

export function normaliseTitle(s: string): string[] {
  return String(s || '')
    .toLowerCase()
    .replace(/[‐-―]/g, '-')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Token overlap in [0,1]: |A∩B| / min(|A|,|B|), damped when one side is tiny. */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(normaliseTitle(a));
  const tb = new Set(normaliseTitle(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const denom = Math.min(ta.size, tb.size);
  const raw = inter / denom;
  // A 2-token "title" fully contained in a 15-token one is not strong evidence.
  const damp = Math.min(1, denom / 4);
  return raw * damp;
}

export function extractDoi(s: string): string | null {
  if (!s) return null;
  const m = /10\.\d{4,9}\/[^\s"'<>)\]]+/i.exec(s);
  if (!m) return null;
  return m[0].replace(/[.,;:]+$/, '');
}

function extractTitleFromCitation(citation: string): string {
  // Typical: "Authors (Year). Title. Journal, vol, pages." — take the sentence after the year.
  const afterYear = /\(\d{4}[a-z]?\)\.?\s*(.+)/.exec(citation);
  const candidate = afterYear ? afterYear[1] : citation;
  const firstSentence = candidate.split(/\.\s+(?=[A-Z])/)[0];
  return firstSentence.length > 15 ? firstSentence : candidate;
}

// ---------------------------------------------------------------------------
// Crossref
// ---------------------------------------------------------------------------

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  'container-title'?: string[];
  issued?: { 'date-parts'?: number[][] };
  URL?: string;
  type?: string;
}

function crossrefToRecord(w: CrossrefWork): ResolvedRecord {
  const year = w.issued?.['date-parts']?.[0]?.[0];
  return {
    doi: w.DOI,
    title: (w.title && w.title[0]) || '',
    authors: (w.author || []).map((a) => a.name || [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean),
    journal: w['container-title']?.[0],
    year: typeof year === 'number' ? year : undefined,
    url: w.URL || (w.DOI ? `https://doi.org/${w.DOI}` : undefined),
    source: 'crossref',
  };
}

export async function resolveDoi(doi: string): Promise<ResolvedRecord | null> {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await transport(`https://api.crossref.org/works/${encodeURIComponent(clean)}`, {
      headers: { 'User-Agent': UA(), Accept: 'application/json' },
    });
  } catch (e) {
    throw new RegistryUnreachableError('Crossref', e);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new RegistryUnreachableError('Crossref', new Error(`HTTP ${res.status}`));
  const body = (await res.json()) as { message?: CrossrefWork };
  return body.message ? crossrefToRecord(body.message) : null;
}

export async function searchCrossref(query: string, rows = 5): Promise<ResolvedRecord[]> {
  const url =
    `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}` +
    `&rows=${Math.min(20, rows)}&select=DOI,title,author,container-title,issued,URL,type`;
  let res: Awaited<ReturnType<FetchLike>>;
  try {
    res = await transport(url, { headers: { 'User-Agent': UA(), Accept: 'application/json' } });
  } catch (e) {
    throw new RegistryUnreachableError('Crossref', e);
  }
  if (!res.ok) throw new RegistryUnreachableError('Crossref', new Error(`HTTP ${res.status}`));
  const body = (await res.json()) as { message?: { items?: CrossrefWork[] } };
  return (body.message?.items || []).map(crossrefToRecord);
}

// ---------------------------------------------------------------------------
// PubMed
// ---------------------------------------------------------------------------

export async function searchPubmed(query: string, retmax = 5): Promise<ResolvedRecord[]> {
  const key = ncbiKey() ? `&api_key=${ncbiKey()}` : '';
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  const ids = await ncbiThrottle(async () => {
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await transport(
        `${base}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${Math.min(20, retmax)}${key}`,
        { headers: { 'User-Agent': UA() } }
      );
    } catch (e) {
      throw new RegistryUnreachableError('PubMed', e);
    }
    if (!res.ok) throw new RegistryUnreachableError('PubMed', new Error(`HTTP ${res.status}`));
    const body = (await res.json()) as { esearchresult?: { idlist?: string[] } };
    return body.esearchresult?.idlist || [];
  });

  if (ids.length === 0) return [];

  return ncbiThrottle(async () => {
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await transport(`${base}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${key}`, {
        headers: { 'User-Agent': UA() },
      });
    } catch (e) {
      throw new RegistryUnreachableError('PubMed', e);
    }
    if (!res.ok) throw new RegistryUnreachableError('PubMed', new Error(`HTTP ${res.status}`));
    const body = (await res.json()) as {
      result?: Record<string, {
        uid?: string; title?: string; authors?: { name: string }[]; fulljournalname?: string; source?: string;
        pubdate?: string; articleids?: { idtype: string; value: string }[];
      }>;
    };
    const out: ResolvedRecord[] = [];
    for (const id of ids) {
      const r = body.result?.[id];
      if (!r) continue;
      const doi = r.articleids?.find((a) => a.idtype === 'doi')?.value;
      const year = r.pubdate ? Number(/\d{4}/.exec(r.pubdate)?.[0]) : undefined;
      out.push({
        pmid: r.uid || id,
        doi,
        title: r.title || '',
        authors: (r.authors || []).map((a) => a.name),
        journal: r.fulljournalname || r.source,
        year: Number.isFinite(year) ? year : undefined,
        url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid || id}/`,
        source: 'pubmed',
      });
    }
    return out;
  });
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const VERIFY_THRESHOLD = 0.6;
const MISMATCH_THRESHOLD = 0.3;

/**
 * Not every legitimate reference is a journal article. A WHO manual, a pharmacopoeia chapter or a
 * vendor protocol will never appear in Crossref or PubMed, and reporting them as "may not exist"
 * puts a fabrication flag on the most authoritative source a protocol can cite. Recognise them and
 * say plainly that they need checking at the source instead.
 */
const INSTITUTIONAL_HOSTS = [
  'who.int', 'cdc.gov', 'fda.gov', 'nih.gov', 'nist.gov', 'epa.gov', 'ema.europa.eu', 'ich.org',
  'iso.org', 'usp.org', 'oecd.org', 'clsi.org', 'ecdc.europa.eu', 'oie.int', 'woah.org',
  'nanoporetech.com', 'illumina.com', 'neb.com', 'thermofisher.com', 'qiagen.com', 'promega.com',
  'takarabio.com', 'beckman.com', 'agilent.com', 'bio-rad.com', 'zymoresearch.com', 'pacb.com',
  '10xgenomics.com', 'twistbioscience.com', 'idtdna.com', 'protocols.io',
];

const INSTITUTIONAL_NAMES = /world health organization|\bwho\b|centers for disease control|\bcdc\b|food and drug administration|european medicines agency|international organization for standardization|pharmacopeia|pharmacopoeia|\bclsi\b|\bich\b guideline|laboratory biosafety manual|oxford nanopore|illumina|new england biolabs|thermo fisher|qiagen|promega|takara|beckman coulter|agilent|bio-rad/i;

function institutionalSource(citation: string, url: string): string | null {
  const host = INSTITUTIONAL_HOSTS.find((h) => url.toLowerCase().includes(h));
  if (host) return host;
  return INSTITUTIONAL_NAMES.test(citation) ? 'a standards body or manufacturer' : null;
}

/** Best title match across Crossref then PubMed, and whether any registry answered at all. */
async function searchByTitle(title: string): Promise<{ best: { rec: ResolvedRecord; sim: number } | null; reachable: boolean }> {
  let reachable = false;
  let best: { rec: ResolvedRecord; sim: number } | null = null;
  for (const search of [searchCrossref, searchPubmed]) {
    try {
      const hits = await search(title, 5);
      reachable = true;
      for (const rec of hits) {
        const sim = titleSimilarity(title, rec.title);
        if (!best || sim > best.sim) best = { rec, sim };
      }
      if (best && best.sim >= VERIFY_THRESHOLD) break;
    } catch (e) {
      if (!(e instanceof RegistryUnreachableError)) throw e;
    }
  }
  return { best, reachable };
}

export async function verifyCitation(ref: { citation: string; doiOrUrl?: string }): Promise<VerificationResult> {
  const citation = String(ref.citation || '').trim();
  const doi = extractDoi(ref.doiOrUrl || '') || extractDoi(citation);
  const claimedTitle = extractTitleFromCitation(citation);

  // Path 1: a DOI is claimed. Resolve it and check it points at THIS paper.
  if (doi) {
    let rec: ResolvedRecord | null;
    try {
      rec = await resolveDoi(doi);
    } catch (e) {
      if (e instanceof RegistryUnreachableError) {
        return { status: 'UNCHECKED', confidence: 0, note: `${e.message}. This citation has not been verified.` };
      }
      throw e;
    }
    if (!rec) {
      // A dead DOI is not the end of the enquiry. The paper may be real and merely mis-cited, which
      // is a different problem from a fabricated reference — and the fix is different too.
      const { best } = claimedTitle.length >= 10 ? await searchByTitle(claimedTitle) : { best: null };
      if (best && best.sim >= VERIFY_THRESHOLD) {
        return {
          status: 'MISMATCH', confidence: best.sim, resolved: best.rec, canonical: formatCanonical(best.rec),
          note: `DOI ${doi} does not exist, but this paper does: "${best.rec.title}"${best.rec.doi ? ` at DOI ${best.rec.doi}` : ''}. The citation has the right paper and the wrong identifier.`,
        };
      }
      return {
        status: 'NOT_FOUND', confidence: best?.sim ?? 0, resolved: best?.rec,
        canonical: best ? formatCanonical(best.rec) : undefined,
        note: best
          ? `DOI ${doi} does not exist, and no close match for this title was found either. Closest record: "${best.rec.title}" (${(best.sim * 100).toFixed(0)}%).`
          : `DOI ${doi} does not exist in Crossref, and no paper with this title was found in Crossref or PubMed. Treat this reference as fabricated unless you can produce the source.`,
      };
    }
    const sim = titleSimilarity(claimedTitle, rec.title);
    if (sim >= VERIFY_THRESHOLD) {
      return { status: 'VERIFIED', confidence: sim, resolved: rec, canonical: formatCanonical(rec), note: `DOI resolves and title matches (${(sim * 100).toFixed(0)}%).` };
    }
    if (sim < MISMATCH_THRESHOLD) {
      return {
        status: 'MISMATCH', confidence: sim, resolved: rec, canonical: formatCanonical(rec),
        note: `DOI ${doi} exists but resolves to a different paper: "${rec.title}". The citation text does not match.`,
      };
    }
    // The old behaviour called this VERIFIED with a "review manually" note, so an invented title on a
    // real DOI counted towards the score. It is the commonest way a fabricated citation survives.
    return {
      status: 'MISMATCH', confidence: sim, resolved: rec, canonical: formatCanonical(rec),
      note: `DOI ${doi} resolves, but only ${(sim * 100).toFixed(0)}% of the citation text matches the record. The registry title is "${rec.title}". Replace the citation text with the registry record.`,
    };
  }

  // Path 2: no DOI.
  const institution = institutionalSource(citation, ref.doiOrUrl || '');
  if (institution) {
    return {
      status: 'UNCHECKED',
      confidence: 0,
      note: `This is a document from ${institution === 'a standards body or manufacturer' ? institution : institution}, not a journal article, so it is not indexed in Crossref or PubMed. Confirm it against the source URL — absence from a registry says nothing about a document of this kind.`,
    };
  }

  // Search by title in Crossref, then PubMed.
  if (claimedTitle.length < 10) {
    return { status: 'NOT_FOUND', confidence: 0, note: 'Citation is too short to search.' };
  }

  const { best, reachable } = await searchByTitle(claimedTitle);

  if (!reachable) {
    return { status: 'UNCHECKED', confidence: 0, note: 'No literature registry could be reached. This citation has not been verified.' };
  }
  if (best && best.sim >= VERIFY_THRESHOLD) {
    return { status: 'VERIFIED', confidence: best.sim, resolved: best.rec, canonical: formatCanonical(best.rec), note: `Matched a registry record by title (${(best.sim * 100).toFixed(0)}%).` };
  }
  return {
    status: 'NOT_FOUND', confidence: best?.sim ?? 0,
    resolved: best?.rec,
    canonical: best ? formatCanonical(best.rec) : undefined,
    note: best
      ? `No confident match. Closest registry record: "${best.rec.title}" (${(best.sim * 100).toFixed(0)}%).`
      : 'No matching record found in Crossref or PubMed. Treat this reference as fabricated unless you can produce the source.',
  };
}

export async function verifyAllReferences<T extends { citation: string; doiOrUrl?: string }>(
  refs: T[],
  concurrency = 3
): Promise<(T & { verification: VerificationResult })[]> {
  const out: (T & { verification: VerificationResult })[] = new Array(refs.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, refs.length) }, async () => {
    while (i < refs.length) {
      const idx = i++;
      const ref = refs[idx];
      let verification: VerificationResult;
      try {
        verification = await verifyCitation(ref);
      } catch (e) {
        verification = { status: 'UNCHECKED', confidence: 0, note: `Verification failed: ${e instanceof Error ? e.message : String(e)}` };
      }
      out[idx] = { ...ref, verification };
    }
  });
  await Promise.all(workers);
  return out;
}
