import { MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAmount, formatDate, cn } from '@/lib/utils';
import type { Transaction } from '@/types';

interface PendingReimbursementListProps {
  transactions: Transaction[];
  onUnmark?: (transaction: Transaction) => void;
  isLoading?: boolean;
}

export function PendingReimbursementList({
  transactions,
  onUnmark,
  isLoading,
}: PendingReimbursementListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        <p className="text-center">
          No pending reimbursements.
          <br />
          <span className="text-sm">Mark expenses as reimbursable from the Transactions page.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="group flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20"
        >
          {/* Type badge */}
          <div
            className={cn(
              'flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium',
              transaction.reimbursement?.type === 'work'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            )}
          >
            {transaction.reimbursement?.type === 'work' ? 'Work' : 'Personal'}
          </div>

          {/* Transaction details */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{transaction.description}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDate(transaction.date)}</span>
              {transaction.reimbursement?.note && (
                <>
                  <span>·</span>
                  <span className="truncate italic">{transaction.reimbursement.note}</span>
                </>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="flex-shrink-0 text-right">
            <span className="font-medium text-amber-600 dark:text-amber-500">
              {formatAmount(Math.abs(transaction.amount), { showSign: false })}
            </span>
          </div>

          {/* Actions */}
          {onUnmark && (
            <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling as HTMLElement;
                    menu.classList.toggle('hidden');
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
                <div className="absolute right-0 top-full z-10 mt-1 hidden min-w-[140px] rounded-md border bg-popover p-1 shadow-md">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      onUnmark(transaction);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Unmark
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
