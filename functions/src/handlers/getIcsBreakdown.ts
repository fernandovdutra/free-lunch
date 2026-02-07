import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { format, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import {
  serializeTransaction,
  type TransactionDoc,
  type CategoryDoc,
} from '../shared/aggregations.js';

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

    const userId = request.auth.uid;
    const {
      statementId,
      startDate,
      endDate,
      categoryId,
      counterparty,
      breakdownMonthKey,
    } = request.data as {
      statementId: string;
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      counterparty?: string;
      breakdownMonthKey?: string;
    };

    if (!statementId) {
      throw new HttpsError('invalid-argument', 'statementId is required');
    }

    const db = getFirestore();

    // Fetch ICS transactions for this statement and categories in parallel
    const [transactionsSnapshot, categoriesSnapshot] = await Promise.all([
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('icsStatementId', '==', statementId)
        .where('source', '==', 'ics_import')
        .orderBy('date', 'desc')
        .get(),
      db
        .collection('users')
        .doc(userId)
        .collection('categories')
        .orderBy('order')
        .get(),
    ]);

    const allTransactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      doc: doc.data() as TransactionDoc,
    }));

    const categories = new Map<string, CategoryDoc>();
    categoriesSnapshot.docs.forEach((doc) => {
      categories.set(doc.id, doc.data() as CategoryDoc);
    });

    // ========================================================================
    // Calculate 6-month totals across ALL ICS transactions (not just this statement)
    // ========================================================================

    // Determine the date range for the 6-month window based on provided dates
    // or fall back to the transactions' own dates
    let windowStart: Date;
    let windowEnd: Date;

    if (startDate && endDate) {
      const selectedStart = new Date(startDate);
      const selectedEnd = new Date(endDate);
      windowStart = startOfMonth(subMonths(selectedStart, 5));
      windowEnd = endOfMonth(selectedEnd);
    } else if (allTransactions.length > 0) {
      // Use the most recent transaction's date as the reference point
      const latestDate = allTransactions[0].doc.date.toDate();
      windowStart = startOfMonth(subMonths(latestDate, 5));
      windowEnd = endOfMonth(latestDate);
    } else {
      // No transactions, use current date
      const now = new Date();
      windowStart = startOfMonth(subMonths(now, 5));
      windowEnd = endOfMonth(now);
    }

    // Fetch ALL ICS transactions in the 6-month window for the chart
    const allIcsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('source', '==', 'ics_import')
      .where('date', '>=', Timestamp.fromDate(windowStart))
      .where('date', '<=', Timestamp.fromDate(windowEnd))
      .get();

    const allIcsTransactions = allIcsSnapshot.docs.map((doc) => ({
      id: doc.id,
      doc: doc.data() as TransactionDoc,
    }));

    // Build monthly totals from ALL ICS transactions
    const monthlyMap = new Map<string, { amount: number; count: number }>();

    // Initialize all 6 months
    const referenceDate = startDate ? new Date(startDate) : (allTransactions.length > 0 ? allTransactions[0].doc.date.toDate() : new Date());
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(referenceDate, i);
      const key = format(monthDate, 'yyyy-MM');
      monthlyMap.set(key, { amount: 0, count: 0 });
    }

    for (const { doc } of allIcsTransactions) {
      const monthKey = format(doc.date.toDate(), 'yyyy-MM');
      const entry = monthlyMap.get(monthKey);
      if (entry) {
        entry.amount += Math.abs(doc.amount);
        entry.count += 1;
      }
    }

    const monthlyTotals: MonthlyTotal[] = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: format(new Date(key + '-01'), 'MMM yyyy'),
        monthKey: key,
        amount: Math.round(data.amount * 100) / 100,
        transactionCount: data.count,
      }));

    // ========================================================================
    // Current month data (from this statement's transactions)
    // ========================================================================

    const globalMonthKey = format(referenceDate, 'yyyy-MM');
    const effectiveMonthKey = breakdownMonthKey ?? globalMonthKey;
    const effectiveMonthStart = startOfMonth(new Date(effectiveMonthKey + '-01'));
    const currentTotal = allTransactions.reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
    const currentMonth = format(effectiveMonthStart, 'MMMM yyyy');

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
