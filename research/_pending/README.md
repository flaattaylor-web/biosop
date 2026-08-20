# Held back from the shipped kit index

Files in this directory are NOT merged into `public/data/kit-index.json`.
`scripts/build-kit-index.mjs` only reads `*.json` directly inside `research/`, so
nothing here reaches the app.

These entries did not clear the verification bar in `../SCHEMA.md`: the catalog
number was read from a third-party page rather than from a vendor page we fetched.
They are kept rather than deleted so the work can be finished later, not because
they are trustworthy now.

## biolegend-unverified.json (29 entries, retrieved 2026-08-20)

`www.biolegend.com` returns HTTP 403 to automated fetching and its datasheet PDFs
are disallowed by robots.txt, so these catalog numbers were read from Labome
product pages instead. 11 BioLegend entries that WERE confirmed on a BioLegend
page (or on a BioLegend technical data sheet mirrored by Cytek) shipped normally
in `../biolegend.json`.

To promote an entry: fetch its BioLegend product page, confirm the catalog number
appears in the page text, set `sourceUrl` to that page, set `verified: true`,
rewrite `verificationNote`, move the entry into `../biolegend.json`, and rerun
`node scripts/build-kit-index.mjs`.
