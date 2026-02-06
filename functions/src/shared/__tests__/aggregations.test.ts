import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  calculateSummary,
  calculateCategorySpending,
  calculateTimelineData,
  calculateSpendingByCategory,
  calculateBudgetProgress,
  calculateReimbursementSummary,
  serializeTransaction,
  type TransactionDoc,
  type CategoryDoc,
  type BudgetDoc,
} from '../aggregations';

// Helper to create a mock Timestamp
function mockTimestamp(dateStr: string): Timestamp {
  return Timestamp.fromDate(new Date(dateStr));
}

// Helper to create a transaction doc
function createTx(overrides: Omit<Partial<TransactionDoc>, 'date'> & { amount: number; date?: string }): { id: string; doc: TransactionDoc } {
  const id = overrides.externalId ?? `tx-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    doc: {
      date: mockTimestamp(overrides.date ?? '2024-01-15'),
      amount: overrides.amount,
      categoryId: overrides.categoryId ?? null,
      isSplit: overrides.isSplit ?? false,
      splits: overrides.splits ?? null,
      reimbursement: overrides.reimbursement ?? null,
      description: overrides.description ?? 'Test transaction',
      counterparty: overrides.counterparty ?? null,
      externalId: overrides.externalId ?? null,
      currency: overrides.currency ?? 'EUR',
      categorySource: overrides.categorySource ?? 'manual',
      categoryConfidence: overrides.categoryConfidence ?? 1,
      bankAccountId: overrides.bankAccountId ?? null,
      importedAt: overrides.importedAt ?? mockTimestamp('2024-01-15'),
      updatedAt: overrides.updatedAt ?? mockTimestamp('2024-01-15'),
    },
  };
}

// ============================================================================
// calculateSummary
// ============================================================================

describe('calculateSummary', () => {
  it('handles empty array', () => {
    const result = calculateSummary([]);
    expect(result).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      pendingReimbursements: 0,
      transactionCount: 0,
    });
  });

  it('sums income correctly', () => {
    const transactions = [
      createTx({ amount: 100 }),
      createTx({ amount: 200 }),
    ];
    const result = calculateSummary(transactions);
    expect(result.totalIncome).toBe(300);
    expect(result.totalExpenses).toBe(0);
    expect(result.netBalance).toBe(300);
    expect(result.transactionCount).toBe(2);
  });

  it('sums expenses correctly', () => {
    const transactions = [
      createTx({ amount: -50 }),
      createTx({ amount: -75.5 }),
    ];
    const result = calculateSummary(transactions);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(125.5);
    expect(result.netBalance).toBe(-125.5);
  });

  it('handles mixed income and expenses', () => {
    const transactions = [
      createTx({ amount: 1000 }),
      createTx({ amount: -200 }),
      createTx({ amount: -300 }),
    ];
    const result = calculateSummary(transactions);
    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(500);
    expect(result.netBalance).toBe(500);
  });

  it('excludes pending reimbursements from income/expenses', () => {
    const transactions = [
      createTx({ amount: 1000 }),
      createTx({ amount: -200 }),
      createTx({
        amount: -150,
        reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
    ];
    const result = calculateSummary(transactions);
    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(200);
    expect(result.pendingReimbursements).toBe(150);
    expect(result.netBalance).toBe(800);
  });

  it('includes cleared reimbursements in expenses', () => {
    const transactions = [
      createTx({
        amount: -100,
        reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
      }),
    ];
    const result = calculateSummary(transactions);
    expect(result.totalExpenses).toBe(100);
    expect(result.pendingReimbursements).toBe(0);
  });
});

// ============================================================================
// calculateCategorySpending
// ============================================================================

describe('calculateCategorySpending', () => {
  const categories = new Map<string, CategoryDoc>([
    ['food', { name: 'Food', icon: '🍽️', color: '#C9A227', parentId: null, order: 0, isSystem: true }],
    ['food-groceries', { name: 'Groceries', icon: '🛒', color: '#C9A227', parentId: 'food', order: 0, isSystem: true }],
    ['transport', { name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 1, isSystem: true }],
  ]);

  it('handles empty array', () => {
    const result = calculateCategorySpending([], categories);
    expect(result).toEqual([]);
  });

  it('groups expenses by category', () => {
    const transactions = [
      createTx({ amount: -50, categoryId: 'food' }),
      createTx({ amount: -30, categoryId: 'food' }),
      createTx({ amount: -20, categoryId: 'transport' }),
    ];
    const result = calculateCategorySpending(transactions, categories);
    expect(result).toHaveLength(2);

    const food = result.find(r => r.categoryId === 'food');
    expect(food?.amount).toBe(80);
    expect(food?.transactionCount).toBe(2);
    expect(food?.categoryName).toBe('Food');

    const transport = result.find(r => r.categoryId === 'transport');
    expect(transport?.amount).toBe(20);
    expect(transport?.transactionCount).toBe(1);
  });

  it('calculates percentages correctly', () => {
    const transactions = [
      createTx({ amount: -75, categoryId: 'food' }),
      createTx({ amount: -25, categoryId: 'transport' }),
    ];
    const result = calculateCategorySpending(transactions, categories);
    const food = result.find(r => r.categoryId === 'food');
    expect(food?.percentage).toBe(75);
    const transport = result.find(r => r.categoryId === 'transport');
    expect(transport?.percentage).toBe(25);
  });

  it('excludes income (positive amounts)', () => {
    const transactions = [
      createTx({ amount: 1000, categoryId: 'food' }),
      createTx({ amount: -50, categoryId: 'food' }),
    ];
    const result = calculateCategorySpending(transactions, categories);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(50);
  });

  it('excludes pending reimbursements', () => {
    const transactions = [
      createTx({ amount: -50, categoryId: 'food' }),
      createTx({
        amount: -100,
        categoryId: 'food',
        reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
    ];
    const result = calculateCategorySpending(transactions, categories);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(50);
  });

  it('handles uncategorized transactions', () => {
    const transactions = [
      createTx({ amount: -50, categoryId: null }),
    ];
    const result = calculateCategorySpending(transactions, categories);
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe('uncategorized');
    expect(result[0].categoryName).toBe('Uncategorized');
  });

  it('handles split transactions', () => {
    const transactions = [
      createTx({
        amount: -100,
        categoryId: 'food',
        isSplit: true,
        splits: [
          { amount: 60, categoryId: 'food-groceries', note: null },
          { amount: 40, categoryId: 'transport', note: null },
        ],
      }),
    ];
    const result = calculateCategorySpending(transactions, categories);

    const groceries = result.find(r => r.categoryId === 'food-groceries');
    expect(groceries?.amount).toBe(60);

    const transport = result.find(r => r.categoryId === 'transport');
    expect(transport?.amount).toBe(40);
  });

  it('sorts by amount descending', () => {
    const transactions = [
      createTx({ amount: -20, categoryId: 'transport' }),
      createTx({ amount: -80, categoryId: 'food' }),
    ];
    const result = calculateCategorySpending(transactions, categories);
    expect(result[0].categoryId).toBe('food');
    expect(result[1].categoryId).toBe('transport');
  });
});

// ============================================================================
// calculateTimelineData
// ============================================================================

describe('calculateTimelineData', () => {
  it('handles empty array with date range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-03');
    const result = calculateTimelineData([], start, end);
    expect(result).toHaveLength(3);
    expect(result.every(d => d.income === 0 && d.expenses === 0)).toBe(true);
  });

  it('zero-fills days without transactions', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-05');
    const transactions = [
      createTx({ amount: -50, date: '2024-01-03' }),
    ];
    const result = calculateTimelineData(transactions, start, end);
    expect(result).toHaveLength(5);

    // Jan 1 and Jan 2 should be zero
    expect(result[0].income).toBe(0);
    expect(result[0].expenses).toBe(0);

    // Jan 3 should have data
    const jan3 = result.find(d => d.dateKey === '2024-01-03');
    expect(jan3?.expenses).toBe(50);
  });

  it('separates income and expenses', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-01');
    const transactions = [
      createTx({ amount: 200, date: '2024-01-01' }),
      createTx({ amount: -50, date: '2024-01-01' }),
    ];
    const result = calculateTimelineData(transactions, start, end);
    expect(result[0].income).toBe(200);
    expect(result[0].expenses).toBe(50);
  });

  it('excludes pending reimbursements', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-01');
    const transactions = [
      createTx({ amount: -100, date: '2024-01-01' }),
      createTx({
        amount: -50,
        date: '2024-01-01',
        reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
    ];
    const result = calculateTimelineData(transactions, start, end);
    expect(result[0].expenses).toBe(100);
  });

  it('includes dateKey in yyyy-MM-dd format', () => {
    const start = new Date('2024-01-15');
    const end = new Date('2024-01-15');
    const result = calculateTimelineData([], start, end);
    expect(result[0].dateKey).toBe('2024-01-15');
  });

  it('returns formatted date string', () => {
    const start = new Date('2024-01-15');
    const end = new Date('2024-01-15');
    const result = calculateTimelineData([], start, end);
    expect(result[0].date).toBe('Jan 15');
  });
});

// ============================================================================
// calculateSpendingByCategory
// ============================================================================

describe('calculateSpendingByCategory', () => {
  const categories = new Map<string, CategoryDoc>([
    ['food', { name: 'Food', icon: '🍽️', color: '#C9A227', parentId: null, order: 0, isSystem: true }],
    ['food-groceries', { name: 'Groceries', icon: '🛒', color: '#C9A227', parentId: 'food', order: 0, isSystem: true }],
    ['transport', { name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 1, isSystem: true }],
  ]);

  it('handles empty array', () => {
    const result = calculateSpendingByCategory([], categories);
    expect(result.size).toBe(0);
  });

  it('sums spending by category', () => {
    const transactions = [
      createTx({ amount: -50, categoryId: 'food' }),
      createTx({ amount: -30, categoryId: 'food' }),
    ];
    const result = calculateSpendingByCategory(transactions, categories);
    expect(result.get('food')).toBe(80);
  });

  it('rolls up child spending to parent', () => {
    const transactions = [
      createTx({ amount: -50, categoryId: 'food-groceries' }),
    ];
    const result = calculateSpendingByCategory(transactions, categories);
    expect(result.get('food-groceries')).toBe(50);
    expect(result.get('food')).toBe(50); // parent rollup
  });

  it('handles split transactions with parent rollup', () => {
    const transactions = [
      createTx({
        amount: -100,
        categoryId: 'food',
        isSplit: true,
        splits: [
          { amount: 60, categoryId: 'food-groceries', note: null },
          { amount: 40, categoryId: 'transport', note: null },
        ],
      }),
    ];
    const result = calculateSpendingByCategory(transactions, categories);
    expect(result.get('food-groceries')).toBe(60);
    expect(result.get('food')).toBe(60); // parent rollup from groceries split
    expect(result.get('transport')).toBe(40);
  });

  it('skips income transactions', () => {
    const transactions = [
      createTx({ amount: 1000, categoryId: 'food' }),
    ];
    const result = calculateSpendingByCategory(transactions, categories);
    expect(result.size).toBe(0);
  });

  it('excludes pending reimbursements', () => {
    const transactions = [
      createTx({ amount: -100, categoryId: 'food' }),
      createTx({
        amount: -50,
        categoryId: 'food',
        reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
    ];
    const result = calculateSpendingByCategory(transactions, categories);
    expect(result.get('food')).toBe(100);
  });
});

// ============================================================================
// calculateBudgetProgress
// ============================================================================

describe('calculateBudgetProgress', () => {
  const categories = new Map<string, CategoryDoc>([
    ['food', { name: 'Food', icon: '🍽️', color: '#C9A227', parentId: null, order: 0, isSystem: true }],
    ['transport', { name: 'Transport', icon: '🚗', color: '#4A6FA5', parentId: null, order: 1, isSystem: true }],
  ]);

  it('handles empty budgets', () => {
    const result = calculateBudgetProgress([], new Map(), categories);
    expect(result).toEqual([]);
  });

  it('calculates safe status', () => {
    const budgets = [
      { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 200, alertThreshold: 80, isActive: true } as BudgetDoc },
    ];
    const spending = new Map([['food', 100]]);
    const result = calculateBudgetProgress(budgets, spending, categories);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('safe');
    expect(result[0].spent).toBe(100);
    expect(result[0].remaining).toBe(100);
    expect(result[0].percentage).toBe(50);
    expect(result[0].categoryName).toBe('Food');
  });

  it('calculates warning status', () => {
    const budgets = [
      { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: true } as BudgetDoc },
    ];
    const spending = new Map([['food', 85]]);
    const result = calculateBudgetProgress(budgets, spending, categories);
    expect(result[0].status).toBe('warning');
  });

  it('calculates exceeded status', () => {
    const budgets = [
      { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: true } as BudgetDoc },
    ];
    const spending = new Map([['food', 150]]);
    const result = calculateBudgetProgress(budgets, spending, categories);
    expect(result[0].status).toBe('exceeded');
    expect(result[0].remaining).toBe(0);
    expect(result[0].percentage).toBe(150);
  });

  it('filters inactive budgets', () => {
    const budgets = [
      { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: false } as BudgetDoc },
    ];
    const result = calculateBudgetProgress(budgets, new Map(), categories);
    expect(result).toHaveLength(0);
  });

  it('sorts by percentage descending', () => {
    const budgets = [
      { id: 'b1', doc: { name: 'Food Budget', categoryId: 'food', monthlyLimit: 100, alertThreshold: 80, isActive: true } as BudgetDoc },
      { id: 'b2', doc: { name: 'Transport Budget', categoryId: 'transport', monthlyLimit: 100, alertThreshold: 80, isActive: true } as BudgetDoc },
    ];
    const spending = new Map([['food', 30], ['transport', 70]]);
    const result = calculateBudgetProgress(budgets, spending, categories);
    expect(result[0].budgetId).toBe('b2');
    expect(result[1].budgetId).toBe('b1');
  });

  it('handles missing category gracefully', () => {
    const budgets = [
      { id: 'b1', doc: { name: 'Unknown Budget', categoryId: 'nonexistent', monthlyLimit: 100, alertThreshold: 80, isActive: true } as BudgetDoc },
    ];
    const result = calculateBudgetProgress(budgets, new Map(), categories);
    expect(result[0].categoryName).toBe('Unknown');
    expect(result[0].categoryIcon).toBe('📁');
  });
});

// ============================================================================
// calculateReimbursementSummary
// ============================================================================

describe('calculateReimbursementSummary', () => {
  it('handles empty arrays', () => {
    const result = calculateReimbursementSummary([], []);
    expect(result).toEqual({
      pendingCount: 0,
      pendingTotal: 0,
      pendingWorkTotal: 0,
      pendingPersonalTotal: 0,
      clearedCount: 0,
      clearedTotal: 0,
    });
  });

  it('calculates pending totals with work/personal breakdown', () => {
    const pending = [
      createTx({
        amount: -100,
        reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
      createTx({
        amount: -50,
        reimbursement: { type: 'personal', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
      createTx({
        amount: -75,
        reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
    ];
    const result = calculateReimbursementSummary(pending, []);
    expect(result.pendingCount).toBe(3);
    expect(result.pendingTotal).toBe(225);
    expect(result.pendingWorkTotal).toBe(175);
    expect(result.pendingPersonalTotal).toBe(50);
  });

  it('calculates cleared totals', () => {
    const cleared = [
      createTx({
        amount: -200,
        reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
      }),
    ];
    const result = calculateReimbursementSummary([], cleared);
    expect(result.clearedCount).toBe(1);
    expect(result.clearedTotal).toBe(200);
  });

  it('handles mixed pending and cleared', () => {
    const pending = [
      createTx({
        amount: -100,
        reimbursement: { type: 'work', status: 'pending', note: null, linkedTransactionId: null, clearedAt: null },
      }),
    ];
    const cleared = [
      createTx({
        amount: -50,
        reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
      }),
    ];
    const result = calculateReimbursementSummary(pending, cleared);
    expect(result.pendingCount).toBe(1);
    expect(result.pendingTotal).toBe(100);
    expect(result.clearedCount).toBe(1);
    expect(result.clearedTotal).toBe(50);
  });
});

// ============================================================================
// serializeTransaction
// ============================================================================

describe('serializeTransaction', () => {
  it('serializes dates as ISO strings', () => {
    const tx = createTx({ amount: -50, date: '2024-01-15T12:00:00Z' });
    const result = serializeTransaction(tx.id, tx.doc);
    expect(typeof result.date).toBe('string');
    expect(typeof result.importedAt).toBe('string');
    expect(typeof result.updatedAt).toBe('string');
  });

  it('serializes reimbursement clearedAt as ISO string', () => {
    const tx = createTx({
      amount: -50,
      reimbursement: { type: 'work', status: 'cleared', note: null, linkedTransactionId: 'x', clearedAt: mockTimestamp('2024-01-20') },
    });
    const result = serializeTransaction(tx.id, tx.doc);
    expect(result.reimbursement?.clearedAt).toContain('2024-01-20');
  });

  it('handles null reimbursement', () => {
    const tx = createTx({ amount: -50 });
    const result = serializeTransaction(tx.id, tx.doc);
    expect(result.reimbursement).toBeNull();
  });

  it('preserves all transaction fields', () => {
    const tx = createTx({
      amount: -100,
      categoryId: 'food',
      description: 'Test',
      counterparty: 'Store',
      currency: 'EUR',
      categorySource: 'manual',
      categoryConfidence: 0.95,
      isSplit: true,
      splits: [{ amount: 50, categoryId: 'food', note: 'lunch' }],
    });
    const result = serializeTransaction(tx.id, tx.doc);
    expect(result.amount).toBe(-100);
    expect(result.categoryId).toBe('food');
    expect(result.description).toBe('Test');
    expect(result.counterparty).toBe('Store');
    expect(result.isSplit).toBe(true);
    expect(result.splits).toHaveLength(1);
  });
});
