import { useState } from 'react';
import { format } from 'date-fns';
import { Link, useNavigate, createSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCategories } from '@/hooks/useCategories';
import {
  useUpdateTransactionCategory,
  useBulkUpdateCategory,
  useCountMatchingTransactions,
} from '@/hooks/useTransactions';
import { useCreateRule } from '@/hooks/useRules';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import {
  SummaryCards,
  SpendingByCategoryChart,
  SpendingOverTimeChart,
  RecentTransactions,
  BudgetOverview,
} from '@/components/dashboard';
import { ApplyToSimilarDialog } from '@/components/transactions/ApplyToSimilarDialog';
import type { Transaction } from '@/types';

export function Dashboard() {
  const navigate = useNavigate();
  const { dateRange, selectedMonth } = useMonth();

  const { data: categories = [] } = useCategories();
  const { data: dashboardData, isLoading, error } = useDashboardData(dateRange);

  // Category editing state
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [pendingCategoryChange, setPendingCategoryChange] = useState<{
    transactionId: string;
    newCategoryId: string;
    transaction: Transaction;
  } | null>(null);

  const updateCategoryMutation = useUpdateTransactionCategory();
  const bulkUpdateMutation = useBulkUpdateCategory();
  const createRuleMutation = useCreateRule();
  const { data: matchingCount = 0 } = useCountMatchingTransactions(
    pendingCategoryChange?.transaction.counterparty ?? null
  );

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

  const handleCategoryChange = async (transactionId: string, categoryId: string | null) => {
    const transaction = dashboardData?.recentTransactions.find((t) => t.id === transactionId);
    await updateCategoryMutation.mutateAsync({ id: transactionId, categoryId });

    if (
      categoryId &&
      transaction &&
      transaction.counterparty &&
      (transaction.categorySource !== 'manual' || !transaction.categoryId)
    ) {
      setPendingCategoryChange({ transactionId, newCategoryId: categoryId, transaction });
      setRuleDialogOpen(true);
    }
  };

  const handleApplyToSimilar = async (options: {
    applyToSimilar: boolean;
    createRule: boolean;
    pattern: string;
    matchType: 'contains' | 'exact';
  }) => {
    if (!pendingCategoryChange) return;

    try {
      if (options.applyToSimilar && pendingCategoryChange.transaction.counterparty) {
        await bulkUpdateMutation.mutateAsync({
          counterparty: pendingCategoryChange.transaction.counterparty,
          categoryId: pendingCategoryChange.newCategoryId,
          excludeTransactionId: pendingCategoryChange.transactionId,
        });
      }

      if (options.createRule && options.pattern) {
        await createRuleMutation.mutateAsync({
          pattern: options.pattern,
          matchType: options.matchType,
          categoryId: pendingCategoryChange.newCategoryId,
          isLearned: true,
        });
      }
    } finally {
      setRuleDialogOpen(false);
      setPendingCategoryChange(null);
    }
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
            onCategoryChange={(id, categoryId) => void handleCategoryChange(id, categoryId)}
          />
        </CardContent>
      </Card>

      {/* Apply to Similar Dialog */}
      <ApplyToSimilarDialog
        open={ruleDialogOpen}
        onOpenChange={(open) => {
          setRuleDialogOpen(open);
          if (!open) setPendingCategoryChange(null);
        }}
        transaction={pendingCategoryChange?.transaction ?? null}
        newCategoryId={pendingCategoryChange?.newCategoryId ?? ''}
        categories={categories}
        matchingCount={matchingCount - 1}
        onApply={(options) => void handleApplyToSimilar(options)}
        isApplying={bulkUpdateMutation.isPending || createRuleMutation.isPending}
      />
    </div>
  );
}
