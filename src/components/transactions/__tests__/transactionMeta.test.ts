import { describe, it, expect } from 'vitest';

import { buildMetaLine } from '../transactionMeta';
import type { Category, Transaction } from '@/types';

const categoriesById = new Map<string, Category>([
  [
    'groceries',
    {
      id: 'groceries',
      name: 'Groceries',
      icon: 'circle',
      color: '#888888',
      parentId: null,
      order: 0,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    externalId: null,
    date: new Date('2026-07-01'),
    bookingDate: null,
    transactionDate: null,
    description: 'Albert Heijn',
    bankDescription: null,
    amount: -45.5,
    currency: 'EUR',
    counterparty: 'Albert Heijn',
    categoryId: 'groceries',
    categoryConfidence: 1,
    categorySource: 'manual',
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

describe('buildMetaLine', () => {
  it('is just the category when there are no markers', () => {
    expect(buildMetaLine(txn(), categoriesById)).toBe('GROCERIES');
    expect(buildMetaLine(txn({ tags: [] }), categoriesById)).toBe('GROCERIES');
  });

  it('appends tags as # markers using the existing separator', () => {
    expect(buildMetaLine(txn({ tags: ['work'] }), categoriesById)).toBe('GROCERIES · #work');
    expect(buildMetaLine(txn({ tags: ['work', 'trip'] }), categoriesById)).toBe(
      'GROCERIES · #work #trip'
    );
  });

  it('collapses more than two tags into a +N counter to keep the line short', () => {
    expect(buildMetaLine(txn({ tags: ['work', 'trip', 'lunch', 'x'] }), categoriesById)).toBe(
      'GROCERIES · #work #trip +2'
    );
  });

  it('keeps the reimbursement marker ahead of the tags', () => {
    const line = buildMetaLine(
      txn({
        tags: ['work'],
        reimbursement: { type: 'work', status: 'cleared' } as Transaction['reimbursement'],
      }),
      categoriesById
    );
    expect(line).toBe('GROCERIES · REIMBURSED ✓ · #work');
  });

  it('still shows tags on uncategorized rows', () => {
    expect(buildMetaLine(txn({ categoryId: null, tags: ['work'] }), categoriesById)).toBe(
      'UNCATEGORIZED · #work'
    );
  });

  it('still shows tags on split rows', () => {
    const line = buildMetaLine(
      txn({
        isSplit: true,
        splits: [
          { amount: 20, categoryId: 'groceries', note: null },
          { amount: 25.5, categoryId: 'groceries', note: null },
        ],
        tags: ['work'],
      }),
      categoriesById
    );
    expect(line).toBe('SPLIT (2) · GROCERIES + GROCERIES · #work');
  });
});
