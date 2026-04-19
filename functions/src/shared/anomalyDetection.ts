import type { TransactionDoc, CategoryDoc } from './aggregations.js';

export interface Anomaly {
  description: string;
  severity: 'info' | 'warning' | 'alert';
  transactionId?: string;
}

interface TransactionWithId {
  id: string;
  doc: TransactionDoc;
}

/**
 * Detect anomalies in a set of transactions:
 * - Unusually large expenses (> 3x average)
 * - Uncategorized transactions
 * - New counterparties not seen before
 * - Potential duplicate transactions
 */
export function detectAnomalies(
  todayTransactions: TransactionWithId[],
  historicalTransactions: TransactionWithId[],
  categories: Map<string, CategoryDoc>
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Calculate historical average expense
  const historicalExpenses = historicalTransactions
    .filter(({ doc }) => doc.amount < 0 && !doc.excludeFromTotals)
    .map(({ doc }) => Math.abs(doc.amount));
  const avgExpense =
    historicalExpenses.length > 0
      ? historicalExpenses.reduce((s, a) => s + a, 0) / historicalExpenses.length
      : 0;

  // Collect known counterparties from history
  const knownCounterparties = new Set<string>();
  for (const { doc } of historicalTransactions) {
    if (doc.counterparty) {
      knownCounterparties.add(doc.counterparty.toLowerCase());
    }
  }

  for (const { id, doc } of todayTransactions) {
    // Unusually large expense
    if (doc.amount < 0 && avgExpense > 0) {
      const absAmount = Math.abs(doc.amount);
      if (absAmount > avgExpense * 3 && absAmount > 50) {
        anomalies.push({
          description: `Unusually large expense: €${absAmount.toFixed(2)} at ${doc.counterparty ?? doc.description} (avg is €${avgExpense.toFixed(2)})`,
          severity: absAmount > avgExpense * 5 ? 'alert' : 'warning',
          transactionId: id,
        });
      }
    }

    // Uncategorized
    if (!doc.categoryId || doc.categoryId === 'uncategorized') {
      anomalies.push({
        description: `Uncategorized transaction: €${Math.abs(doc.amount).toFixed(2)} — ${doc.description}`,
        severity: 'info',
        transactionId: id,
      });
    }

    // New counterparty
    if (
      doc.counterparty &&
      !knownCounterparties.has(doc.counterparty.toLowerCase()) &&
      doc.amount < 0
    ) {
      anomalies.push({
        description: `New counterparty: ${doc.counterparty} (€${Math.abs(doc.amount).toFixed(2)})`,
        severity: 'info',
        transactionId: id,
      });
    }
  }

  // Potential duplicates (same amount + same counterparty on same day)
  const seen = new Map<string, string>();
  for (const { id, doc } of todayTransactions) {
    const key = `${doc.amount}|${doc.counterparty?.toLowerCase() ?? ''}`;
    const existingId = seen.get(key);
    if (existingId) {
      anomalies.push({
        description: `Potential duplicate: €${Math.abs(doc.amount).toFixed(2)} at ${doc.counterparty ?? doc.description}`,
        severity: 'warning',
        transactionId: id,
      });
    } else {
      seen.set(key, id);
    }
  }

  return anomalies;
}
