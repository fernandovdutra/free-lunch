import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// The module transitively imports the Firebase client (initializes Auth/Firestore
// at load) — stub it, per project convention.
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));
vi.mock('@/lib/bankingFunctions', () => ({ recategorizeTransactions: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ dataOwnerId: 'user-1' }) }));

const updateDocMock = vi.hoisted(() => vi.fn());
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  setDoc: vi.fn(),
  updateDoc: (ref: unknown, data: Record<string, unknown>): Promise<void> => {
    updateDocMock(ref, data);
    return Promise.resolve();
  },
  deleteDoc: vi.fn(),
  // Sentinels, so a write payload can be asserted structurally.
  deleteField: () => 'DELETE_FIELD',
  serverTimestamp: () => 'SERVER_TS',
  Timestamp: { fromDate: (d: Date) => ({ toDate: () => d }) },
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

import {
  patchTransactionInCache,
  useUpdateTransaction,
  useUpdateTransactionCategory,
} from '../useTransactionMutations';
import type { Transaction } from '@/types';

function txn(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    externalId: null,
    date: new Date('2026-04-01'),
    bookingDate: null,
    transactionDate: null,
    description: 'Transaction',
    bankDescription: null,
    amount: -10,
    currency: 'EUR',
    counterparty: null,
    categoryId: null,
    categoryConfidence: 0,
    categorySource: 'auto',
    isSplit: false,
    splits: null,
    reimbursement: null,
    note: null,
    bankAccountId: null,
    importedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Transaction;
}

describe('patchTransactionInCache', () => {
  const patch = { categoryId: 'food-groceries', categorySource: 'manual' as const };

  it('patches the matching transaction in a flat array (non-paginated query)', () => {
    const old = [txn('a'), txn('b')];
    const next = patchTransactionInCache(old, 'b', patch) as Transaction[];
    expect(next[0]!.categoryId).toBeNull();
    expect(next[1]!.categoryId).toBe('food-groceries');
    expect(next[1]!.categorySource).toBe('manual');
  });

  it('patches inside the InfiniteData shape (paginated query) without throwing', () => {
    const old = {
      pageParams: [null, 'cursor'],
      pages: [
        { transactions: [txn('a'), txn('b')], lastDoc: null, hasMore: true },
        { transactions: [txn('c')], lastDoc: null, hasMore: false },
      ],
    };
    const next = patchTransactionInCache(old, 'c', patch) as typeof old;
    expect(next.pages[0]!.transactions[1]!.categoryId).toBeNull();
    expect(next.pages[1]!.transactions[0]!.categoryId).toBe('food-groceries');
    // Page metadata is preserved.
    expect(next.pages[0]!.hasMore).toBe(true);
    expect(next.pageParams).toEqual([null, 'cursor']);
  });

  it('returns undefined/empty inputs unchanged', () => {
    expect(patchTransactionInCache(undefined, 'a', patch)).toBeUndefined();
    expect(patchTransactionInCache(null, 'a', patch)).toBeNull();
  });

  it('leaves unknown shapes untouched (defensive)', () => {
    const weird = { foo: 'bar' };
    expect(patchTransactionInCache(weird, 'a', patch)).toBe(weird);
  });
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

/**
 * A manual categorization resolves any AI-categorization failure the backend
 * recorded (`categorizationStatus: 'failed'`). If the marker survived, the
 * transaction would keep inflating the "retry failed AI categorization" count
 * and a retry could overwrite the user's own choice.
 */
describe('manual category writes clear the AI failure marker', () => {
  beforeEach(() => {
    updateDocMock.mockReset();
  });

  /** The data payload of the first `updateDoc` call. */
  function writePayload(): Record<string, unknown> {
    const call = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>] | undefined;
    if (!call) throw new Error('updateDoc was never called');
    return call[1];
  }

  it('useUpdateTransactionCategory deletes both marker fields', async () => {
    const { result } = renderHook(() => useUpdateTransactionCategory(), { wrapper });

    await result.current.mutateAsync({ id: 't1', categoryId: 'food-groceries' });

    await waitFor(() => { expect(updateDocMock).toHaveBeenCalledTimes(1); });
    expect(writePayload()).toEqual({
      categoryId: 'food-groceries',
      categorySource: 'manual',
      categoryConfidence: 1,
      categorizationStatus: 'DELETE_FIELD',
      categorizationError: 'DELETE_FIELD',
      updatedAt: 'SERVER_TS',
    });
  });

  it('useUpdateTransaction deletes the marker fields when the edit sets a category', async () => {
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({ id: 't1', data: { categoryId: 'food-groceries' } });

    expect(writePayload()).toMatchObject({
      categoryId: 'food-groceries',
      categorizationStatus: 'DELETE_FIELD',
      categorizationError: 'DELETE_FIELD',
    });
  });

  it('useUpdateTransaction leaves the marker alone for unrelated edits (e.g. a note)', async () => {
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 't1',
      data: { note: 'lunch with team' } as never,
    });

    expect(writePayload()).toEqual({
      note: 'lunch with team',
      updatedAt: 'SERVER_TS',
    });
  });
});
