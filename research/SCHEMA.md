# Kit index entry — JSON schema (one array per vendor file)

Every entry MUST come from a vendor page you actually fetched. Never write a catalog number from memory.

```json
{
  "vendor": "New England Biolabs",
  "vendorShort": "NEB",
  "productName": "Q5 High-Fidelity 2X Master Mix",
  "catalogNumbers": ["M0492S", "M0492L"],
  "category": "PCR & Amplification",
  "subcategory": "High-fidelity PCR master mix",
  "description": "1–2 sentences taken from or closely paraphrasing the vendor page. No marketing superlatives you can't source.",
  "productUrl": "https://www.neb.com/en/products/m0492-q5-high-fidelity-2x-master-mix",
  "protocolUrl": "https://www.neb.com/en/protocols/2012/12/07/protocol-for-q5-high-fidelity-2x-master-mix-m0492",
  "storage": "-20°C",
  "kitSize": "100 reactions (S) / 500 reactions (L)",
  "applications": ["cloning", "GC-rich templates", "long amplicons"],
  "keyParameters": { "input": "1 pg–1 ng plasmid; 1 ng–1 µg genomic DNA per 50 µL", "time": "~1 h", "notes": "Anneal 2–5 °C above Taq Tm; 20–30 s/kb extension" },
  "sourceUrl": "https://www.neb.com/en/products/m0492-q5-high-fidelity-2x-master-mix",
  "retrievedAt": "2026-08-18",
  "verified": true,
  "verificationNote": "Catalog numbers M0492S/M0492L present on fetched product page."
}
```

## Allowed `category` values (use EXACTLY one of these strings)
- "PCR & Amplification"            (PCR, hot-start, master mixes, long-range, colony PCR)
- "qPCR & Digital PCR"             (SYBR/probe qPCR mixes, one-step RT-qPCR, ddPCR supermixes/assays)
- "Reverse Transcription"          (RT kits, cDNA synthesis)
- "Cloning & DNA Assembly"         (Gibson/HiFi, Golden Gate, TOPO, Gateway, ligation, competent cells, mutagenesis)
- "Nucleic Acid Purification"      (plasmid mini/midi/maxi, gDNA, RNA extraction, viral NA, PCR/gel cleanup, cfDNA)
- "NGS Library Preparation"        (DNA/RNA/methyl/targeted/amplicon library prep, indexes, hyb capture)
- "NGS Library QC & Quantification"(fluorometric assays, qPCR quant, size selection beads, TapeStation/Bioanalyzer kits)
- "Single-Cell & Spatial"          (10x, spatial transcriptomics, single-cell multiome)
- "Long-Read Sequencing"           (PacBio, ONT prep kits, flow cells)
- "CRISPR & Genome Editing"        (Cas9/Cas12 nucleases, gRNA synthesis, editing detection, HDR)
- "Epigenetics & Methylation"      (bisulfite, EM-seq, ChIP, ATAC, CUT&Tag)
- "Protein Expression & Purification" (expression systems, affinity resins, tags, proteases)
- "Western Blot & Immunoassay"     (ELISA kits, blotting substrates, secondary detection, transfer)
- "Cell Culture & Transfection"    (transfection reagents, lipofection, electroporation kits, media supplements)
- "Cell Analysis & Viability"      (viability/cytotox assays, reporter assays, apoptosis, proliferation)
- "Diagnostics & Pathogen Detection" (research-use pathogen panels, clinical-grade extraction, sample collection/stabilisation)
- "Enzymes & Modifying Reagents"   (restriction enzymes, ligases, polymerases sold alone, phosphatases, nucleases)
- "Oligos, Probes & Standards"     (primer/probe products, ladders, controls, synthetic standards)

## Verification bar
- `verified: true` ONLY IF you fetched `sourceUrl` (with WebFetch) and the catalog number appears in the fetched content.
- If a vendor site blocks fetching, you may include an entry with `verified: false` ONLY IF the catalog number appears verbatim in a search-result snippet, and you record that snippet's URL as `sourceUrl` and explain in `verificationNote`. Cap unverified entries at 20% of your file. If you cannot verify, leave it out — a missing kit is fine, a wrong catalog number is not.
- Prefer vendor category/listing pages first (one fetch → many products), then fetch individual product pages to confirm numbers and collect fields.
- `protocolUrl`: the vendor's protocol/manual/handbook page or PDF for THAT product if you find one; otherwise omit the field.
- Do not include discontinued products. Do not include prices.
- Keep `description`, `keyParameters` short and factual (from the page). Omit any field you can't source rather than guessing.

## Output
Write ONLY a JSON array (no prose, no markdown fences) to the file path you are given. Validate it is parseable JSON before finishing.

## Save incrementally (important)
Write your JSON file after every ~8–10 entries (rewrite the whole array each time), not only at the end. If you are cut off, the partial file must still be valid JSON.
