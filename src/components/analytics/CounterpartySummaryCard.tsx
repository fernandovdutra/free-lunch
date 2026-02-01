import { format } from 'date-fns';
import { Calendar, Hash, TrendingDown, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount } from '@/lib/utils';
import type { CounterpartyAnalytics } from '@/hooks/useCounterpartyAnalytics';

interface CounterpartySummaryCardProps {
  analytics: CounterpartyAnalytics | null | undefined;
  isLoading?: boolean;
}

export function CounterpartySummaryCard({
  analytics,
  isLoading,
}: CounterpartySummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      label: 'Total Spent',
      value: formatAmount(-analytics.totalSpent, { showSign: false }),
      icon: TrendingDown,
      color: 'text-destructive',
    },
    {
      label: 'Total Transactions',
      value: analytics.totalTransactions.toString(),
      icon: Hash,
      color: 'text-primary',
    },
    {
      label: 'Avg per Month',
      value: formatAmount(-analytics.averagePerMonth, { showSign: false }),
      icon: Calculator,
      color: 'text-muted-foreground',
    },
    {
      label: 'First Transaction',
      value: analytics.firstTransactionDate
        ? format(analytics.firstTransactionDate, 'MMM d, yyyy')
        : '—',
      icon: Calendar,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
