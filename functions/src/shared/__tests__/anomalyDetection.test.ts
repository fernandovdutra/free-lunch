import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { detectAnomalies } from '../anomalyDetection';
import type { TransactionDoc, CategoryDoc } from '../aggregations';

function mockTimestamp(dateStr: string): Timestamp {
  return Timestamp.fromDate(new Date(dateStr));
}

function createTx(
  overrides: Omit<Partial<TransactionDoc>, 'date'> & { amount: number; date?: string }
): { id: string; doc: TransactionDoc } {
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
    } as TransactionDoc,
  };
}

const emptyCategories = new Map<string, CategoryDoc>();

describe('detectAnomalies', () => {
  it('returns empty array for empty transactions', () => {
    const result = detectAnomalies([], [], emptyCategories);
    expect(result).toEqual([]);
  });

  describe('large expense detection', () => {
    const history = Array.from({ length: 30 }, (_, i) =>
      createTx({ amount: -10, counterparty: 'Shop', categoryId: 'food', date: `2024-01-${String(i + 1).padStart(2, '0')}` })
    );
    // avg = 10

    it('flags expense > 3x average and > €50 as warning (not > 5x)', () => {
      // avg=10, expense=40 → 40 > 3*10=30 AND 40 < 5*10=50 → warning
      // But 40 < 50 (abs threshold), so we need a bigger avg
      // Use history with avg=20, expense=80 → 80 > 3*20=60 AND 80 < 5*20=100 → warning
      const bigHistory = Array.from({ length: 30 }, (_, i) =>
        createTx({ amount: -20, counterparty: 'Shop', categoryId: 'food', date: `2024-01-${String(i + 1).padStart(2, '0')}` })
      );
      const today = [createTx({ amount: -80, counterparty: 'Big Shop', categoryId: 'food' })];
      const result = detectAnomalies(today, bigHistory, emptyCategories);
      const largeExpense = result.find((a) => a.description.includes('Unusually large'));
      expect(largeExpense).toBeDefined();
      expect(largeExpense!.severity).toBe('warning');
    });

    it('flags expense > 5x average as alert', () => {
      // avg=10, expense=60 → 60 > 5*10=50 → alert
      const today = [createTx({ amount: -60, counterparty: 'Big Shop', categoryId: 'food' })];
      const result = detectAnomalies(today, history, emptyCategories);
      const largeExpense = result.find((a) => a.description.includes('Unusually large'));
      expect(largeExpense).toBeDefined();
      expect(largeExpense!.severity).toBe('alert');
    });

    it('does NOT flag expense > 3x average but under €50', () => {
      const today = [createTx({ amount: -40, counterparty: 'Small Shop', categoryId: 'food' })];
      const result = detectAnomalies(today, history, emptyCategories);
      const largeExpense = result.find((a) => a.description.includes('Unusually large'));
      expect(largeExpense).toBeUndefined();
    });

    it('skips large-expense check when no history (avg=0)', () => {
      const today = [createTx({ amount: -1000, counterparty: 'Shop', categoryId: 'food' })];
      const result = detectAnomalies(today, [], emptyCategories);
      const largeExpense = result.find((a) => a.description.includes('Unusually large'));
      expect(largeExpense).toBeUndefined();
    });
  });

  describe('uncategorized detection', () => {
    it('flags categoryId: null as info', () => {
      const today = [createTx({ amount: -20, categoryId: null })];
      const result = detectAnomalies(today, [], emptyCategories);
      const uncat = result.find((a) => a.description.includes('Uncategorized'));
      expect(uncat).toBeDefined();
      expect(uncat!.severity).toBe('info');
    });

    it('flags categoryId: "uncategorized" as info', () => {
      const today = [createTx({ amount: -20, categoryId: 'uncategorized' })];
      const result = detectAnomalies(today, [], emptyCategories);
      const uncat = result.find((a) => a.description.includes('Uncategorized'));
      expect(uncat).toBeDefined();
    });

    it('does NOT flag categorized transactions', () => {
      const today = [createTx({ amount: -20, categoryId: 'food' })];
      const result = detectAnomalies(today, [], emptyCategories);
      const uncat = result.find((a) => a.description.includes('Uncategorized'));
      expect(uncat).toBeUndefined();
    });
  });

  describe('new counterparty detection', () => {
    const history = [
      createTx({ amount: -10, counterparty: 'Albert Heijn', categoryId: 'food' }),
    ];

    it('flags new counterparty on expense', () => {
      const today = [createTx({ amount: -15, counterparty: 'New Store', categoryId: 'food' })];
      const result = detectAnomalies(today, history, emptyCategories);
      const newCp = result.find((a) => a.description.includes('New counterparty'));
      expect(newCp).toBeDefined();
      expect(newCp!.severity).toBe('info');
    });

    it('does NOT flag new counterparty on income', () => {
      const today = [createTx({ amount: 500, counterparty: 'New Employer', categoryId: 'income' })];
      const result = detectAnomalies(today, history, emptyCategories);
      const newCp = result.find((a) => a.description.includes('New counterparty'));
      expect(newCp).toBeUndefined();
    });

    it('matches counterparty case-insensitively', () => {
      const today = [createTx({ amount: -15, counterparty: 'albert heijn', categoryId: 'food' })];
      const result = detectAnomalies(today, history, emptyCategories);
      const newCp = result.find((a) => a.description.includes('New counterparty'));
      expect(newCp).toBeUndefined();
    });
  });

  describe('duplicate detection', () => {
    it('flags second transaction with same amount + counterparty', () => {
      const today = [
        createTx({ amount: -25, counterparty: 'Shop', categoryId: 'food' }),
        createTx({ amount: -25, counterparty: 'Shop', categoryId: 'food' }),
      ];
      const result = detectAnomalies(today, [], emptyCategories);
      const dups = result.filter((a) => a.description.includes('Potential duplicate'));
      expect(dups).toHaveLength(1);
      expect(dups[0].severity).toBe('warning');
    });

    it('does NOT flag when amounts differ', () => {
      const today = [
        createTx({ amount: -25, counterparty: 'Shop', categoryId: 'food' }),
        createTx({ amount: -30, counterparty: 'Shop', categoryId: 'food' }),
      ];
      const result = detectAnomalies(today, [], emptyCategories);
      const dups = result.filter((a) => a.description.includes('Potential duplicate'));
      expect(dups).toHaveLength(0);
    });
  });

  it('returns multiple anomaly types for one transaction', () => {
    // Uncategorized + new counterparty
    const today = [createTx({ amount: -20, counterparty: 'Brand New Place', categoryId: null })];
    const result = detectAnomalies(today, [], emptyCategories);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const types = result.map((a) => {
      if (a.description.includes('Uncategorized')) return 'uncategorized';
      if (a.description.includes('New counterparty')) return 'new_counterparty';
      return 'other';
    });
    expect(types).toContain('uncategorized');
    expect(types).toContain('new_counterparty');
  });

  it('attaches transaction IDs to anomalies', () => {
    const today = [createTx({ amount: -20, categoryId: null })];
    const result = detectAnomalies(today, [], emptyCategories);
    for (const anomaly of result) {
      expect(anomaly.transactionId).toBeDefined();
    }
  });
});
