import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardData as getDashboardDataFn, deserializeTransaction } from '@/lib/bankingFunctions';
import { timed } from '@/lib/perf';
import type {
  Transaction,
  SpendingSummary,
  CategorySpending,
  TimelineData,
} from '@/types';

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
  timeline: (TimelineData & { dateKey: string })[];
  recentTransactions: Transaction[];
}

export function useDashboardData(dateRange: DashboardDateRange) {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: dashboardKeys.dateRange(
      dataOwnerId ?? '',
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString()
    ),
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
