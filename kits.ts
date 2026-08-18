/**
 * Commercial-kit discovery and grounding.
 *
 *  discoverKits(query)   — Gemini + Google Search grounding finds candidate vendor
 *                          product pages; each page is fetched and a KitIndexEntry is
 *                          extracted with the SAME verification bar as the shipped
 *                          catalog: `verified` only if the catalog number appears in
 *                          the fetched page text.
 *  fetchReferenceDoc(url)— fetches a vendor protocol page/PDF for use as a
 *                          generation attachment (PDF inline, HTML as text).
 */
import { GoogleGenAI, Type } from '@google/genai';
import type { KitIndexEntry } from '../types';
import { getEnv } from './env';
import { defaultModel, getAiClient } from './gemini';

const UA = 'Mozilla/5.0 (compatible; BioSOP-Generator/1.0; +https://taylorflaat-biosop.org)';
const MAX_HTML_TEXT = 60_000;
const MAX_PDF_BYTES = 12 * 1024 * 1024;

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|table|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&deg;/g, '°').replace(/&micro;/g, 'µ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export interface FetchedDoc {
  url: string;
  finalUrl: string;
  mimeType: string;
  /** For HTML: extracted text. For PDF: empty (see base64). */
  text: string;
  /** For PDF: base64 bytes to attach inline. */
  base64?: string;
  bytes: number;
  status: number;
}

function toBase64(u8: Uint8Array): string {
  // Chunked to avoid call-stack limits on large PDFs; works in Node and Workers.
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CH)));
  return btoa(bin);
}

export async function fetchReferenceDoc(url: string, timeoutMs = 20_000): Promise<FetchedDoc> {
  const u = new URL(url); // throws on invalid
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) URLs are allowed.');
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(u.toString(), { headers: { 'User-Agent': UA, Accept: 'text/html,application/pdf,application/xhtml+xml,*/*;q=0.8' }, redirect: 'follow', signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(res.url).host}`);
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const isPdf = ct.includes('application/pdf') || /\.pdf(\?|$)/i.test(res.url);
  if (isPdf) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > MAX_PDF_BYTES) throw new Error(`PDF is too large (${(buf.length / 1e6).toFixed(1)} MB; limit ${MAX_PDF_BYTES / 1e6} MB).`);
    return { url, finalUrl: res.url, mimeType: 'application/pdf', text: '', base64: toBase64(buf), bytes: buf.length, status: res.status };
  }
  const html = await res.text();
  const text = htmlToText(html).slice(0, MAX_HTML_TEXT);
  return { url, finalUrl: res.url, mimeType: 'text/plain', text, bytes: html.length, status: res.status };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

const RESELLER_HOSTS = /amazon\.|ebay\.|alibaba\.|fishersci\.|vwr\.|sigmaaldrich\.com\/.*\/product\/(?!sigma|mm|sial|aldrich)|biocompare|labx\.|scientificlabs|coleparmer/i;
const KNOWN_VENDOR_HOSTS: Record<string, string> = {
  'neb.com': 'NEB', 'thermofisher.com': 'Thermo Fisher', 'qiagen.com': 'QIAGEN', 'illumina.com': 'Illumina', 'bio-rad.com': 'Bio-Rad',
  'promega.com': 'Promega', 'takarabio.com': 'Takara', 'zymoresearch.com': 'Zymo', 'agilent.com': 'Agilent', '10xgenomics.com': '10x Genomics',
  'idtdna.com': 'IDT', 'roche.com': 'Roche', 'sequencing.roche.com': 'Roche', 'sigmaaldrich.com': 'MilliporeSigma', 'merckmillipore.com': 'MilliporeSigma',
  'beckman.com': 'Beckman Coulter', 'pacb.com': 'PacBio', 'nanoporetech.com': 'Oxford Nanopore', 'twistbioscience.com': 'Twist', 'abcam.com': 'Abcam',
  'cellsignal.com': 'CST', 'lonza.com': 'Lonza', 'mirusbio.com': 'Mirus', 'rndsystems.com': 'Bio-Techne', 'bio-techne.com': 'Bio-Techne',
  'cytivalifesciences.com': 'Cytiva', 'mn-net.com': 'Macherey-Nagel', 'meridianbioscience.com': 'Meridian', 'norgenbiotek.com': 'Norgen',
  'omegabiotek.com': 'Omega Bio-tek', 'biotium.com': 'Biotium', 'lgcgroup.com': 'LGC', 'biosearchtech.com': 'LGC Biosearch', 'genscript.com': 'GenScript',
  'miltenyibiotec.com': 'Miltenyi', 'bdbiosciences.com': 'BD', 'vazyme.com': 'Vazyme', 'kapabiosystems.com': 'Roche', 'azenta.com': 'Azenta',
};

function vendorFromHost(host: string): string | undefined {
  const h = host.replace(/^www\./, '');
  for (const [k, v] of Object.entries(KNOWN_VENDOR_HOSTS)) if (h === k || h.endsWith('.' + k)) return v;
  return undefined;
}

export interface DiscoveryCandidate { url: string; title: string; vendorGuess?: string }

/** Step 1: grounded search → candidate vendor URLs. */
export async function findCandidatePages(query: string, vendorHint?: string, max = 4): Promise<{ candidates: DiscoveryCandidate[]; searchQueries: string[]; note: string }> {
  const ai = getAiClient();
  const prompt =
    `Find the OFFICIAL manufacturer product page (and if possible the protocol/manual page) for this laboratory kit or reagent: "${query}"` +
    (vendorHint ? ` from ${vendorHint}` : '') +
    `. Prefer the manufacturer's own website over resellers. Reply with the product name, vendor, catalog number if shown, and the URLs you found.`;
  const response = await ai.models.generateContent({ model: defaultModel(), contents: prompt, config: { tools: [{ googleSearch: {} }] } });
  const cand = response.candidates?.[0] as { groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[]; webSearchQueries?: string[] } } | undefined;
  const chunks = cand?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const candidates: DiscoveryCandidate[] = [];
  for (const c of chunks) {
    const uri = c.web?.uri; if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    let host = '';
    try { host = new URL(uri).host; } catch { continue; }
    if (RESELLER_HOSTS.test(uri)) continue;
    candidates.push({ url: uri, title: c.web?.title || uri, vendorGuess: vendorFromHost(host) });
  }
  // Known vendors first, then anything else, cap.
  candidates.sort((a, b) => Number(!!b.vendorGuess) - Number(!!a.vendorGuess));
  return {
    candidates: candidates.slice(0, max),
    searchQueries: cand?.groundingMetadata?.webSearchQueries || [],
    note: chunks.length ? `${chunks.length} grounded source(s) returned; ${candidates.length} after filtering resellers.` : 'Search grounding returned no sources.',
  };
}

const kitEntrySchema = {
  type: Type.OBJECT,
  properties: {
    vendor: { type: Type.STRING }, vendorShort: { type: Type.STRING }, productName: { type: Type.STRING },
    catalogNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
    category: { type: Type.STRING, enum: [
      'PCR & Amplification', 'qPCR & Digital PCR', 'Reverse Transcription', 'Cloning & DNA Assembly', 'Nucleic Acid Purification', 'NGS Library Preparation',
      'NGS Library QC & Quantification', 'Single-Cell & Spatial', 'Long-Read Sequencing', 'CRISPR & Genome Editing', 'Epigenetics & Methylation',
      'Protein Expression & Purification', 'Western Blot & Immunoassay', 'Cell Culture & Transfection', 'Cell Analysis & Viability', 'Diagnostics & Pathogen Detection',
      'Enzymes & Modifying Reagents', 'Oligos, Probes & Standards'] },
    subcategory: { type: Type.STRING }, description: { type: Type.STRING }, protocolUrl: { type: Type.STRING }, storage: { type: Type.STRING },
    kitSize: { type: Type.STRING }, applications: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyParameters: { type: Type.OBJECT, properties: { input: { type: Type.STRING }, time: { type: Type.STRING }, notes: { type: Type.STRING } } },
    isProductPage: { type: Type.BOOLEAN, description: 'true only if this page describes ONE specific purchasable product' },
  },
  required: ['vendor', 'vendorShort', 'productName', 'catalogNumbers', 'category', 'description', 'isProductPage'],
};

/**
 * The verification bar for discovered kits: a catalog number counts as confirmed
 * only if it appears in the fetched page text (ignoring spaces, dashes and dots
 * so "M0492 S" / "M-0492-S" still match). Numbers shorter than 3 characters are
 * never accepted — too easy to match by accident.
 */
export function confirmCatalogNumbers(catalogNumbers: string[], pageText: string): string[] {
  const norm = (x: string) => x.replace(/[\s\-–—_./#]/g, '').toLowerCase();
  const pageNorm = norm(pageText);
  return catalogNumbers.filter((c) => norm(c).length >= 3 && pageNorm.includes(norm(c)));
}

/** Step 2: fetch a candidate page and extract a KitIndexEntry, verifying the catalog number against the page text. */
export async function extractKitFromPage(url: string, vendorHint?: string): Promise<KitIndexEntry | null> {
  const doc = await fetchReferenceDoc(url, 15_000);
  const pageText = doc.mimeType === 'application/pdf' ? '' : doc.text;
  if (!pageText || pageText.length < 200) return null; // PDFs / empty pages are not product pages for extraction purposes

  const ai = getAiClient();
  const prompt =
    `Below is the text of a web page (${doc.finalUrl}). If it is a manufacturer product page for ONE specific laboratory kit/reagent, extract the product ` +
    `record. Catalog numbers must be copied EXACTLY as they appear on the page — never invent or "complete" them. If the page lists no catalog number, ` +
    `return an empty catalogNumbers array. Keep description to 1–2 factual sentences from the page. If this is not a single-product page (a category ` +
    `listing, article, reseller, or search page), set isProductPage=false.` + (vendorHint ? ` Vendor hint: ${vendorHint}.` : '') +
    `\n\n=== PAGE TEXT (truncated) ===\n${pageText.slice(0, 40_000)}\n=== END ===`;
  const response = await ai.models.generateContent({
    model: defaultModel(), contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema: kitEntrySchema },
  });
  const raw = JSON.parse(response.text || '{}') as Partial<KitIndexEntry> & { isProductPage?: boolean };
  if (!raw.isProductPage || !raw.productName) return null;

  const cats = (raw.catalogNumbers || []).map((c) => String(c).trim()).filter(Boolean);
  const confirmed = confirmCatalogNumbers(cats, pageText);
  const verified = confirmed.length > 0;
  const vendorShort = raw.vendorShort || vendorFromHost(new URL(doc.finalUrl).host) || raw.vendor || 'Unknown';
  const idBase = confirmed[0] || cats[0] || raw.productName;
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return {
    id: `${slug(vendorShort)}-${slug(idBase)}`,
    vendor: raw.vendor || vendorShort,
    vendorShort,
    productName: raw.productName,
    catalogNumbers: cats,
    category: raw.category || 'Enzymes & Modifying Reagents',
    subcategory: raw.subcategory,
    description: raw.description || '',
    productUrl: doc.finalUrl,
    protocolUrl: raw.protocolUrl && /^https?:\/\//.test(raw.protocolUrl) ? raw.protocolUrl : undefined,
    storage: raw.storage,
    kitSize: raw.kitSize,
    applications: raw.applications || [],
    keyParameters: (raw.keyParameters as Record<string, string>) || {},
    sourceUrl: doc.finalUrl,
    retrievedAt: new Date().toISOString().slice(0, 10),
    verified,
    verificationNote: verified
      ? `Catalog number(s) ${confirmed.join(', ')} found in the fetched page text.`
      : cats.length
        ? `Catalog number(s) ${cats.join(', ')} were reported by the model but NOT found in the fetched page text — treat as unverified.`
        : 'No catalog number visible on the fetched page.',
    source: 'discovered',
  };
}

export interface DiscoveryResult {
  query: string;
  candidates: DiscoveryCandidate[];
  entries: KitIndexEntry[];
  errors: { url: string; error: string }[];
  note: string;
}

export async function discoverKits(query: string, vendorHint?: string): Promise<DiscoveryResult> {
  const { candidates, note } = await findCandidatePages(query, vendorHint);
  const entries: KitIndexEntry[] = [];
  const errors: { url: string; error: string }[] = [];
  await Promise.all(candidates.map(async (c) => {
    try {
      const e = await extractKitFromPage(c.url, c.vendorGuess || vendorHint);
      if (e) entries.push(e);
    } catch (err) {
      errors.push({ url: c.url, error: err instanceof Error ? err.message.slice(0, 200) : String(err) });
    }
  }));
  // Verified first, then by name.
  entries.sort((a, b) => Number(b.verified) - Number(a.verified) || a.productName.localeCompare(b.productName));
  return { query, candidates, entries, errors, note };
}

export function isAiConfigured(): boolean {
  return !!getEnv('GEMINI_API_KEY');
}
