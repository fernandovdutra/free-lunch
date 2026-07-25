import { describe, it, expect } from 'vitest';
import { suggestIncomeMatches } from '../reimbursementSuggestions';
import type { Transaction } from '@/types';

function income(id: string, amount: number, date: string): Transaction {
  return {
    id,
    externalId: null,
    date: new Date(date),
    description: `Income ${id}`,
    amount,
    currency: 'EUR',
    counterparty: null,
    categoryId: null,
    categoryConfidence: 0,
    categorySource: 'manual',
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: null,
    importedAt: new Date(date),
    updatedAt: new Date(date),
  };
}

const expense = { amount: -42.5, date: new Date('2026-07-01') };

describe('suggestIncomeMatches', () => {
  it('returns only income whose amount exactly matches the expense', () => {
    const txns = [
      income('exact', 42.5, '2026-07-05'),
      income('off-by-cent', 42.51, '2026-07-05'),
      income('different', 100, '2026-07-05'),
    ];
    const result = suggestIncomeMatches(expense, txns);
    expect(result.map((t) => t.id)).toEqual(['exact']);
  });

  it('matches amounts in cents, ignoring float noise', () => {
    const txns = [income('float', 0.1 + 0.2, '2026-07-05')];
    const result = suggestIncomeMatches({ amount: -0.3, date: new Date('2026-07-01') }, txns);
    expect(result.map((t) => t.id)).toEqual(['float']);
  });

  it('ranks income after the expense date above income before it', () => {
    const txns = [
      income('before', 42.5, '2026-06-30'),
      income('after-far', 42.5, '2026-07-20'),
      income('after-near', 42.5, '2026-07-03'),
    ];
    const result = suggestIncomeMatches(expense, txns);
    expect(result.map((t) => t.id)).toEqual(['after-near', 'after-far', 'before']);
  });

  it('limits the number of suggestions', () => {
    const txns = [
      income('a', 42.5, '2026-07-02'),
      income('b', 42.5, '2026-07-03'),
      income('c', 42.5, '2026-07-04'),
      income('d', 42.5, '2026-07-05'),
    ];
    expect(suggestIncomeMatches(expense, txns, 3)).toHaveLength(3);
  });

  it('returns nothing for a zero-amount expense', () => {
    const txns = [income('zero', 0, '2026-07-05')];
    expect(suggestIncomeMatches({ amount: 0, date: new Date('2026-07-01') }, txns)).toEqual([]);
  });
});
