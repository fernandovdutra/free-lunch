/**
 * Firestore/Auth/Functions emulator helpers for E2E tests.
 *
 * Talks to the emulators' REST APIs directly (Bearer "owner" is the
 * emulator's admin bypass token) so specs can stage deterministic test
 * data without depending on firebase-admin. Never touches production —
 * every URL here is a localhost emulator endpoint.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const FUNCTIONS_HOST = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5001';

export const TEST_UID = 'test-user-emulator'; // pinned by scripts/seed-emulator.mjs

/** Project id: env var, else .env.local, else the offline demo project. */
export function projectId(): string {
  if (process.env.VITE_FIREBASE_PROJECT_ID) return process.env.VITE_FIREBASE_PROJECT_ID;
  try {
    const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    const m = /^VITE_FIREBASE_PROJECT_ID=(.+)$/m.exec(env);
    if (m?.[1]) return m[1].trim();
  } catch {
    // no .env.local — fall through
  }
  return 'demo-freelunch';
}

const AUTH_HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

type FirestoreValue = Record<string, unknown>;

export const fv = {
  str: (v: string): FirestoreValue => ({ stringValue: v }),
  num: (v: number): FirestoreValue => ({ doubleValue: v }),
  bool: (v: boolean): FirestoreValue => ({ booleanValue: v }),
  ts: (v: Date): FirestoreValue => ({ timestampValue: v.toISOString() }),
  nul: (): FirestoreValue => ({ nullValue: null }),
  map: (fields: Record<string, FirestoreValue>): FirestoreValue => ({ mapValue: { fields } }),
  arr: (values: FirestoreValue[]): FirestoreValue => ({ arrayValue: { values } }),
};

/** Full-document PATCH (replaces all fields) — idempotent staging. */
export async function setDoc(path: string, fields: Record<string, FirestoreValue>): Promise<void> {
  const url = `http://${FIRESTORE_HOST}/v1/projects/${projectId()}/databases/(default)/documents/${path}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`setDoc ${path}: ${r.status} ${await r.text()}`);
}

/** Remove a staged document. Missing documents are not an error. */
export async function deleteDoc(path: string): Promise<void> {
  const url = `http://${FIRESTORE_HOST}/v1/projects/${projectId()}/databases/(default)/documents/${path}`;
  const r = await fetch(url, { method: 'DELETE', headers: AUTH_HEADERS });
  if (!r.ok && r.status !== 404) {
    throw new Error(`deleteDoc ${path}: ${r.status} ${await r.text()}`);
  }
}

export async function listUserDocs(collection: string): Promise<
  Array<{ name: string; fields: Record<string, any> }>
> {
  // The emulator caps list pages (~150 docs) regardless of pageSize — follow
  // nextPageToken until exhausted.
  const docs: Array<{ name: string; fields: Record<string, any> }> = [];
  let pageToken = '';
  do {
    const url =
      `http://${FIRESTORE_HOST}/v1/projects/${projectId()}/databases/(default)/documents/users/${TEST_UID}/${collection}` +
      `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const r = await fetch(url, { headers: AUTH_HEADERS });
    if (!r.ok) throw new Error(`listUserDocs ${collection}: ${r.status} ${await r.text()}`);
    const j = (await r.json()) as {
      documents?: Array<{ name: string; fields: Record<string, any> }>;
      nextPageToken?: string;
    };
    docs.push(...(j.documents ?? []));
    pageToken = j.nextPageToken ?? '';
  } while (pageToken);
  return docs;
}

/** idToken for the seeded user, via the Auth emulator (any API key works). */
export async function getIdToken(): Promise<string> {
  const r = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@freelunch.local',
        password: 'test1234',
        returnSecureToken: true,
      }),
    }
  );
  const j = (await r.json()) as { idToken?: string };
  if (!j.idToken) throw new Error(`auth emulator sign-in failed: ${JSON.stringify(j)}`);
  return j.idToken;
}

/** Calls the getBudgetProgress callable on the Functions emulator. */
export async function fetchBudgetProgress(
  idToken: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ categoryId: string; spent: number }>> {
  const r = await fetch(
    `http://${FUNCTIONS_HOST}/${projectId()}/europe-west1/getBudgetProgress`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        data: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      }),
    }
  );
  if (!r.ok) throw new Error(`getBudgetProgress: ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { result?: { budgetProgress?: Array<{ categoryId: string; spent: number }> } };
  return j.result?.budgetProgress ?? [];
}

function dayOfThisMonth(day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0);
}

function txnFields(overrides: {
  date: Date;
  description: string;
  counterparty: string;
  amount: number;
  categoryId: string | null;
  reimbursement: Record<string, FirestoreValue> | null;
}): Record<string, FirestoreValue> {
  const now = new Date();
  return {
    externalId: fv.nul(),
    date: fv.ts(overrides.date),
    description: fv.str(overrides.description),
    amount: fv.num(overrides.amount),
    currency: fv.str('EUR'),
    counterparty: fv.str(overrides.counterparty),
    categoryId: overrides.categoryId === null ? fv.nul() : fv.str(overrides.categoryId),
    categoryConfidence: fv.num(overrides.categoryId === null ? 0 : 1),
    categorySource: fv.str('manual'),
    isSplit: fv.bool(false),
    splits: fv.nul(),
    reimbursement: overrides.reimbursement === null ? fv.nul() : fv.map(overrides.reimbursement),
    bankAccountId: fv.nul(),
    importedAt: fv.ts(now),
    updatedAt: fv.ts(now),
  };
}

// Deterministic doc ids so re-staging fully resets prior runs (the resolve
// journey mutates these docs; every run starts from the same state).
export const STAGED = {
  clearedExpenseId: 'e2e-reimb-cleared-exp',
  clearedIncomeId: 'e2e-reimb-cleared-inc',
  pendingExpenseId: 'e2e-reimb-pending-exp',
  matchIncomeId: 'e2e-reimb-match-inc',
  categorizeId: 'e2e-cat-exp',
  clearedAmount: 21.87,
  pendingAmount: 47.23,
  clearedMerchant: 'E2E Bistro',
  pendingMerchant: 'E2E Werklunch',
  matchMerchant: 'E2E ACME Declaratie',
  categorizeMerchant: 'E2E Kiosk',
};

/**
 * Stages the reimbursement scenario in the Firestore emulator:
 * - a restaurants expense already reimbursed (cleared) + its income txn
 * - a restaurants expense with a PENDING reimbursement
 * - an unrelated income txn with the exact pending amount (suggestion bait)
 * Idempotent: full-document PATCH resets any mutations from earlier runs.
 * Kept separate from stageCategorizationData so parallel spec files never
 * reset each other's documents mid-run.
 */
export async function stageReimbursementData(): Promise<void> {
  const cleared = {
    type: fv.str('work'),
    note: fv.str('E2E work dinner'),
    status: fv.str('cleared'),
    linkedTransactionId: fv.str(STAGED.clearedIncomeId),
    clearedAt: fv.ts(dayOfThisMonth(8)),
  };

  const base = `users/${TEST_UID}/transactions`;
  await Promise.all([
    setDoc(
      `${base}/${STAGED.clearedExpenseId}`,
      txnFields({
        date: dayOfThisMonth(5),
        description: STAGED.clearedMerchant,
        counterparty: STAGED.clearedMerchant,
        amount: -STAGED.clearedAmount,
        categoryId: 'food-restaurants',
        reimbursement: cleared,
      })
    ),
    setDoc(
      `${base}/${STAGED.clearedIncomeId}`,
      txnFields({
        date: dayOfThisMonth(8),
        description: 'E2E ACME terugbetaling',
        counterparty: 'E2E ACME BV',
        amount: STAGED.clearedAmount,
        categoryId: 'income-other',
        reimbursement: { ...cleared, linkedTransactionId: fv.str(STAGED.clearedExpenseId) },
      })
    ),
    setDoc(
      `${base}/${STAGED.pendingExpenseId}`,
      txnFields({
        date: dayOfThisMonth(10),
        description: STAGED.pendingMerchant,
        counterparty: STAGED.pendingMerchant,
        amount: -STAGED.pendingAmount,
        categoryId: 'food-restaurants',
        reimbursement: {
          type: fv.str('work'),
          note: fv.str('E2E team lunch'),
          status: fv.str('pending'),
          linkedTransactionId: fv.nul(),
          clearedAt: fv.nul(),
        },
      })
    ),
    setDoc(
      `${base}/${STAGED.matchIncomeId}`,
      txnFields({
        date: dayOfThisMonth(12),
        description: STAGED.matchMerchant,
        counterparty: STAGED.matchMerchant,
        amount: STAGED.pendingAmount,
        categoryId: null,
        reimbursement: null,
      })
    ),
  ]);
}

/** Stages the expense used by the categorization spec (reset to Coffee & Bars). */
export async function stageCategorizationData(): Promise<void> {
  await setDoc(
    `users/${TEST_UID}/transactions/${STAGED.categorizeId}`,
    txnFields({
      date: dayOfThisMonth(3),
      description: STAGED.categorizeMerchant,
      counterparty: STAGED.categorizeMerchant,
      amount: -3.45,
      categoryId: 'food-coffee',
      reimbursement: null,
    })
  );
}

// ---------------------------------------------------------------------------
// Bank connections
// ---------------------------------------------------------------------------

export const STAGED_BANK_CONNECTION = {
  id: 'e2e-abn-expired',
  bankName: 'E2E Test Bank',
  iban: 'NL01ABNA0000009999',
  accountName: 'E2E RECONNECT ACCOUNT',
};

/**
 * Stage a bank connection whose PSD2 consent has lapsed. `getBankStatus`
 * reads it straight out of Firestore, so the settings page renders the real
 * expired-connection state without any Enable Banking traffic.
 */
export async function stageExpiredBankConnection(): Promise<void> {
  const { id, bankName, iban, accountName } = STAGED_BANK_CONNECTION;
  await setDoc(`users/${TEST_UID}/bankConnections/${id}`, {
    id: fv.str(id),
    provider: fv.str('enable_banking'),
    bankId: fv.str('e2e_test_bank'),
    bankName: fv.str(bankName),
    status: fv.str('expired'),
    sessionId: fv.str('e2e-session'),
    accounts: fv.arr([
      fv.map({
        uid: fv.str('e2e-account-1'),
        iban: fv.str(iban),
        name: fv.str(accountName),
        currency: fv.str('EUR'),
      }),
    ]),
    // 21 days past — consent gone, matching the state a stale connection
    // reaches when nobody re-authorizes it.
    consentExpiresAt: fv.ts(new Date(Date.now() - 21 * 86_400_000)),
    lastSync: fv.ts(new Date(Date.now() - 21 * 86_400_000)),
    createdAt: fv.ts(new Date(Date.now() - 111 * 86_400_000)),
    updatedAt: fv.ts(new Date(Date.now() - 21 * 86_400_000)),
  });
}

export async function removeStagedBankConnection(): Promise<void> {
  await deleteDoc(`users/${TEST_UID}/bankConnections/${STAGED_BANK_CONNECTION.id}`);
}
