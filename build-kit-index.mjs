#!/usr/bin/env node
/**
 * Merge research/*.json into public/data/kit-index.json.
 * Validates required fields and category enum, dedupes by vendor+catalog number,
 * and prints coverage stats. Run: node scripts/build-kit-index.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const researchDir = join(root, 'research');
const outFile = join(root, 'public', 'data', 'kit-index.json');

const CATEGORIES = new Set([
  'PCR & Amplification', 'qPCR & Digital PCR', 'Reverse Transcription', 'Cloning & DNA Assembly', 'Nucleic Acid Purification',
  'NGS Library Preparation', 'NGS Library QC & Quantification', 'Single-Cell & Spatial', 'Long-Read Sequencing', 'CRISPR & Genome Editing',
  'Epigenetics & Methylation', 'Protein Expression & Purification', 'Western Blot & Immunoassay', 'Cell Culture & Transfection',
  'Cell Analysis & Viability', 'Diagnostics & Pathogen Detection', 'Enzymes & Modifying Reagents', 'Oligos, Probes & Standards',
]);
const REQUIRED = ['vendor', 'vendorShort', 'productName', 'catalogNumbers', 'category', 'description', 'productUrl', 'sourceUrl', 'retrievedAt', 'verified'];

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const all = [];
const problems = [];
const files = readdirSync(researchDir).filter((f) => f.endsWith('.json')).sort();

for (const f of files) {
  let arr;
  try { arr = JSON.parse(readFileSync(join(researchDir, f), 'utf8')); } catch (e) { problems.push(`${f}: unparseable (${e.message})`); continue; }
  if (!Array.isArray(arr)) { problems.push(`${f}: not an array`); continue; }
  arr.forEach((e, i) => {
    // Some vendors block product-page fetches; the entry was then verified against a vendor PDF.
    // Fall back to that document as the product link rather than discarding a verified entry.
    if (!e.productUrl && e.sourceUrl) e.productUrl = e.sourceUrl;
    const missing = REQUIRED.filter((k) => e[k] === undefined || e[k] === null || e[k] === '');
    if (missing.length) { problems.push(`${f}[${i}] ${e.productName || '?'}: missing ${missing.join(',')}`); return; }
    if (!Array.isArray(e.catalogNumbers) || e.catalogNumbers.length === 0) { problems.push(`${f}[${i}] ${e.productName}: catalogNumbers empty`); return; }
    if (!CATEGORIES.has(e.category)) { problems.push(`${f}[${i}] ${e.productName}: bad category "${e.category}"`); return; }
    if (!/^https?:\/\//.test(e.productUrl) || !/^https?:\/\//.test(e.sourceUrl)) { problems.push(`${f}[${i}] ${e.productName}: bad URL`); return; }
    all.push({
      id: `${slug(e.vendorShort)}-${slug(e.catalogNumbers[0])}`,
      ...e,
      catalogNumbers: e.catalogNumbers.map((c) => String(c).trim()),
      applications: Array.isArray(e.applications) ? e.applications : [],
      keyParameters: e.keyParameters && typeof e.keyParameters === 'object' ? e.keyParameters : {},
      verified: !!e.verified,
      source: 'index',
    });
  });
}

// Dedupe by id (vendor + first catalog number); keep the first, note duplicates.
const seen = new Map();
const deduped = [];
for (const e of all) {
  if (seen.has(e.id)) { problems.push(`duplicate id ${e.id} (${e.productName}) — kept first`); continue; }
  seen.set(e.id, true); deduped.push(e);
}
deduped.sort((a, b) => a.vendorShort.localeCompare(b.vendorShort) || a.category.localeCompare(b.category) || a.productName.localeCompare(b.productName));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), count: deduped.length, entries: deduped }, null, 0));

const byVendor = {}; const byCat = {}; let verified = 0;
for (const e of deduped) { byVendor[e.vendorShort] = (byVendor[e.vendorShort] || 0) + 1; byCat[e.category] = (byCat[e.category] || 0) + 1; if (e.verified) verified++; }
console.log(`kit-index: ${deduped.length} entries (${verified} verified) from ${files.length} files → ${outFile}`);
console.log('by vendor:', Object.entries(byVendor).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
console.log('by category:', Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' | '));
if (problems.length) { console.log(`\n${problems.length} problem(s):`); problems.slice(0, 40).forEach((p) => console.log(' -', p)); }
