import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

// ============================================================================
// Response types
// ============================================================================

export interface MonthlyTotal {
  month: string;      // 'MMM yyyy' display format
  monthKey: string;   // 'yyyy-MM' sortable key
  amount: number;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface SpendingExplorerResponse {
  currentTotal: number;
  currentMonth: string;
  monthlyTotals: MonthlyTotal[];
  categories?: CategoryBreakdownItem[];
  transactions?: ReturnType<typeof serializeTransaction>[];
}

// ============================================================================
// Helper: filter transactions by direction, excluding pending reimbursements
// ============================================================================

function filterByDirection(
  transactions: Array<{ id: string; doc: TransactionDoc }>,
  direction: 'expenses' | 'income',
  categories: Map<string, CategoryDoc>
): Array<{ id: string; doc: TransactionDoc }> {
  return transactions.filter(({ doc }) => {
    // Exclude transactions marked for exclusion (e.g. ABN AMRO ICS lump sums)
    if (doc.excludeFromTotals) return false;
    // Exclude reimbursements — pending (money coming back) and cleared
    // (already paid back; the expense/payment pair nets to zero)
    if (doc.reimbursement?.status === 'pending') return false;
    if (doc.reimbursement?.status === 'cleared') return false;
    // Exclude Transfer category from both expenses and income views
    if (doc.categoryId) {
      const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
      if (topLevel === 'transfer') return false;
    }
    return direction === 'expenses' ? doc.amount < 0 : doc.amount > 0;
  });
}

// ============================================================================
// Helper: get effective amount (always positive)
// ============================================================================

function effectiveAmount(amount: number): number {
  return Math.abs(amount);
}

// ============================================================================
// Helper: resolve a transaction's effective category (rolls up to parent if needed)
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

export const getSpendingExplorer = onCall(
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
      direction,
      startDate,
      endDate,
      monthKey,
      categoryId,
      subcategoryId,
      counterparty,
      breakdownMonthKey,
    } = request.data as {
      direction?: string;
      startDate?: string;
      endDate?: string;
      monthKey?: string; // 'yyyy-MM' — TZ-stable focal month; takes precedence over startDate/endDate
      categoryId?: string;
      subcategoryId?: string;
      counterparty?: string;
      breakdownMonthKey?: string; // 'yyyy-MM' — if provided, use this month for breakdown
    };

    // Validate required params
    if (!direction || (direction !== 'expenses' && direction !== 'income')) {
      throw new HttpsError('invalid-argument', 'direction must be "expenses" or "income"');
    }
    if (!monthKey && (!startDate || !endDate)) {
      throw new HttpsError('invalid-argument', 'monthKey or startDate/endDate are required');
    }

    // The focal month is unambiguous when sent as `monthKey` (yyyy-MM): the
    // frontend formats `selectedMonth` in local time, so May local → '2026-05'
    // regardless of TZ. All month buckets and boundaries below are AMSTERDAM
    // calendar months (the app's canonical zone) — server-local (UTC)
    // bucketing would put late-evening CET/CEST transactions near a month
    // boundary into the wrong month.
    let selectedMonthKey: string;
    let endMonthKey: string;
    if (monthKey) {
      if (!/^\d{4}-\d{2}$/.test(monthKey)) {
        throw new HttpsError('invalid-argument', 'monthKey must be yyyy-MM');
      }
      selectedMonthKey = monthKey;
      endMonthKey = monthKey;
    } else {
      const selectedStart = new Date(startDate as string);
      const selectedEnd = new Date(endDate as string);
      if (isNaN(selectedStart.getTime()) || isNaN(selectedEnd.getTime())) {
        throw new HttpsError('invalid-argument', 'invalid date inputs');
      }
      selectedMonthKey = amsterdamMonthKey(selectedStart);
      endMonthKey = amsterdamMonthKey(selectedEnd);
    }

    // Calculate 6-month window: selected month + 5 previous months
    const sixMonthStart = amsterdamMonthRangeUtc(shiftMonthKey(selectedMonthKey, -5)).start;
    const sixMonthEnd = amsterdamMonthRangeUtc(endMonthKey).end;

    const db = getFirestore();

    // Fetch transactions for 6-month window and categories in parallel
    const [transactionsSnapshot, categoriesSnapshot] = await Promise.all([
      db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('date', '>=', Timestamp.fromDate(sixMonthStart))
        .where('date', '<=', Timestamp.fromDate(sixMonthEnd))
        .orderBy('date', 'desc')
        .get(),
      db
        .collection('users')
        .doc(userId)
        .collection('categories')
        .orderBy('order')
        .get(),
    ]);

    // Build data structures
    const allTransactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      doc: doc.data() as TransactionDoc,
    }));

    const categories = new Map<string, CategoryDoc>();
    categoriesSnapshot.docs.forEach((doc) => {
      categories.set(doc.id, doc.data() as CategoryDoc);
    });

    // Filter by direction
    const directedTransactions = filterByDirection(allTransactions, direction, categories);

    // ========================================================================
    // Calculate 6-month totals
    // ========================================================================

    const monthlyMap = new Map<string, { amount: number; count: number }>();

    // Initialize all 6 months
    for (let i = 5; i >= 0; i--) {
      monthlyMap.set(shiftMonthKey(selectedMonthKey, -i), { amount: 0, count: 0 });
    }

    // If filtering by specific counterparty within category context
    if (counterparty && categoryId && subcategoryId) {
      for (const { doc } of directedTransactions) {
        if (doc.counterparty !== counterparty) continue;
        // Also filter by subcategory
        const matchesSubcategory = doc.isSplit && doc.splits
          ? doc.splits.some((s) => s.categoryId === subcategoryId)
          : doc.categoryId === subcategoryId;
        if (!matchesSubcategory) continue;

        const monthKey = amsterdamMonthKey(doc.date.toDate());
        const entry = monthlyMap.get(monthKey);
        if (entry) {
          entry.amount += effectiveAmount(doc.amount);
          entry.count += 1;
        }
      }
    } else if (subcategoryId && categoryId) {
      // Filter by subcategory
      for (const { doc } of directedTransactions) {
        const matchesSubcategory = doc.isSplit && doc.splits
          ? doc.splits.some((s) => s.categoryId === subcategoryId)
          : doc.categoryId === subcategoryId;
        if (!matchesSubcategory) continue;

        const monthKey = amsterdamMonthKey(doc.date.toDate());
        const entry = monthlyMap.get(monthKey);
        if (entry) {
          if (doc.isSplit && doc.splits) {
            for (const split of doc.splits) {
              if (split.categoryId === subcategoryId) {
                entry.amount += split.amount;
                entry.count += 1;
              }
            }
          } else {
            entry.amount += effectiveAmount(doc.amount);
            entry.count += 1;
          }
        }
      }
    } else if (categoryId) {
      // Filter by top-level category (include subcategories)
      for (const { doc } of directedTransactions) {
        const topLevel = doc.isSplit && doc.splits
          ? null // handled per split
          : getTopLevelCategoryId(doc.categoryId, categories);

        const monthKey = amsterdamMonthKey(doc.date.toDate());
        const entry = monthlyMap.get(monthKey);
        if (!entry) continue;

        if (doc.isSplit && doc.splits) {
          for (const split of doc.splits) {
            const splitTopLevel = getTopLevelCategoryId(split.categoryId, categories);
            if (splitTopLevel === categoryId) {
              entry.amount += split.amount;
              entry.count += 1;
            }
          }
        } else if (topLevel === categoryId) {
          entry.amount += effectiveAmount(doc.amount);
          entry.count += 1;
        }
      }
    } else {
      // All transactions for this direction
      for (const { doc } of directedTransactions) {
        const monthKey = amsterdamMonthKey(doc.date.toDate());
        const entry = monthlyMap.get(monthKey);
        if (entry) {
          entry.amount += effectiveAmount(doc.amount);
          entry.count += 1;
        }
      }
    }

    // Convert to sorted array
    const monthlyTotals: MonthlyTotal[] = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: format(monthKeyToDisplayDate(key), 'MMM yyyy'),
        monthKey: key,
        amount: Math.round(data.amount * 100) / 100,
        transactionCount: data.count,
      }));

    // ========================================================================
    // Current month data
    // ========================================================================

    // Determine which month to show breakdown for
    const effectiveMonthKey = breakdownMonthKey ?? selectedMonthKey;
    const { start: effectiveMonthStart, end: effectiveMonthEnd } =
      amsterdamMonthRangeUtc(effectiveMonthKey);

    const currentMonthTotal = monthlyMap.get(effectiveMonthKey);
    const currentTotal = Math.round((currentMonthTotal?.amount ?? 0) * 100) / 100;
    const currentMonth = format(monthKeyToDisplayDate(effectiveMonthKey), 'MMMM yyyy');

    // Filter to breakdown month for category/transaction detail
    const selectedMonthTransactions = directedTransactions.filter(({ doc }) => {
      const txDate = doc.date.toDate();
      return txDate >= effectiveMonthStart && txDate <= effectiveMonthEnd;
    });

    // ========================================================================
    // Level-specific response
    // ========================================================================

    // Counterparty level: return transactions for that counterparty in selected month
    if (counterparty && categoryId && subcategoryId) {
      const counterpartyTransactions = selectedMonthTransactions.filter(({ doc }) => {
        if (doc.counterparty !== counterparty) return false;
        if (doc.isSplit && doc.splits) {
          return doc.splits.some((s) => s.categoryId === subcategoryId);
        }
        return doc.categoryId === subcategoryId;
      });

      return {
        currentTotal,
        currentMonth,
        monthlyTotals,
        transactions: counterpartyTransactions.map(({ id, doc }) => serializeTransaction(id, doc)),
      };
    }

    // Subcategory level: return transactions for that subcategory
    if (subcategoryId && categoryId) {
      const subcatTransactions = selectedMonthTransactions.filter(({ doc }) => {
        if (doc.isSplit && doc.splits) {
          return doc.splits.some((s) => s.categoryId === subcategoryId);
        }
        return doc.categoryId === subcategoryId;
      });

      return {
        currentTotal,
        currentMonth,
        monthlyTotals,
        transactions: subcatTransactions.map(({ id, doc }) => serializeTransaction(id, doc)),
      };
    }

    // Category level: return subcategory breakdown
    if (categoryId) {
      // Find subcategories of this category
      const subcategories = new Map<string, CategoryDoc>();
      categories.forEach((cat, id) => {
        if (cat.parentId === categoryId) {
          subcategories.set(id, cat);
        }
      });

      // If no subcategories (leaf category), return transactions
      if (subcategories.size === 0) {
        const catTransactions = selectedMonthTransactions.filter(({ doc }) => {
          if (doc.isSplit && doc.splits) {
            return doc.splits.some((s) => {
              const topLevel = getTopLevelCategoryId(s.categoryId, categories);
              return topLevel === categoryId;
            });
          }
          const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
          return topLevel === categoryId;
        });

        return {
          currentTotal,
          currentMonth,
          monthlyTotals,
          transactions: catTransactions.map(({ id, doc }) => serializeTransaction(id, doc)),
        };
      }

      // Calculate subcategory breakdown
      const spending = new Map<string, { amount: number; count: number }>();

      for (const { doc } of selectedMonthTransactions) {
        if (doc.isSplit && doc.splits) {
          for (const split of doc.splits) {
            // Check if split belongs to this parent category
            const cat = categories.get(split.categoryId);
            if (cat?.parentId === categoryId || split.categoryId === categoryId) {
              const key = cat?.parentId === categoryId ? split.categoryId : categoryId;
              const current = spending.get(key) ?? { amount: 0, count: 0 };
              spending.set(key, {
                amount: current.amount + split.amount,
                count: current.count + 1,
              });
            }
          }
        } else {
          const txCatId = doc.categoryId;
          if (!txCatId) continue;
          const cat = categories.get(txCatId);
          // Transaction is directly in this parent category or in one of its subcategories
          if (cat?.parentId === categoryId || txCatId === categoryId) {
            const key = cat?.parentId === categoryId ? txCatId : categoryId;
            const current = spending.get(key) ?? { amount: 0, count: 0 };
            spending.set(key, {
              amount: current.amount + effectiveAmount(doc.amount),
              count: current.count + 1,
            });
          }
        }
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
        currentTotal,
        currentMonth,
        monthlyTotals,
        categories: categoryBreakdown,
      };
    }

    // Top level: group by top-level categories
    const spending = new Map<string, { amount: number; count: number }>();

    for (const { doc } of selectedMonthTransactions) {
      if (doc.isSplit && doc.splits) {
        for (const split of doc.splits) {
          const topLevel = getTopLevelCategoryId(split.categoryId, categories);
          const current = spending.get(topLevel) ?? { amount: 0, count: 0 };
          spending.set(topLevel, {
            amount: current.amount + split.amount,
            count: current.count + 1,
          });
        }
      } else {
        const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
        const current = spending.get(topLevel) ?? { amount: 0, count: 0 };
        spending.set(topLevel, {
          amount: current.amount + effectiveAmount(doc.amount),
          count: current.count + 1,
        });
      }
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
      currentTotal,
      currentMonth,
      monthlyTotals,
      categories: categoryBreakdown,
    };
  }
);
