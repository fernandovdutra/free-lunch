import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import { queryKeys } from '@/lib/queryKeys';
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
  const { dataOwnerId } = useAuth();
  const { dateRange, selectedMonth } = useMonth();
  // Local-time format → TZ-stable yyyy-MM. See useSpendingExplorer for context.
  const monthKey = format(selectedMonth, 'yyyy-MM');

  return useQuery({
    queryKey: queryKeys.icsBreakdown.explorer(dataOwnerId ?? '', {
      statementId,
      monthKey,
      categoryId,
      counterparty,
      breakdownMonthKey,
    }),
    queryFn: async (): Promise<IcsBreakdownData> => {
      if (!dataOwnerId || !statementId) throw new Error('Not authenticated or missing statementId');

      const request: Parameters<typeof getIcsBreakdownFn>[0] = {
        statementId,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        monthKey,
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
    enabled: !!dataOwnerId && !!statementId,
  });
}
