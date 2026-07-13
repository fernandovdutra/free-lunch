import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { getDashboardData as getDashboardDataFn, deserializeTransaction } from '@/lib/bankingFunctions';
import { timed } from '@/lib/perf';
import type {
  Transaction,
  SpendingSummary,
  CategorySpending,
  TimelineData,
} from '@/types';

// Query keys — delegated to the central factory (src/lib/queryKeys.ts).
export const dashboardKeys = {
  all: (userId: string) => queryKeys.dashboard.all(userId),
  dateRange: (userId: string, range: { startDate: Date; endDate: Date }) =>
    queryKeys.dashboard.range(userId, range),
};

interface DashboardDateRange {
  startDate: Date;
  endDate: Date;
}

interface DashboardData {
  summary: SpendingSummary;
  categorySpending: CategorySpending[];
  timeline: (TimelineData & { dateKey: string })[];
  recentTransactions: Transaction[];
}

export function useDashboardData(dateRange: DashboardDateRange) {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: dashboardKeys.dateRange(dataOwnerId ?? '', dateRange),
    queryFn: async (): Promise<DashboardData> => {
      if (!dataOwnerId) throw new Error('Not authenticated');

      const result = await timed('getDashboardData', () =>
        getDashboardDataFn({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        })
      );

      return {
        summary: result.data.summary,
        categorySpending: result.data.categorySpending,
        timeline: result.data.timeline,
        recentTransactions: result.data.recentTransactions.map(deserializeTransaction),
      };
    },
    enabled: !!dataOwnerId,
  });
}
