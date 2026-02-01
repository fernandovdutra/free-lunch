import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CounterpartySpendingChart,
  CounterpartyTrendChart,
  CounterpartySummaryCard,
} from '@/components/analytics';
import { useCounterpartyAnalytics } from '@/hooks/useCounterpartyAnalytics';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';

export function CounterpartyDetail() {
  const { counterparty } = useParams<{ counterparty: string }>();
  const navigate = useNavigate();
  const { selectedMonth } = useMonth();
  const decodedCounterparty = counterparty ? decodeURIComponent(counterparty) : null;

  const { data: analytics, isLoading, error } = useCounterpartyAnalytics(decodedCounterparty);

  const currentMonthLabel = format(selectedMonth, 'MMMM yyyy');

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Failed to load data</p>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TrendingUp className="h-6 w-6 text-primary" />
            {decodedCounterparty}
          </h1>
          <p className="text-muted-foreground">Spending analytics and history</p>
        </div>
      </div>

      {/* Current month highlight */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{currentMonthLabel}</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-destructive">
                  {formatAmount(-(analytics?.currentMonthSpending ?? 0), { showSign: false })}
                </p>
              )}
            </div>
            {!isLoading && analytics && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-semibold">{analytics.currentMonthTransactions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <CounterpartySummaryCard analytics={analytics} isLoading={isLoading} />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterpartySpendingChart
              data={analytics?.last12Months ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterpartyTrendChart
              data={analytics?.last12Months ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
