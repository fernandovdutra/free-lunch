import { TransactionRow } from './TransactionRow';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transaction, Category } from '@/types';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
  onCategoryChange: (transactionId: string, categoryId: string | null) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onMarkReimbursable?: ((transaction: Transaction) => void) | undefined;
  onClearReimbursement?: ((transaction: Transaction) => void) | undefined;
}

export function TransactionList({
  transactions,
  categories,
  isLoading,
  onCategoryChange,
  onEdit,
  onDelete,
  onMarkReimbursable,
  onClearReimbursement,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-16" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-center">
        <div>
          <p className="text-lg font-medium">No transactions found</p>
          <p className="text-muted-foreground">
            Add your first transaction or adjust your filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {/* Header row */}
      <div className="hidden sm:flex items-center gap-4 bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
        <div className="w-28 flex-shrink-0">Date</div>
        <div className="min-w-0 flex-1">Description</div>
        <div className="w-36 flex-shrink-0">Category</div>
        <div className="w-6 flex-shrink-0" />
        <div className="w-24 flex-shrink-0 text-right">Amount</div>
        <div className="w-8 flex-shrink-0" />
      </div>

      {/* Transaction rows */}
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onEdit={onEdit}
          onDelete={onDelete}
          onMarkReimbursable={onMarkReimbursable}
          onClearReimbursement={onClearReimbursement}
        />
      ))}
    </div>
  );
}
