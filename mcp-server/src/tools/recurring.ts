import { db, userId } from '../firebase.js';
import { Timestamp } from 'firebase-admin/firestore';
import { subMonths } from 'date-fns';

/**
 * Detect recurring expenses by finding counterparties that appear
 * at least 2 times in the last 3 months with similar amounts.
 */
export async function getRecurringExpenses() {
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);

  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .where('date', '>=', Timestamp.fromDate(threeMonthsAgo))
    .where('date', '<=', Timestamp.fromDate(now))
    .orderBy('date', 'desc')
    .get();

  // Group expenses by counterparty
  const counterpartyMap = new Map<
    string,
    { amounts: number[]; dates: string[]; descriptions: string[] }
  >();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.amount >= 0) continue; // Only expenses
    const counterparty = data.counterparty;
    if (!counterparty) continue;

    const key = counterparty.toLowerCase();
    const existing = counterpartyMap.get(key) ?? { amounts: [], dates: [], descriptions: [] };
    existing.amounts.push(Math.abs(data.amount));
    existing.dates.push(data.date?.toDate?.()?.toISOString() ?? '');
    if (!existing.descriptions.includes(data.description)) {
      existing.descriptions.push(data.description);
    }
    counterpartyMap.set(key, existing);
  }

  // Filter for recurring (2+ occurrences)
  const recurring = [];
  for (const [key, data] of counterpartyMap) {
    if (data.amounts.length < 2) continue;

    const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
    // Check if amounts are consistent (within 20% of average)
    const isConsistent = data.amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount < 0.2
    );

    const frequency = data.amounts.length >= 3 ? 'monthly' : 'irregular';

    recurring.push({
      counterparty: key,
      averageAmount: Math.round(avgAmount * 100) / 100,
      occurrences: data.amounts.length,
      frequency,
      isConsistentAmount: isConsistent,
      lastDate: data.dates[0],
      descriptions: data.descriptions.slice(0, 3),
    });
  }

  return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
}
