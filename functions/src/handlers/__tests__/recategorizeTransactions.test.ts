/**
 * Integration-style tests for the `recategorizeTransactions` callable against
 * an in-memory fake Firestore, covering:
 *
 *  - the pattern + LLM write shapes are preserved after the pipeline
 *    extraction (categoryId / categoryConfidence / categorySource / updatedAt)
 *  - an LLM hard failure marks the affected docs
 *    `categorizationStatus: 'failed'` instead of leaving them silently
 *    uncategorized
 *  - `mode: 'failed'` selects exactly the failed docs, implies LLM, and a
 *    successful retry clears the failure marker
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fake = vi.hoisted(() => {
  type DocData = Record<string, unknown>;

  class FakeDocRef {
    path: string;
    constructor(
      public db: FakeFirestore,
      public collectionPath: string,
      public id: string
    ) {
      this.path = `${collectionPath}/${id}`;
    }
    collection(name: string) {
      return new FakeCollection(this.db, `${this.path}/${name}`);
    }
    async get() {
      const data = this.db.store.get(this.path);
      return { exists: data !== undefined, id: this.id, ref: this, data: () => data && { ...data } };
    }
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
    async get() {
      const docs: Array<{ id: string; ref: FakeDocRef; exists: boolean; data: () => DocData }> = [];
      const prefix = `${this.path}/`;
      for (const [path, data] of this.db.store) {
        if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/')) continue;
        const matches = this.filters.every(({ field, op, value }) => {
          const actual = data[field];
          if (op === '==') return actual === value;
          if (op === '!=') return actual !== undefined && actual !== value;
          throw new Error(`Unsupported operator in fake: ${op}`);
        });
        if (matches) {
          const id = path.slice(prefix.length);
          docs.push({
            id,
            ref: new FakeDocRef(this.db, this.path, id),
            exists: true,
            data: () => ({ ...data }),
          });
        }
      }
      return { empty: docs.length === 0, size: docs.length, docs };
    }
  }

  class FakeCollection extends FakeQuery {
    constructor(db: FakeFirestore, path: string) {
      super(db, path, []);
    }
    doc(id: string) {
      return new FakeDocRef(this.db, this.path, id);
    }
  }

  class FakeFirestore {
    store = new Map<string, DocData>();

    collection(name: string) {
      return new FakeCollection(this, name);
    }

    async getAll(...refs: FakeDocRef[]) {
      return Promise.all(refs.map((r) => r.get()));
    }

    batch() {
      const ops: Array<{ path: string; data: DocData }> = [];
      return {
        update: (ref: FakeDocRef, data: DocData) => ops.push({ path: ref.path, data }),
        commit: async () => {
          for (const op of ops) this.applyUpdate(op.path, op.data);
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

  return { FakeFirestore };
});

let db: InstanceType<(typeof fake)['FakeFirestore']>;

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => db,
  FieldValue: {
    serverTimestamp: () => 'SERVER_TS',
    delete: () => 'DELETE',
  },
}));

vi.mock('../../shared/dataOwner.js', () => ({
  resolveDataOwner: async (uid: string) => uid,
  requireRole: async () => undefined,
}));

const categorizeMock = vi.hoisted(() => vi.fn());
const categorizeBatchWithLLMMock = vi.hoisted(() => vi.fn());

vi.mock('../../categorization/index.js', () => ({
  Categorizer: class {
    async initialize() {}
    categorize(description: string, counterparty: string | null) {
      return categorizeMock(description, counterparty);
    }
    categorizeBatchWithLLM(
      transactions: Array<{ index: number }>,
      apiKey: string
    ) {
      return categorizeBatchWithLLMMock(transactions, apiKey);
    }
  },
}));

import { recategorizeTransactions } from '../recategorizeTransactions';

const USER = 'user1';
const TX_PATH = `users/${USER}/transactions`;

function seedTxn(id: string, data: Record<string, unknown> = {}) {
  db.store.set(`${TX_PATH}/${id}`, {
    description: `desc ${id}`,
    counterparty: null,
    amount: -10,
    categoryId: null,
    categorySource: 'none',
    ...data,
  });
}

function run(data: unknown) {
  return recategorizeTransactions.run({
    auth: { uid: USER },
    data,
    rawRequest: {},
  } as never);
}

const NO_MATCH = { categoryId: null, confidence: 0, source: 'none' };

beforeEach(() => {
  vi.clearAllMocks();
  db = new fake.FakeFirestore();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  categorizeMock.mockReturnValue(NO_MATCH);
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe('recategorizeTransactions', () => {
  it('preserves the pattern-pass write shape (and rule matches still win)', async () => {
    seedTxn('t1', { categorySource: 'auto', categoryId: 'old-cat' });
    categorizeMock.mockReturnValue({ categoryId: 'rules-cat', confidence: 0.95, source: 'rule' });

    const result = await run({ mode: 'all' });

    expect(result.updated).toBe(1);
    expect(result.processed).toBe(1);
    expect(db.store.get(`${TX_PATH}/t1`)).toMatchObject({
      categoryId: 'rules-cat',
      categoryConfidence: 0.95,
      categorySource: 'rule',
      updatedAt: 'SERVER_TS',
    });
  });

  it('preserves the LLM write shape for a successful pass', async () => {
    seedTxn('t1');
    categorizeBatchWithLLMMock.mockResolvedValue({
      results: new Map([[0, { categoryId: 'llm-cat', confidence: 0.8, source: 'llm' }]]),
      failures: new Map(),
    });

    const result = await run({ useLLM: true, mode: 'uncategorized' });

    expect(result.llmCategorized).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.llmFailed).toBe(0);
    expect(db.store.get(`${TX_PATH}/t1`)).toMatchObject({
      categoryId: 'llm-cat',
      categoryConfidence: 0.8,
      categorySource: 'llm',
      updatedAt: 'SERVER_TS',
    });
    expect(db.store.get(`${TX_PATH}/t1`)!.categorizationStatus).toBeUndefined();
  });

  it('marks docs categorizationStatus failed when the LLM hard-fails', async () => {
    seedTxn('t1');
    seedTxn('t2');
    categorizeBatchWithLLMMock.mockRejectedValue(new Error('Anthropic 529 overloaded'));

    const result = await run({ useLLM: true, mode: 'uncategorized' });

    expect(result.llmFailed).toBe(2);
    expect(result.llmCategorized).toBe(0);
    for (const id of ['t1', 't2']) {
      const doc = db.store.get(`${TX_PATH}/${id}`)!;
      expect(doc.categorizationStatus).toBe('failed');
      expect(doc.categorizationError).toMatch(/529 overloaded/);
      expect(doc.categoryId).toBeNull(); // still uncategorized, but visibly so
    }
  });

  it('records per-transaction failures when the model skips some indices', async () => {
    seedTxn('t1');
    seedTxn('t2');
    categorizeBatchWithLLMMock.mockResolvedValue({
      results: new Map([[0, { categoryId: 'llm-cat', confidence: 0.8, source: 'llm' }]]),
      failures: new Map([[1, 'model returned no valid category for this transaction']]),
    });

    const result = await run({ useLLM: true, mode: 'uncategorized' });

    expect(result.llmCategorized).toBe(1);
    expect(result.llmFailed).toBe(1);
    const failedDocs = [...db.store.values()].filter(
      (d) => d.categorizationStatus === 'failed'
    );
    expect(failedDocs).toHaveLength(1);
    expect(failedDocs[0].categorizationError).toMatch(/no valid category/);
  });

  it("mode 'failed' targets only failed docs, implies LLM, and success clears the marker", async () => {
    seedTxn('t-failed', {
      categorizationStatus: 'failed',
      categorizationError: 'LLM response unusable: truncated',
    });
    seedTxn('t-ok', { categorySource: 'merchant', categoryId: 'groceries' });
    categorizeBatchWithLLMMock.mockResolvedValue({
      results: new Map([[0, { categoryId: 'llm-cat', confidence: 0.7, source: 'llm' }]]),
      failures: new Map(),
    });

    const result = await run({ mode: 'failed' }); // note: no explicit useLLM

    expect(result.processed).toBe(1); // only the failed doc was selected
    expect(result.llmCategorized).toBe(1);
    const doc = db.store.get(`${TX_PATH}/t-failed`)!;
    expect(doc.categoryId).toBe('llm-cat');
    expect(doc.categorySource).toBe('llm');
    expect(doc.categorizationStatus).toBeUndefined(); // marker cleared
    expect(doc.categorizationError).toBeUndefined();
    // The healthy doc is untouched.
    expect(db.store.get(`${TX_PATH}/t-ok`)).toMatchObject({ categoryId: 'groceries' });
  });

  it('a pattern match during retry also clears the failure marker', async () => {
    seedTxn('t-failed', {
      categorizationStatus: 'failed',
      categorizationError: 'LLM response unusable',
    });
    categorizeMock.mockReturnValue({ categoryId: 'rules-cat', confidence: 0.9, source: 'rule' });

    const result = await run({ mode: 'failed' });

    expect(result.updated).toBe(1);
    const doc = db.store.get(`${TX_PATH}/t-failed`)!;
    expect(doc.categoryId).toBe('rules-cat');
    expect(doc.categorizationStatus).toBeUndefined();
    expect(doc.categorizationError).toBeUndefined();
    expect(categorizeBatchWithLLMMock).not.toHaveBeenCalled();
  });

  it('keeps the missing-API-key behavior: error reported, docs NOT marked failed', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    seedTxn('t1');

    const result = await run({ useLLM: true, mode: 'uncategorized' });

    expect(result.errors).toContainEqual(expect.stringMatching(/ANTHROPIC_API_KEY/));
    expect(db.store.get(`${TX_PATH}/t1`)!.categorizationStatus).toBeUndefined();
  });

  it('still skips (not marks) transactions when LLM is off', async () => {
    seedTxn('t1');

    const result = await run({ mode: 'uncategorized' });

    expect(result.skipped).toBe(1);
    expect(db.store.get(`${TX_PATH}/t1`)!.categorizationStatus).toBeUndefined();
  });
});
