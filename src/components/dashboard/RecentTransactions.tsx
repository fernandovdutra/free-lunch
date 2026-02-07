import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatAmount, formatDate, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import type { Transaction, Category } from '@/types';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  isLoading?: boolean;
  onCategoryChange?: (transactionId: string, categoryId: string | null) => void;
}

export function RecentTransactions({
  transactions,
  categories,
  isLoading,
  onCategoryChange,
}: RecentTransactionsProps) {
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-center">
        <p className="text-muted-foreground">No recent transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((transaction) => {
        const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : null;

        return (
          <div
            key={transaction.id}
            className="flex items-center gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="w-14 flex-shrink-0 text-sm text-muted-foreground">
              {formatDate(transaction.date, 'short')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {typeof transaction.description === 'string'
                  ? transaction.description
                  : 'Bank transaction'}
              </p>
            </div>
            <div className="w-32 flex-shrink-0">
              {onCategoryChange && editingTransactionId === transaction.id ? (
                <CategoryPicker
                  value={transaction.categoryId}
                  onChange={(categoryId) => {
                    onCategoryChange(transaction.id, categoryId);
                    setEditingTransactionId(null);
                  }}
                  categories={categories}
                  className="h-7"
                />
              ) : category ? (
                onCategoryChange ? (
                  <button
                    type="button"
                    onClick={() => { setEditingTransactionId(transaction.id); }}
                    className="block w-full text-left transition-opacity hover:opacity-80"
                  >
                    <CategoryBadge category={category} size="sm" />
                  </button>
                ) : (
                  <CategoryBadge category={category} size="sm" />
                )
              ) : onCategoryChange ? (
                <button
                  type="button"
                  onClick={() => { setEditingTransactionId(transaction.id); }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                >
                  <span>?</span>
                  Uncategorized
                </button>
              ) : null}
            </div>
            <div
              className={cn(
                'w-20 flex-shrink-0 text-right text-sm font-medium tabular-nums',
                transaction.amount > 0 ? 'text-emerald-500' : 'text-red-500'
              )}
            >
              {formatAmount(transaction.amount)}
            </div>
          </div>
        );
      })}

      <Link
        to="/transactions"
        className="flex items-center justify-center gap-2 pt-3 text-sm text-primary hover:underline"
      >
        View all transactions
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
