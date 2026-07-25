import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CallableRequest } from 'firebase-functions/v2/https';

/**
 * In-memory doc store shared by the fake Firestore. Covers everything the
 * handler touches: membership resolution (resolveDataOwner), role lookup
 * (requireRole), the throttle transaction, and the holdings collection.
 */
let docs: Map<string, Record<string, unknown>>;

function makeRef(path: string): Record<string, unknown> {
  return {
    path,
    get: async () => ({
      exists: docs.has(path),
      data: () => docs.get(path),
    }),
    collection: (name: string) => makeCollection(`${path}/${name}`),
  };
}

function makeCollection(path: string) {
  return {
    doc: (id: string) => makeRef(`${path}/${id}`),
    get: async () => ({ docs: [] as unknown[] }),
  };
}

const mockDb = {
  collection: (name: string) => makeCollection(name),
  runTransaction: async (fn: (txn: unknown) => Promise<void>) => {
    const txn = {
      get: async (ref: { path: string }) => ({
        exists: docs.has(ref.path),
        data: () => docs.get(ref.path),
      }),
      set: (ref: { path: string }, value: Record<string, unknown>, opts?: { merge?: boolean }) => {
        const existing = opts?.merge ? (docs.get(ref.path) ?? {}) : {};
        docs.set(ref.path, { ...existing, ...value });
      },
    };
    await fn(txn);
  },
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
}));

vi.mock('../../marketData/twelveData.js', () => ({
  TwelveDataClient: class {},
  twelveDataApiKey: { name: 'TWELVE_DATA_API_KEY', value: () => 'test-api-key' },
}));

const refreshHoldings = vi.fn<(...args: unknown[]) => Promise<{ updated: number; skipped: number }>>(
  async () => ({ updated: 0, skipped: 0 })
);
vi.mock('../../marketData/refreshHoldings.js', () => ({
  refreshHoldings: (...args: unknown[]) => refreshHoldings(...args),
}));

import { getLiveQuote } from '../getLiveQuote.js';

function callAs(uid: string) {
  return getLiveQuote.run({
    auth: { uid },
    data: {},
    rawRequest: {},
  } as unknown as CallableRequest);
}

describe('getLiveQuote authorization', () => {
  beforeEach(() => {
    refreshHoldings.mockClear();
    docs = new Map(
      Object.entries({
        'memberships/viewer-1': { primaryOwnerId: 'owner-1' },
        'memberships/editor-1': { primaryOwnerId: 'owner-1' },
        'users/owner-1': { members: { 'viewer-1': 'viewer', 'editor-1': 'editor' } },
      })
    );
  });

  it('rejects unauthenticated calls', async () => {
    await expect(
      getLiveQuote.run({ auth: undefined, data: {}, rawRequest: {} } as unknown as CallableRequest)
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('denies a viewer household member (holdings writes require owner/editor)', async () => {
    await expect(callAs('viewer-1')).rejects.toMatchObject({ code: 'permission-denied' });
    expect(refreshHoldings).not.toHaveBeenCalled();
  });

  it('allows the owner to refresh prices', async () => {
    await expect(callAs('owner-1')).resolves.toEqual({ updated: 0, skipped: 0 });
    expect(refreshHoldings).toHaveBeenCalledTimes(1);
  });

  it('allows an editor household member to refresh prices', async () => {
    await expect(callAs('editor-1')).resolves.toEqual({ updated: 0, skipped: 0 });
    expect(refreshHoldings).toHaveBeenCalledTimes(1);
  });

  it('throttles a caller who exceeds the hourly quote limit', async () => {
    // Pre-seed the caller's usage doc at the limit for the current hour.
    docs.set('users/owner-1/meta/apiUsage', {
      quote: { bucket: Math.floor(Date.now() / 3_600_000), count: 30 },
    });

    await expect(callAs('owner-1')).rejects.toMatchObject({ code: 'resource-exhausted' });
    expect(refreshHoldings).not.toHaveBeenCalled();
  });

  it('throttle is per caller: another user still has budget', async () => {
    docs.set('users/editor-1/meta/apiUsage', {
      quote: { bucket: Math.floor(Date.now() / 3_600_000), count: 30 },
    });

    await expect(callAs('editor-1')).rejects.toMatchObject({ code: 'resource-exhausted' });
    await expect(callAs('owner-1')).resolves.toEqual({ updated: 0, skipped: 0 });
  });
});
