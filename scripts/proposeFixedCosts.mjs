/**
 * Scans the last N months of a user's transactions and prints likely
 * fixed-cost candidates so you can confirm which to write to
 * `users/{uid}/settings/fixedSchedule.items`.
 *
 * Usage:
 *
 *   # 1. List candidates
 *   PROD_UID=<your-uid> SA_PATH=<service-account.json> \
 *     node scripts/proposeFixedCosts.mjs
 *
 *   # 2. After picking which counterparties are real fixed costs,
 *   #    write them to the settings doc:
 *   PROD_UID=<your-uid> SA_PATH=<service-account.json> \
 *     node scripts/proposeFixedCosts.mjs \
 *       --confirm "ziggo,vattenfall,spotify"
 *
 *   Optional knobs:
 *     --months=3                 (default lookback window, in months)
 *     --min=15                   (minimum |amount| to consider, EUR)
 *     --variance=0.1             (max amount variance vs median, 0..1)
 *
 * The detector mirrors src/lib/detectFixedCosts.ts so the candidate
 * list here is the same one the app would compute. Pure read-only
 * unless you pass --confirm.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('./../functions/node_modules/firebase-admin');

// ---- Args --------------------------------------------------------------

// Supports both `--key=value` and `--key value` forms.
const args = (() => {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const stripped = a.replace(/^--/, '');
    const eq = stripped.indexOf('=');
    if (eq >= 0) {
      out[stripped.slice(0, eq)] = stripped.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[stripped] = next;
        i++;
      } else {
        out[stripped] = true;
      }
    }
  }
  return out;
})();

const PROD_UID = process.env.PROD_UID;
const SA_PATH = process.env.SA_PATH;
const PROJECT_ID = 'free-lunch-85447';

if (!PROD_UID) throw new Error('Set PROD_UID env var to your Firebase Auth UID');
if (!SA_PATH) throw new Error('Set SA_PATH env var to your service-account JSON path');

const monthsBack = Number(args.months ?? 3);
const minAmount = Number(args.min ?? 15);
const maxVariancePct = Number(args.variance ?? 0.1);
const minOccurrences = Number(args.occurrences ?? 2);

// ---- Firestore --------------------------------------------------------

const app = admin.initializeApp({
  credential: admin.credential.cert(SA_PATH),
  projectId: PROJECT_ID,
});
const db = admin.firestore(app);

const today = new Date();
const start = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
const end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of previous month

console.log(
  `Scanning ${PROD_UID} transactions from ${start.toISOString().slice(0, 10)} to ${end
    .toISOString()
    .slice(0, 10)}…\n`
);

const snap = await db
  .collection('users')
  .doc(PROD_UID)
  .collection('transactions')
  .where('date', '>=', admin.firestore.Timestamp.fromDate(start))
  .where('date', '<=', admin.firestore.Timestamp.fromDate(end))
  .get();

const transactions = snap.docs.map((d) => {
  const data = d.data();
  const date = data.bookingDate?.toDate?.() ?? data.date?.toDate?.() ?? new Date(data.date);
  return {
    counterparty: data.counterparty ?? null,
    amount: data.amount,
    date,
    excludeFromTotals: data.excludeFromTotals,
    reimbursement: data.reimbursement ?? null,
  };
});

// ---- Detector (mirror of src/lib/detectFixedCosts.ts) -----------------

function detect(rows) {
  const groups = new Map();
  for (const t of rows) {
    if (t.amount >= 0) continue;
    if (t.excludeFromTotals) continue;
    if (t.reimbursement?.status === 'pending') continue;
    const cp = t.counterparty?.trim();
    if (!cp) continue;
    const key = cp.toLowerCase();
    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = groups.get(key) ?? { key, label: cp, rows: [] };
    bucket.rows.push({ date: t.date, amount: Math.abs(t.amount), monthKey });
    groups.set(key, bucket);
  }

  const out = [];
  for (const b of groups.values()) {
    const monthsObserved = Array.from(new Set(b.rows.map((r) => r.monthKey))).sort();
    if (monthsObserved.length < minOccurrences) continue;

    const amounts = b.rows.map((r) => r.amount).sort((a, c) => a - c);
    const median = amounts[Math.floor(amounts.length / 2)] ?? 0;
    if (median < minAmount) continue;

    const min = amounts[0] ?? 0;
    const max = amounts[amounts.length - 1] ?? 0;
    const variancePct = median > 0 ? (max - min) / median : 1;
    if (variancePct > maxVariancePct) continue;

    const mostRecent = [...b.rows].sort((a, c) => c.date.getTime() - a.date.getTime())[0];
    const d = mostRecent.date.getDate();

    out.push({
      key: b.key,
      label: b.label,
      d,
      a: Math.round(median * 100) / 100,
      l: b.label,
      occurrences: monthsObserved.length,
      months: monthsObserved.join(','),
      variancePct: Math.round(variancePct * 1000) / 1000,
    });
  }
  return out.sort((a, b) => b.a - a.a);
}

const candidates = detect(transactions);

// ---- Output -----------------------------------------------------------

const printable = candidates.map((c) => ({
  KEY: c.key,
  LABEL: c.label,
  DAY: c.d,
  AMOUNT: `€${c.a.toFixed(2)}`,
  MONTHS: c.occurrences,
  VAR: `${(c.variancePct * 100).toFixed(1)}%`,
}));

if (printable.length === 0) {
  console.log('No candidates met the threshold. Try lowering --min or --occurrences.');
} else {
  console.table(printable);
}

// ---- Confirm path -----------------------------------------------------

if (args.confirm) {
  const keys = String(args.confirm)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const items = candidates
    .filter((c) => keys.includes(c.key))
    .map((c) => ({ d: c.d, a: c.a, l: c.l }));

  if (items.length === 0) {
    console.log('\nNo candidates matched --confirm keys. Nothing written.');
  } else {
    const ref = db.collection('users').doc(PROD_UID).collection('settings').doc('fixedSchedule');
    await ref.set({ items, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log(
      `\nWrote ${items.length} fixed-cost item(s) to users/${PROD_UID}/settings/fixedSchedule.`
    );
    console.table(items);
  }
}

await app.delete();
