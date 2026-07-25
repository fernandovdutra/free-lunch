import type { Transaction } from '@/types';

/**
 * Suggest income transactions that likely reimburse the given expense.
 *
 * A candidate is suggested when its amount exactly matches the expense
 * amount (compared in cents to avoid float noise). Candidates are ranked
 * by plausibility: income dated on/after the expense first (reimbursements
 * normally arrive after the expense), then by date proximity to it.
 */
export function suggestIncomeMatches(
  expense: Pick<Transaction, 'amount' | 'date'>,
  incomeTxns: Transaction[],
  max = 3
): Transaction[] {
  const targetCents = Math.round(Math.abs(expense.amount) * 100);
  if (targetCents === 0) return [];

  const expenseTime = expense.date.getTime();
  const rank = (t: Transaction) => {
    const diff = t.date.getTime() - expenseTime;
    return { before: diff < 0 ? 1 : 0, dist: Math.abs(diff) };
  };

  return incomeTxns
    .filter((t) => Math.round(t.amount * 100) === targetCents)
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      return ra.before - rb.before || ra.dist - rb.dist;
    })
    .slice(0, max);
}
