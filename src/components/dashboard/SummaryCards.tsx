import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet, Receipt, ChevronRight } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import type { SpendingSummary } from '@/types';

interface SummaryCardsProps {
  summary: SpendingSummary;
  isLoading?: boolean;
  pendingCount?: number;
  incomeHref?: string;
  expensesHref?: string;
}

export function SummaryCards({ summary, isLoading, pendingCount = 0, incomeHref, expensesHref }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
              <Skeleton className="h-6 w-20 sm:h-8 sm:w-32" />
              <Skeleton className="mt-1 hidden h-3 w-20 sm:block" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {incomeHref ? (
        <Link to={incomeHref}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">Total Income</CardTitle>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <ChevronRight className="h-4 w-4 text-muted-foreground lg:hidden" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
              <div className="text-lg font-bold tabular-nums text-emerald-500 sm:text-2xl">
                {formatAmount(summary.totalIncome, { showSign: false })}
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">This period</p>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="text-lg font-bold tabular-nums text-emerald-500 sm:text-2xl">
              {formatAmount(summary.totalIncome, { showSign: false })}
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">This period</p>
          </CardContent>
        </Card>
      )}

      {expensesHref ? (
        <Link to={expensesHref}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">Total Expenses</CardTitle>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <ChevronRight className="h-4 w-4 text-muted-foreground lg:hidden" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
              <div className="text-lg font-bold tabular-nums text-red-500 sm:text-2xl">
                {formatAmount(-summary.totalExpenses, { showSign: false })}
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">This period</p>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
            <div className="text-lg font-bold tabular-nums text-red-500 sm:text-2xl">
              {formatAmount(-summary.totalExpenses, { showSign: false })}
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">This period</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs font-medium sm:text-sm">Net Balance</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
          <div className="text-lg font-bold tabular-nums sm:text-2xl">{formatAmount(summary.netBalance)}</div>
          <p className="text-xs text-muted-foreground">{summary.transactionCount} transactions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs font-medium sm:text-sm">Pending Reimbursements</CardTitle>
          <Receipt className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 sm:px-6 sm:pb-6">
          <div className="text-lg font-bold tabular-nums text-amber-500 sm:text-2xl">
            {formatAmount(summary.pendingReimbursements, { showSign: false })}
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingCount} expense{pendingCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
