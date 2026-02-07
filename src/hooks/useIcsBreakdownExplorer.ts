import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import {
  getIcsBreakdownFn,
  deserializeTransaction,
  type MonthlyTotal,
  type CategoryBreakdownItem,
} from '@/lib/bankingFunctions';
import type { Transaction } from '@/types';

interface UseIcsBreakdownParams {
  statementId: string | undefined;
  categoryId?: string | undefined;
  counterparty?: string | undefined;
  breakdownMonthKey?: string | undefined;
}

export interface IcsBreakdownData {
  currentTotal: number;
  currentMonth: string;
  monthlyTotals: MonthlyTotal[];
  categories?: CategoryBreakdownItem[] | undefined;
  transactions?: Transaction[] | undefined;
}

export function useIcsBreakdownExplorer({
  statementId,
  categoryId,
  counterparty,
  breakdownMonthKey,
}: UseIcsBreakdownParams) {
  const { user } = useAuth();
  const { dateRange, selectedMonth } = useMonth();

  return useQuery({
    queryKey: [
      'icsBreakdown',
      user?.id,
      statementId,
      selectedMonth.toISOString(),
      categoryId,
      counterparty,
      breakdownMonthKey,
    ],
    queryFn: async (): Promise<IcsBreakdownData> => {
      if (!user?.id || !statementId) throw new Error('Not authenticated or missing statementId');

      const request: Parameters<typeof getIcsBreakdownFn>[0] = {
        statementId,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      };
      if (categoryId) request.categoryId = categoryId;
      if (counterparty) request.counterparty = counterparty;
      if (breakdownMonthKey) request.breakdownMonthKey = breakdownMonthKey;

      const result = await getIcsBreakdownFn(request);

      const data: IcsBreakdownData = {
        currentTotal: result.data.currentTotal,
        currentMonth: result.data.currentMonth,
        monthlyTotals: result.data.monthlyTotals,
      };
      if (result.data.categories) data.categories = result.data.categories;
      if (result.data.transactions) data.transactions = result.data.transactions.map(deserializeTransaction);

      return data;
    },
    enabled: !!user?.id && !!statementId,
  });
}
