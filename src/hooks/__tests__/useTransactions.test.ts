import { describe, it, expect, vi } from 'vitest';

// useTransactions transitively imports the Firebase client, which initializes
// Auth/Firestore at module load. We only exercise the pure filter helpers here,
// so stub the client (project convention: mock Firebase with vi.mock()).
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

import { applyClientFilters, transactionKeys, type TransactionFilters } from '../useTransactions';
import type { Transaction } from '@/types';

// Note: Since useTransactions depends heavily on Firebase and hooks,
// we test the filter logic conceptually here. Full integration tests
// would require Firebase emulator setup.

describe('TransactionFilters type', () => {
  it('allows optional filters', () => {
    const filters: TransactionFilters = {};
    expect(filters.startDate).toBeUndefined();
    expect(filters.endDate).toBeUndefined();
    expect(filters.categoryId).toBeUndefined();
    expect(filters.searchText).toBeUndefined();
  });

  it('allows date range filters', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const filters: TransactionFilters = {
      startDate,
      endDate,
    };

    expect(filters.startDate).toEqual(startDate);
    expect(filters.endDate).toEqual(endDate);
  });

  it('allows category filter', () => {
    const filters: TransactionFilters = {
      categoryId: 'food-groceries',
    };

    expect(filters.categoryId).toBe('food-groceries');
  });

  it('allows null categoryId for uncategorized filter', () => {
    const filters: TransactionFilters = {
      categoryId: null,
    };

    expect(filters.categoryId).toBeNull();
  });

  it('allows search text filter', () => {
    const filters: TransactionFilters = {
      searchText: 'supermarket',
    };

    expect(filters.searchText).toBe('supermarket');
  });

  it('allows amount range filters', () => {
    const filters: TransactionFilters = {
      minAmount: 10,
      maxAmount: 100,
    };

    expect(filters.minAmount).toBe(10);
    expect(filters.maxAmount).toBe(100);
  });

  it('allows combining multiple filters', () => {
    const filters: TransactionFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      categoryId: 'food',
      searchText: 'lunch',
      minAmount: 5,
      maxAmount: 50,
    };

    expect(filters.startDate).toBeDefined();
    expect(filters.endDate).toBeDefined();
    expect(filters.categoryId).toBe('food');
    expect(filters.searchText).toBe('lunch');
    expect(filters.minAmount).toBe(5);
    expect(filters.maxAmount).toBe(50);
  });
});

// Helper function tests - mimicking the client-side filtering logic
describe('Client-side filter logic', () => {
  interface MockTransaction {
    description: string;
    counterparty: string | null;
    amount: number;
  }

  const mockTransactions: MockTransaction[] = [
    { description: 'Albert Heijn groceries', counterparty: 'Albert Heijn BV', amount: -45.5 },
    { description: 'Salary payment', counterparty: 'Employer Inc', amount: 3500.0 },
    { description: 'Restaurant dinner', counterparty: 'Restaurant XYZ', amount: -75.0 },
    { description: 'Coffee shop', counterparty: null, amount: -4.5 },
  ];

  it('filters by search text in description', () => {
    const searchText = 'groceries';
    const filtered = mockTransactions.filter(
      (t) =>
        t.description.toLowerCase().includes(searchText.toLowerCase()) ||
        t.counterparty?.toLowerCase().includes(searchText.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.description).toContain('groceries');
  });

  it('filters by search text in counterparty', () => {
    const searchText = 'heijn';
    const filtered = mockTransactions.filter(
      (t) =>
        t.description.toLowerCase().includes(searchText.toLowerCase()) ||
        t.counterparty?.toLowerCase().includes(searchText.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
  });

  it('filters by minimum amount', () => {
    const minAmount = 50;
    const filtered = mockTransactions.filter((t) => Math.abs(t.amount) >= minAmount);

    expect(filtered).toHaveLength(2); // salary and restaurant
  });

  it('filters by maximum amount', () => {
    const maxAmount = 50;
    const filtered = mockTransactions.filter((t) => Math.abs(t.amount) <= maxAmount);

    expect(filtered).toHaveLength(2); // groceries and coffee
  });

  it('filters by amount range', () => {
    const minAmount = 10;
    const maxAmount = 100;
    const filtered = mockTransactions.filter(
      (t) => Math.abs(t.amount) >= minAmount && Math.abs(t.amount) <= maxAmount
    );

    expect(filtered).toHaveLength(2); // groceries and restaurant
  });

  it('handles case-insensitive search', () => {
    const searchText = 'SALARY';
    const filtered = mockTransactions.filter(
      (t) =>
        t.description.toLowerCase().includes(searchText.toLowerCase()) ||
        t.counterparty?.toLowerCase().includes(searchText.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.description).toBe('Salary payment');
  });

  it('handles null counterparty in search', () => {
    const searchText = 'coffee';
    const filtered = mockTransactions.filter(
      (t) =>
        t.description.toLowerCase().includes(searchText.toLowerCase()) ||
        t.counterparty?.toLowerCase().includes(searchText.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.counterparty).toBeNull();
  });
});

// Query key only depends on server-side filters, so changing a client-side
// filter (search, direction, amounts, …) must NOT produce a new key — that's
// what lets the cached dataset be reused instead of refetching from Firestore.
describe('transactionKeys.filtered — only server filters affect the key', () => {
  const base: TransactionFilters = {
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    categoryId: 'food-groceries',
  };

  it('is stable when only client-side filters change', () => {
    const a = transactionKeys.filtered('user-1', { ...base, searchText: 'lunch', direction: 'expense' });
    const b = transactionKeys.filtered('user-1', {
      ...base,
      searchText: 'dinner',
      direction: 'income',
      minAmount: 10,
      reimbursementStatus: 'pending',
      categorizationStatus: 'manual',
    });
    expect(a).toEqual(b);
  });

  it('changes when a server-side filter changes', () => {
    const a = transactionKeys.filtered('user-1', base);
    const b = transactionKeys.filtered('user-1', { ...base, categoryId: 'transport-public' });
    expect(a).not.toEqual(b);
  });

  it('changes when the user changes', () => {
    const a = transactionKeys.filtered('user-1', base);
    const b = transactionKeys.filtered('user-2', base);
    expect(a).not.toEqual(b);
  });

  it('infinite key is also stable across client-side filters and distinct from filtered', () => {
    const a = transactionKeys.infinite('user-1', { ...base, searchText: 'a', direction: 'expense' });
    const b = transactionKeys.infinite('user-1', { ...base, searchText: 'b', direction: 'income' });
    expect(a).toEqual(b);
    // Distinct namespace from the non-paginated key (different cached shape).
    expect(transactionKeys.infinite('user-1', base)).not.toEqual(
      transactionKeys.filtered('user-1', base)
    );
  });
});

describe('applyClientFilters', () => {
  function txn(overrides: Partial<Transaction>): Transaction {
    return {
      id: Math.random().toString(36).slice(2),
      externalId: null,
      date: new Date('2026-04-01'),
      bookingDate: null,
      transactionDate: null,
      description: 'Transaction',
      bankDescription: null,
      amount: -10,
      currency: 'EUR',
      counterparty: null,
      categoryId: 'cat-1',
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

  const sample: Transaction[] = [
    txn({ description: 'Albert Heijn groceries', counterparty: 'Albert Heijn', amount: -45.5, categorySource: 'manual', tags: ['work', 'trip'] }),
    txn({ description: 'Salary payment', counterparty: 'Employer Inc', amount: 3500, categorySource: 'rule' }),
    txn({ description: 'Restaurant dinner', counterparty: 'Restaurant XYZ', amount: -75, reimbursement: { type: 'work', status: 'pending' } as Transaction['reimbursement'], tags: ['work'] }),
    txn({ description: 'Coffee shop', counterparty: null, amount: -4.5, categoryId: null, categorySource: 'none' }),
  ];

  it('returns the same list when no client filters are set', () => {
    expect(applyClientFilters(sample, {})).toHaveLength(sample.length);
  });

  it('filters by search across description and counterparty', () => {
    expect(applyClientFilters(sample, { searchText: 'heijn' })).toHaveLength(1);
  });

  it('filters by direction', () => {
    expect(applyClientFilters(sample, { direction: 'income' })).toHaveLength(1);
    expect(applyClientFilters(sample, { direction: 'expense' })).toHaveLength(3);
  });

  it('filters by amount range on absolute value', () => {
    expect(applyClientFilters(sample, { minAmount: 50 })).toHaveLength(2); // salary, restaurant
    expect(applyClientFilters(sample, { maxAmount: 50 })).toHaveLength(2); // groceries, coffee
  });

  it('filters by reimbursement status', () => {
    expect(applyClientFilters(sample, { reimbursementStatus: 'pending' })).toHaveLength(1);
    expect(applyClientFilters(sample, { reimbursementStatus: 'none' })).toHaveLength(3);
  });

  it('filters by categorization status', () => {
    expect(applyClientFilters(sample, { categorizationStatus: 'manual' })).toHaveLength(1);
    expect(applyClientFilters(sample, { categorizationStatus: 'uncategorized' })).toHaveLength(1);
    expect(applyClientFilters(sample, { categorizationStatus: 'auto' })).toHaveLength(2);
  });

  it('filters by tag (exact, case-sensitive — same semantics as the MCP tag filter)', () => {
    expect(applyClientFilters(sample, { tag: 'work' })).toHaveLength(2); // groceries, restaurant
    expect(applyClientFilters(sample, { tag: 'trip' })).toHaveLength(1); // groceries
    expect(applyClientFilters(sample, { tag: 'Work' })).toHaveLength(0); // case-sensitive
    expect(applyClientFilters(sample, { tag: 'unknown' })).toHaveLength(0);
  });

  it('treats transactions without tags as non-matching', () => {
    const untagged = applyClientFilters(sample, { tag: 'work' }).filter((t) => !t.tags?.length);
    expect(untagged).toHaveLength(0);
  });

  it('composes multiple client filters', () => {
    const result = applyClientFilters(sample, { direction: 'expense', maxAmount: 50 });
    expect(result).toHaveLength(2); // groceries (-45.5), coffee (-4.5)
  });

  it('composes the tag filter with search and the other client filters', () => {
    // tag + search
    expect(applyClientFilters(sample, { tag: 'work', searchText: 'heijn' })).toHaveLength(1);
    // tag + search that excludes every tagged row
    expect(applyClientFilters(sample, { tag: 'work', searchText: 'salary' })).toHaveLength(0);
    // tag + amount range (category is a server-side filter, applied upstream)
    expect(applyClientFilters(sample, { tag: 'work', maxAmount: 50 })).toHaveLength(1);
    // tag + reimbursement status
    expect(
      applyClientFilters(sample, { tag: 'work', reimbursementStatus: 'pending' })
    ).toHaveLength(1);
  });

  it('does not mutate the input array', () => {
    const input = [...sample];
    applyClientFilters(input, { direction: 'income' });
    expect(input).toHaveLength(sample.length);
  });
});
