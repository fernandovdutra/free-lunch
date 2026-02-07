import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyBarChart, SpendingHeader } from '@/components/spending';
import { useIcsBreakdownExplorer } from '@/hooks/useIcsBreakdownExplorer';
import { useCategories } from '@/hooks/useCategories';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount, formatDate } from '@/lib/utils';

export function IcsBreakdownCategory() {
  const { statementId, categoryId } = useParams<{
    statementId: string;
    categoryId: string;
  }>();
  const navigate = useNavigate();
  const { selectedMonth } = useMonth();
  const { data: categories = [] } = useCategories();

  const globalMonthKey = format(selectedMonth, 'yyyy-MM');
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);
  const selectedMonthKey = highlightedMonth ?? globalMonthKey;

  const { data, isLoading } = useIcsBreakdownExplorer({
    statementId,
    categoryId,
    breakdownMonthKey: highlightedMonth,
  });

  const category = categories.find((c) => c.id === categoryId);
  const title = category?.name ?? 'Category';

  const handleMonthClick = (monthKey: string) => {
    setHighlightedMonth(monthKey === globalMonthKey ? undefined : monthKey);
  };

  // Group transactions by date
  const grouped = new Map<string, NonNullable<typeof data>['transactions']>();
  if (data?.transactions) {
    for (const tx of data.transactions) {
      const dateKey = formatDate(tx.date, 'long');
      const group = grouped.get(dateKey) ?? [];
      group.push(tx);
      grouped.set(dateKey, group);
    }
  }

  return (
    <div className="space-y-6">
      <SpendingHeader
        title={title}
        total={data?.currentTotal ?? 0}
        monthLabel={data?.currentMonth ?? format(selectedMonth, 'MMMM yyyy')}
        onBack={() => void navigate(`/ics/${statementId}`)}
        isLoading={isLoading}
        direction="expenses"
      />

      <MonthlyBarChart
        data={data?.monthlyTotals ?? []}
        selectedMonthKey={selectedMonthKey}
        onMonthClick={handleMonthClick}
        isLoading={isLoading}
        color={category?.color ?? '#7C3AED'}
      />

      {/* Transaction list */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg p-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : grouped.size > 0 ? (
          Array.from(grouped.entries()).map(([dateLabel, txs]) => (
            <div key={dateLabel}>
              <p className="mb-1 px-1 text-xs font-medium uppercase text-muted-foreground">
                {dateLabel}
              </p>
              <div className="space-y-0.5">
                {txs!.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      if (tx.counterparty) {
                        void navigate(
                          `/ics/${statementId}/${categoryId}/counterparty/${encodeURIComponent(tx.counterparty)}`
                        );
                      }
                    }}
                    className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {tx.counterparty || tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.date, 'short')}
                      </p>
                    </div>
                    <p className="ml-2 shrink-0 font-semibold tabular-nums">
                      {formatAmount(tx.amount, { showSign: false })}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">No transactions for this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
