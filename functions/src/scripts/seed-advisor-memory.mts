/**
 * Structural initializer for advisor memory.
 *
 * Creates an empty skeleton if the document does not yet exist.
 * If it already exists, exits without modifying anything.
 *
 * Personal data (financialProfile, recurringExpenses, etc.) must be set
 * via the app UI or directly in the Firestore console — never hardcoded here.
 *
 * Run: npx tsx src/scripts/seed-advisor-memory.mts
 * Env: FREE_LUNCH_USER_ID, FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'free-lunch-85447';
const USER_ID = process.env.FREE_LUNCH_USER_ID;

if (!USER_ID) {
  console.error('ERROR: FREE_LUNCH_USER_ID env var is required');
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const db = getFirestore();
const ref = db.collection('users').doc(USER_ID).collection('advisorMemory').doc('current');
const existing = await ref.get();

if (existing.exists) {
  console.log('Advisor memory already exists — not overwriting.');
  console.log('Use the app Settings page or Firestore console to edit the financial profile.');
  process.exit(0);
}

const skeleton = {
  financialProfile: 'FILL IN: describe your situation (salary timing, household, fixed costs, country-specific notes).',
  recurringExpenses: [],
  activeGoals: [],
  investmentProfile: '',
  pastAdvice: [],
  spendingBaselines: [],
  knownMerchants: [],
  behavioralPatterns: [],
  temporalPatterns: [],
  updatedAt: Timestamp.now(),
};

await ref.set(skeleton);
console.log('✅ Advisor memory skeleton created for user', USER_ID);
console.log('Next: fill in financialProfile via the Firestore console or the app Settings page.');
console.log('Then run "Refresh Financial Memory" in the app to build baselines and patterns.');
process.exit(0);
