/**
 * Client-side search over the kit index. Tokenised scoring — no server round-trip.
 */
import type { KitIndexEntry } from '../types';

let cache: KitIndexEntry[] | null = null;
let loading: Promise<KitIndexEntry[]> | null = null;

export async function loadKitIndex(): Promise<KitIndexEntry[]> {
  if (cache) return cache;
  if (!loading) {
    loading = fetch('/data/kit-index.json', { cache: 'force-cache' })
      .then((r) => { if (!r.ok) throw new Error(`kit index HTTP ${r.status}`); return r.json(); })
      .then((j: { entries: KitIndexEntry[] }) => { cache = j.entries || []; return cache; })
      .catch(() => { cache = []; return cache; });
  }
  return loading;
}

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const catNorm = (s: string) => String(s || '').toLowerCase().replace(/[\s\-–—_./#]/g, '');

export interface KitSearchOptions {
  vendor?: string;
  category?: string;
  verifiedOnly?: boolean;
  limit?: number;
}

export function searchKits(entries: KitIndexEntry[], query: string, opts: KitSearchOptions = {}): KitIndexEntry[] {
  const q = norm(query);
  const tokens = q.split(' ').filter(Boolean);
  const qCat = catNorm(query);
  const limit = opts.limit ?? 200;

  const scored = entries
    .filter((e) => (!opts.vendor || e.vendorShort === opts.vendor) && (!opts.category || e.category === opts.category) && (!opts.verifiedOnly || e.verified))
    .map((e) => {
      if (!tokens.length) return { e, score: 1 };
      let score = 0;
      const name = norm(e.productName), vendor = norm(`${e.vendor} ${e.vendorShort}`), sub = norm(e.subcategory || ''), desc = norm(e.description);
      const apps = norm((e.applications || []).join(' ')), cat = norm(e.category);
      // exact catalog number match is the strongest signal
      if (qCat.length >= 3 && e.catalogNumbers.some((c) => catNorm(c) === qCat)) score += 100;
      else if (qCat.length >= 3 && e.catalogNumbers.some((c) => catNorm(c).includes(qCat) || qCat.includes(catNorm(c)))) score += 40;
      for (const t of tokens) {
        if (name === t) score += 30;
        else if (name.split(' ').includes(t)) score += 12;
        else if (name.includes(t)) score += 8;
        if (vendor.split(' ').includes(t)) score += 6;
        if (sub.includes(t)) score += 4;
        if (cat.includes(t)) score += 3;
        if (apps.includes(t)) score += 3;
        if (desc.includes(t)) score += 1;
      }
      // all tokens present somewhere?
      const hay = `${name} ${vendor} ${sub} ${cat} ${apps} ${desc} ${e.catalogNumbers.map(catNorm).join(' ')}`;
      if (tokens.every((t) => hay.includes(t))) score += 5;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.productName.localeCompare(b.e.productName));
  return scored.slice(0, limit).map((x) => x.e);
}

export function facets(entries: KitIndexEntry[]): { vendors: [string, number][]; categories: [string, number][] } {
  const v: Record<string, number> = {}; const c: Record<string, number> = {};
  for (const e of entries) { v[e.vendorShort] = (v[e.vendorShort] || 0) + 1; c[e.category] = (c[e.category] || 0) + 1; }
  const sortDesc = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) as [string, number][];
  return { vendors: sortDesc(v), categories: sortDesc(c) };
}
