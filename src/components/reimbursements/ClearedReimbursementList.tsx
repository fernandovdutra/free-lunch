import { Check } from 'lucide-react';
import { formatAmount, formatDate, cn } from '@/lib/utils';
import type { Transaction } from '@/types';

interface ClearedReimbursementListProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export function ClearedReimbursementList({
  transactions,
  isLoading,
}: ClearedReimbursementListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-muted-foreground">
        <p className="text-center text-sm">No cleared reimbursements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
        >
          {/* Cleared indicator */}
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Transaction details */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-muted-foreground line-through">
              {transaction.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(transaction.date)}</span>
              {transaction.reimbursement?.clearedAt && (
                <>
                  <span>·</span>
                  <span>Cleared {formatDate(transaction.reimbursement.clearedAt, 'relative')}</span>
                </>
              )}
            </div>
          </div>

          {/* Type badge */}
          <div
            className={cn(
              'flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium opacity-60',
              transaction.reimbursement?.type === 'work'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            )}
          >
            {transaction.reimbursement?.type === 'work' ? 'Work' : 'Personal'}
          </div>

          {/* Amount */}
          <div className="flex-shrink-0 text-right">
            <span className="font-medium text-muted-foreground line-through">
              {formatAmount(Math.abs(transaction.amount), { showSign: false })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
