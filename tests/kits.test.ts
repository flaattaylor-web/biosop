import { describe, it, expect } from 'vitest';
import { htmlToText } from '../src/server/kits';
import { searchKits, facets } from '../src/client/kitSearch';
import type { KitIndexEntry } from '../src/types';
import { readFileSync } from 'node:fs';

describe('htmlToText', () => {
  it('strips scripts/styles/tags and decodes entities', () => {
    const t = htmlToText('<html><head><style>.a{}</style><script>var x=1;</script></head><body><h1>Q5&reg; Master&nbsp;Mix</h1><p>Cat # M0492S &amp; M0492L</p><table><tr><td>Store at &minus;20&deg;C</td></tr></table></body></html>'.replace('&reg;', '&#174;').replace('&minus;', '-'));
    expect(t).toContain('Master Mix');
    expect(t).toContain('M0492S & M0492L');
    expect(t).toContain('-20°C');
    expect(t).not.toMatch(/<|var x/);
  });
});

describe('kit index integrity (shipped catalog)', () => {
  const idx = JSON.parse(readFileSync('public/data/kit-index.json', 'utf8')) as { entries: KitIndexEntry[] };
  it('has hundreds of entries, all with catalog numbers, URLs and sources', () => {
    expect(idx.entries.length).toBeGreaterThan(300);
    for (const e of idx.entries) {
      expect(e.catalogNumbers.length, e.productName).toBeGreaterThan(0);
      expect(e.productUrl, e.productName).toMatch(/^https?:\/\//);
      expect(e.sourceUrl, e.productName).toMatch(/^https?:\/\//);
      expect(typeof e.verified).toBe('boolean');
    }
  });
  it('has unique ids', () => {
    const ids = new Set(idx.entries.map((e) => e.id));
    expect(ids.size).toBe(idx.entries.length);
  });
  it('is fully verified (every entry traced to a fetched vendor page)', () => {
    expect(idx.entries.filter((e) => !e.verified)).toHaveLength(0);
  });
  it('searches by exact catalog number, by name tokens, and filters by vendor/category', () => {
    const r1 = searchKits(idx.entries, '74104');
    expect(r1[0]?.productName).toMatch(/RNeasy Mini/);
    const r2 = searchKits(idx.entries, 'q5 master mix', { vendor: 'NEB' });
    expect(r2[0]?.productName).toMatch(/Q5/);
    const r3 = searchKits(idx.entries, '', { category: 'CRISPR & Genome Editing' });
    expect(r3.length).toBeGreaterThan(5);
    expect(r3.every((e) => e.category === 'CRISPR & Genome Editing')).toBe(true);
    const f = facets(idx.entries);
    expect(f.vendors.length).toBeGreaterThanOrEqual(8);
  });
});

import { confirmCatalogNumbers } from '../src/server/kits';

describe('discovery verification bar', () => {
  const page = 'Q5 High-Fidelity 2X Master Mix. Catalog # M0492S (100 rxns), M0492L (500 rxns). Store at -20 °C.';
  it('confirms numbers present on the page, tolerant of spacing/dashes', () => {
    expect(confirmCatalogNumbers(['M0492S', 'M-0492-L', 'M0492 X'], page)).toEqual(['M0492S', 'M-0492-L']);
  });
  it('rejects a model-invented number that is not on the page (the hallucination case)', () => {
    expect(confirmCatalogNumbers(['M0493S'], page)).toEqual([]);
    expect(confirmCatalogNumbers(['E5520S'], page)).toEqual([]);
  });
  it('never accepts trivially short tokens', () => {
    expect(confirmCatalogNumbers(['Q5', '20', 'M0'], page)).toEqual([]);
  });
});
