/**
 * `upsertBankCashHolding` must be atomic: the read-merge-write of the history
 * array runs inside a Firestore transaction so concurrent syncs (or a client
 * edit racing a sync) cannot silently drop each other's writes.
 *
 * The fake below implements real optimistic-concurrency semantics: reads
 * record the document version, and a commit whose read versions are stale is
 * retried from scratch — exactly how Firestore server transactions behave.
 * The race test forces two upserts to both read before either commits and
 * asserts the loser retries onto the winner's document instead of clobbering
 * it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { upsertBankCashHolding } from '../syncConnection';

type DocData = Record<string, unknown>;

class FakeDocRef {
  path: string;
  constructor(
    public db: FakeTxFirestore,
    collectionPath: string,
    public id: string
  ) {
    this.path = `${collectionPath}/${id}`;
  }
  collection(name: string) {
    return new FakeCollection(this.db, `${this.path}/${name}`);
  }
}

class FakeCollection {
  constructor(
    public db: FakeTxFirestore,
    public path: string
  ) {}
  doc(id: string) {
    return new FakeDocRef(this.db, this.path, id);
  }
}

class ContentionError extends Error {
  constructor() {
    super('ABORTED: transaction contention');
  }
}

class FakeTxFirestore {
  store = new Map<string, { data: DocData; version: number }>();
  /** Awaited inside txn.get — lets a test hold all participants at the read
   * barrier so both transactions read before either commits. */
  onGet: ((path: string) => Promise<void>) | null = null;
  commits = 0;
  retries = 0;

  collection(name: string) {
    return new FakeCollection(this, name);
  }

  async runTransaction<T>(fn: (txn: unknown) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reads = new Map<string, number>();
      const writes: Array<{ type: 'set' | 'update'; path: string; data: DocData }> = [];
      const firstAttempt = attempt === 0;

      const txn = {
        get: async (ref: FakeDocRef) => {
          // Only gate the first attempt at the barrier; retries proceed.
          if (this.onGet && firstAttempt) await this.onGet(ref.path);
          const entry = this.store.get(ref.path);
          reads.set(ref.path, entry?.version ?? 0);
          return {
            exists: entry !== undefined,
            id: ref.id,
            data: () => (entry ? { ...entry.data } : undefined),
          };
        },
        set: (ref: FakeDocRef, data: DocData) =>
          writes.push({ type: 'set', path: ref.path, data }),
        update: (ref: FakeDocRef, data: DocData) =>
          writes.push({ type: 'update', path: ref.path, data }),
      };

      try {
        const result = await fn(txn);
        // Commit: verify every read version is still current (optimistic lock).
        for (const [path, version] of reads) {
          if ((this.store.get(path)?.version ?? 0) !== version) throw new ContentionError();
        }
        for (const write of writes) {
          const current = this.store.get(write.path);
          if (write.type === 'update') {
            if (!current) throw new Error(`NOT_FOUND: ${write.path}`);
            this.store.set(write.path, {
              data: { ...current.data, ...write.data },
              version: current.version + 1,
            });
          } else {
            this.store.set(write.path, {
              data: { ...write.data },
              version: (current?.version ?? 0) + 1,
            });
          }
        }
        this.commits++;
        return result;
      } catch (err) {
        if (err instanceof ContentionError) {
          this.retries++;
          continue;
        }
        throw err;
      }
    }
    throw new Error('transaction retries exhausted');
  }
}

const USER = 'user1';
const HOLDING_PATH = `users/${USER}/holdings/bank-acc1`;

function params(amount: number) {
  return {
    accountUid: 'acc1',
    name: 'ABN AMRO ••5787',
    platform: 'ABN AMRO',
    amount,
    connectionId: 'conn1',
  };
}

let db: FakeTxFirestore;

beforeEach(() => {
  db = new FakeTxFirestore();
});

describe('upsertBankCashHolding', () => {
  it('creates the holding with a single dated history point', async () => {
    await upsertBankCashHolding(db as unknown as Firestore, USER, params(1000));

    const doc = db.store.get(HOLDING_PATH)!.data;
    expect(doc).toMatchObject({
      value: 1000,
      updateSource: 'bank',
      bankAccountUid: 'acc1',
      bankConnectionId: 'conn1',
      type: 'Cash',
    });
    expect(doc.history as unknown[]).toHaveLength(1);
  });

  it('updates in place: same-day re-sync keeps one history point per day', async () => {
    await upsertBankCashHolding(db as unknown as Firestore, USER, params(1000));
    await upsertBankCashHolding(db as unknown as Firestore, USER, params(1250));

    const doc = db.store.get(HOLDING_PATH)!.data;
    expect(doc.value).toBe(1250);
    const history = doc.history as Array<{ date: Timestamp; value: number }>;
    expect(history).toHaveLength(1);
    expect(history[0].value).toBe(1250);
  });

  it('preserves prior-day history when appending today', async () => {
    db.store.set(HOLDING_PATH, {
      version: 1,
      data: {
        value: 900,
        history: [{ date: '2020-01-01', value: 900 }],
      },
    });

    await upsertBankCashHolding(db as unknown as Firestore, USER, params(1000));

    const history = db.store.get(HOLDING_PATH)!.data.history as Array<{ value: number }>;
    expect(history).toHaveLength(2);
    expect(history.map((p) => p.value)).toEqual([900, 1000]);
  });

  it('two concurrent upserts converge without losing a write (race test)', async () => {
    // Barrier: hold both transactions at their initial read so BOTH observe
    // "document does not exist" before either commits — the exact interleaving
    // the old get-then-set code raced on.
    let waiting = 0;
    let release: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    db.onGet = async () => {
      waiting++;
      if (waiting === 2) release!();
      await barrier;
    };

    await Promise.all([
      upsertBankCashHolding(db as unknown as Firestore, USER, params(1000)),
      upsertBankCashHolding(db as unknown as Firestore, USER, params(1250)),
    ]);

    // The loser detected contention and re-ran against the winner's document.
    expect(db.retries).toBeGreaterThanOrEqual(1);
    expect(db.commits).toBe(2);

    const doc = db.store.get(HOLDING_PATH)!.data;
    // Consistent result: exactly one history point for today (no duplicate
    // seed overwrite), and the value matches one of the two writers — with
    // the retried write applied last.
    const history = doc.history as Array<{ value: number }>;
    expect(history).toHaveLength(1);
    expect([1000, 1250]).toContain(doc.value);
    expect(history[0].value).toBe(doc.value);
    // The document kept its bank linkage regardless of which writer won.
    expect(doc).toMatchObject({ bankAccountUid: 'acc1', updateSource: 'bank' });
  });
});
