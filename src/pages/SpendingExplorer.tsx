import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyBarChart, SpendingHeader, CategoryRow } from '@/components/spending';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useMonth } from '@/contexts/MonthContext';

export function SpendingExplorer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedMonth } = useMonth();

  const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
  const basePath = `/${direction}`;

  // Local state for which bar is highlighted — initialized from global month
  const globalMonthKey = format(selectedMonth, 'yyyy-MM');
  const [highlightedMonth, setHighlightedMonth] = useState<string>(globalMonthKey);

  // Sync local highlight when user navigates via the header month selector
  useEffect(() => {
    setHighlightedMonth(globalMonthKey);
  }, [globalMonthKey]);

  const selectedMonthKey = highlightedMonth;

  const { data, isLoading } = useSpendingExplorer({
    direction,
    breakdownMonthKey: highlightedMonth,
  });

  const handleMonthClick = (monthKey: string) => {
    setHighlightedMonth(monthKey);
  };

  return (
    <div className="space-y-6">
      <SpendingHeader
        title={direction === 'expenses' ? 'Expenses' : 'Income'}
        total={data?.currentTotal ?? 0}
        monthLabel={data?.currentMonth ?? format(selectedMonth, 'MMMM yyyy')}
        onBack={() => void navigate('/')}
        isLoading={isLoading}
        direction={direction}
      />

      <MonthlyBarChart
        data={data?.monthlyTotals ?? []}
        selectedMonthKey={selectedMonthKey}
        onMonthClick={handleMonthClick}
        isLoading={isLoading}
        color={direction === 'expenses' ? '#1D4739' : '#2D5A4A'}
      />

      {/* Category breakdown */}
      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : data?.categories?.length ? (
          data.categories.map((cat) => (
            <CategoryRow
              key={cat.categoryId}
              categoryId={cat.categoryId}
              name={cat.categoryName}
              icon={cat.categoryIcon}
              color={cat.categoryColor}
              amount={cat.amount}
              percentage={cat.percentage}
              transactionCount={cat.transactionCount}
              onClick={() => void navigate(`${basePath}/${cat.categoryId}`)}
            />
          ))
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">
              No {direction} for this month
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
