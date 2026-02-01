import { Briefcase, Users, Clock, CheckCircle } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import type { ReimbursementSummaryData } from '@/hooks/useReimbursements';

interface ReimbursementSummaryProps {
  data: ReimbursementSummaryData;
  isLoading?: boolean;
}

export function ReimbursementSummary({ data, isLoading }: ReimbursementSummaryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending total */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pending Total</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-500">
            {formatAmount(data.pendingTotal, { showSign: false })}
          </p>
        </div>
      </div>

      {/* Breakdown by type */}
      <div className="space-y-2 pl-[52px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-blue-500" />
            <span>Work Expenses</span>
          </div>
          <span className="font-medium">
            {formatAmount(data.pendingWorkTotal, { showSign: false })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Personal IOUs</span>
          </div>
          <span className="font-medium">
            {formatAmount(data.pendingPersonalTotal, { showSign: false })}
          </span>
        </div>
      </div>

      {/* Pending count */}
      <div className="flex items-center gap-3 border-t pt-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <span className="text-lg font-bold">{data.pendingCount}</span>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Pending Expense{data.pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Cleared count */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Recently Cleared</p>
          <p className="font-medium">
            {data.clearedCount} expense{data.clearedCount !== 1 ? 's' : ''} (
            {formatAmount(data.clearedTotal, { showSign: false })})
          </p>
        </div>
      </div>
    </div>
  );
}
