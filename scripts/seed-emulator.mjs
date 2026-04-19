/**
 * Seeds the Firebase emulator with a test user + realistic fake data so the
 * iPhone smoke test lands on a populated app.
 *
 * Usage (with emulators already running):
 *   node scripts/seed-emulator.mjs
 *
 * Login credentials it creates:
 *   email:    test@freelunch.local
 *   password: test1234
 */

// Emulator targets (must be set BEFORE admin SDK init)
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const admin = require('./../functions/node_modules/firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? (() => { throw new Error('Set FIREBASE_PROJECT_ID env var'); })();
const TEST_EMAIL = 'test@freelunch.local';
const TEST_PASSWORD = 'test1234';
// Pinned UID so SINGLE_USER_ID in functions/.secret.local stays valid across re-seeds.
const TEST_UID = 'test-user-emulator';

admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();

async function ensureTestUser() {
  try {
    const u = await auth.getUser(TEST_UID);
    await auth.updateUser(TEST_UID, { email: TEST_EMAIL, password: TEST_PASSWORD });
    return u.uid;
  } catch {
    const u = await auth.createUser({
      uid: TEST_UID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: 'Test User',
      emailVerified: true,
    });
    return u.uid;
  }
}

const CATEGORIES = [
  // Income
  { id: 'income', name: 'Income', icon: '💰', color: '#2D5A4A', parentId: null, order: 0 },
  { id: 'income-salary', name: 'Salary', icon: '💵', color: '#2D5A4A', parentId: 'income', order: 0 },
  { id: 'income-other', name: 'Other Income', icon: '💸', color: '#2D5A4A', parentId: 'income', order: 1 },
  // Housing
  { id: 'housing', name: 'Housing', icon: '🏠', color: '#5B6E8A', parentId: null, order: 1 },
  { id: 'housing-rent', name: 'Rent/Mortgage', icon: '🏡', color: '#5B6E8A', parentId: 'housing', order: 0 },
  { id: 'housing-utilities', name: 'Utilities', icon: '⚡', color: '#5B6E8A', parentId: 'housing', order: 1 },
  { id: 'housing-communications', name: 'Communications', icon: '📱', color: '#5B6E8A', parentId: 'housing', order: 2 },
  // Transport
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 2 },
  { id: 'transport-public', name: 'Public Transit', icon: '🚇', color: '#4A6FA5', parentId: 'transport', order: 0 },
  { id: 'transport-fuel', name: 'Fuel', icon: '⛽', color: '#4A6FA5', parentId: 'transport', order: 1 },
  // Food & Drink
  { id: 'food', name: 'Food & Drink', icon: '🍽️', color: '#C9A227', parentId: null, order: 3 },
  { id: 'food-groceries', name: 'Groceries', icon: '🛒', color: '#C9A227', parentId: 'food', order: 0 },
  { id: 'food-restaurants', name: 'Restaurants', icon: '🍴', color: '#C9A227', parentId: 'food', order: 1 },
  { id: 'food-coffee', name: 'Coffee & Bars', icon: '☕', color: '#C9A227', parentId: 'food', order: 2 },
  // Shopping
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#A67B8A', parentId: null, order: 4 },
  { id: 'shopping-clothing', name: 'Clothing', icon: '👕', color: '#A67B8A', parentId: 'shopping', order: 0 },
  { id: 'shopping-general', name: 'Online/General', icon: '📦', color: '#A67B8A', parentId: 'shopping', order: 1 },
  // Subscriptions
  { id: 'subscriptions', name: 'Subscriptions', icon: '🔄', color: '#6366F1', parentId: null, order: 5 },
  { id: 'subscriptions-streaming', name: 'Streaming', icon: '📺', color: '#6366F1', parentId: 'subscriptions', order: 0 },
  { id: 'subscriptions-software', name: 'Software/Apps', icon: '💻', color: '#6366F1', parentId: 'subscriptions', order: 1 },
  // Health
  { id: 'health', name: 'Health', icon: '❤️', color: '#4A9A8A', parentId: null, order: 6 },
  { id: 'health-fitness', name: 'Fitness', icon: '🏋️', color: '#4A9A8A', parentId: 'health', order: 0 },
  // Entertainment
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#7B6B8A', parentId: null, order: 7 },
  { id: 'entertainment-events', name: 'Events', icon: '🎪', color: '#7B6B8A', parentId: 'entertainment', order: 0 },
  { id: 'entertainment-travel', name: 'Travel', icon: '✈️', color: '#7B6B8A', parentId: 'entertainment', order: 1 },
];

// Realistic NL-style transactions. Each is a template; we'll scatter them across months.
const TX_TEMPLATES = [
  // Recurring monthly
  { desc: 'Salary - ACME BV',                  counterparty: 'ACME BV',              amount: 3800, categoryId: 'income-salary',         recurring: 'monthly' },
  { desc: 'Freelance payment',                  counterparty: 'Design Studio NL',     amount: 650,  categoryId: 'income-other',          recurring: 'random' },
  { desc: 'Rent — de Pijp apartment',           counterparty: 'Verhuurder BV',        amount: -1450, categoryId: 'housing-rent',         recurring: 'monthly' },
  { desc: 'Vattenfall — electricity',           counterparty: 'Vattenfall',           amount: -95,  categoryId: 'housing-utilities',     recurring: 'monthly' },
  { desc: 'KPN internet',                       counterparty: 'KPN',                  amount: -42,  categoryId: 'housing-communications', recurring: 'monthly' },
  { desc: 'OV-chipkaart auto-reload',           counterparty: 'NS',                   amount: -50,  categoryId: 'transport-public',     recurring: 'monthly' },
  { desc: 'Basic-Fit membership',               counterparty: 'Basic-Fit',            amount: -22,  categoryId: 'health-fitness',        recurring: 'monthly' },
  { desc: 'Netflix',                            counterparty: 'Netflix',              amount: -13.99, categoryId: 'subscriptions-streaming', recurring: 'monthly' },
  { desc: 'Spotify Family',                     counterparty: 'Spotify',              amount: -17.99, categoryId: 'subscriptions-streaming', recurring: 'monthly' },
  { desc: 'GitHub Copilot',                     counterparty: 'GitHub',               amount: -10,  categoryId: 'subscriptions-software', recurring: 'monthly' },

  // Groceries — weekly
  { desc: 'Albert Heijn groceries',             counterparty: 'Albert Heijn',         amount: -58,  categoryId: 'food-groceries',        recurring: 'weekly' },
  { desc: 'Jumbo supermarket',                  counterparty: 'Jumbo',                amount: -45,  categoryId: 'food-groceries',        recurring: 'weekly' },
  { desc: 'Dirk supermarket',                   counterparty: 'Dirk',                 amount: -32,  categoryId: 'food-groceries',        recurring: 'random' },

  // Coffee & bars
  { desc: 'Starbucks Amsterdam',                counterparty: 'Starbucks',            amount: -5.20, categoryId: 'food-coffee',          recurring: 'random' },
  { desc: 'Café Lust — beers',                  counterparty: 'Café Lust',            amount: -18,  categoryId: 'food-coffee',           recurring: 'random' },
  { desc: 'Bocca Coffee',                       counterparty: 'Bocca Coffee',         amount: -4.50, categoryId: 'food-coffee',          recurring: 'random' },

  // Restaurants
  { desc: 'De Pizzabakkers',                    counterparty: 'De Pizzabakkers',      amount: -34,  categoryId: 'food-restaurants',      recurring: 'random' },
  { desc: 'Thaise Snackbar',                    counterparty: 'Thaise Snackbar',      amount: -22,  categoryId: 'food-restaurants',      recurring: 'random' },
  { desc: 'Sushi Samba',                        counterparty: 'Sushi Samba',          amount: -48,  categoryId: 'food-restaurants',      recurring: 'random' },

  // Transport
  { desc: 'Shell fuel station',                 counterparty: 'Shell',                amount: -72,  categoryId: 'transport-fuel',        recurring: 'random' },
  { desc: 'NS trein — Utrecht-Amsterdam',       counterparty: 'NS',                   amount: -15.80, categoryId: 'transport-public',    recurring: 'random' },

  // Shopping
  { desc: 'Bol.com order',                      counterparty: 'Bol.com',              amount: -67,  categoryId: 'shopping-general',      recurring: 'random' },
  { desc: 'Zalando — shirt',                    counterparty: 'Zalando',              amount: -45,  categoryId: 'shopping-clothing',     recurring: 'random' },
  { desc: 'Amazon NL',                          counterparty: 'Amazon',               amount: -28,  categoryId: 'shopping-general',      recurring: 'random' },
  { desc: 'HEMA',                               counterparty: 'HEMA',                 amount: -14,  categoryId: 'shopping-general',      recurring: 'random' },

  // Entertainment
  { desc: 'Paradiso concert',                   counterparty: 'Paradiso',             amount: -42,  categoryId: 'entertainment-events',  recurring: 'random' },
  { desc: 'Pathé cinema',                       counterparty: 'Pathé',                amount: -13.50, categoryId: 'entertainment-events', recurring: 'random' },
  { desc: 'Booking.com — weekend Paris',        counterparty: 'Booking.com',          amount: -285, categoryId: 'entertainment-travel',  recurring: 'random' },
];

function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

async function seedCategories(uid) {
  const batch = db.batch();
  const now = new Date();
  for (const c of CATEGORIES) {
    const ref = db.doc(`users/${uid}/categories/${c.id}`);
    batch.set(ref, { ...c, isSystem: true, createdAt: now, updatedAt: now });
  }
  await batch.commit();
  console.log(`  ✓ ${CATEGORIES.length} categories`);
}

async function seedTransactions(uid) {
  const now = new Date();
  const monthsBack = 4;
  const transactions = [];

  for (let m = monthsBack; m >= 0; m--) {
    const monthStart = addMonths(now, -m);
    monthStart.setDate(1);

    for (const tpl of TX_TEMPLATES) {
      if (tpl.recurring === 'monthly') {
        const day = 3 + Math.floor(Math.random() * 5);
        const date = new Date(monthStart); date.setDate(day);
        if (date > now) continue;
        transactions.push({ ...tpl, date });
      } else if (tpl.recurring === 'weekly') {
        for (let w = 0; w < 4; w++) {
          const date = addDays(monthStart, w * 7 + Math.floor(Math.random() * 5));
          if (date > now) continue;
          const jitter = 0.85 + Math.random() * 0.3;
          transactions.push({ ...tpl, amount: Math.round(tpl.amount * jitter * 100) / 100, date });
        }
      } else { // random — 1-3 hits per month
        const hits = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < hits; i++) {
          const day = 1 + Math.floor(Math.random() * 27);
          const date = new Date(monthStart); date.setDate(day);
          if (date > now) continue;
          const jitter = 0.8 + Math.random() * 0.4;
          transactions.push({ ...tpl, amount: Math.round(tpl.amount * jitter * 100) / 100, date });
        }
      }
    }
  }

  // Write in batches of 500
  let written = 0;
  for (let i = 0; i < transactions.length; i += 400) {
    const batch = db.batch();
    const slice = transactions.slice(i, i + 400);
    for (const tx of slice) {
      const ref = db.collection(`users/${uid}/transactions`).doc();
      batch.set(ref, {
        externalId: null,
        date: tx.date,
        description: tx.desc,
        amount: tx.amount,
        currency: 'EUR',
        counterparty: tx.counterparty,
        categoryId: tx.categoryId,
        categoryConfidence: 0.95,
        categorySource: 'auto',
        isSplit: false,
        splits: null,
        reimbursement: null,
        bankAccountId: 'NL91ABNA0417164300',
        importedAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await batch.commit();
    written += slice.length;
  }
  console.log(`  ✓ ${written} transactions`);
}

async function seedBudgets(uid) {
  const budgets = [
    { name: 'Groceries monthly',    categoryId: 'food-groceries',     monthlyLimit: 400, alertThreshold: 80 },
    { name: 'Restaurants & coffee', categoryId: 'food-restaurants',   monthlyLimit: 200, alertThreshold: 80 },
    { name: 'Shopping',             categoryId: 'shopping',           monthlyLimit: 150, alertThreshold: 75 },
    { name: 'Subscriptions',        categoryId: 'subscriptions',      monthlyLimit: 60,  alertThreshold: 90 },
  ];
  const batch = db.batch();
  const now = new Date();
  for (const b of budgets) {
    const ref = db.collection(`users/${uid}/budgets`).doc();
    batch.set(ref, { ...b, isActive: true, createdAt: now, updatedAt: now });
  }
  await batch.commit();
  console.log(`  ✓ ${budgets.length} budgets`);
}

async function seedGoals(uid) {
  const goals = [
    {
      name: 'Emergency fund — 3 months expenses',
      type: 'savings',
      targetAmount: 9000,
      currentAmount: 4200,
      startDate: addMonths(new Date(), -6),
      targetDate: addMonths(new Date(), 8),
      status: 'active',
      linkedCategoryIds: null,
      notes: 'Target: 3x monthly expenses in liquid savings',
    },
    {
      name: 'Pay off student loan',
      type: 'debt_payoff',
      targetAmount: 12000,
      currentAmount: 7500,
      startDate: addMonths(new Date(), -14),
      targetDate: addMonths(new Date(), 10),
      status: 'active',
      linkedCategoryIds: null,
      notes: null,
    },
    {
      name: 'Holiday Japan 2027',
      type: 'savings',
      targetAmount: 4000,
      currentAmount: 1100,
      startDate: addMonths(new Date(), -2),
      targetDate: addMonths(new Date(), 14),
      status: 'active',
      linkedCategoryIds: ['entertainment-travel'],
      notes: '2 weeks, approx flights + lodging + food',
    },
  ];
  const batch = db.batch();
  const now = new Date();
  for (const g of goals) {
    const ref = db.collection(`users/${uid}/goals`).doc();
    batch.set(ref, { ...g, createdAt: now, updatedAt: now });
  }
  await batch.commit();
  console.log(`  ✓ ${goals.length} goals`);
}

async function seedInvestments(uid) {
  const now = new Date();
  const investments = [
    {
      name: 'VWRL — Vanguard FTSE All-World',
      platform: 'DEGIRO',
      type: 'etf',
      currency: 'EUR',
      notes: 'Core equity position, monthly DCA',
      entries: Array.from({ length: 6 }, (_, i) => ({
        date: addMonths(now, -5 + i),
        marketValue: 8000 + i * 600 + Math.random() * 300,
        costBasis: 8000 + i * 500,
      })),
    },
    {
      name: 'Pension — ING',
      platform: 'ING',
      type: 'pension',
      currency: 'EUR',
      notes: 'Employer pension, 5% match',
      entries: Array.from({ length: 6 }, (_, i) => ({
        date: addMonths(now, -5 + i),
        marketValue: 22000 + i * 350 + Math.random() * 200,
        costBasis: 22000 + i * 350,
      })),
    },
    {
      name: 'High-yield savings — Trade Republic',
      platform: 'Trade Republic',
      type: 'savings',
      currency: 'EUR',
      notes: '3.25% APY',
      entries: Array.from({ length: 6 }, (_, i) => ({
        date: addMonths(now, -5 + i),
        marketValue: 3000 + i * 500,
        costBasis: 3000 + i * 500,
      })),
    },
  ];
  const batch = db.batch();
  for (const inv of investments) {
    const ref = db.collection(`users/${uid}/investments`).doc();
    batch.set(ref, { ...inv, createdAt: now, updatedAt: now });
  }
  await batch.commit();
  console.log(`  ✓ ${investments.length} investments`);
}

async function seedUserDoc(uid) {
  await db.doc(`users/${uid}`).set({
    id: uid,
    email: TEST_EMAIL,
    displayName: 'Test User',
    createdAt: new Date(),
    settings: { language: 'en', currency: 'EUR', defaultDateRange: 'month', theme: 'light' },
    bankConnections: [],
  });
  console.log('  ✓ user doc');
}

async function main() {
  console.log(`Seeding emulator at ${process.env.FIRESTORE_EMULATOR_HOST} (project ${PROJECT_ID})...`);
  const uid = await ensureTestUser();
  console.log(`  ✓ test user: ${TEST_EMAIL} / ${TEST_PASSWORD} (uid: ${uid})`);
  await seedUserDoc(uid);
  await seedCategories(uid);
  await seedTransactions(uid);
  await seedBudgets(uid);
  await seedGoals(uid);
  await seedInvestments(uid);
  console.log('\nDone. SINGLE_USER_ID for advisor secrets:', uid);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
