import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { TrendingUp, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCounterpartyAnalytics } from '@/hooks/useCounterpartyAnalytics';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CounterpartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterparty: string | null;
}

export function CounterpartyDialog({
  open,
  onOpenChange,
  counterparty,
}: CounterpartyDialogProps) {
  const navigate = useNavigate();
  const { selectedMonth } = useMonth();
  const { data: analytics, isLoading } = useCounterpartyAnalytics(counterparty);

  const handleViewDetails = () => {
    onOpenChange(false);
    void navigate(`/counterparty/${encodeURIComponent(counterparty ?? '')}`);
  };

  const currentMonthLabel = format(selectedMonth, 'MMMM yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {counterparty}
          </DialogTitle>
          <DialogDescription>Spending summary for this merchant</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        ) : !analytics ? (
          <div className="py-8 text-center text-muted-foreground">
            No spending data for this counterparty
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Current month summary */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">{currentMonthLabel}</p>
              <p className="text-2xl font-bold tabular-nums text-destructive">
                {formatAmount(-analytics.currentMonthSpending, { showSign: false })}
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.currentMonthTransactions} transaction
                {analytics.currentMonthTransactions !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Mini 3-month chart */}
            {analytics.last3Months.some((m) => m.amount > 0) && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Last 3 months
                </p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart
                    data={analytics.last3Months}
                    margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  >
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#5C6661' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {analytics.last3Months.map((entry, index) => (
                        <Cell
                          key={entry.monthKey}
                          fill={index === 2 ? '#1D4739' : '#A3C4B5'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">All-time total</p>
                <p className="font-medium tabular-nums">
                  {formatAmount(-analytics.totalSpent, { showSign: false })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg per month</p>
                <p className="font-medium tabular-nums">
                  {formatAmount(-analytics.averagePerMonth, { showSign: false })}
                </p>
              </div>
            </div>

            {/* View details button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleViewDetails}
            >
              View Full History
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
