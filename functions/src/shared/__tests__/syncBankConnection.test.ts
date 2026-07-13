/**
 * Integration-style tests for `syncBankConnection` against an in-memory fake
 * Firestore, covering the data-critical guarantees:
 *
 *  - new transactions land at deterministic doc ids and re-syncs are no-ops
 *  - legacy documents (random ids) are still de-duplicated via the bulk
 *    externalId lookup
 *  - a concurrent sync racing past the bulk lookup cannot duplicate a
 *    transaction or clobber user edits (create-only precondition)
 *  - pending → booked status updates still work
 *  - account failures surface as `success: false` and do not advance lastSync
 *  - ICS lump-sum auto-exclusion requires date proximity, not just an equal
 *    amount, and prefers the closest-dated statement
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnableBankingTransaction } from '../../enableBanking/types';

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const { MockTimestamp } = vi.hoisted(() => {
  class MockTimestamp {
    constructor(public _date: Date) {}
    toDate() {
      return new Date(this._date.getTime());
    }
    static fromDate(d: Date) {
      return new MockTimestamp(d);
    }
  }
  return { MockTimestamp };
});

const fake = vi.hoisted(() => {
  type DocData = Record<string, unknown>;

  /** Minimal in-memory Firestore fake covering exactly the surface the sync uses. */
  class FakeFirestore {
    store = new Map<string, DocData>();
    autoId = 0;
    /** Fires once before the next batch commit, then clears itself (used to
     * simulate a concurrent sync winning the race). */
    onceBeforeBatchCommit: (() => void) | null = null;

    collection(name: string) {
      return new FakeCollection(this, name);
    }

    batch() {
      const ops: Array<{ type: 'create' | 'set' | 'update'; path: string; data: DocData }> = [];
      return {
        create: (ref: FakeDocRef, data: DocData) =>
          ops.push({ type: 'create', path: ref.path, data }),
        set: (ref: FakeDocRef, data: DocData) => ops.push({ type: 'set', path: ref.path, data }),
        update: (ref: FakeDocRef, data: DocData) =>
          ops.push({ type: 'update', path: ref.path, data }),
        commit: async () => {
          if (this.onceBeforeBatchCommit) {
            const hook = this.onceBeforeBatchCommit;
            this.onceBeforeBatchCommit = null;
            hook();
          }
          // Atomic: validate all create preconditions before applying anything.
          for (const op of ops) {
            if (op.type === 'create' && this.store.has(op.path)) {
              throw Object.assign(new Error(`ALREADY_EXISTS: ${op.path}`), { code: 6 });
            }
          }
          for (const op of ops) {
            if (op.type === 'update') {
              this.applyUpdate(op.path, op.data);
            } else {
              this.store.set(op.path, { ...op.data });
            }
          }
        },
      };
    }

    applyUpdate(path: string, data: DocData) {
      const existing = this.store.get(path);
      if (!existing) throw new Error(`NOT_FOUND: ${path}`);
      const next = { ...existing };
      for (const [key, value] of Object.entries(data)) {
        if (value === 'DELETE') delete next[key];
        else next[key] = value;
      }
      this.store.set(path, next);
    }
  }

  class FakeCollection {
    constructor(
      public db: FakeFirestore,
      public path: string
    ) {}

    doc(id?: string) {
      return new FakeDocRef(this.db, this, id ?? `auto_${++this.db.autoId}`);
    }

    where(field: string, op: string, value: unknown) {
      return new FakeQuery(this.db, this.path, [{ field, op, value }]);
    }
  }

  class FakeDocRef {
    path: string;
    constructor(
      public db: FakeFirestore,
      public parent: FakeCollection,
      public id: string
    ) {
      this.path = `${parent.path}/${id}`;
    }

    collection(name: string) {
      return new FakeCollection(this.db, `${this.path}/${name}`);
    }

    async get() {
      const data = this.db.store.get(this.path);
      return {
        exists: data !== undefined,
        id: this.id,
        ref: this,
        data: () => (data ? { ...data } : undefined),
      };
    }

    async set(data: DocData) {
      this.db.store.set(this.path, { ...data });
    }

    async create(data: DocData) {
      if (this.db.store.has(this.path)) {
        throw Object.assign(new Error(`ALREADY_EXISTS: ${this.path}`), { code: 6 });
      }
      this.db.store.set(this.path, { ...data });
    }

    async update(data: DocData) {
      this.db.applyUpdate(this.path, data);
    }
  }

  function comparable(value: unknown): number | string {
    if (value instanceof MockTimestamp) return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    return value as number | string;
  }

  class FakeQuery {
    constructor(
      public db: FakeFirestore,
      public path: string,
      public filters: Array<{ field: string; op: string; value: unknown }>
    ) {}

    where(field: string, op: string, value: unknown) {
      return new FakeQuery(this.db, this.path, [...this.filters, { field, op, value }]);
    }

    select(..._fields: string[]) {
      return this; // the fake just returns full documents
    }

    limit(_n: number) {
      return this;
    }

    async get() {
      const docs: Array<{ id: string; ref: FakeDocRef; data: () => DocData }> = [];
      for (const [path, data] of this.db.store) {
        const prefix = `${this.path}/`;
        if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/')) continue;
        const matches = this.filters.every(({ field, op, value }) => {
          const actual = comparable(data[field]);
          const expected = comparable(value);
          if (actual === undefined || actual === null) return false;
          if (op === '==') return actual === expected;
          if (op === '>=') return actual >= expected;
          if (op === '<=') return actual <= expected;
          throw new Error(`Unsupported operator in fake: ${op}`);
        });
        if (matches) {
          const id = path.slice(prefix.length);
          const collection = new FakeCollection(this.db, this.path);
          docs.push({
            id,
            ref: new FakeDocRef(this.db, collection, id),
            data: () => ({ ...data }),
          });
        }
      }
      return { empty: docs.length === 0, size: docs.length, docs };
    }
  }

  return { FakeFirestore };
});

let db: InstanceType<(typeof fake)['FakeFirestore']>;

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => db,
  FieldValue: {
    serverTimestamp: () => 'SERVER_TS',
    delete: () => 'DELETE',
  },
  Timestamp: MockTimestamp,
}));

const getTransactions = vi.fn();
const getBalances = vi.fn();
vi.mock('../../enableBanking/client.js', () => ({
  EnableBankingClient: class {
    getTransactions = getTransactions;
    getBalances = getBalances;
  },
}));

vi.mock('../../config.js', () => ({
  config: {
    enableBankingApiUrl: 'https://api.test',
    enableBankingPrivateKey: 'key',
    enableBankingAppId: 'app',
  },
}));

vi.mock('../../categorization/index.js', () => ({
  Categorizer: class {
    async initialize() {}
    categorize() {
      return { categoryId: null, confidence: 0, source: 'none' };
    }
    async categorizeBatchWithLLM() {
      return new Map();
    }
  },
}));

import { syncBankConnection, transactionDocId } from '../syncConnection';
import { amsterdamDayKey, amsterdamToday, shiftDayKey } from '../amsterdamTime';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = 'user1';
const CONN = 'conn1';
const CONN_PATH = `users/${USER}/bankConnections/${CONN}`;
const TX_PATH = `users/${USER}/transactions`;
const RAW_PATH = `users/${USER}/rawBankTransactions`;

function bankTx(
  entryReference: string,
  overrides: Partial<EnableBankingTransaction> = {}
): EnableBankingTransaction {
  return {
    entry_reference: entryReference,
    transaction_amount: { amount: '25.00', currency: 'EUR' },
    credit_debit_indicator: 'DBIT',
    creditor: { name: 'Albert Heijn' },
    booking_date: '2026-06-25',
    remittance_information_unstructured: 'Albert Heijn 1657',
    status: 'booked',
    ...overrides,
  };
}

/** Local-noon MockTimestamp — the LEGACY server-local bookingDate convention;
 * seeded docs written this way must keep de-duplicating after the switch to
 * Amsterdam-noon stamps (the dedup window's ±2-day buffer absorbs the skew). */
function bookingTs(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return MockTimestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
}

function seedConnection() {
  db.store.set(CONN_PATH, {
    status: 'active',
    bankName: 'ABN AMRO',
    consentExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    accounts: [{ uid: 'acc1', iban: 'NL16ABNA0837885787' }],
  });
}

function txDocs() {
  return [...db.store.keys()].filter(
    (p) => p.startsWith(`${TX_PATH}/`) && !p.slice(TX_PATH.length + 1).includes('/')
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
  db = new fake.FakeFirestore();
  seedConnection();
  getBalances.mockResolvedValue({ balances: [] });
  getTransactions.mockResolvedValue({ transactions: [] });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('syncBankConnection', () => {
  it('creates new transactions at deterministic doc ids, with matching raw copies', async () => {
    getTransactions.mockResolvedValue({ transactions: [bankTx('REF-A'), bankTx('REF-B')] });

    const result = await syncBankConnection(USER, CONN);

    expect(result.success).toBe(true);
    expect(result.totalNew).toBe(2);
    const docIdA = transactionDocId('REF-A');
    expect(db.store.get(`${TX_PATH}/${docIdA}`)).toMatchObject({
      externalId: 'REF-A',
      amount: -25,
      status: 'booked',
    });
    expect(db.store.get(`${RAW_PATH}/${docIdA}`)).toMatchObject({ transactionId: docIdA });
    expect(db.store.has(`${TX_PATH}/${transactionDocId('REF-B')}`)).toBe(true);
    // Clean run advances the lastSync watermark.
    expect(db.store.get(CONN_PATH)!.lastSync).toBe('SERVER_TS');
  });

  it('is idempotent: re-syncing the same fetch creates nothing new', async () => {
    getTransactions.mockResolvedValue({ transactions: [bankTx('REF-A'), bankTx('REF-B')] });

    await syncBankConnection(USER, CONN);
    const second = await syncBankConnection(USER, CONN);

    expect(second.totalNew).toBe(0);
    expect(txDocs()).toHaveLength(2);
  });

  it('skips a transaction whose externalId already exists on a legacy random-id doc', async () => {
    db.store.set(`${TX_PATH}/legacyRandomId`, {
      externalId: 'REF-A',
      status: 'booked',
      bookingDate: bookingTs('2026-06-25'),
      categoryId: 'groceries',
    });
    getTransactions.mockResolvedValue({ transactions: [bankTx('REF-A')] });

    const result = await syncBankConnection(USER, CONN);

    expect(result.totalNew).toBe(0);
    expect(db.store.has(`${TX_PATH}/${transactionDocId('REF-A')}`)).toBe(false);
    expect(db.store.get(`${TX_PATH}/legacyRandomId`)).toMatchObject({ categoryId: 'groceries' });
  });

  it('dedups legacy docs whose bookingDate was clobbered to a raw string', async () => {
    // The old pending→booked update path wrote bookingDate as a raw
    // 'yyyy-MM-dd' string; Firestore type-bracketing hides those from the
    // Timestamp range query, so the string-bounded companion query must
    // catch them.
    db.store.set(`${TX_PATH}/legacyStringDate`, {
      externalId: 'REF-A',
      status: 'booked',
      bookingDate: '2026-06-25',
      categoryId: 'groceries',
    });
    getTransactions.mockResolvedValue({ transactions: [bankTx('REF-A')] });

    const result = await syncBankConnection(USER, CONN);

    expect(result.totalNew).toBe(0);
    expect(db.store.has(`${TX_PATH}/${transactionDocId('REF-A')}`)).toBe(false);
    expect(txDocs()).toHaveLength(1);
    expect(db.store.get(`${TX_PATH}/legacyStringDate`)).toMatchObject({
      categoryId: 'groceries',
      bookingDate: '2026-06-25', // booked docs are left completely untouched
    });
  });

  it('repairs a legacy string bookingDate to a Timestamp when upgrading pending to booked', async () => {
    db.store.set(`${TX_PATH}/legacyStringPending`, {
      externalId: 'REF-A',
      status: 'pending',
      bookingDate: '2026-06-24',
      categoryId: 'user-picked',
    });
    getTransactions.mockResolvedValue({
      transactions: [bankTx('REF-A', { status: 'booked', booking_date: '2026-06-25' })],
    });

    const result = await syncBankConnection(USER, CONN);

    expect(result.totalUpdated).toBe(1);
    expect(result.totalNew).toBe(0);
    const doc = db.store.get(`${TX_PATH}/legacyStringPending`)!;
    expect(doc.status).toBe('booked');
    expect(doc.bookingDate).toBeInstanceOf(MockTimestamp);
    // Amsterdam noon on the booking date (June = CEST = UTC+2 → 10:00Z),
    // regardless of the server/test-runner zone.
    expect((doc.bookingDate as InstanceType<typeof MockTimestamp>).toDate()).toEqual(
      new Date('2026-06-25T10:00:00.000Z')
    );
    expect(doc.categoryId).toBe('user-picked');
    expect(txDocs()).toHaveLength(1);
  });

  it('clamps the fetch window to the max lookback when lastSync is stale', async () => {
    const staleLastSync = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000); // frozen by long-failing syncs
    db.store.set(CONN_PATH, { ...db.store.get(CONN_PATH)!, lastSync: staleLastSync });

    await syncBankConnection(USER, CONN);

    // Window dates are AMSTERDAM calendar dates (the runtime's UTC date is
    // still "yesterday" around Amsterdam midnight).
    expect(getTransactions).toHaveBeenCalledWith(
      'acc1',
      expect.objectContaining({
        date_from: shiftDayKey(amsterdamToday(), -85),
        date_to: amsterdamToday(),
      })
    );
  });

  it('does not clamp a fresh lastSync (still overlaps by one day)', async () => {
    const recentLastSync = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    db.store.set(CONN_PATH, { ...db.store.get(CONN_PATH)!, lastSync: recentLastSync });

    await syncBankConnection(USER, CONN);

    expect(getTransactions).toHaveBeenCalledWith(
      'acc1',
      expect.objectContaining({ date_from: shiftDayKey(amsterdamDayKey(recentLastSync), -1) })
    );
  });

  it('closes the concurrent-sync race: a doc created after the bulk lookup is neither duplicated nor overwritten', async () => {
    getTransactions.mockResolvedValue({ transactions: [bankTx('REF-A'), bankTx('REF-B')] });

    // Simulate a second sync committing REF-A (with a user edit already applied)
    // between this sync's bulk existence check and its batch commit.
    const docIdA = transactionDocId('REF-A');
    db.onceBeforeBatchCommit = () => {
      db.store.set(`${TX_PATH}/${docIdA}`, {
        externalId: 'REF-A',
        status: 'booked',
        bookingDate: bookingTs('2026-06-25'),
        categoryId: 'user-set-category',
        notes: 'user note',
      });
    };

    const result = await syncBankConnection(USER, CONN);

    expect(result.success).toBe(true);
    expect(result.totalNew).toBe(1); // only REF-B counted
    expect(txDocs()).toHaveLength(2); // no duplicates
    // The racing writer's document — including its user edits — is untouched.
    expect(db.store.get(`${TX_PATH}/${docIdA}`)).toMatchObject({
      categoryId: 'user-set-category',
      notes: 'user note',
    });
    expect(db.store.has(`${TX_PATH}/${transactionDocId('REF-B')}`)).toBe(true);
  });

  it('still upgrades an existing pending transaction to booked without touching user fields', async () => {
    db.store.set(`${TX_PATH}/legacyPending`, {
      externalId: 'REF-A',
      status: 'pending',
      bookingDate: bookingTs('2026-06-24'),
      categoryId: 'user-picked',
    });
    getTransactions.mockResolvedValue({
      transactions: [bankTx('REF-A', { status: 'booked', booking_date: '2026-06-25' })],
    });

    const result = await syncBankConnection(USER, CONN);

    expect(result.totalUpdated).toBe(1);
    expect(result.totalNew).toBe(0);
    const doc = db.store.get(`${TX_PATH}/legacyPending`)!;
    expect(doc.status).toBe('booked');
    expect(doc.categoryId).toBe('user-picked');
    expect(txDocs()).toHaveLength(1);
  });

  it('reports success: false and keeps lastSync when the account fetch fails', async () => {
    getTransactions.mockRejectedValue(new Error('Enable Banking API error: 500'));

    const result = await syncBankConnection(USER, CONN);

    expect(result.success).toBe(false);
    expect(result.results[0].errors).toContain('Enable Banking API error: 500');
    // Failed run must not advance the watermark, so the window is re-fetched.
    expect(db.store.get(CONN_PATH)!.lastSync).toBeUndefined();
  });

  describe('ICS lump-sum auto-exclusion', () => {
    const icsTx = () =>
      bankTx('REF-ICS', {
        transaction_amount: { amount: '543.21', currency: 'EUR' },
        creditor: { name: 'INT CARD SERVICES' },
        remittance_information_unstructured: 'INT CARD SERVICES incasso',
        booking_date: '2026-06-25',
      });

    it('does not match an equal-amount statement outside the date window', async () => {
      db.store.set(`users/${USER}/icsStatements/stmt-old`, {
        totalNewExpenses: 543.21,
        statementDate: bookingTs('2026-01-15'),
      });
      getTransactions.mockResolvedValue({ transactions: [icsTx()] });

      await syncBankConnection(USER, CONN);

      const doc = db.store.get(`${TX_PATH}/${transactionDocId('REF-ICS')}`)!;
      expect(doc.excludeFromTotals).toBeUndefined();
      expect(doc.icsStatementId).toBeUndefined();
      expect(
        db.store.get(`users/${USER}/icsStatements/stmt-old`)!.lumpSumTransactionId
      ).toBeUndefined();
    });

    it('excludes the lump sum against the closest-dated statement within the window', async () => {
      db.store.set(`users/${USER}/icsStatements/stmt-far`, {
        totalNewExpenses: 543.21,
        statementDate: bookingTs('2026-06-01'),
      });
      db.store.set(`users/${USER}/icsStatements/stmt-near`, {
        totalNewExpenses: 543.21,
        statementDate: bookingTs('2026-06-20'),
      });
      getTransactions.mockResolvedValue({ transactions: [icsTx()] });

      await syncBankConnection(USER, CONN);

      const docId = transactionDocId('REF-ICS');
      const doc = db.store.get(`${TX_PATH}/${docId}`)!;
      expect(doc.excludeFromTotals).toBe(true);
      expect(doc.icsStatementId).toBe('stmt-near');
      expect(db.store.get(`users/${USER}/icsStatements/stmt-near`)!.lumpSumTransactionId).toBe(
        docId
      );
      expect(
        db.store.get(`users/${USER}/icsStatements/stmt-far`)!.lumpSumTransactionId
      ).toBeUndefined();
    });
  });
});
