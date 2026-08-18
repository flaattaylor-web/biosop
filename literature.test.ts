import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { _setTransport, verifyCitation, titleSimilarity, extractDoi, resolveDoi } from '../src/server/literature';

const REGISTRY: Record<string, unknown> = {
  '10.1038/nmeth.2019': { DOI: '10.1038/nmeth.2019', title: ['Fiji: an open-source platform for biological-image analysis'], author: [{ given: 'J', family: 'Schindelin' }], 'container-title': ['Nature Methods'], issued: { 'date-parts': [[2012]] } },
};

beforeEach(() => {
  _setTransport(async (url) => {
    const m = /works\/(.+)$/.exec(url);
    if (m) {
      const w = REGISTRY[decodeURIComponent(m[1])];
      return { ok: !!w, status: w ? 200 : 404, json: async () => ({ message: w }) };
    }
    if (url.includes('query.bibliographic')) return { ok: true, status: 200, json: async () => ({ message: { items: Object.values(REGISTRY) } }) };
    return { ok: true, status: 200, json: async () => ({ esearchresult: { idlist: [] } }) };
  });
});
afterEach(() => _setTransport(null));

describe('literature verification', () => {
  it('VERIFIED: real DOI + matching title', async () => {
    const r = await verifyCitation({ citation: 'Schindelin J (2012). Fiji: an open-source platform for biological-image analysis. Nat Methods.', doiOrUrl: '10.1038/nmeth.2019' });
    expect(r.status).toBe('VERIFIED');
  });
  it('NOT_FOUND: plausible fake DOI is rejected', async () => {
    const r = await verifyCitation({ citation: 'Smith (2019). Anything. Nature Methods.', doiOrUrl: '10.1038/nmeth.99999' });
    expect(r.status).toBe('NOT_FOUND');
  });
  it('MISMATCH: real DOI attached to the wrong paper is caught', async () => {
    const r = await verifyCitation({ citation: 'Jones (2015). Optimized qPCR master mix for low-input RNA. NAR.', doiOrUrl: '10.1038/nmeth.2019' });
    expect(r.status).toBe('MISMATCH');
    expect(r.resolved?.title).toMatch(/Fiji/);
  });
  it('UNCHECKED, never NOT_FOUND, when the registry is unreachable', async () => {
    _setTransport(async () => { throw new Error('ECONNREFUSED'); });
    const r = await verifyCitation({ citation: 'x', doiOrUrl: '10.1038/nmeth.2019' });
    expect(r.status).toBe('UNCHECKED');
  });
  it('resolveDoi distinguishes 404 (null) from outage (throws)', async () => {
    expect(await resolveDoi('10.1038/nmeth.99999')).toBeNull();
    _setTransport(async () => { throw new Error('down'); });
    await expect(resolveDoi('10.1038/nmeth.2019')).rejects.toThrow(/Crossref/);
  });
  it('extractDoi handles URLs and trailing punctuation', () => {
    expect(extractDoi('https://doi.org/10.1093/nar/gkab1112.')).toBe('10.1093/nar/gkab1112');
    expect(extractDoi('no doi here')).toBeNull();
  });
  it('titleSimilarity is robust to punctuation and case, and damps tiny overlaps', () => {
    expect(titleSimilarity('Fiji: an open-source platform', 'FIJI AN OPEN SOURCE PLATFORM')).toBe(1);
    expect(titleSimilarity('PCR', 'PCR-based detection of many things in a long title')).toBeLessThan(0.5);
  });
});
