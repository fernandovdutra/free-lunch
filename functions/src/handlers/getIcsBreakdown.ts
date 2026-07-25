import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { format } from 'date-fns';
import {
  serializeTransaction,
  type TransactionDoc,
  type CategoryDoc,
} from '../shared/aggregations.js';
import {
  amsterdamMonthKey,
  amsterdamMonthRangeUtc,
  shiftMonthKey,
} from '../shared/amsterdamTime.js';
import { resolveDataOwner } from '../shared/dataOwner.js';

/** Local Date carrying the calendar parts of a `yyyy-MM` key, for date-fns
 * display formatting (TZ-safe: no UTC-midnight anchoring). */
function monthKeyToDisplayDate(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

// Reuse response types from spending explorer
import type {
  MonthlyTotal,
  CategoryBreakdownItem,
  SpendingExplorerResponse,
} from './getSpendingExplorer.js';

// ============================================================================
// Helper: resolve a transaction's top-level category
// ============================================================================

function getTopLevelCategoryId(
  categoryId: string | null,
  categories: Map<string, CategoryDoc>
): string {
  if (!categoryId) return 'uncategorized';
  const cat = categories.get(categoryId);
  if (!cat) return categoryId;
  if (cat.parentId) return cat.parentId;
  return categoryId;
}

// ============================================================================
// Cloud Function
// ============================================================================

export const getIcsBreakdown = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request): Promise<SpendingExplorerResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = await resolveDataOwner(request.auth.uid);
    const {
      statementId,
      startDate,
      endDate,
      monthKey,
      categoryId,
      counterparty,
      breakdownMonthKey,
    } = request.data as {
      statementId: string;
      startDate?: string;
      endDate?: string;
      monthKey?: string; // 'yyyy-MM' — TZ-stable focal month; takes precedence over startDate/endDate
      categoryId?: string;
      counterparty?: string;
      breakdownMonthKey?: string;
    };

    if (!statementId) {
      throw new HttpsError('invalid-argument', 'statementId is required');
    }
    if (monthKey && !/^\d{4}-\d{2}$/.test(monthKey)) {
      throw new HttpsError('invalid-argument', 'monthKey must be yyyy-MM');
    }

    const db = getFirestore();

    // Fetch ICS transactions for this statement and categories in parallel
    // Query by icsStatementId only (single-field, auto-indexed) and filter source in code
    const [transactionsSnapshot, categoriesSnapshot] = await Promise.all([
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('icsStatementId', '==', statementId)
        .get(),
      db
        .collection('users')
        .doc(userId)
        .collection('categories')
        .orderBy('order')
        .get(),
    ]);

    const allTransactions = transactionsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        doc: doc.data() as TransactionDoc,
      }))
      .filter(({ doc }) => doc.source === 'ics_import')
      .sort((a, b) => b.doc.date.toDate().getTime() - a.doc.date.toDate().getTime());

    const categories = new Map<string, CategoryDoc>();
    categoriesSnapshot.docs.forEach((doc) => {
      categories.set(doc.id, doc.data() as CategoryDoc);
    });

    // ========================================================================
    // Calculate 6-month totals across ALL ICS transactions (not just this statement)
    // ========================================================================

    // Determine the focal month and 6-month window. `monthKey` (yyyy-MM) is
    // TZ-stable and is the source of truth when provided. All month buckets
    // and boundaries are AMSTERDAM calendar months (the app's canonical
    // zone), not server-local (UTC) ones. Fall back to startDate/endDate,
    // then to transaction history, then to today.
    let referenceMonthKey: string;
    let endMonthKey: string;

    if (monthKey) {
      referenceMonthKey = monthKey;
      endMonthKey = monthKey;
    } else if (startDate && endDate) {
      referenceMonthKey = amsterdamMonthKey(new Date(startDate));
      endMonthKey = amsterdamMonthKey(new Date(endDate));
    } else if (allTransactions.length > 0) {
      // Use the most recent transaction's date as the reference point
      referenceMonthKey = amsterdamMonthKey(allTransactions[0].doc.date.toDate());
      endMonthKey = referenceMonthKey;
    } else {
      // No transactions, use current date
      referenceMonthKey = amsterdamMonthKey();
      endMonthKey = referenceMonthKey;
    }

    const windowStart = amsterdamMonthRangeUtc(shiftMonthKey(referenceMonthKey, -5)).start;
    const windowEnd = amsterdamMonthRangeUtc(endMonthKey).end;

    // Fetch ALL ICS transactions for the chart
    // Query by source only (single-field) and filter by date in code
    const allIcsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('source', '==', 'ics_import')
      .get();

    const allIcsTransactions = allIcsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        doc: doc.data() as TransactionDoc,
      }))
      .filter(({ doc }) => {
        const txDate = doc.date.toDate();
        return txDate >= windowStart && txDate <= windowEnd;
      });

    // Build monthly totals from ALL ICS transactions
    const monthlyMap = new Map<string, { amount: number; count: number }>();

    // Initialize all 6 months back from the reference month
    for (let i = 5; i >= 0; i--) {
      monthlyMap.set(shiftMonthKey(referenceMonthKey, -i), { amount: 0, count: 0 });
    }

    for (const { doc } of allIcsTransactions) {
      const txMonthKey = amsterdamMonthKey(doc.date.toDate());
      const entry = monthlyMap.get(txMonthKey);
      if (entry) {
        entry.amount += Math.abs(doc.amount);
        entry.count += 1;
      }
    }

    const monthlyTotals: MonthlyTotal[] = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: format(monthKeyToDisplayDate(key), 'MMM yyyy'),
        monthKey: key,
        amount: Math.round(data.amount * 100) / 100,
        transactionCount: data.count,
      }));

    // ========================================================================
    // Current month data (from this statement's transactions)
    // ========================================================================

    const effectiveMonthKey = breakdownMonthKey ?? referenceMonthKey;
    const currentTotal = allTransactions.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
    const currentMonth = format(monthKeyToDisplayDate(effectiveMonthKey), 'MMMM yyyy');

    // ========================================================================
    // Level-specific response
    // ========================================================================

    // Counterparty level: return transactions for that counterparty within a category
    if (counterparty && categoryId) {
      const filtered = allTransactions.filter(({ doc }) => {
        if (doc.counterparty !== counterparty) return false;
        const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
        return doc.categoryId === categoryId || topLevel === categoryId;
      });

      return {
        currentTotal: Math.round(filtered.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0) * 100) / 100,
        currentMonth,
        monthlyTotals,
        transactions: filtered.map(({ id, doc }) => serializeTransaction(id, doc)),
      };
    }

    // Category level: return transactions for that category
    if (categoryId) {
      const filtered = allTransactions.filter(({ doc }) => {
        const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
        return doc.categoryId === categoryId || topLevel === categoryId;
      });

      return {
        currentTotal: Math.round(filtered.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0) * 100) / 100,
        currentMonth,
        monthlyTotals,
        transactions: filtered.map(({ id, doc }) => serializeTransaction(id, doc)),
      };
    }

    // Top level: group by top-level categories
    const spending = new Map<string, { amount: number; count: number }>();

    for (const { doc } of allTransactions) {
      const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
      const current = spending.get(topLevel) ?? { amount: 0, count: 0 };
      spending.set(topLevel, {
        amount: current.amount + Math.abs(doc.amount),
        count: current.count + 1,
      });
    }

    const total = Array.from(spending.values()).reduce((sum, s) => sum + s.amount, 0);

    const categoryBreakdown: CategoryBreakdownItem[] = Array.from(spending.entries())
      .map(([id, data]) => {
        const cat = categories.get(id);
        return {
          categoryId: id,
          categoryName: cat?.name ?? 'Uncategorized',
          categoryIcon: cat?.icon ?? '📁',
          categoryColor: cat?.color ?? '#9CA3AF',
          amount: Math.round(data.amount * 100) / 100,
          percentage: total > 0 ? Math.round((data.amount / total) * 1000) / 10 : 0,
          transactionCount: data.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      currentTotal: Math.round(currentTotal * 100) / 100,
      currentMonth,
      monthlyTotals,
      categories: categoryBreakdown,
    };
  }
);
