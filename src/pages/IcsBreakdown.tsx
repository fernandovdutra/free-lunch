import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthlyBarChart, SpendingHeader, CategoryRow } from '@/components/spending';
import { useIcsBreakdownExplorer } from '@/hooks/useIcsBreakdownExplorer';
import { useMonth } from '@/contexts/MonthContext';

export function IcsBreakdown() {
  const { statementId } = useParams<{ statementId: string }>();
  const navigate = useNavigate();
  const { selectedMonth } = useMonth();

  const globalMonthKey = format(selectedMonth, 'yyyy-MM');
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);
  const selectedMonthKey = highlightedMonth ?? globalMonthKey;

  const { data, isLoading } = useIcsBreakdownExplorer({
    statementId,
    breakdownMonthKey: highlightedMonth,
  });

  const handleMonthClick = (monthKey: string) => {
    setHighlightedMonth(monthKey === globalMonthKey ? undefined : monthKey);
  };

  return (
    <div className="space-y-6">
      <SpendingHeader
        title="ICS Credit Card"
        total={data?.currentTotal ?? 0}
        monthLabel={data?.currentMonth ?? format(selectedMonth, 'MMMM yyyy')}
        onBack={() => void navigate(-1)}
        isLoading={isLoading}
        direction="expenses"
      />

      <MonthlyBarChart
        data={data?.monthlyTotals ?? []}
        selectedMonthKey={selectedMonthKey}
        onMonthClick={handleMonthClick}
        isLoading={isLoading}
        color="#7C3AED"
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
              onClick={() => void navigate(`/ics/${statementId}/${cat.categoryId}`)}
            />
          ))
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">No ICS transactions for this statement</p>
          </div>
        )}
      </div>
    </div>
  );
}
