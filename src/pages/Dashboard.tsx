import { format } from 'date-fns';
import { Link, useNavigate, createSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCategories } from '@/hooks/useCategories';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import {
  SummaryCards,
  SpendingByCategoryChart,
  SpendingOverTimeChart,
  RecentTransactions,
  BudgetOverview,
} from '@/components/dashboard';

export function Dashboard() {
  const navigate = useNavigate();
  const { dateRange, selectedMonth } = useMonth();

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

  const periodLabel = format(selectedMonth, 'MMMM yyyy');

  const handleCategoryClick = (categoryId: string) => {
    // Resolve subcategory to its parent so the spending explorer gets a top-level ID
    const cat = categories.find((c) => c.id === categoryId);
    const topLevelId = cat?.parentId ?? categoryId;
    void navigate(`/expenses/${topLevelId}`);
  };

  const handleDateClick = (date: string) => {
    void navigate({
      pathname: '/transactions',
      search: createSearchParams({ date }).toString(),
    });
  };

  // Count pending reimbursements
  const pendingCount =
    dashboardData?.recentTransactions.filter((t) => t.reimbursement?.status === 'pending').length ??
    0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview for {periodLabel}</p>
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

      {/* Spending drill-down entry cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/expenses">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expenses</p>
                  <p className="text-xl font-bold tabular-nums text-red-500">
                    {formatAmount(-(dashboardData?.summary.totalExpenses ?? 0), { showSign: false })}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/income">
          <Card className="transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Income</p>
                  <p className="text-xl font-bold tabular-nums text-emerald-500">
                    {formatAmount(dashboardData?.summary.totalIncome ?? 0, { showSign: false })}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

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
              onCategoryClick={handleCategoryClick}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingOverTimeChart
              data={dashboardData?.timeline ?? []}
              isLoading={isLoading}
              onDateClick={handleDateClick}
            />
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
