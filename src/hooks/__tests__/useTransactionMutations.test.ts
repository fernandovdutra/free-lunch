import { describe, it, expect, vi } from 'vitest';

// The module transitively imports the Firebase client (initializes Auth/Firestore
// at load). We only exercise the pure cache helper, so stub the client.
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

import { patchTransactionInCache } from '../useTransactionMutations';
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
