/**
 * Dry-run analysis: parse the net-worth TSV, build holdings, print the
 * account → Holding mapping + a per-date reconciliation against the sheet's own
 * subtotal rows, and write the holdings JSON the importer consumes.
 *
 *   node analyze.mjs [path/to/networth.tsv]
 *
 * Default input: ./networth.raw.tsv (gitignored). Writes
 * ./generated/holdings.generated.json (gitignored). Never touches Firestore.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSheet, buildHoldings, leafTotalsPerDate, extractRow } from './parse.mjs';
import { MAPPING } from './mapping.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] ?? join(here, 'networth.raw.tsv');
const tsv = readFileSync(inputPath, 'utf8');

const parsed = parseSheet(tsv);
const { dates, fx } = parsed;
const { holdings, unmapped } = buildHoldings(parsed, MAPPING);
const eur = (n) => '€' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// ── Mapping table ──
console.log('\n=== ACCOUNT → HOLDING MAPPING ===\n');
const col = (s, w) => String(s).padEnd(w);
console.log(
  col('sheet row', 30), col('→ name', 24), col('type', 12),
  col('kind', 10), col('liq', 9), col('now (EUR)', 12), col('pts', 4), 'incl'
);
console.log('-'.repeat(118));
for (const h of holdings) {
  const flags = (h.needsTypeDecision ? ' ⚠type' : '');
  console.log(
    col(h.sheetName, 30), col(h.name, 24), col(h.type + flags, 12),
    col(h.kind, 10), col(h.liquidity, 9),
    col(eur(h.value), 12), col(h.history.length, 4), h.include ? 'yes' : 'NO'
  );
}
if (unmapped.length) console.log('\n⚠ UNMAPPED rows:', unmapped);

// ── Reconciliation against the sheet's own subtotals ──
const totalRow = extractRow(tsv, 'Total net worth');
const assetsRow = extractRow(tsv, 'Assets');
const liabRow = extractRow(tsv, 'Liabilities');
const { assets, liabs } = leafTotalsPerDate(parsed, MAPPING);

let maxDiff = 0, worst = '';
for (let i = 0; i < dates.length; i++) {
  const net = assets[i] - liabs[i];
  const dA = Math.abs(assets[i] - assetsRow[i]);
  const dL = Math.abs(liabs[i] - liabRow[i]);
  const dN = Math.abs(net - totalRow[i]);
  const d = Math.max(dA, dL, dN);
  if (d > maxDiff) { maxDiff = d; worst = dates[i]; }
}

console.log('\n=== RECONCILIATION (leaf sums vs sheet subtotals, all 41 dates) ===');
console.log(`max abs diff across all dates: €${maxDiff.toFixed(4)} (worst: ${worst})`);
console.log(maxDiff < 1 ? '✅ reconciles (rounding only)' : '❌ MISMATCH — check transcription');

// ── Latest net worth ──
const li = dates.length - 1;
const includedAssets = holdings.filter((h) => h.include && h.kind === 'asset').reduce((s, h) => s + h.value, 0);
const includedLiabs = holdings.filter((h) => h.include && h.kind === 'liability').reduce((s, h) => s + h.value, 0);
console.log(`\n=== NET WORTH @ ${dates[li]} ===`);
console.log(`sheet "Total net worth":   ${eur(totalRow[li])}`);
console.log(`all leaves (assets−liab):  ${eur(assets[li] - liabs[li])}`);
console.log(`imported (include=yes):    ${eur(includedAssets - includedLiabs)}  (assets ${eur(includedAssets)} − liab ${eur(includedLiabs)})`);

// ── Emit holdings JSON for the importer ──
mkdirSync(join(here, 'generated'), { recursive: true });
const outPath = join(here, 'generated', 'holdings.generated.json');
writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), holdings }, null, 2));
console.log(`\nWrote ${holdings.length} holdings → ${outPath}`);
