import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import {
  getSpendingExplorerFn,
  deserializeTransaction,
  type MonthlyTotal,
  type CategoryBreakdownItem,
} from '@/lib/bankingFunctions';
import type { Transaction } from '@/types';

// Query keys
export const spendingExplorerKeys = {
  all: (userId: string) => ['spendingExplorer', userId] as const,
  explorer: (
    userId: string,
    direction: string,
    monthISO: string,
    categoryId?: string,
    subcategoryId?: string,
    counterparty?: string,
    breakdownMonthKey?: string
  ) =>
    [
      'spendingExplorer',
      userId,
      direction,
      monthISO,
      categoryId,
      subcategoryId,
      counterparty,
      breakdownMonthKey,
    ] as const,
};

interface UseSpendingExplorerParams {
  direction: 'expenses' | 'income';
  categoryId?: string | undefined;
  subcategoryId?: string | undefined;
  counterparty?: string | undefined;
  breakdownMonthKey?: string | undefined;
}

export interface SpendingExplorerData {
  currentTotal: number;
  currentMonth: string;
  monthlyTotals: MonthlyTotal[];
  categories?: CategoryBreakdownItem[] | undefined;
  transactions?: Transaction[] | undefined;
}

export function useSpendingExplorer({
  direction,
  categoryId,
  subcategoryId,
  counterparty,
  breakdownMonthKey,
}: UseSpendingExplorerParams) {
  const { user } = useAuth();
  const { dateRange, selectedMonth } = useMonth();

  return useQuery({
    queryKey: spendingExplorerKeys.explorer(
      user?.id ?? '',
      direction,
      selectedMonth.toISOString(),
      categoryId,
      subcategoryId,
      counterparty,
      breakdownMonthKey
    ),
    queryFn: async (): Promise<SpendingExplorerData> => {
      if (!user?.id) throw new Error('Not authenticated');

      const request: Parameters<typeof getSpendingExplorerFn>[0] = {
        direction,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      };
      if (categoryId) request.categoryId = categoryId;
      if (subcategoryId) request.subcategoryId = subcategoryId;
      if (counterparty) request.counterparty = counterparty;
      if (breakdownMonthKey) request.breakdownMonthKey = breakdownMonthKey;

      const result = await getSpendingExplorerFn(request);

      const data: SpendingExplorerData = {
        currentTotal: result.data.currentTotal,
        currentMonth: result.data.currentMonth,
        monthlyTotals: result.data.monthlyTotals,
      };
      if (result.data.categories) data.categories = result.data.categories;
      if (result.data.transactions) data.transactions = result.data.transactions.map(deserializeTransaction);

      return data;
    },
    enabled: !!user?.id,
  });
}

export type { MonthlyTotal, CategoryBreakdownItem };
