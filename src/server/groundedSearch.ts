/**
 * Gemini with Google Search grounding, cross-checked against Crossref/PubMed.
 *
 * Grounding gives us real URLs the model actually consulted, instead of DOIs it
 * recalled from training. We then push any DOI we can extract through the
 * registry verifier, so the UI can show a provenance badge on each source.
 */
import { GoogleGenAI } from '@google/genai';
import { extractDoi, verifyCitation, VerificationResult } from './literature';
import { getEnv } from './env';

export interface GroundedSource {
  uri: string;
  title: string;
  doi?: string;
  verification?: VerificationResult;
  /** How this source came to be shown. */
  provenance: 'RETRIEVED';
}

export interface GroundedSearchResult {
  answer: string;
  sources: GroundedSource[];
  /** Search queries the model actually issued (from grounding metadata). */
  searchQueries: string[];
  groundingAvailable: boolean;
}

function client(): GoogleGenAI {
  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');
  return new GoogleGenAI({ apiKey });
}

const model = () => getEnv('GEMINI_MODEL') || 'gemini-2.5-flash';

export async function groundedLiteratureSearch(params: {
  query: string;
  organism?: string;
  verifySources?: boolean;
}): Promise<GroundedSearchResult> {
  const ai = client();
  const prompt =
    `You are assisting a molecular biology lab. Using web search, find peer-reviewed or manufacturer ` +
    `protocol sources relevant to: "${params.query}"` +
    (params.organism ? ` (organism/host: ${params.organism})` : '') +
    `.\n\nSummarise the consensus reaction conditions (concentrations, temperatures, times) and cite ` +
    `sources inline. Prefer primary literature and vendor protocol documents. Include DOIs where they exist. ` +
    `If sources disagree, say so explicitly rather than averaging.`;

  const response = await ai.models.generateContent({
    model: model(),
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });

  const cand = response.candidates?.[0];
  const meta = (cand as { groundingMetadata?: {
    groundingChunks?: { web?: { uri?: string; title?: string } }[];
    webSearchQueries?: string[];
  } } | undefined)?.groundingMetadata;

  const chunks = meta?.groundingChunks || [];
  const seen = new Set<string>();
  const sources: GroundedSource[] = [];
  for (const c of chunks) {
    const uri = c.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const title = c.web?.title || uri;
    const doi = extractDoi(uri) || extractDoi(title) || undefined;
    sources.push({ uri, title, doi, provenance: 'RETRIEVED' });
  }

  if (params.verifySources !== false) {
    await Promise.all(
      sources.filter((s) => s.doi).map(async (s) => {
        try {
          s.verification = await verifyCitation({ citation: s.title, doiOrUrl: s.doi });
        } catch {
          s.verification = { status: 'UNCHECKED', confidence: 0, note: 'Verification failed.' };
        }
      })
    );
  }

  return {
    answer: response.text || '',
    sources,
    searchQueries: meta?.webSearchQueries || [],
    groundingAvailable: chunks.length > 0,
  };
}
