/**
 * Copies the real user's Firestore data from production into the local emulator
 * under the pinned test UID (test-user-emulator), so insight generation can be
 * evaluated against real spending patterns.
 *
 * Usage (with emulators already running):
 *   node scripts/copy-prod-to-emulator.mjs
 *
 * Collections copied: transactions, categories, rules, goals, investments, advisorMemory
 * Existing emulator data for test-user-emulator is wiped before copy.
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('./../functions/node_modules/firebase-admin');

const PROD_UID = process.env.PROD_UID ?? (() => { throw new Error('Set PROD_UID env var to your Firebase Auth UID'); })();
const EMULATOR_UID = 'test-user-emulator';
const PROJECT_ID = 'free-lunch-85447';
const COLLECTIONS = ['transactions', 'categories', 'rules', 'goals', 'investments', 'advisorMemory'];

// --- Production app (reads real data) ---
const SA_PATH = process.env.SA_PATH ?? (() => { throw new Error('Set SA_PATH env var to your service account key JSON path'); })();
const prodApp = admin.initializeApp(
  { credential: admin.credential.cert(SA_PATH), projectId: PROJECT_ID },
  'prod'
);
const prodDb = admin.firestore(prodApp);

// --- Emulator app (writes test data) ---
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const emulatorApp = admin.initializeApp(
  { projectId: PROJECT_ID },
  'emulator'
);
const emulatorDb = admin.firestore(emulatorApp);

async function deleteCollection(db, collRef, batchSize = 400) {
  const snap = await collRef.limit(batchSize).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await deleteCollection(db, collRef, batchSize);
}

async function copyCollection(collName) {
  const prodRef = prodDb.collection('users').doc(PROD_UID).collection(collName);
  const emulatorRef = emulatorDb.collection('users').doc(EMULATOR_UID).collection(collName);

  // Wipe existing emulator docs for this collection
  process.stdout.write(`  Clearing emulator ${collName}... `);
  await deleteCollection(emulatorDb, emulatorRef);
  console.log('done');

  // Read from prod
  process.stdout.write(`  Reading prod ${collName}... `);
  const snap = await prodRef.get();
  console.log(`${snap.size} docs`);

  if (snap.empty) return;

  // Write in batches of 400
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = emulatorDb.batch();
    docs.slice(i, i + 400).forEach((d) => {
      batch.set(emulatorRef.doc(d.id), d.data());
    });
    await batch.commit();
    process.stdout.write(`  Wrote ${Math.min(i + 400, docs.length)}/${docs.length}\r`);
  }
  console.log(`  ✓ ${collName}: ${docs.length} docs copied`);
}

async function main() {
  console.log(`\nCopying prod user ${PROD_UID} → emulator ${EMULATOR_UID}`);
  console.log(`Collections: ${COLLECTIONS.join(', ')}\n`);

  for (const coll of COLLECTIONS) {
    console.log(`\n[${coll}]`);
    await copyCollection(coll);
  }

  console.log('\n✅ Done. Refresh the app on your iPhone to see real data.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message);
  if (err.message.includes('credential') || err.message.includes('auth') || err.message.includes('UNAUTHENTICATED')) {
    console.error('\nFix: run  gcloud auth application-default login  then retry.');
  }
  process.exit(1);
});
