# BioSOP Generator — Session Summary (2026-08-18)

Package: **biosop-v3.zip** (Cloudflare-ready, browser-local storage, 620-kit repository). Domain configured: **taylorflaat-biosop.org**.

---

## 1. What you started with

An AI Studio scaffold (React + Express + Gemini) that generated SOPs and Excel reaction sheets. My review found the core problem: it *presented* as an "ISO/GLP Compliance System" but had no persistence, model-recalled citations rendered as live DOI links, silent rewriting of volumes, and — in the third upload — a "99%+ Accuracy Audit" whose score was clamped to 99.0–99.9 and could never fail (`Math.max(99.0, Math.min(99.9, x))`), printing ISO/GLP claims the code never checked.

## 2. What was built (v3)

### Accuracy engine (`src/core/`, strict TypeScript, 75 tests incl. property-based)
- **`units.ts`** — full unit algebra: M→fM, g/L→pg/mL, U/µL, %, X, mass↔molar with molecular weight. Refuses to guess; returns typed failures. Locale-aware number parsing (fixes "12,5 → 125").
- **`reactionMath.ts`** — the model proposes concentrations, the engine derives volumes from C₁V₁=C₂V₂. Nothing silently rewritten: every deviation is a finding with the derivation shown. Component roles (MASTER_MIX / PER_SAMPLE / DILUENT) — template is no longer scaled into the mix. Overflow is an ERROR, not a redefined reaction volume. Pipettability floor with concrete intermediate-dilution recipes.
- **`auditor.ts`** — replaces the clamped score. Can FAIL. Shows coverage next to score. Lists what each dimension did *not* check. Never claims ISO/GLP; the scope statement is rendered in the UI and every Word export.
- **`worklists.ts`** — Opentrons Python (API v2), Hamilton CSV, Tecan GWL, Echo picklist — all from the same engine.

### Runtime & hosting
- **One API (Hono, `src/server/app.ts`) on two runtimes:** Node (`server.ts`, local dev with Vite HMR) and **Cloudflare Workers** (`src/worker.ts`). Verified end-to-end in the real Workers runtime (workerd) with Playwright.
- **`wrangler.jsonc`** names `taylorflaat-biosop.org` + `www.` as custom domains → Cloudflare attaches DNS + TLS on deploy. `DEPLOY.md` = GitHub → Cloudflare in 5 steps. **No database required.**
- Streaming generation (SSE) with real per-section progress and cancel; fake `setTimeout` progress removed.
- Model ID configurable (`GEMINI_MODEL`, default gemini-2.5-flash), validated against `models.list` at boot.
- Optional bearer token + per-IP rate limit on AI endpoints. `xlsx@0.18.5` (CVE-2023-30533) removed.

### Privacy (your ask: "only stores user data in their own browser")
- **Browser-local by default**: protocols, immutable versions, hash-bound e-signatures, append-only audit log in IndexedDB. Optional shared server storage (SQLite/D1) for teams.
- **Exports and worklists run in the browser** — Excel (live named-range formulas), Word (controlled document: header/footer, Page X of Y, signature block, revision history, references with verification badges), worklists. A proprietary SOP never leaves the machine to make a file.
- **Vault backup/restore**, optionally **AES-256-GCM encrypted** with a passphrase; wipe-all; a **Data & privacy panel** stating exactly what leaves the browser (AI calls: prompt/SOP to Gemini via your Worker; reference verification: citation strings only).
- Tested: across a full session (save, sign, reload, export Word+Excel, worklists, encrypted backup → wipe → restore) the page made exactly one server request: `/api/health`.

### Literature integrity
- Crossref + PubMed verification with four honest states: **VERIFIED / MISMATCH (real DOI, wrong paper — the hallucination signature) / NOT_FOUND / UNCHECKED** (registry unreachable ≠ doesn't exist). Gemini Search grounding for retrieval. Reference badges in UI and Word.

### Commercial kit repository (your ask: "true repository … massive internet search")
- **620 products, 16 vendors, 100% verified**: NEB 65 · Thermo Fisher 55 · MilliporeSigma 50 · Promega 50 · QIAGEN 47 · Roche/KAPA 45 · Bio-Rad 44 · Takara 40 · Agilent 36 · Illumina 35 · Zymo 35 · 10x 25 · IDT 25 · Beckman 23 · PacBio 23 · Oxford Nanopore 22. Every catalog number confirmed on a fetched vendor page (`research/*.json` keeps `sourceUrl` + `retrievedAt`); discontinued/unconfirmable products omitted. I independently re-checked 6 random entries: 6/6 confirmed.
- **Search** (name, catalog #, vendor, application; vendor/category facets; verified-only).
- **Find on the web** (your ask): AI + Google Search → vendor page fetched → record extracted → *verified* only if the catalog number is in the page text → saved to **My kits** (browser).
- **Generate SOP from manufacturer protocol**: fetches the vendor protocol page/PDF, attaches it inline to generation, stamps vendor/catalog/URL, runs the audit.
- The 56 original hand-written kit SOPs remain under **Curated SOPs**.

## 3. What is NOT done / honest limits
- Research **waves 3–4** (Twist, Abcam, CST, Lonza, Mirus, Bio-Techne, Cytiva, Macherey-Nagel, Meridian, Norgen, Omega, Biotium, LGC, GenScript, Miltenyi, BD) not yet run; the session's web-search quota is exhausted, so they'd be fetch-only with thinner yields.
- Discovery / reference-doc endpoints could not be exercised live from this sandbox (Google + vendor egress blocked); logic is unit-tested with mocks and runs on Cloudflare.
- No user authentication: e-signatures attest to what was typed; in browser-local mode they demonstrate integrity to reviewers you export to, not to a third party.
- The audit checks internal consistency, structure and citation resolvability — not scientific appropriateness. It is not evidence of ISO/GLP/GMP/21 CFR 11 conformance.
- Pre-existing behaviour kept: generic hazards/PPE are filled in when the model omits them — flagged as worth turning into a hard failure.
- Client bundle is ~2.2 MB (not yet code-split).

## 4. Your next steps
1. **Gemini key**: aistudio.google.com → Get API key (paid tier recommended for proprietary work). Store as Worker secret `GEMINI_API_KEY`.
2. **Deploy**: follow `DEPLOY.md` (unzip → GitHub repo → Cloudflare *Import a repository* → build `npm run build`, deploy `npx wrangler deploy` → add secret → domain attaches). Add `BIOSOP_API_TOKEN` once public.
3. **Local run** (optional): `npm install && npm run dev` → http://localhost:3000; `npm run cf:dev` for the Worker; `npm test`.
4. Tell me when to run research waves 3–4, or which vendors matter most.

## 5. Session interruptions worth knowing about
- Two agent runs died on API errors early on; I redid that work directly.
- Your org's monthly spend limit was hit mid-way through kit research wave 1; after it was raised, waves 1–2 completed. Agents now save incrementally so a cutoff can't lose work.
