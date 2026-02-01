import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import type { BudgetProgress, Transaction, Category, TransactionSplit, ReimbursementInfo } from '@/types';

// Firestore document shape for transactions
interface TransactionDocument {
  date: Timestamp | string;
  amount: number;
  categoryId?: string | null;
  isSplit?: boolean;
  splits?: TransactionSplit[] | null;
  reimbursement?: ReimbursementInfo | null;
}

// Query keys
export const budgetProgressKeys = {
  current: (userId: string) => ['budgetProgress', userId, 'current'] as const,
  suggestions: (userId: string) => ['budgetProgress', userId, 'suggestions'] as const,
};

interface SpendingByCategory {
  categoryId: string;
  amount: number;
}

/**
 * Calculate spending by category for a date range, handling splits and excluding pending reimbursements
 */
function calculateSpendingByCategory(
  transactions: Transaction[],
  categories: Category[]
): SpendingByCategory[] {
  const spending = new Map<string, number>();

  // Build a map of child -> parent for rollup
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  transactions.forEach((t) => {
    // Skip income and pending reimbursements
    if (t.amount >= 0) return;
    if (t.reimbursement?.status === 'pending') return;

    const absAmount = Math.abs(t.amount);

    if (t.isSplit && t.splits) {
      // Handle split transactions - each split counts toward its category
      t.splits.forEach((split) => {
        if (split.amount < 0) return; // splits are positive amounts
        const current = spending.get(split.categoryId) ?? 0;
        spending.set(split.categoryId, current + split.amount);

        // Also add to parent category if exists
        const category = categoryMap.get(split.categoryId);
        if (category?.parentId) {
          const parentCurrent = spending.get(category.parentId) ?? 0;
          spending.set(category.parentId, parentCurrent + split.amount);
        }
      });
    } else if (t.categoryId) {
      // Regular transaction
      const current = spending.get(t.categoryId) ?? 0;
      spending.set(t.categoryId, current + absAmount);

      // Also add to parent category if exists
      const category = categoryMap.get(t.categoryId);
      if (category?.parentId) {
        const parentCurrent = spending.get(category.parentId) ?? 0;
        spending.set(category.parentId, parentCurrent + absAmount);
      }
    }
  });

  return Array.from(spending.entries()).map(([categoryId, amount]) => ({
    categoryId,
    amount,
  }));
}

/**
 * Hook to get current month's budget progress
 */
export function useBudgetProgress() {
  const { user } = useAuth();
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();

  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];
      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsRef,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as TransactionDocument;
        const dateValue = data.date;
        return {
          id: docSnap.id,
          date: dateValue instanceof Timestamp ? dateValue.toDate() : new Date(dateValue),
          amount: data.amount,
          categoryId: data.categoryId ?? null,
          isSplit: data.isSplit ?? false,
          splits: data.splits ?? null,
          reimbursement: data.reimbursement ?? null,
        } as Transaction;
      });
    },
    enabled: !!user?.id,
  });

  const budgetProgress = useMemo((): BudgetProgress[] => {
    if (!budgets.length || !categories.length) return [];

    const spending = calculateSpendingByCategory(transactions, categories);
    const spendingMap = new Map(spending.map((s) => [s.categoryId, s.amount]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return budgets
      .filter((b) => b.isActive)
      .map((budget): BudgetProgress => {
        const category = categoryMap.get(budget.categoryId);
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
          budget,
          categoryName: category?.name ?? 'Unknown',
          categoryIcon: category?.icon ?? '📁',
          categoryColor: category?.color ?? '#9CA3AF',
          spent,
          remaining,
          percentage,
          status,
        };
      })
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
  }, [budgets, categories, transactions]);

  return {
    data: budgetProgress,
    isLoading,
  };
}

/**
 * Hook to get spending suggestions based on 3-month average
 */
export function useBudgetSuggestions() {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();

  const now = new Date();
  const threeMonthsAgo = subMonths(startOfMonth(now), 3);
  const endDate = endOfMonth(subMonths(now, 1)); // End of last month

  return useQuery({
    queryKey: budgetProgressKeys.suggestions(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return new Map<string, number>();

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsRef,
        where('date', '>=', Timestamp.fromDate(threeMonthsAgo)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);

      const transactions = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as TransactionDocument;
        const dateValue = data.date;
        return {
          id: docSnap.id,
          date: dateValue instanceof Timestamp ? dateValue.toDate() : new Date(dateValue),
          amount: data.amount,
          categoryId: data.categoryId ?? null,
          isSplit: data.isSplit ?? false,
          splits: data.splits ?? null,
          reimbursement: data.reimbursement ?? null,
        } as Transaction;
      });

      const spending = calculateSpendingByCategory(transactions, categories);

      // Calculate 3-month average (divide by 3)
      const suggestions = new Map<string, number>();
      spending.forEach(({ categoryId, amount }) => {
        suggestions.set(categoryId, Math.round((amount / 3) * 100) / 100);
      });

      return suggestions;
    },
    enabled: !!user?.id && categories.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes - suggestions don't need frequent updates
  });
}
