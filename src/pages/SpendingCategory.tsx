import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyBarChart, SpendingHeader, CategoryRow } from '@/components/spending';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useCategories } from '@/hooks/useCategories';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount, formatDate } from '@/lib/utils';

export function SpendingCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const { data: categories = [] } = useCategories();

  const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
  const basePath = `/${direction}`;

  const { data, isLoading } = useSpendingExplorer({
    direction,
    categoryId,
  });

  const selectedMonthKey = format(selectedMonth, 'yyyy-MM');

  const parentCategory = categories.find((c) => c.id === categoryId);
  const title = parentCategory?.name ?? 'Category';

  const handleMonthClick = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    setSelectedMonth(new Date(Number(year), Number(month) - 1, 1));
  };

  // Check if this is a leaf category (no subcategories → shows transactions)
  const hasTransactions = !!data?.transactions;
  const hasCategories = !!data?.categories?.length;

  return (
    <div className="space-y-6">
      <SpendingHeader
        title={title}
        total={data?.currentTotal ?? 0}
        monthLabel={data?.currentMonth ?? format(selectedMonth, 'MMMM yyyy')}
        onBack={() => void navigate(basePath)}
        isLoading={isLoading}
        direction={direction}
      />

      <MonthlyBarChart
        data={data?.monthlyTotals ?? []}
        selectedMonthKey={selectedMonthKey}
        onMonthClick={handleMonthClick}
        isLoading={isLoading}
        color={parentCategory?.color ?? '#1D4739'}
      />

      {/* Subcategory breakdown or transaction list */}
      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : hasCategories ? (
          data.categories!.map((cat) => (
            <CategoryRow
              key={cat.categoryId}
              categoryId={cat.categoryId}
              name={cat.categoryName}
              icon={cat.categoryIcon}
              color={cat.categoryColor}
              amount={cat.amount}
              percentage={cat.percentage}
              transactionCount={cat.transactionCount}
              onClick={() =>
                void navigate(`${basePath}/${categoryId}/${cat.categoryId}`)
              }
            />
          ))
        ) : hasTransactions ? (
          <TransactionList
            transactions={data.transactions!}
            basePath={`${basePath}/${categoryId}/${categoryId}`}
          />
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">No data for this month</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple transaction list for leaf categories
function TransactionList({
  transactions,
  basePath,
}: {
  transactions: Array<{
    id: string;
    date: Date;
    counterparty: string | null;
    description: string;
    amount: number;
  }>;
  basePath: string;
}) {
  const navigate = useNavigate();

  // Group by date
  const grouped = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const dateKey = formatDate(tx.date, 'long');
    const group = grouped.get(dateKey) ?? [];
    group.push(tx);
    grouped.set(dateKey, group);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([dateLabel, txs]) => (
        <div key={dateLabel}>
          <p className="mb-1 px-1 text-xs font-medium uppercase text-muted-foreground">
            {dateLabel}
          </p>
          <div className="space-y-0.5">
            {txs.map((tx) => (
              <button
                key={tx.id}
                onClick={() => {
                  if (tx.counterparty) {
                    void navigate(
                      `${basePath}/counterparty/${encodeURIComponent(tx.counterparty)}`
                    );
                  }
                }}
                className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
              >
                <p className="truncate font-medium">
                  {tx.counterparty || tx.description}
                </p>
                <p className="ml-2 shrink-0 font-semibold tabular-nums">
                  {formatAmount(tx.amount, { showSign: false })}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
