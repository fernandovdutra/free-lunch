import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyBarChart, SpendingHeader } from '@/components/spending';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useCategories } from '@/hooks/useCategories';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount, formatDate } from '@/lib/utils';

export function SpendingSubcategory() {
  const { categoryId, subcategoryId } = useParams<{
    categoryId: string;
    subcategoryId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const { data: categories = [] } = useCategories();

  const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
  const basePath = `/${direction}`;

  const { data, isLoading } = useSpendingExplorer({
    direction,
    categoryId,
    subcategoryId,
  });

  const selectedMonthKey = format(selectedMonth, 'yyyy-MM');

  const subcategory = categories.find((c) => c.id === subcategoryId);
  const title = subcategory?.name ?? 'Subcategory';

  const handleMonthClick = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    setSelectedMonth(new Date(Number(year), Number(month) - 1, 1));
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
        onBack={() => void navigate(`${basePath}/${categoryId}`)}
        isLoading={isLoading}
        direction={direction}
      />

      <MonthlyBarChart
        data={data?.monthlyTotals ?? []}
        selectedMonthKey={selectedMonthKey}
        onMonthClick={handleMonthClick}
        isLoading={isLoading}
        color={subcategory?.color ?? '#1D4739'}
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
                          `${basePath}/${categoryId}/${subcategoryId}/counterparty/${encodeURIComponent(tx.counterparty)}`
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
            <p className="text-muted-foreground">No transactions for this month</p>
          </div>
        )}
      </div>
    </div>
  );
}
