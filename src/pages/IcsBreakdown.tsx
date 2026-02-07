import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MonthlyBarChart, SpendingHeader, CategoryRow } from '@/components/spending';
import { useIcsBreakdownExplorer } from '@/hooks/useIcsBreakdownExplorer';
import { useMonth } from '@/contexts/MonthContext';
import { deleteIcsImportFn } from '@/lib/bankingFunctions';
import { useToast } from '@/components/ui/toaster';

export function IcsBreakdown() {
  const { statementId } = useParams<{ statementId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedMonth } = useMonth();
  const { toast } = useToast();

  const globalMonthKey = format(selectedMonth, 'yyyy-MM');
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);
  const selectedMonthKey = highlightedMonth ?? globalMonthKey;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading } = useIcsBreakdownExplorer({
    statementId,
    breakdownMonthKey: highlightedMonth,
  });

  const handleMonthClick = (monthKey: string) => {
    setHighlightedMonth(monthKey === globalMonthKey ? undefined : monthKey);
  };

  const handleDelete = async () => {
    if (!statementId) return;
    setIsDeleting(true);
    try {
      const result = await deleteIcsImportFn({ statementId });
      toast({
        title: 'ICS import deleted',
        description: result.data.message,
      });
      await queryClient.invalidateQueries();
      void navigate('/transactions');
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
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

      {/* Delete import action */}
      <div className="flex justify-end">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
            <p className="text-sm text-destructive">Delete all ICS transactions for this statement?</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowDeleteConfirm(false); }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => { setShowDeleteConfirm(true); }}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete Import
          </Button>
        )}
      </div>

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
