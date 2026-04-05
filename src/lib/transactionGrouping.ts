import { formatDate } from '@/lib/utils';

/**
 * Groups transactions by formatted date label.
 */
export function groupTransactionsByDate<T extends { date: Date }>(
  transactions: T[],
  dateFormat: 'long' | 'short' = 'long'
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const tx of transactions) {
    const dateKey = formatDate(tx.date, dateFormat);
    const group = grouped.get(dateKey) ?? [];
    group.push(tx);
    grouped.set(dateKey, group);
  }
  return grouped;
}
