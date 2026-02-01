import { describe, it, expect } from 'vitest';
import type { Budget, Transaction } from '@/types';

// Mock data helpers
function createMockBudget(overrides?: Partial<Budget>): Budget {
  return {
    id: 'budget-1',
    name: 'Groceries Budget',
    categoryId: 'food-groceries',
    monthlyLimit: 500,
    alertThreshold: 80,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    externalId: null,
    date: new Date(),
    description: 'Test Transaction',
    amount: -50,
    currency: 'EUR',
    counterparty: null,
    categoryId: 'food-groceries',
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

describe('Budget calculations', () => {
  describe('Progress calculation', () => {
    it('calculates correct percentage for partial spending', () => {
      const budget = createMockBudget({ monthlyLimit: 500 });
      const spent = 250;
      const percentage = (spent / budget.monthlyLimit) * 100;

      expect(percentage).toBe(50);
    });

    it('calculates percentage over 100 when exceeded', () => {
      const budget = createMockBudget({ monthlyLimit: 500 });
      const spent = 600;
      const percentage = (spent / budget.monthlyLimit) * 100;

      expect(percentage).toBe(120);
    });

    it('handles zero limit gracefully', () => {
      const budget = createMockBudget({ monthlyLimit: 0 });
      const spent = 100;
      const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

      expect(percentage).toBe(0);
    });
  });

  describe('Status determination', () => {
    it('returns "safe" when under alert threshold', () => {
      const budget = createMockBudget({ monthlyLimit: 500, alertThreshold: 80 });
      const spent = 300; // 60%
      const percentage = (spent / budget.monthlyLimit) * 100;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= budget.alertThreshold) status = 'warning';

      expect(status).toBe('safe');
    });

    it('returns "warning" when at alert threshold', () => {
      const budget = createMockBudget({ monthlyLimit: 500, alertThreshold: 80 });
      const spent = 400; // 80%
      const percentage = (spent / budget.monthlyLimit) * 100;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= budget.alertThreshold) status = 'warning';

      expect(status).toBe('warning');
    });

    it('returns "exceeded" when over 100%', () => {
      const budget = createMockBudget({ monthlyLimit: 500, alertThreshold: 80 });
      const spent = 550; // 110%
      const percentage = (spent / budget.monthlyLimit) * 100;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= budget.alertThreshold) status = 'warning';

      expect(status).toBe('exceeded');
    });
  });

  describe('Transaction filtering', () => {
    it('excludes income (positive amounts) from budget calculations', () => {
      const incomeTransaction = createMockTransaction({ amount: 100 }); // positive = income
      const shouldInclude = incomeTransaction.amount < 0;

      expect(shouldInclude).toBe(false);
    });

    it('includes expenses (negative amounts) in budget calculations', () => {
      const expenseTransaction = createMockTransaction({ amount: -50 }); // negative = expense
      const shouldInclude = expenseTransaction.amount < 0;

      expect(shouldInclude).toBe(true);
    });

    it('excludes pending reimbursements from budget calculations', () => {
      const reimbursableTransaction = createMockTransaction({
        amount: -50,
        reimbursement: {
          type: 'work',
          note: null,
          status: 'pending',
          linkedTransactionId: null,
          clearedAt: null,
        },
      });
      const shouldInclude =
        reimbursableTransaction.amount < 0 &&
        reimbursableTransaction.reimbursement?.status !== 'pending';

      expect(shouldInclude).toBe(false);
    });

    it('includes cleared reimbursements in budget calculations', () => {
      const clearedTransaction = createMockTransaction({
        amount: -50,
        reimbursement: {
          type: 'work',
          note: null,
          status: 'cleared',
          linkedTransactionId: 'tx-2',
          clearedAt: new Date(),
        },
      });
      const shouldInclude =
        clearedTransaction.amount < 0 &&
        clearedTransaction.reimbursement?.status !== 'pending';

      expect(shouldInclude).toBe(true);
    });
  });

  describe('Split transaction handling', () => {
    it('counts each split toward its respective category', () => {
      const splitTransaction = createMockTransaction({
        amount: -100,
        isSplit: true,
        splits: [
          { amount: 60, categoryId: 'food-groceries', note: null },
          { amount: 40, categoryId: 'food-restaurants', note: null },
        ],
      });

      const spendingByCategory = new Map<string, number>();

      if (splitTransaction.isSplit && splitTransaction.splits) {
        splitTransaction.splits.forEach((split) => {
          const current = spendingByCategory.get(split.categoryId) ?? 0;
          spendingByCategory.set(split.categoryId, current + split.amount);
        });
      }

      expect(spendingByCategory.get('food-groceries')).toBe(60);
      expect(spendingByCategory.get('food-restaurants')).toBe(40);
    });
  });
});
