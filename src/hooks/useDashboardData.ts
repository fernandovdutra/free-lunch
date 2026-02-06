import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardData as getDashboardDataFn, deserializeTransaction } from '@/lib/bankingFunctions';
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
  const { user } = useAuth();

  return useQuery({
    queryKey: dashboardKeys.dateRange(
      user?.id ?? '',
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString()
    ),
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error('Not authenticated');

      const result = await getDashboardDataFn({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });

      return {
        summary: result.data.summary,
        categorySpending: result.data.categorySpending,
        timeline: result.data.timeline,
        recentTransactions: result.data.recentTransactions.map(deserializeTransaction),
      };
    },
    enabled: !!user?.id,
  });
}
