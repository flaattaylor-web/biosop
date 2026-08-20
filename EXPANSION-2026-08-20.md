# Content expansion — 20 August 2026

Repository state before: 626 kits / 16 vendors, 36 protocols / 7 disciplines.
Repository state after: **1,231 kits / 32 vendors, 124 protocols / 18 disciplines.**

Nothing was removed. This is additive on top of everything already in `main` at
commit `5658100`.

---

## 1. Commercial kit repository: 626 → 1,231

Sixteen new vendors researched, 605 new entries, every one with its catalog number
confirmed on a page or vendor PDF that was actually fetched.

| Vendor | Entries | | Vendor | Entries |
|---|---|---|---|---|
| Cell Signaling Technology | 45 | | Bio-Techne / R&D Systems | 41 |
| Cytiva | 45 | | Lonza | 38 |
| Miltenyi Biotec | 45 | | STEMCELL Technologies | 38 |
| Norgen Biotek | 45 | | Active Motif | 36 |
| Twist Bioscience | 45 | | Macherey-Nagel | 32 |
| Abcam | 42 | | Omega Bio-tek | 31 |
| Biotium | 42 | | Mirus Bio | 27 |
| GenScript | 42 | | BioLegend | 11 |

Rebuild the index with `node scripts/build-kit-index.mjs`.

### What did not ship, and why

- **29 BioLegend entries** are in `research/_pending/biolegend-unverified.json` and are
  NOT in the index. `www.biolegend.com` returns HTTP 403 to automated fetching and its
  datasheet PDFs are robots-disallowed, so those catalog numbers were read from a
  third-party aggregator. That does not clear the bar in `research/SCHEMA.md`. The 11
  BioLegend entries that were confirmed on a BioLegend page or a BioLegend technical
  data sheet shipped normally. See `research/_pending/README.md` to promote them later.
- Quote-based custom services with no catalog number (Twist gene fragments and oligo
  pools, GenScript gene synthesis / peptide / antibody services) were excluded rather
  than given invented numbers.
- Products confirmed discontinued on the vendor's own page were excluded: 13 GenScript
  SKUs, 2 Bio-Techne Quantikine kits superseded by B/C revisions, 3 Biotium/Mirus items,
  1 Norgen kit, 1 Omega kit.
- Where two vendor pages disagreed about a number, the entry was dropped rather than
  guessed (Omega `M6932`, one Lonza PYROGENT variant, MethoCult `04044`).

### Independent audit of this batch

12 catalog numbers sampled at random across the new vendors and re-fetched: **12/12
confirmed**, correct product, correct number. 8 protocol DOIs sampled at random:
**8/8 resolved to exactly the cited paper**, no retractions.

The audit found **one real defect**, now fixed: the Mirus "TransIT Lentivirus System"
entry listed the five component products bundled into the system as if they were order
codes for the system, which put `MIR 6603` on two different entries. It now carries
`MIR 6650` and `MIR 6655` only. A full sweep confirms **zero duplicate catalog numbers
across all 1,231 entries**.

### Known weakness in the verification bar

`verified: true` asserts that the catalog number appears on the fetched page. It does
not assert that the number belongs to the named product. The Mirus defect above is
exactly that gap, and it was found by inspection rather than by the check.

160 of the new entries are verified against PDFs rather than product pages, and that
verification is concentrated: one Cytiva PDF backs 17 entries, one Miltenyi asset backs
15, and Cytiva's 45 entries rest on 10 distinct URLs. A single misread table row in a
shared document could corrupt every entry that depends on it without tripping anything.
If more assurance is bought, spend it there first.

41 entries (35 Cytiva, 6 Twist) have `productUrl` equal to `sourceUrl` pointing at a
PDF, because no purchasable product page could be fetched for them.

---

## 2. Reference protocol library: 36 → 124

Eleven new disciplines and a deepened Molecular Biology set, in
`src/data/biologyProtocols.ts`. Same `ProtocolSeed` shape as the original 36.

| Discipline | New | | Discipline | New |
|---|---|---|---|---|
| Cell & Gene Therapy | 9 | | Microscopy & Imaging | 7 |
| Molecular Biology (deepened) | 8 | | Single-Cell & Spatial Biology | 7 |
| Model Organism Methods | 8 | | Structural Biology & Biophysics | 7 |
| Neuroscience | 8 | | Microbiome & Metagenomics | 6 |
| Stem Cells & Organoids | 8 | | Plant Biology | 6 |
| Biochemistry & Enzymology | 7 | | | |
| Epigenetics & Chromatin | 7 | | | |

Every reference DOI was resolved against Crossref at authoring time and the returned
title checked against the citation. DOIs that could not be confirmed were dropped
rather than shipped, and the plain citation kept.

### Things the reference check caught

- **A retracted paper that passes a naive title match.** Voinnet et al. 2003 (Plant J,
  `10.1046/j.1365-313X.2003.01676.x`), the paper everyone cites for p19 silencing
  suppression in agroinfiltration, is marked RETRACTED in Crossref. It was dropped and
  replaced with Norkunas 2018. **This is worth encoding in the app**: a DOI that resolves
  correctly, to the right title, and is retracted currently passes verification.
- **A wrong-paper DOI**, caught before shipping: `10.1016/j.stemcr.2020.05.003` was
  drafted as Assou et al. on recurrent genetic abnormalities in hPSC. It actually
  resolves to Hedegaard et al. on cortical astrocytes. That is the exact hallucination
  signature the app exists to catch, produced by the same class of model that the app
  audits. It was dropped.
- Three citation corrections made against Crossref rather than from memory: a Methods in
  Enzymology volume, a CD-spectroscopy author name (Jess, not Jarvis), and a Mol Ther
  Methods volume (3, not the commonly miscited 5).
- One Golgi-Cox protocol had three parameters corrected after reading the source paper:
  impregnation time, section thickness, and the direction of the PFA-perfusion failure
  mode, which had been drafted backwards.

### Scope note

Animal protocols (neuroscience, zebrafish, mouse) state that the work requires a current
IACUC-or-equivalent approval and that euthanasia follows the approved protocol and AVMA
guidelines. Cell and gene therapy protocols state where a method is research-grade and
would need formal qualification for release testing; no GMP, ICH or 21 CFR 11
conformance is claimed anywhere.

---

## 3. Protocol Library tab, rebuilt

`src/components/ProtocolLibrary.tsx` was a flat `protocols.map()` with no search and no filtering.
At 95 documents that was tolerable. At **183** (57 kit SOPs + 124 reference protocols + 2 generic)
it was not browsable. It now has:

- **Search** across title, discipline, document ID, scope, reagents, equipment, vendor and catalog
  number. Multi-term, all terms must match.
- **Source filter** — All / Reference methods / Kit SOPs / Yours — derived from the document itself
  (`companyKitInfo` marks a kit SOP, a `Reference method` author marks a transcribed protocol,
  anything else is the user's own).
- **Discipline chips** with live counts, derived from the data rather than hardcoded, so a new
  category appears without a code change.
- **Results grouped under discipline headings** with counts, and an "N of 183" readout.

### A false claim removed from the card

Every card printed a hardcoded **"Literature Verified"** badge, including on documents whose
citations had never been checked and on documents with no citations at all. That is the same
unearned assurance the audit rewrite stripped out of the score, surviving in the UI. The badge now
reports the real state from `verificationStatus`: `N verified`, `N/M verified`, `N references,
unchecked`, `No references`, or a red `N references failed check` when any reference came back
MISMATCH or NOT_FOUND.

## 4. Repository cleanup

**84 stale files deleted from the repository root.** These were leftovers from the GitHub
web-interface uploads: duplicate copies of `App.tsx`, `Header.tsx`, `auditor.ts`, `types.ts`, every
`research/*.json`, both test files, plus `download` and `download (1)` and a stale 620-entry
`kit-index.json`. Each was compared against its counterpart in the tree first: 62 were byte
identical, and the 20 that differed were all **older** than the `src/` version (`auditor.ts` at root
was the 15 kB pre-rewrite auditor against 36 kB in `src/core/`). Nothing unique was lost.

**One file was recovered rather than deleted.** `aiErrors.test.ts` sat at the root with no
counterpart in `tests/`, and `vitest.config.ts` only includes `tests/**/*.test.ts`, so **six tests
covering Gemini error classification had never run**. Moved to `tests/aiErrors.test.ts`; all six pass.

**Three files were restored that the repository had lost entirely.** `.gitignore`, `.env.example` and
`.dev.vars.example` were present in the v3 package but never reached GitHub through the web-interface
upload. The missing `.gitignore` is the one that mattered: without it `node_modules/`, `dist/`,
`.wrangler/` and **`.env*`** were untracked but not ignored, so a local `.env` holding a Gemini API
key was one `git add -A` away from being committed to a public repository. It also explains the
`download` and `download (1)` files that had been sitting at the root. The missing `.env.example` and
`.dev.vars.example` are the files `DEPLOY.md` instructs the reader to copy, so those instructions
could not be followed as written. All three restored from the v3 package, unmodified.

Effect on `npm run lint`: **120 errors to 2.** The remaining two are both in
`src/components/Header.tsx` and are the `@types/react` gap, not new: without React types every
`.tsx` prop resolves to `any`, so `samples.reduce<...>()` reads as a type argument on an untyped
call. Installing `@types/react` and `@types/react-dom` is the real fix and is the single highest
-value next change, but it typechecks every `.tsx` file for the first time and regenerates
`package-lock.json`, so it deserves its own pass rather than riding along with a content release.

## 5. Engineering changes

### `DISCIPLINES` extended, 11 to 21
`src/components/DeNovoDescriptionEditor.tsx` — so the generator can be asked for the disciplines the
library now covers. Quick-add chips and placeholders fall back to the generic set, which is the
existing behaviour for any unmapped discipline.

### Retraction detection in the literature verifier

A retracted paper resolves cleanly, matches its own title, and scored **VERIFIED**. Crossref carries
the withdrawal in `updated-by`, so the information was there and unused. Now:

- `VerificationStatus` gains **`RETRACTED`**, threaded through `literature.ts`, `types.ts`,
  `client/api.ts`, the audit, the reference panel and the Word export.
- `retraction`, `withdrawal` and `removal` invalidate the citation. A **correction** does not. An
  **expression of concern** does not invalidate but is appended to the note.
- Crossref returns the same notice twice when both the publisher and Retraction Watch deposit it, so
  notices are deduplicated on type plus DOI.
- The audit raises `CITATION_RETRACTED` as an **ERROR**, and the Word export prints
  `[RETRACTED — paper withdrawn, do not rely on this]`.

**The check runs before the title comparison, and that ordering is the substantive part.** Crossref
rewrites a retracted record's title with a `Retracted:` prefix, which drags similarity down into the
MISMATCH band. Checking after would have been protective by accident while telling the reader
something false: that their DOI points at a different paper. The identifier is right and the paper is
withdrawn, and those need different fixes. Caught by a test, not by inspection.

Five tests added to `tests/literature.test.ts`, built on the real Crossref record for Voinnet 2003,
including the duplicated notices, plus negative cases for correction-only and no-updates records.

### `@types/react` and `@types/react-dom` installed

`.tsx` files had never been typechecked: without React types every prop resolved to `any` and passed.
Now installed as devDependencies. **`npm run lint` reports 0 errors.** `npm ci` was verified against
the regenerated `package-lock.json` in a clean tree, then build and tests, because Cloudflare installs
from that lockfile.

### Two stale auditor tests fixed

`tests/auditor.test.ts` had two failures at HEAD. Neither was a bug in the auditor. The shared fixture
carried a single step with no quantities, which the completeness rules added on 19 August correctly
flag: an ERROR below three steps, and a warning when fewer than half the steps contain a number. The
rules are right; the fixture predated them. It now carries three steps with real volumes,
temperatures and cycle counts. **All 73 tests pass.**

### Bundle code-split

`biologyProtocols.ts` and `companyKits.ts` are now dynamically imported, and `KitRepository` is a
`React.lazy` route behind a `Suspense` fallback. `INITIAL_GENERIC_SOPS` stays synchronous so there is
a document to render immediately, and the library merges in after first paint. Merge order prefers
anything already in state, so a saved or freshly generated protocol can never be overwritten
regardless of which boot effect resolves first.

| Chunk | Raw | Gzipped |
|---|---|---|
| entry | 2,049 kB | **577 kB** (was 946 kB) |
| biologyProtocols | 909 kB | 310 kB, on demand |
| companyKits | 203 kB | 52 kB, on demand |
| KitRepository | 36 kB | 10 kB, on demand |

**39% less to parse before first paint.**

### Protocol Library chip cap

Kit SOPs carry vendor-oriented categories of their own, so the tab spans **36** categories, not the
library's 18, and the tail is mostly one- and two-document buckets with near-duplicates
(`NGS Library Preparation & Sequencing` against `NGS & Single Cell Sequencing`, `Genome Editing`
against `CRISPR & Genome Editing`). Rather than rewrite vendor categories, the chip row shows the 12
densest and hides the rest behind `+24 more`. A chip selected from the tail stays visible when the
list collapses. Filtering source to *Reference methods* gives the clean 18.

## 6. Verification state at time of packaging

- `npm run build` clean. Entry chunk **577 kB gzipped** after the code-split, down from 946 kB.
  `kit-index.json` is served from `public/` and is not in the bundle.
- **Headless-browser smoke test passed** against the production build: the app boots, the lazy
  chunks resolve, the Protocol Library reports 183 protocols, search for "patch clamp" returns 1,
  the Neuroscience chip returns 8, the source filter returns 124 reference methods across 18
  discipline sections and 57 kit SOPs, and the console is clean. **No JS errors.**
- `npx tsc --noEmit -p tsconfig.core.json` clean.
- `npm test`: **73 passed, 0 failed.** Up from 60 passing at commit `5658100`: six recovered
  `aiErrors` tests, five new retraction tests, and the two stale auditor tests repaired.
  `tests/db.test.ts` still does not load, because it needs a `better-sqlite3` native build
  unavailable in this sandbox. Known and pre-existing; it passes locally.
- `npx tsc --noEmit -p tsconfig.json` reports 120 errors, **identical in count and
  content to pristine HEAD**. They all come from the duplicate loose `.tsx`/`.ts` files
  sitting at the repository root, left over from the GitHub web-interface uploads
  (`App.tsx`, `KitRepository.tsx`, `neb.json`, `download`, `download (1)`, and others).
  They shadow nothing and the build ignores them, but they make `npm run lint`
  permanently red. They were left in place rather than deleted. Deleting them is a
  separate, safe cleanup.
