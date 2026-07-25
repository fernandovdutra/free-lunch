import { describe, it, expect } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  enforceApiThrottle,
  QUOTE_CALLS_PER_HOUR,
  FX_CALLS_PER_HOUR,
} from '../apiThrottle';

/**
 * Minimal in-memory Firestore stand-in supporting the exact chain the throttle
 * uses: collection().doc().collection().doc() refs plus runTransaction with
 * get/set({ merge: true }).
 */
function createFakeDb() {
  const store = new Map<string, Record<string, unknown>>();

  function makeRef(path: string) {
    return {
      path,
      collection: (name: string) => ({
        doc: (id: string) => makeRef(`${path}/${name}/${id}`),
      }),
    };
  }

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => makeRef(`${name}/${id}`),
    }),
    runTransaction: async (fn: (txn: unknown) => Promise<void>) => {
      const txn = {
        get: async (ref: { path: string }) => ({
          exists: store.has(ref.path),
          data: () => store.get(ref.path),
        }),
        set: (ref: { path: string }, value: Record<string, unknown>, opts?: { merge?: boolean }) => {
          const existing = opts?.merge ? (store.get(ref.path) ?? {}) : {};
          store.set(ref.path, { ...existing, ...value });
        },
      };
      await fn(txn);
    },
  };

  return { db: db as unknown as Firestore, store };
}

const HOUR_MS = 3_600_000;

describe('enforceApiThrottle', () => {
  it('allows calls under the limit and counts them', async () => {
    const { db, store } = createFakeDb();
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      await expect(enforceApiThrottle(db, 'user-1', 'fx', 5, now)).resolves.toBeUndefined();
    }

    const usage = store.get('users/user-1/meta/apiUsage') as { fx: { count: number } };
    expect(usage.fx.count).toBe(5);
  });

  it('rejects with resource-exhausted once the limit is reached', async () => {
    const { db } = createFakeDb();
    const now = Date.now();

    for (let i = 0; i < 3; i++) {
      await enforceApiThrottle(db, 'user-1', 'quote', 3, now);
    }

    const overLimit = enforceApiThrottle(db, 'user-1', 'quote', 3, now);
    await expect(overLimit).rejects.toBeInstanceOf(HttpsError);
    await expect(
      enforceApiThrottle(db, 'user-1', 'quote', 3, now)
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('resets the counter in a new hourly window', async () => {
    const { db, store } = createFakeDb();
    const now = Date.now();

    for (let i = 0; i < 2; i++) {
      await enforceApiThrottle(db, 'user-1', 'fx', 2, now);
    }
    await expect(enforceApiThrottle(db, 'user-1', 'fx', 2, now)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });

    // One hour later the fixed window rolls over and calls are allowed again.
    await expect(enforceApiThrottle(db, 'user-1', 'fx', 2, now + HOUR_MS)).resolves.toBeUndefined();
    const usage = store.get('users/user-1/meta/apiUsage') as { fx: { count: number } };
    expect(usage.fx.count).toBe(1);
  });

  it('tracks quote and fx counters independently', async () => {
    const { db, store } = createFakeDb();
    const now = Date.now();

    await enforceApiThrottle(db, 'user-1', 'quote', QUOTE_CALLS_PER_HOUR, now);
    await enforceApiThrottle(db, 'user-1', 'fx', FX_CALLS_PER_HOUR, now);
    await enforceApiThrottle(db, 'user-1', 'fx', FX_CALLS_PER_HOUR, now);

    const usage = store.get('users/user-1/meta/apiUsage') as {
      quote: { count: number };
      fx: { count: number };
    };
    expect(usage.quote.count).toBe(1);
    expect(usage.fx.count).toBe(2);
  });

  it('tracks users independently', async () => {
    const { db } = createFakeDb();
    const now = Date.now();

    await enforceApiThrottle(db, 'user-1', 'fx', 1, now);
    await expect(enforceApiThrottle(db, 'user-1', 'fx', 1, now)).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
    // A different user has their own budget.
    await expect(enforceApiThrottle(db, 'user-2', 'fx', 1, now)).resolves.toBeUndefined();
  });
});
