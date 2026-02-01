import { useState } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCategories } from '@/hooks/useCategories';
import {
  SummaryCards,
  SpendingByCategoryChart,
  SpendingOverTimeChart,
  RecentTransactions,
  BudgetOverview,
} from '@/components/dashboard';

type DatePreset = 'thisMonth' | 'lastMonth' | 'thisYear';

export function Dashboard() {
  const now = new Date();
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');

  // Calculate date range based on preset
  const dateRange = getDateRange(datePreset, now);

  const { data: categories = [] } = useCategories();
  const { data: dashboardData, isLoading, error } = useDashboardData(dateRange);

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load dashboard</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const periodLabel = getPeriodLabel(datePreset, dateRange);

  // Count pending reimbursements
  const pendingCount =
    dashboardData?.recentTransactions.filter((t) => t.reimbursement?.status === 'pending').length ??
    0;

  return (
    <div className="space-y-6">
      {/* Page header with date selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview for {periodLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={datePreset === 'thisMonth' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setDatePreset('thisMonth');
            }}
          >
            This Month
          </Button>
          <Button
            variant={datePreset === 'lastMonth' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setDatePreset('lastMonth');
            }}
          >
            Last Month
          </Button>
          <Button
            variant={datePreset === 'thisYear' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setDatePreset('thisYear');
            }}
          >
            This Year
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards
        summary={
          dashboardData?.summary ?? {
            totalIncome: 0,
            totalExpenses: 0,
            netBalance: 0,
            pendingReimbursements: 0,
            transactionCount: 0,
          }
        }
        isLoading={isLoading}
        pendingCount={pendingCount}
      />

      {/* Charts section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingByCategoryChart
              data={dashboardData?.categorySpending ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingOverTimeChart data={dashboardData?.timeline ?? []} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Budget overview */}
      <BudgetOverview />

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactions
            transactions={dashboardData?.recentTransactions ?? []}
            categories={categories}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function getDateRange(preset: DatePreset, now: Date) {
  switch (preset) {
    case 'thisMonth':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    }
    case 'thisYear':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
      };
  }
}

function getPeriodLabel(preset: DatePreset, dateRange: { startDate: Date; endDate: Date }) {
  switch (preset) {
    case 'thisMonth':
      return format(dateRange.startDate, 'MMMM yyyy');
    case 'lastMonth':
      return format(dateRange.startDate, 'MMMM yyyy');
    case 'thisYear':
      return format(dateRange.startDate, 'yyyy');
  }
}
