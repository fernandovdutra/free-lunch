import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { calculateIcsStatementTotals } from '../icsAccounting';
import {
  calculateSummary,
  calculateCategorySpending,
  calculateSpendingByCategory,
  calculateTimelineData,
  type CategoryDoc,
  type TransactionDoc,
} from '../aggregations';

const octoberStatement = [
  { amountEur: 1.09, direction: 'Af' as const },
  { amountEur: 38.91, direction: 'Af' as const },
  { amountEur: 15.99, direction: 'Af' as const },
  { amountEur: 41.50, direction: 'Af' as const },
  { amountEur: 8.93, direction: 'Af' as const },
  { amountEur: 2385.14, direction: 'Af' as const },
  { amountEur: 22.50, direction: 'Bij' as const },
];

function tx(amount: number, categoryId: string, source: TransactionDoc['source'] = 'ics_import', date = '2026-10-16'): { id: string; doc: TransactionDoc } {
  const stamp = Timestamp.fromDate(new Date(date + 'T12:00:00Z'));
  return {
    id: `test-${amount}-${categoryId}`,
    doc: {
      date: stamp,
      amount,
      categoryId,
      source,
      isSplit: false,
      splits: null,
      reimbursement: null,
      description: 'ICS test transaction',
      counterparty: 'ICS',
      externalId: null,
      currency: 'EUR',
      categorySource: 'manual',
      categoryConfidence: 1,
      bankAccountId: null,
      importedAt: stamp,
      updatedAt: stamp,
    },
  };
}

const categories = new Map<string, CategoryDoc>([
  ['travel', { name: 'Travel', icon: 'plane', color: '#888888', parentId: null, order: 1, isSystem: false }],
  ['transfer', { name: 'Transfer', icon: 'repeat', color: '#777777', parentId: null, order: 2, isSystem: true }],
  ['transfer-cc', { name: 'Card Payment', icon: 'credit-card', color: '#777777', parentId: 'transfer', order: 3, isSystem: true }],
]);

describe('ICS statement settlement accounting', () => {
  it('reconciles the actual October 2026 ICS statement exactly', () => {
    expect(calculateIcsStatementTotals(octoberStatement)).toEqual({
      grossPurchases: 2491.56,
      refunds: 22.5,
      netPayment: 2469.06,
    });
  });

  it('does not double-count the ABN AMRO card settlement or record refunds as income', () => {
    const charge = tx(-2385.14, 'travel');
    const refund = tx(22.5, 'travel', 'ics_import', '2026-10-24');
    const settlement = tx(-2469.06, 'transfer-cc', 'bank_sync', '2026-11-02');
    settlement.doc.excludeFromTotals = true;
    const other = tx(-(2491.56 - 2385.14), 'travel');
    const records = [charge, refund, other, settlement];
    const summary = calculateSummary(records, categories);
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalExpenses).toBeCloseTo(2469.06, 2);
    expect(calculateCategorySpending(records, categories).find(row => row.categoryId === 'travel')?.amount).toBeCloseTo(2469.06, 2);
    expect(calculateSpendingByCategory(records, categories).get('travel')).toBeCloseTo(2469.06, 2);
    const daily = calculateTimelineData(records, new Date('2026-10-16T00:00:00Z'), new Date('2026-11-03T00:00:00Z'), categories);
    expect(daily.find(d => d.dateKey === '2026-10-24')?.expenses).toBe(-22.5);
  });

  it('keeps ordinary positive income separate from ICS refunds', () => {
    const records = [tx(-100, 'travel'), tx(15, 'travel'), tx(1000, 'income-salary', 'bank_sync')];
    expect(calculateSummary(records)).toMatchObject({ totalExpenses: 85, totalIncome: 1000 });
  });

  it('rejects invalid amounts rather than silently importing a malformed statement', () => {
    expect(() => calculateIcsStatementTotals([{ amountEur: -22.5, direction: 'Bij' }])).toThrow();
    expect(() => calculateIcsStatementTotals([{ amountEur: Infinity, direction: 'Af' }])).toThrow();
  });
});
