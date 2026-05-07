import { format } from 'date-fns';
import type { Transaction } from '@/types';

export interface DayBucket {
  /** ISO date key, e.g. "2026-04-22". */
  key: string;
  label: string;
  netTotal: number;
  /** True when sum is ~0 but rows have opposing signs (transfer in+out). */
  isSelfCanceling: boolean;
  txns: Transaction[];
}

export interface MonthBucket {
  /** "yyyy-MM". Used as IntersectionObserver target id. */
  key: string;
  /** Display abbreviation, e.g. "APR". */
  label: string;
  netTotal: number;
  count: number;
  days: DayBucket[];
}

/**
 * Group a flat (already date-desc) list of transactions into months → days.
 * Day boundary uses `transactionDate ?? bookingDate ?? date`.
 */
export function groupByMonthThenDay(transactions: Transaction[]): MonthBucket[] {
  const monthMap = new Map<string, MonthBucket>();

  for (const t of transactions) {
    const d = t.transactionDate ?? t.bookingDate ?? t.date;
    const monthKey = format(d, 'yyyy-MM');
    const dayKey = format(d, 'yyyy-MM-dd');

    let month = monthMap.get(monthKey);
    if (!month) {
      month = {
        key: monthKey,
        label: format(d, 'MMM').toUpperCase(),
        netTotal: 0,
        count: 0,
        days: [],
      };
      monthMap.set(monthKey, month);
    }

    let day = month.days.find((d2) => d2.key === dayKey);
    if (!day) {
      day = {
        key: dayKey,
        label: `${format(d, 'EEE').toUpperCase()} · ${format(d, 'MMM').toUpperCase()} ${format(d, 'd')}`,
        netTotal: 0,
        isSelfCanceling: false,
        txns: [],
      };
      month.days.push(day);
    }

    day.txns.push(t);
    day.netTotal += t.amount;
    month.netTotal += t.amount;
    month.count += 1;
  }

  // Mark self-canceling days (e.g. internal transfers in+out)
  for (const month of monthMap.values()) {
    for (const day of month.days) {
      if (day.txns.length >= 2 && Math.abs(day.netTotal) < 0.005) {
        const hasPlus = day.txns.some((t) => t.amount > 0);
        const hasMinus = day.txns.some((t) => t.amount < 0);
        day.isSelfCanceling = hasPlus && hasMinus;
      }
    }
  }

  return Array.from(monthMap.values());
}
