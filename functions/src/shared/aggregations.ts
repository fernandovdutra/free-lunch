import { Timestamp } from 'firebase-admin/firestore';
import { eachDayOfInterval, format } from 'date-fns';

// ============================================================================
// Input types (from Firestore documents)
// ============================================================================

export interface TransactionDoc {
  date: Timestamp;
  amount: number;
  categoryId: string | null;
  isSplit: boolean;
  splits: Array<{ amount: number; categoryId: string; note: string | null }> | null;
  reimbursement: {
    type: string;
    status: string;
    note: string | null;
    linkedTransactionId: string | null;
    clearedAt: Timestamp | null;
  } | null;
  description: string;
  counterparty: string | null;
  externalId: string | null;
  currency: string;
  categorySource: string;
  categoryConfidence: number;
  bankAccountId: string | null;
  importedAt: Timestamp;
  updatedAt: Timestamp;
  excludeFromTotals?: boolean;
  icsStatementId?: string | null;
  source?: 'bank_sync' | 'ics_import' | 'manual';
}

export interface CategoryDoc {
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  order: number;
  isSystem: boolean;
}

export interface BudgetDoc {
  name: string;
  categoryId: string;
  monthlyLimit: number;
  alertThreshold: number;
  isActive: boolean;
}

// ============================================================================
// Output types (serialized for client consumption)
// ============================================================================

export interface SpendingSummaryResult {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  pendingReimbursements: number;
  transactionCount: number;
}

export interface CategorySpendingResult {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TimelineDataResult {
  date: string;       // 'MMM d' format for display
  dateKey: string;    // 'yyyy-MM-dd' for programmatic use
  income: number;
  expenses: number;
}

export interface BudgetProgressResult {
  budgetId: string;
  budgetName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  monthlyLimit: number;
  alertThreshold: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}

export interface ReimbursementSummaryResult {
  pendingCount: number;
  pendingTotal: number;
  pendingWorkTotal: number;
  pendingPersonalTotal: number;
  clearedCount: number;
  clearedTotal: number;
}

export interface TransactionResult {
  id: string;
  externalId: string | null;
  date: string;              // ISO string
  description: string;
  amount: number;
  currency: string;
  counterparty: string | null;
  categoryId: string | null;
  categorySource: string;
  categoryConfidence: number;
  isSplit: boolean;
  splits: Array<{ amount: number; categoryId: string; note: string | null }> | null;
  reimbursement: {
    type: string;
    status: string;
    note: string | null;
    linkedTransactionId: string | null;
    clearedAt: string | null;
  } | null;
  bankAccountId: string | null;
  importedAt: string;        // ISO string
  updatedAt: string;         // ISO string
  excludeFromTotals?: boolean;
  icsStatementId?: string | null;
  source?: 'bank_sync' | 'ics_import' | 'manual';
}

// Internal type for transactions with id attached
interface TransactionWithId {
  id: string;
  doc: TransactionDoc;
}

// ============================================================================
// Helper: convert Firestore Timestamp to Date
// ============================================================================

function toDate(ts: Timestamp): Date {
  return ts.toDate();
}

function toISOString(ts: Timestamp): string {
  return ts.toDate().toISOString();
}

// ============================================================================
// Serialization
// ============================================================================

export function serializeTransaction(id: string, doc: TransactionDoc): TransactionResult {
  return {
    id,
    externalId: doc.externalId ?? null,
    date: toISOString(doc.date),
    description: doc.description,
    amount: doc.amount,
    currency: doc.currency ?? 'EUR',
    counterparty: doc.counterparty ?? null,
    categoryId: doc.categoryId ?? null,
    categorySource: doc.categorySource ?? 'manual',
    categoryConfidence: doc.categoryConfidence ?? 0,
    isSplit: doc.isSplit ?? false,
    splits: doc.splits ?? null,
    reimbursement: doc.reimbursement
      ? {
          type: doc.reimbursement.type,
          status: doc.reimbursement.status,
          note: doc.reimbursement.note ?? null,
          linkedTransactionId: doc.reimbursement.linkedTransactionId ?? null,
          clearedAt: doc.reimbursement.clearedAt
            ? toISOString(doc.reimbursement.clearedAt)
            : null,
        }
      : null,
    bankAccountId: doc.bankAccountId ?? null,
    importedAt: toISOString(doc.importedAt),
    updatedAt: toISOString(doc.updatedAt),
    excludeFromTotals: doc.excludeFromTotals ?? undefined,
    icsStatementId: doc.icsStatementId ?? undefined,
    source: doc.source ?? undefined,
  };
}

// ============================================================================
// Helper: resolve top-level category ID
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
// calculateSummary
// ============================================================================

export function calculateSummary(
  transactions: TransactionWithId[],
  categories?: Map<string, CategoryDoc>
): SpendingSummaryResult {
  let totalIncome = 0;
  let totalExpenses = 0;
  let pendingReimbursements = 0;

  for (const { doc } of transactions) {
    if (doc.excludeFromTotals) continue;
    if (categories && doc.categoryId) {
      const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
      if (topLevel === 'transfer') continue;
    }
    if (doc.reimbursement?.status === 'pending') {
      pendingReimbursements += Math.abs(doc.amount);
    } else if (doc.amount > 0) {
      totalIncome += doc.amount;
    } else {
      totalExpenses += Math.abs(doc.amount);
    }
  }

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    pendingReimbursements,
    transactionCount: transactions.length,
  };
}

// ============================================================================
// calculateCategorySpending
// (Fixed: now handles split transactions — ports budget progress approach)
// ============================================================================

export function calculateCategorySpending(
  transactions: TransactionWithId[],
  categories: Map<string, CategoryDoc>
): CategorySpendingResult[] {
  // Only count expenses (negative amounts), exclude pending reimbursements, excluded, and Transfer category
  const expenses = transactions.filter(({ doc }) => {
    if (doc.amount >= 0) return false;
    if (doc.reimbursement?.status === 'pending') return false;
    if (doc.excludeFromTotals) return false;
    const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
    if (topLevel === 'transfer') return false;
    return true;
  });

  // Group by category, handling splits
  const spending = new Map<string, { amount: number; count: number }>();

  for (const { doc } of expenses) {
    if (doc.isSplit && doc.splits) {
      // Handle split transactions: each split counted toward its own category
      for (const split of doc.splits) {
        if (split.amount <= 0) continue; // splits use positive amounts
        const key = split.categoryId || 'uncategorized';
        const current = spending.get(key) ?? { amount: 0, count: 0 };
        spending.set(key, {
          amount: current.amount + split.amount,
          count: current.count + 1,
        });
      }
    } else {
      // Regular transaction
      const key = doc.categoryId ?? 'uncategorized';
      const current = spending.get(key) ?? { amount: 0, count: 0 };
      spending.set(key, {
        amount: current.amount + Math.abs(doc.amount),
        count: current.count + 1,
      });
    }
  }

  // Calculate total for percentages
  const total = Array.from(spending.values()).reduce((sum, s) => sum + s.amount, 0);

  // Convert to result array
  const result: CategorySpendingResult[] = [];
  spending.forEach((value, categoryId) => {
    const category = categories.get(categoryId);
    result.push({
      categoryId,
      categoryName: category?.name ?? 'Uncategorized',
      categoryColor: category?.color ?? '#9CA3AF',
      amount: value.amount,
      percentage: total > 0 ? (value.amount / total) * 100 : 0,
      transactionCount: value.count,
    });
  });

  // Sort by amount descending
  return result.sort((a, b) => b.amount - a.amount);
}

// ============================================================================
// calculateTimelineData
// ============================================================================

export function calculateTimelineData(
  transactions: TransactionWithId[],
  startDate: Date,
  endDate: Date,
  categories?: Map<string, CategoryDoc>
): TimelineDataResult[] {
  // Create a map of date -> amounts
  const dailyData = new Map<string, { income: number; expenses: number }>();

  // Initialize all days in range
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  for (const day of days) {
    dailyData.set(format(day, 'yyyy-MM-dd'), { income: 0, expenses: 0 });
  }

  // Aggregate transactions by day
  for (const { doc } of transactions) {
    if (doc.excludeFromTotals) continue;
    if (doc.reimbursement?.status === 'pending') continue; // Skip pending reimbursements
    if (categories && doc.categoryId) {
      const topLevel = getTopLevelCategoryId(doc.categoryId, categories);
      if (topLevel === 'transfer') continue;
    }

    const dateKey = format(toDate(doc.date), 'yyyy-MM-dd');
    const current = dailyData.get(dateKey) ?? { income: 0, expenses: 0 };

    if (doc.amount > 0) {
      current.income += doc.amount;
    } else {
      current.expenses += Math.abs(doc.amount);
    }

    dailyData.set(dateKey, current);
  }

  // Convert to array with formatted dates
  return Array.from(dailyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, data]) => ({
      date: format(new Date(dateKey), 'MMM d'),
      dateKey,
      income: data.income,
      expenses: data.expenses,
    }));
}

// ============================================================================
// calculateSpendingByCategory (with parent rollup + split handling)
// ============================================================================

export function calculateSpendingByCategory(
  transactions: TransactionWithId[],
  categories: Map<string, CategoryDoc>
): Map<string, number> {
  const spending = new Map<string, number>();

  for (const { doc } of transactions) {
    // Skip income, pending reimbursements, excluded, and Transfer category
    if (doc.excludeFromTotals) continue;
    if (doc.amount >= 0) continue;
    if (doc.reimbursement?.status === 'pending') continue;
    const topLevelId = getTopLevelCategoryId(doc.categoryId, categories);
    if (topLevelId === 'transfer') continue;

    const absAmount = Math.abs(doc.amount);

    if (doc.isSplit && doc.splits) {
      // Handle split transactions — each split counts toward its category
      for (const split of doc.splits) {
        if (split.amount <= 0) continue; // splits use positive amounts
        const current = spending.get(split.categoryId) ?? 0;
        spending.set(split.categoryId, current + split.amount);

        // Also add to parent category if exists
        const category = categories.get(split.categoryId);
        if (category?.parentId) {
          const parentCurrent = spending.get(category.parentId) ?? 0;
          spending.set(category.parentId, parentCurrent + split.amount);
        }
      }
    } else if (doc.categoryId) {
      // Regular transaction
      const current = spending.get(doc.categoryId) ?? 0;
      spending.set(doc.categoryId, current + absAmount);

      // Also add to parent category if exists
      const category = categories.get(doc.categoryId);
      if (category?.parentId) {
        const parentCurrent = spending.get(category.parentId) ?? 0;
        spending.set(category.parentId, parentCurrent + absAmount);
      }
    }
  }

  return spending;
}

// ============================================================================
// calculateBudgetProgress
// ============================================================================

export function calculateBudgetProgress(
  budgets: Array<{ id: string; doc: BudgetDoc }>,
  spendingMap: Map<string, number>,
  categories: Map<string, CategoryDoc>
): BudgetProgressResult[] {
  return budgets
    .filter(({ doc }) => doc.isActive)
    .map(({ id, doc: budget }): BudgetProgressResult => {
      const category = categories.get(budget.categoryId);
      const spent = spendingMap.get(budget.categoryId) ?? 0;
      const remaining = Math.max(0, budget.monthlyLimit - spent);
      const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (percentage >= 100) {
        status = 'exceeded';
      } else if (percentage >= budget.alertThreshold) {
        status = 'warning';
      }

      return {
        budgetId: id,
        budgetName: budget.name,
        categoryId: budget.categoryId,
        categoryName: category?.name ?? 'Unknown',
        categoryIcon: category?.icon ?? '📁',
        categoryColor: category?.color ?? '#9CA3AF',
        monthlyLimit: budget.monthlyLimit,
        alertThreshold: budget.alertThreshold,
        spent,
        remaining,
        percentage,
        status,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

// ============================================================================
// calculateReimbursementSummary
// ============================================================================

export function calculateReimbursementSummary(
  pendingTransactions: TransactionWithId[],
  clearedTransactions: TransactionWithId[]
): ReimbursementSummaryResult {
  const pendingTotal = pendingTransactions.reduce(
    (sum, { doc }) => sum + Math.abs(doc.amount),
    0
  );
  const pendingWorkTotal = pendingTransactions
    .filter(({ doc }) => doc.reimbursement?.type === 'work')
    .reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
  const pendingPersonalTotal = pendingTransactions
    .filter(({ doc }) => doc.reimbursement?.type === 'personal')
    .reduce((sum, { doc }) => sum + Math.abs(doc.amount), 0);
  const clearedTotal = clearedTransactions.reduce(
    (sum, { doc }) => sum + Math.abs(doc.amount),
    0
  );

  return {
    pendingCount: pendingTransactions.length,
    pendingTotal,
    pendingWorkTotal,
    pendingPersonalTotal,
    clearedCount: clearedTransactions.length,
    clearedTotal,
  };
}
