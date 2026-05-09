import type { Transaction } from '@/types';
import type { FixedCost } from './burnUp.types';

export interface FixedCostCandidate extends FixedCost {
  /** Lowercased grouping key (the counterparty as seen in Firestore). */
  counterpartyKey: string;
  /** Display label, same as `l`. */
  label: string;
  /** Median amount across observed months (positive €). */
  amount: number;
  /** Most-recent day-of-month observed. */
  d: number;
  a: number;
  l: string;
  /** Number of months in the window where this counterparty appeared. */
  occurrences: number;
  /** Distinct YYYY-MM keys observed. */
  monthsObserved: string[];
  /** Variance of amounts as a percentage of the median (0..1). */
  variancePct: number;
}

interface DetectorOptions {
  /** Minimum |amount| for a transaction to be considered (€). */
  minAmount?: number;
  /** Maximum allowed amount variance as a fraction of the median. */
  maxVariancePct?: number;
  /** Minimum number of distinct months a counterparty must appear in. */
  minOccurrences?: number;
}

/**
 * Detects likely fixed costs by scanning a window of recent transactions.
 *
 * Heuristic:
 *   - group by lowercased counterparty
 *   - keep groups appearing in ≥minOccurrences distinct months
 *   - reject if amount variance exceeds maxVariancePct of the median
 *   - reject if median |amount| < minAmount
 *   - return one row per group, with median amount, most-recent
 *     day-of-month, and a list of months observed
 *
 * The output shape matches `FixedCost` (`{ d, a, l }`) so confirmed
 * candidates can be written straight to
 * `users/{uid}/settings/fixedSchedule.items` after user review.
 *
 * Pure function — used by the interactive post-PR review script, not
 * by the running app.
 */
export function detectFixedCostCandidates(
  transactions: Transaction[],
  options: DetectorOptions = {}
): FixedCostCandidate[] {
  const minAmount = options.minAmount ?? 15;
  const maxVariancePct = options.maxVariancePct ?? 0.1;
  const minOccurrences = options.minOccurrences ?? 2;

  type Bucket = {
    key: string;
    label: string;
    rows: { date: Date; amount: number; monthKey: string }[];
  };
  const groups = new Map<string, Bucket>();

  for (const t of transactions) {
    if (t.amount >= 0) continue; // expenses only
    if (t.excludeFromTotals) continue;
    if (t.reimbursement?.status === 'pending') continue;
    const cp = t.counterparty?.trim();
    if (!cp) continue;
    const key = cp.toLowerCase();
    const date = t.bookingDate ?? t.date;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = groups.get(key) ?? { key, label: cp, rows: [] };
    bucket.rows.push({ date, amount: Math.abs(t.amount), monthKey });
    groups.set(key, bucket);
  }

  const candidates: FixedCostCandidate[] = [];

  for (const bucket of groups.values()) {
    const monthsObserved = Array.from(new Set(bucket.rows.map((r) => r.monthKey))).sort();
    if (monthsObserved.length < minOccurrences) continue;

    const amounts = bucket.rows.map((r) => r.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)] ?? 0;
    if (median < minAmount) continue;

    const min = amounts[0] ?? 0;
    const max = amounts[amounts.length - 1] ?? 0;
    const variancePct = median > 0 ? (max - min) / median : 1;
    if (variancePct > maxVariancePct) continue;

    const mostRecent = [...bucket.rows].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    if (!mostRecent) continue;
    const d = mostRecent.date.getDate();
    const amount = Math.round(median * 100) / 100;

    candidates.push({
      counterpartyKey: bucket.key,
      label: bucket.label,
      l: bucket.label,
      amount,
      a: amount,
      d,
      occurrences: monthsObserved.length,
      monthsObserved,
      variancePct: Math.round(variancePct * 1000) / 1000,
    });
  }

  return candidates.sort((a, b) => b.amount - a.amount);
}
