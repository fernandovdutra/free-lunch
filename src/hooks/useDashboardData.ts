import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import type {
  Transaction,
  Category,
  SpendingSummary,
  CategorySpending,
  TimelineData,
  TransactionSplit,
  ReimbursementInfo,
} from '@/types';
import { eachDayOfInterval, format } from 'date-fns';

// Firestore document shape
interface TransactionDocument {
  externalId?: string | null;
  date: Timestamp | string;
  description: string;
  amount: number;
  currency?: 'EUR';
  counterparty?: string | null;
  categoryId?: string | null;
  categoryConfidence?: number;
  categorySource?: 'auto' | 'manual' | 'rule';
  isSplit?: boolean;
  splits?: TransactionSplit[] | null;
  reimbursement?: ReimbursementInfo | null;
  bankAccountId?: string | null;
  importedAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

// Query keys
export const dashboardKeys = {
  all: (userId: string) => ['dashboard', userId] as const,
  dateRange: (userId: string, startDate: string, endDate: string) =>
    ['dashboard', userId, startDate, endDate] as const,
};

interface DashboardDateRange {
  startDate: Date;
  endDate: Date;
}

interface DashboardData {
  summary: SpendingSummary;
  categorySpending: CategorySpending[];
  timeline: TimelineData[];
  recentTransactions: Transaction[];
}

// Transform Firestore data to Transaction type
function transformTransaction(docSnap: QueryDocumentSnapshot): Transaction {
  const data = docSnap.data() as TransactionDocument;
  return {
    id: docSnap.id,
    externalId: data.externalId ?? null,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    description: data.description,
    amount: data.amount,
    currency: data.currency ?? 'EUR',
    counterparty: data.counterparty ?? null,
    categoryId: data.categoryId ?? null,
    categoryConfidence: data.categoryConfidence ?? 0,
    categorySource: data.categorySource ?? 'manual',
    isSplit: data.isSplit ?? false,
    splits: data.splits ?? null,
    reimbursement: data.reimbursement ?? null,
    bankAccountId: data.bankAccountId ?? null,
    importedAt:
      data.importedAt instanceof Timestamp
        ? data.importedAt.toDate()
        : new Date(data.importedAt ?? Date.now()),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(data.updatedAt ?? Date.now()),
  };
}

export function useDashboardData(dateRange: DashboardDateRange) {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();

  return useQuery({
    queryKey: dashboardKeys.dateRange(
      user?.id ?? '',
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString()
    ),
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error('Not authenticated');

      // Fetch transactions for date range
      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsRef,
        where('date', '>=', Timestamp.fromDate(dateRange.startDate)),
        where('date', '<=', Timestamp.fromDate(dateRange.endDate)),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(transformTransaction);

      return {
        summary: calculateSummary(transactions),
        categorySpending: calculateCategorySpending(transactions, categories),
        timeline: calculateTimelineData(transactions, dateRange),
        recentTransactions: transactions.slice(0, 5),
      };
    },
    enabled: !!user?.id && categories.length >= 0,
  });
}

/**
 * Calculate summary metrics from transactions
 */
export function calculateSummary(transactions: Transaction[]): SpendingSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  let pendingReimbursements = 0;

  transactions.forEach((t) => {
    if (t.reimbursement?.status === 'pending') {
      pendingReimbursements += Math.abs(t.amount);
    } else if (t.amount > 0) {
      totalIncome += t.amount;
    } else {
      totalExpenses += Math.abs(t.amount);
    }
  });

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    pendingReimbursements,
    transactionCount: transactions.length,
  };
}

/**
 * Calculate spending breakdown by category
 */
export function calculateCategorySpending(
  transactions: Transaction[],
  categories: Category[]
): CategorySpending[] {
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Only count expenses (negative amounts), exclude pending reimbursements
  const expenses = transactions.filter(
    (t) => t.amount < 0 && t.reimbursement?.status !== 'pending'
  );

  // Group by category
  const spending = new Map<string, { amount: number; count: number }>();
  expenses.forEach((t) => {
    const key = t.categoryId ?? 'uncategorized';
    const current = spending.get(key) ?? { amount: 0, count: 0 };
    spending.set(key, {
      amount: current.amount + Math.abs(t.amount),
      count: current.count + 1,
    });
  });

  // Calculate total for percentages
  const total = Array.from(spending.values()).reduce((sum, s) => sum + s.amount, 0);

  // Convert to CategorySpending array
  const result: CategorySpending[] = [];
  spending.forEach((value, categoryId) => {
    const category = categoryMap.get(categoryId);
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

/**
 * Calculate timeline data with daily aggregation
 */
export function calculateTimelineData(
  transactions: Transaction[],
  dateRange: DashboardDateRange
): TimelineData[] {
  // Create a map of date -> amounts
  const dailyData = new Map<string, { income: number; expenses: number }>();

  // Initialize all days in range
  const days = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
  days.forEach((day) => {
    dailyData.set(format(day, 'yyyy-MM-dd'), { income: 0, expenses: 0 });
  });

  // Aggregate transactions by day
  transactions.forEach((t) => {
    if (t.reimbursement?.status === 'pending') return; // Skip pending reimbursements

    const dateKey = format(t.date, 'yyyy-MM-dd');
    const current = dailyData.get(dateKey) ?? { income: 0, expenses: 0 };

    if (t.amount > 0) {
      current.income += t.amount;
    } else {
      current.expenses += Math.abs(t.amount);
    }

    dailyData.set(dateKey, current);
  });

  // Convert to array with formatted dates
  return Array.from(dailyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: format(new Date(date), 'MMM d'),
      income: data.income,
      expenses: data.expenses,
    }));
}
