/**
 * Idempotent importer: net-worth TSV → users/{uid}/holdings in Firestore.
 *
 * Emulator-first. Refuses to touch prod unless you pass --prod explicitly.
 * Doc ids are deterministic (slug of kind + sheet-row name), so re-running
 * upserts the same docs instead of duplicating.
 *
 *   # 1. start emulators (repo root):  npm run firebase:emulators
 *   # 2. dry run (no deps, prints the write plan + reconciliation):
 *   node import.mjs --uid=<UID> --dry-run
 *   # 3. write to the emulator:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *     GCLOUD_PROJECT=free-lunch-85447 node import.mjs --uid=<UID>
 *   # 4. write to PROD (needs GOOGLE_APPLICATION_CREDENTIALS):
 *   GOOGLE_APPLICATION_CREDENTIALS=sa.json \
 *     node import.mjs --uid=<UID> --prod
 *
 * Run from functions/scripts/wealth-import (firebase-admin resolves from
 * functions/node_modules). Input defaults to ./networth.raw.tsv (gitignored).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSheet, buildHoldings, leafTotalsPerDate, extractRow } from './parse.mjs';
import { MAPPING } from './mapping.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};

const uid = opt('uid') ?? process.env.IMPORT_UID;
const dryRun = flag('dry-run');
const prod = flag('prod');
const inputPath = opt('input') ?? join(here, 'networth.raw.tsv');
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'free-lunch-85447';

if (!uid) {
  console.error('ERROR: --uid=<firebase-user-id> is required.');
  process.exit(1);
}

/** Stable doc id from kind + the original sheet row name. */
function docId(kind, sheetName) {
  const slug = sheetName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${kind}-${slug}`;
}

const tsv = readFileSync(inputPath, 'utf8');
const parsed = parseSheet(tsv);
const { holdings } = buildHoldings(parsed, MAPPING);
const toImport = holdings.filter((h) => h.include);

// Reconciliation gate — never import data that doesn't tie out to the sheet.
const { assets, liabs } = leafTotalsPerDate(parsed, MAPPING);
const li = parsed.dates.length - 1;
const sheetNet = extractRow(tsv, 'Total net worth')[li];
const leafNet = assets[li] - liabs[li];
if (Math.abs(leafNet - sheetNet) > 1) {
  console.error(`ABORT: net worth mismatch (leaves €${leafNet.toFixed(2)} vs sheet €${sheetNet.toFixed(2)})`);
  process.exit(1);
}

const eur = (n) => '€' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const importedNet = toImport.reduce((s, h) => s + (h.kind === 'asset' ? h.value : -h.value), 0);

console.log(`\nUID: ${uid}   project: ${PROJECT_ID}   input: ${inputPath}`);
console.log(`${toImport.length}/${holdings.length} holdings to write. Net worth ${eur(importedNet)} (sheet ${eur(sheetNet)}).\n`);
for (const h of toImport) {
  console.log(`  ${docId(h.kind, h.sheetName).padEnd(34)} ${h.kind.padEnd(10)} ${h.type.padEnd(12)} ${eur(h.value).padStart(11)}  ${h.history.length} pts`);
}

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  process.exit(0);
}

if (!prod && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('\nREFUSING to write: FIRESTORE_EMULATOR_HOST is not set and --prod was not passed.');
  console.error('Set FIRESTORE_EMULATOR_HOST=localhost:8080 for the emulator, or pass --prod for production.');
  process.exit(1);
}

// ── Live write (dynamic import so --dry-run needs no deps) ──
const { initializeApp, applicationDefault } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');

initializeApp(
  prod
    ? { credential: applicationDefault(), projectId: PROJECT_ID }
    : { projectId: PROJECT_ID }
);
const dbAdmin = getFirestore();

const target = prod ? 'PRODUCTION' : `emulator (${process.env.FIRESTORE_EMULATOR_HOST})`;
console.log(`\nWriting to ${target} …`);

const now = Timestamp.now();
const batch = dbAdmin.batch();
for (const h of toImport) {
  const id = docId(h.kind, h.sheetName);
  const ref = dbAdmin.collection('users').doc(uid).collection('holdings').doc(id);
  const lastDate = h.history[h.history.length - 1].date;
  batch.set(ref, {
    name: h.name,
    platform: h.platform,
    type: h.type,
    kind: h.kind,
    value: h.value,
    cost: h.cost,
    units: h.units,
    liquidity: h.liquidity,
    updateSource: h.updateSource,
    notes: null,
    symbol: h.symbol,
    history: h.history, // ISO date strings — transformHolding handles these
    lastValueAt: Timestamp.fromDate(new Date(lastDate)),
    createdAt: Timestamp.fromDate(new Date(h.history[0].date)),
    updatedAt: now,
  });
}
await batch.commit();
console.log(`✅ Wrote ${toImport.length} holdings to users/${uid}/holdings.`);
process.exit(0);
