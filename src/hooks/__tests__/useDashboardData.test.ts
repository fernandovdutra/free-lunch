import { describe, it, expect } from 'vitest';
import {
  calculateSummary,
  calculateCategorySpending,
  calculateTimelineData,
} from '../useDashboardData';
import type { Transaction, Category } from '@/types';

// Helper to create mock transaction
function createMockTransaction(
  overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'description'>
): Transaction {
  return {
    externalId: null,
    date: new Date('2026-01-15'),
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

// Helper to create mock category
function createMockCategory(
  overrides: Partial<Category> & Pick<Category, 'id' | 'name' | 'color'>
): Category {
  return {
    icon: '📦',
    parentId: null,
    order: 0,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mockCategories: Category[] = [
  createMockCategory({ id: 'income-salary', name: 'Salary', color: '#10B981' }),
  createMockCategory({ id: 'food', name: 'Food & Drink', color: '#F59E0B' }),
  createMockCategory({ id: 'transport', name: 'Transport', color: '#3B82F6' }),
];

describe('calculateSummary', () => {
  it('calculates income correctly from positive amounts', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: 3000, description: 'Salary' }),
      createMockTransaction({ id: '2', amount: 500, description: 'Bonus' }),
    ];

    const summary = calculateSummary(transactions);

    expect(summary.totalIncome).toBe(3500);
  });

  it('calculates expenses correctly from negative amounts', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: -100, description: 'Groceries' }),
      createMockTransaction({ id: '2', amount: -50, description: 'Coffee' }),
    ];

    const summary = calculateSummary(transactions);

    expect(summary.totalExpenses).toBe(150);
  });

  it('calculates net balance correctly', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: 3000, description: 'Salary' }),
      createMockTransaction({ id: '2', amount: -100, description: 'Groceries' }),
      createMockTransaction({ id: '3', amount: -50, description: 'Coffee' }),
    ];

    const summary = calculateSummary(transactions);

    expect(summary.totalIncome).toBe(3000);
    expect(summary.totalExpenses).toBe(150);
    expect(summary.netBalance).toBe(2850);
  });

  it('tracks pending reimbursements separately from expenses', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: 3000, description: 'Salary' }),
      createMockTransaction({ id: '2', amount: -100, description: 'Groceries' }),
      createMockTransaction({
        id: '3',
        amount: -25,
        description: 'Work lunch',
        reimbursement: {
          status: 'pending',
          type: 'work',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const summary = calculateSummary(transactions);

    expect(summary.totalExpenses).toBe(100); // Excludes pending reimbursement
    expect(summary.pendingReimbursements).toBe(25);
    expect(summary.netBalance).toBe(2900); // Income - expenses (not including pending)
  });

  it('counts total transactions', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: 3000, description: 'Salary' }),
      createMockTransaction({ id: '2', amount: -100, description: 'Groceries' }),
      createMockTransaction({ id: '3', amount: -50, description: 'Coffee' }),
    ];

    const summary = calculateSummary(transactions);

    expect(summary.transactionCount).toBe(3);
  });

  it('handles empty transaction list', () => {
    const summary = calculateSummary([]);

    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.netBalance).toBe(0);
    expect(summary.pendingReimbursements).toBe(0);
    expect(summary.transactionCount).toBe(0);
  });

  it('handles cleared reimbursements as regular income', () => {
    const transactions = [
      createMockTransaction({
        id: '1',
        amount: 25,
        description: 'Work lunch reimbursement',
        reimbursement: {
          status: 'cleared',
          type: 'work',
          note: null,
          linkedTransactionId: '3',
          clearedAt: new Date(),
        },
      }),
    ];

    const summary = calculateSummary(transactions);

    expect(summary.totalIncome).toBe(25);
    expect(summary.pendingReimbursements).toBe(0);
  });
});

describe('calculateCategorySpending', () => {
  it('groups expenses by category', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: -100, description: 'Groceries', categoryId: 'food' }),
      createMockTransaction({ id: '2', amount: -50, description: 'Coffee', categoryId: 'food' }),
      createMockTransaction({ id: '3', amount: -30, description: 'Bus', categoryId: 'transport' }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    const foodSpending = spending.find((s) => s.categoryId === 'food');
    const transportSpending = spending.find((s) => s.categoryId === 'transport');

    expect(foodSpending?.amount).toBe(150);
    expect(foodSpending?.transactionCount).toBe(2);
    expect(transportSpending?.amount).toBe(30);
    expect(transportSpending?.transactionCount).toBe(1);
  });

  it('excludes income (positive amounts) from spending', () => {
    const transactions = [
      createMockTransaction({
        id: '1',
        amount: 3000,
        description: 'Salary',
        categoryId: 'income-salary',
      }),
      createMockTransaction({ id: '2', amount: -100, description: 'Groceries', categoryId: 'food' }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    expect(spending.find((s) => s.categoryId === 'income-salary')).toBeUndefined();
    expect(spending).toHaveLength(1);
  });

  it('excludes pending reimbursements from spending', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: -100, description: 'Groceries', categoryId: 'food' }),
      createMockTransaction({
        id: '2',
        amount: -25,
        description: 'Work lunch',
        categoryId: 'food',
        reimbursement: {
          status: 'pending',
          type: 'work',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    const foodSpending = spending.find((s) => s.categoryId === 'food');
    expect(foodSpending?.amount).toBe(100); // Excludes the 25 pending
    expect(foodSpending?.transactionCount).toBe(1);
  });

  it('handles uncategorized transactions', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: -100, description: 'Groceries', categoryId: null }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    const uncategorized = spending.find((s) => s.categoryId === 'uncategorized');
    expect(uncategorized?.categoryName).toBe('Uncategorized');
    expect(uncategorized?.amount).toBe(100);
    expect(uncategorized?.categoryColor).toBe('#9CA3AF'); // Default gray
  });

  it('calculates percentages correctly', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: -75, description: 'Groceries', categoryId: 'food' }),
      createMockTransaction({ id: '2', amount: -25, description: 'Bus', categoryId: 'transport' }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    const foodSpending = spending.find((s) => s.categoryId === 'food');
    const transportSpending = spending.find((s) => s.categoryId === 'transport');

    expect(foodSpending?.percentage).toBe(75);
    expect(transportSpending?.percentage).toBe(25);
  });

  it('sorts by amount descending', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: -30, description: 'Bus', categoryId: 'transport' }),
      createMockTransaction({ id: '2', amount: -100, description: 'Groceries', categoryId: 'food' }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    expect(spending[0]?.categoryId).toBe('food');
    expect(spending[1]?.categoryId).toBe('transport');
  });

  it('returns empty array for no expenses', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: 3000, description: 'Salary' }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    expect(spending).toHaveLength(0);
  });

  it('uses category color from categories list', () => {
    const transactions = [
      createMockTransaction({ id: '1', amount: -100, description: 'Groceries', categoryId: 'food' }),
    ];

    const spending = calculateCategorySpending(transactions, mockCategories);

    const foodSpending = spending.find((s) => s.categoryId === 'food');
    expect(foodSpending?.categoryColor).toBe('#F59E0B');
  });
});

describe('calculateTimelineData', () => {
  const dateRange = {
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-05'),
  };

  it('aggregates expenses by day', () => {
    const transactions = [
      createMockTransaction({
        id: '1',
        amount: -100,
        description: 'Groceries',
        date: new Date('2026-01-01'),
      }),
      createMockTransaction({
        id: '2',
        amount: -50,
        description: 'Coffee',
        date: new Date('2026-01-01'),
      }),
      createMockTransaction({
        id: '3',
        amount: -30,
        description: 'Lunch',
        date: new Date('2026-01-03'),
      }),
    ];

    const timeline = calculateTimelineData(transactions, dateRange);

    const jan1 = timeline.find((t) => t.date === 'Jan 1');
    const jan3 = timeline.find((t) => t.date === 'Jan 3');

    expect(jan1?.expenses).toBe(150);
    expect(jan3?.expenses).toBe(30);
  });

  it('aggregates income by day', () => {
    const transactions = [
      createMockTransaction({
        id: '1',
        amount: 3000,
        description: 'Salary',
        date: new Date('2026-01-01'),
      }),
    ];

    const timeline = calculateTimelineData(transactions, dateRange);

    const jan1 = timeline.find((t) => t.date === 'Jan 1');
    expect(jan1?.income).toBe(3000);
  });

  it('includes all days in range even without transactions', () => {
    const transactions: Transaction[] = [];

    const timeline = calculateTimelineData(transactions, dateRange);

    expect(timeline).toHaveLength(5); // Jan 1-5
    timeline.forEach((t) => {
      expect(t.income).toBe(0);
      expect(t.expenses).toBe(0);
    });
  });

  it('excludes pending reimbursements from timeline', () => {
    const transactions = [
      createMockTransaction({
        id: '1',
        amount: -100,
        description: 'Groceries',
        date: new Date('2026-01-01'),
      }),
      createMockTransaction({
        id: '2',
        amount: -25,
        description: 'Work lunch',
        date: new Date('2026-01-01'),
        reimbursement: {
          status: 'pending',
          type: 'work',
          note: null,
          linkedTransactionId: null,
          clearedAt: null,
        },
      }),
    ];

    const timeline = calculateTimelineData(transactions, dateRange);

    const jan1 = timeline.find((t) => t.date === 'Jan 1');
    expect(jan1?.expenses).toBe(100); // Excludes the 25 pending
  });

  it('sorts timeline data chronologically', () => {
    const transactions: Transaction[] = [];

    const timeline = calculateTimelineData(transactions, dateRange);

    expect(timeline[0]?.date).toBe('Jan 1');
    expect(timeline[4]?.date).toBe('Jan 5');
  });

  it('formats dates as "MMM d"', () => {
    const transactions: Transaction[] = [];

    const timeline = calculateTimelineData(transactions, dateRange);

    expect(timeline[0]?.date).toBe('Jan 1');
    expect(timeline[1]?.date).toBe('Jan 2');
  });
});
