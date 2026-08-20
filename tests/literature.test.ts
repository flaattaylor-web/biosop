import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { _setTransport, verifyCitation, titleSimilarity, extractDoi, resolveDoi } from '../src/server/literature';

const REGISTRY: Record<string, unknown> = {
  '10.1038/nmeth.2019': { DOI: '10.1038/nmeth.2019', title: ['Fiji: an open-source platform for biological-image analysis'], author: [{ given: 'J', family: 'Schindelin' }], 'container-title': ['Nature Methods'], issued: { 'date-parts': [[2012]] } },
  // The real Crossref shape for Voinnet 2003, the standard p19 silencing-suppressor citation. It
  // resolves, the title matches its own record exactly, and it is retracted. Duplicated notices are
  // deliberate: Crossref returns both the publisher and Retraction Watch deposits.
  '10.1046/j.1365-313X.2003.01676.x': {
    DOI: '10.1046/j.1365-313X.2003.01676.x',
    title: ['Retracted: An enhanced transient expression system in plants based on suppression of gene silencing by the p19 protein of tomato bushy stunt virus'],
    author: [{ given: 'O', family: 'Voinnet' }], 'container-title': ['The Plant Journal'], issued: { 'date-parts': [[2003]] },
    'updated-by': [
      { DOI: '10.1111/tpj.12893', type: 'correction', label: 'Correction', source: 'retraction-watch', updated: { 'date-parts': [[2015, 6, 8]] } },
      { DOI: '10.1111/tpj.13066', type: 'retraction', label: 'Retraction', source: 'retraction-watch', updated: { 'date-parts': [[2015, 11, 13]] } },
      { DOI: '10.1111/tpj.13066', type: 'retraction', label: 'Retraction', source: 'publisher', updated: { 'date-parts': [[2015, 11, 13]] } },
    ],
  },
  '10.1000/concern': {
    DOI: '10.1000/concern', title: ['A paper under an expression of concern'], author: [{ given: 'A', family: 'Author' }],
    'container-title': ['Journal'], issued: { 'date-parts': [[2019]] },
    'updated-by': [{ DOI: '10.1000/eoc', type: 'expression_of_concern', label: 'Expression of concern', source: 'publisher', updated: { 'date-parts': [[2021, 3, 1]] } }],
  },
  '10.1000/corrected': {
    DOI: '10.1000/corrected', title: ['A paper that was merely corrected'], author: [{ given: 'B', family: 'Author' }],
    'container-title': ['Journal'], issued: { 'date-parts': [[2018]] },
    'updated-by': [{ DOI: '10.1000/corr', type: 'correction', label: 'Correction', source: 'publisher', updated: { 'date-parts': [[2019, 1, 1]] } }],
  },
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
  it('RETRACTED outranks a perfect title match', async () => {
    const r = await verifyCitation({
      citation: 'Voinnet O, Rivas S, Mestre P, Baulcombe D. An enhanced transient expression system in plants based on suppression of gene silencing by the p19 protein of tomato bushy stunt virus. The Plant Journal. 2003;33(5):949-956.',
      doiOrUrl: '10.1046/j.1365-313X.2003.01676.x',
    });
    expect(r.status).toBe('RETRACTED');
    expect(r.note).toMatch(/retract/i);
    expect(r.note).toContain('10.1111/tpj.13066');
    expect(r.note).toContain('2015-11-13');
  });
  it('deduplicates the publisher and Retraction Watch deposits of the same notice', async () => {
    const rec = await resolveDoi('10.1046/j.1365-313X.2003.01676.x');
    expect(rec?.updates?.filter((u) => u.type === 'retraction')).toHaveLength(1);
  });
  it('an expression of concern warns but does not invalidate', async () => {
    const r = await verifyCitation({ citation: 'Author A. A paper under an expression of concern. Journal. 2019.', doiOrUrl: '10.1000/concern' });
    expect(r.status).toBe('VERIFIED');
    expect(r.note).toMatch(/expression of concern/i);
  });
  it('a correction is not a withdrawal', async () => {
    const r = await verifyCitation({ citation: 'Author B. A paper that was merely corrected. Journal. 2018.', doiOrUrl: '10.1000/corrected' });
    expect(r.status).toBe('VERIFIED');
    expect(r.note).not.toMatch(/retract/i);
  });
  it('a record with no updated-by is unaffected', async () => {
    const r = await verifyCitation({ citation: 'Schindelin J (2012). Fiji: an open-source platform for biological-image analysis. Nat Methods.', doiOrUrl: '10.1038/nmeth.2019' });
    expect(r.status).toBe('VERIFIED');
    expect(r.note).not.toMatch(/retract|concern/i);
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
