import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBudgets } from '@/hooks/useBudgets';
import { getBudgetProgressFn } from '@/lib/bankingFunctions';
import type { BudgetProgress } from '@/types';

// Query keys
export const budgetProgressKeys = {
  current: (userId: string) => ['budgetProgress', userId, 'current'] as const,
  suggestions: (userId: string) => ['budgetProgress', userId, 'suggestions'] as const,
};

/**
 * Hook to get current month's budget progress
 */
export function useBudgetProgress(dateRange?: { startDate: Date; endDate: Date }) {
  const { dataOwnerId } = useAuth();
  const { data: budgets = [] } = useBudgets();

  const { data: budgetProgress = [], isLoading } = useQuery({
    queryKey: budgetProgressKeys.current(dataOwnerId ?? ''),
    queryFn: async (): Promise<BudgetProgress[]> => {
      if (!dataOwnerId) return [];

      const params: { startDate?: string; endDate?: string } = {};
      if (dateRange) {
        params.startDate = dateRange.startDate.toISOString();
        params.endDate = dateRange.endDate.toISOString();
      }
      const result = await getBudgetProgressFn(params);

      // Map flat response back to BudgetProgress with nested Budget object
      // This keeps UI components working without changes
      const budgetMap = new Map(budgets.map((b) => [b.id, b]));

      return result.data.budgetProgress.map((item): BudgetProgress => {
        const budget = budgetMap.get(item.budgetId);
        return {
          budget: budget ?? {
            id: item.budgetId,
            name: item.budgetName,
            categoryId: item.categoryId,
            monthlyLimit: item.monthlyLimit,
            alertThreshold: item.alertThreshold,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          categoryName: item.categoryName,
          categoryIcon: item.categoryIcon,
          categoryColor: item.categoryColor,
          spent: item.spent,
          remaining: item.remaining,
          percentage: item.percentage,
          status: item.status,
        };
      });
    },
    enabled: !!dataOwnerId && budgets.length > 0,
  });

  return {
    data: budgetProgress,
    isLoading,
  };
}

/**
 * Hook to get spending suggestions based on 3-month average
 */
export function useBudgetSuggestions() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: budgetProgressKeys.suggestions(dataOwnerId ?? ''),
    queryFn: async () => {
      if (!dataOwnerId) return new Map<string, number>();

      const result = await getBudgetProgressFn({ suggestions: true });
      return new Map(Object.entries(result.data.suggestions ?? {}));
    },
    enabled: !!dataOwnerId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
