import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import type { SpendingSummary } from '@/types';

interface SummaryCardsProps {
  summary: SpendingSummary;
  isLoading?: boolean;
  pendingCount?: number;
}

export function SummaryCards({ summary, isLoading, pendingCount = 0 }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-emerald-500">
            {formatAmount(summary.totalIncome, { showSign: false })}
          </div>
          <p className="text-xs text-muted-foreground">This period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-red-500">
            {formatAmount(-summary.totalExpenses, { showSign: false })}
          </div>
          <p className="text-xs text-muted-foreground">This period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{formatAmount(summary.netBalance)}</div>
          <p className="text-xs text-muted-foreground">{summary.transactionCount} transactions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Reimbursements</CardTitle>
          <Receipt className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-amber-500">
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
