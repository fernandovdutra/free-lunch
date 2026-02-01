import { describe, it, expect } from 'vitest';
import { calculateReimbursementSummary } from '../useReimbursements';
import type { Transaction } from '@/types';

// Helper to create mock transaction
function createMockTransaction(
  overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'description'>
): Transaction {
  return {
    externalId: null,
    date: new Date('2024-01-15'),
    currency: 'EUR',
    counterparty: null,
    categoryId: null,
    categoryConfidence: 0,
    categorySource: 'manual',
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: null,
    importedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('calculateReimbursementSummary', () => {
  it('calculates correct totals for pending work reimbursements', () => {
    const pending = [
      createMockTransaction({
        id: '1',
        amount: -50,
        description: 'Work lunch',
        reimbursement: {
          type: 'work',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
      createMockTransaction({
        id: '2',
        amount: -100,
        description: 'Train ticket',
        reimbursement: {
          type: 'work',
          status: 'pending',
          note: 'Client meeting',
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const summary = calculateReimbursementSummary(pending, []);

    expect(summary.pendingCount).toBe(2);
    expect(summary.pendingTotal).toBe(150);
    expect(summary.pendingWorkTotal).toBe(150);
    expect(summary.pendingPersonalTotal).toBe(0);
  });

  it('calculates correct totals for pending personal reimbursements', () => {
    const pending = [
      createMockTransaction({
        id: '1',
        amount: -30,
        description: 'Dinner for friend',
        reimbursement: {
          type: 'personal',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const summary = calculateReimbursementSummary(pending, []);

    expect(summary.pendingCount).toBe(1);
    expect(summary.pendingTotal).toBe(30);
    expect(summary.pendingWorkTotal).toBe(0);
    expect(summary.pendingPersonalTotal).toBe(30);
  });

  it('calculates correct mixed work and personal totals', () => {
    const pending = [
      createMockTransaction({
        id: '1',
        amount: -100,
        description: 'Work expense',
        reimbursement: {
          type: 'work',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
      createMockTransaction({
        id: '2',
        amount: -50,
        description: 'Personal IOU',
        reimbursement: {
          type: 'personal',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
      createMockTransaction({
        id: '3',
        amount: -25,
        description: 'Another work expense',
        reimbursement: {
          type: 'work',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const summary = calculateReimbursementSummary(pending, []);

    expect(summary.pendingCount).toBe(3);
    expect(summary.pendingTotal).toBe(175);
    expect(summary.pendingWorkTotal).toBe(125);
    expect(summary.pendingPersonalTotal).toBe(50);
  });

  it('calculates cleared reimbursement totals', () => {
    const cleared = [
      createMockTransaction({
        id: '1',
        amount: -75,
        description: 'Cleared expense',
        reimbursement: {
          type: 'work',
          status: 'cleared',
          note: null,
          linkedTransactionId: 'income-1',
          clearedAt: new Date('2024-01-20'),
        },
      }),
      createMockTransaction({
        id: '2',
        amount: -25,
        description: 'Another cleared',
        reimbursement: {
          type: 'personal',
          status: 'cleared',
          note: null,
          linkedTransactionId: 'income-2',
          clearedAt: new Date('2024-01-21'),
        },
      }),
    ];

    const summary = calculateReimbursementSummary([], cleared);

    expect(summary.clearedCount).toBe(2);
    expect(summary.clearedTotal).toBe(100);
  });

  it('handles empty arrays', () => {
    const summary = calculateReimbursementSummary([], []);

    expect(summary.pendingCount).toBe(0);
    expect(summary.pendingTotal).toBe(0);
    expect(summary.pendingWorkTotal).toBe(0);
    expect(summary.pendingPersonalTotal).toBe(0);
    expect(summary.clearedCount).toBe(0);
    expect(summary.clearedTotal).toBe(0);
  });

  it('uses absolute values for amounts', () => {
    // Expenses are negative but we want to show positive totals
    const pending = [
      createMockTransaction({
        id: '1',
        amount: -100, // Negative expense
        description: 'Expense',
        reimbursement: {
          type: 'work',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const summary = calculateReimbursementSummary(pending, []);

    expect(summary.pendingTotal).toBe(100); // Should be positive
    expect(summary.pendingWorkTotal).toBe(100);
  });

  it('calculates combined pending and cleared stats', () => {
    const pending = [
      createMockTransaction({
        id: '1',
        amount: -50,
        description: 'Pending work',
        reimbursement: {
          type: 'work',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
      createMockTransaction({
        id: '2',
        amount: -30,
        description: 'Pending personal',
        reimbursement: {
          type: 'personal',
          status: 'pending',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const cleared = [
      createMockTransaction({
        id: '3',
        amount: -100,
        description: 'Cleared',
        reimbursement: {
          type: 'work',
          status: 'cleared',
          note: null,
          linkedTransactionId: 'income-1',
          clearedAt: new Date(),
        },
      }),
    ];

    const summary = calculateReimbursementSummary(pending, cleared);

    expect(summary.pendingCount).toBe(2);
    expect(summary.pendingTotal).toBe(80);
    expect(summary.pendingWorkTotal).toBe(50);
    expect(summary.pendingPersonalTotal).toBe(30);
    expect(summary.clearedCount).toBe(1);
    expect(summary.clearedTotal).toBe(100);
  });
});
