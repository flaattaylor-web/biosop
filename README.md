# BioSOP Generator v3

Generates biotech SOPs and reaction sheets with Gemini, then **independently verifies** them: every volume is recomputed from C₁V₁ = C₂V₂ by a tested calculation engine, every citation can be checked against Crossref/PubMed, and every document is versioned, signable, and audit-logged.

## What changed in v3 (vs. the AI Studio scaffold)

| Area | Before | Now |
|---|---|---|
| Accuracy score | Clamped to 99.0–99.9; could not fail; asserted ISO/GLP conformance the code never checked | `src/core/auditor.ts` — real findings, real failures, coverage shown next to score, explicit "not checked" list, no compliance claims |
| Volumes | Model's numbers, silently rewritten if >15% off, silently accepted under that; unit conversion only mM→µM, µM→nM | `src/core/units.ts` + `reactionMath.ts` — full unit algebra (M…fM, g/L…pg/mL, U/µL, %, X, MW-aware mass↔molar), 2% tolerance, every deviation surfaced as a finding with the derivation shown |
| Master mix | Template scaled into the mix | PER_SAMPLE components excluded from mix, added per tube |
| Persistence | None — everything lost on refresh | **Browser-local by default** (IndexedDB): immutable versions, content-hash e-signatures, append-only audit log, diffs; encrypted vault backup/restore. Optional shared server storage (SQLite/D1). |
| Citations | Model-recalled DOIs rendered as live links | Crossref/PubMed verification with VERIFIED / MISMATCH / NOT_FOUND / UNCHECKED status; Gemini Search grounding for retrieval |
| Excel | Hardcoded values | Named ranges `N_RXN`, `OVERFLOW`, `RXN_VOL`; every run volume is a formula; sheet protected except inputs |
| Word | No header/footer, no page numbers, no signatures, references never rendered | Running header, "Page X of Y", uncontrolled-when-printed, Prepared/Reviewed/Approved block bound to content hash, revision history, references with verification badges |
| Generation | Blocking call with `setTimeout` fake progress | SSE streaming with real per-section progress and cancel |
| Instruments | — | Opentrons Python, Hamilton CSV, Tecan GWL, Echo picklist — all from the same engine |
| Security | Open Gemini proxy; `xlsx@0.18.5` (CVE-2023-30533) parsing user uploads | Per-IP rate limit + optional bearer token; `xlsx` removed (exceljs everywhere) |
| Tests | None | 67 tests incl. property-based tests on the unit/dilution math; DB suite runs on both drivers (`npm test`) |
| Hosting | AI Studio scaffold only | Cloudflare Workers from GitHub, custom domain, stateless by default (D1 optional); Node server kept for local dev |
| Privacy | SOP JSON posted to server for every export | Exports and worklists run in the browser; only AI calls and citation strings leave it — spelled out in a Data & privacy panel |

## Commercial kit repository

`public/data/kit-index.json` — **620 products from 16 vendors**, every entry traced to a fetched vendor page with the catalog number confirmed on it (`verified: true`; entries that couldn't be confirmed were left out). Sources are in `research/*.json` (one file per vendor, with `sourceUrl` + `retrievedAt`); rebuild the index with `node scripts/build-kit-index.mjs`.

In the app (**Company Kit Repository → Catalog**): search by name / catalog number / vendor / application, filter by vendor and category. **Find on the web** discovers products not in the catalog: Gemini + Google Search grounding finds the vendor page, the server fetches it, extracts the record, and marks it *verified* only if the catalog number appears in the fetched page text; results are saved to **My kits** in your browser. **Generate SOP from manufacturer protocol** fetches the vendor's protocol page/PDF and attaches it to the generation as the primary reference (PDFs are passed to the model inline), stamps the SOP with vendor/catalog/URL, and runs the normal audit.

## Deploy (GitHub → Cloudflare, custom domain)

The app runs natively on **Cloudflare Workers + D1** and deploys from GitHub. See **[DEPLOY.md](DEPLOY.md)** — configured for `taylorflaat-biosop.org`.

## Run locally

```bash
npm install
cp .env.example .env     # set GEMINI_API_KEY; optionally GEMINI_MODEL, BIOSOP_API_TOKEN
npm run dev              # Node server + Vite HMR → http://localhost:3000
npm run cf:dev           # the Cloudflare Worker locally (workerd + local D1) → http://localhost:8787
npm test                 # vitest (67 tests)
npm run lint             # tsc (base + strict core)
npm run deploy           # vite build + wrangler deploy
```

One API (`src/server/app.ts`, Hono) runs on both runtimes; only the entry points differ:
`server.ts` (Node, better-sqlite3 file) and `src/worker.ts` (Workers, D1).

At boot the server lists the models available to your key and warns if `GEMINI_MODEL` (default `gemini-2.5-flash`) is not among them.

## Layout

```
src/core/           pure, tested, strict-TS calculation + audit + worklists (no I/O)
  units.ts          unit parsing/conversion, locale-aware number parsing
  reactionMath.ts   C1V1=C2V2 engine, master mix, roles, pipettability
  auditor.ts        honest audit — can FAIL, reports coverage, no compliance claims
  worklists.ts      Opentrons / Hamilton / Tecan / Echo generators
src/server/
  db.ts             SQLite versions, signatures, audit log
  literature.ts     Crossref + PubMed verification (injectable transport for tests)
  groundedSearch.ts Gemini + Google Search grounding, cross-checked
  excelLive.ts      live-formula workbook
  wordControlled.ts controlled-document .docx
  routes/           protocols, literature, generation (SSE + worklists)
src/client/api.ts   the one client for every endpoint (replaces 5 fetch/download copies)
src/components/     AuditReportCard, ReferenceVerifier, VersionPanel, WorklistPanel (new)
tests/              vitest + fast-check
```

## Honest limits

- The audit checks internal consistency, structure, and whether citations resolve. It does **not** establish that the science is right for your application, and it is not evidence of ISO 9001 / GLP / GMP / 21 CFR 11 conformance. The scope statement is rendered in the UI and in every Word export.
- `sanitizeAndValidateSop` still fills in generic hazards/PPE/QC when the model omits them (pre-existing behaviour). For a safety document that default deserves review — consider making omission a hard failure instead.
- E-signatures record name, meaning, timestamp and content hash. There is no user authentication, so a signature attests to what was typed, not to a verified identity — and in browser-local mode the record is held by the user, so it demonstrates integrity to reviewers you export to, not to a third party.
- Literature verification needs outbound access to `api.crossref.org` and `eutils.ncbi.nlm.nih.gov`; when unreachable it reports UNCHECKED, never NOT_FOUND.
