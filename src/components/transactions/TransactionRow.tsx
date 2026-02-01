import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Split,
  Receipt,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import { CategoryPicker } from './CategoryPicker';
import { cn, formatAmount, formatDate, getAmountColor } from '@/lib/utils';
import type { Transaction, Category } from '@/types';
import { useState } from 'react';

interface TransactionRowProps {
  transaction: Transaction;
  categories: Category[];
  onCategoryChange: (transactionId: string, categoryId: string | null) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onMarkReimbursable?: ((transaction: Transaction) => void) | undefined;
  onClearReimbursement?: ((transaction: Transaction) => void) | undefined;
}

export function TransactionRow({
  transaction,
  categories,
  onCategoryChange,
  onEdit,
  onDelete,
  onMarkReimbursable,
  onClearReimbursement,
}: TransactionRowProps) {
  const [isPickingCategory, setIsPickingCategory] = useState(false);

  const category = categories.find((c) => c.id === transaction.categoryId);
  const isExpense = transaction.amount < 0;
  const isIncome = transaction.amount > 0;
  const isPendingReimbursement = transaction.reimbursement?.status === 'pending';
  const isClearedReimbursement = transaction.reimbursement?.status === 'cleared';

  const handleCategoryClick = () => {
    setIsPickingCategory(true);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    onCategoryChange(transaction.id, categoryId);
    setIsPickingCategory(false);
  };

  // Determine if we should show booking date separately
  const showBookingDate =
    transaction.bookingDate &&
    transaction.transactionDate &&
    transaction.bookingDate.toDateString() !== transaction.transactionDate.toDateString();

  return (
    <div className="group flex items-center gap-4 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50">
      {/* Date */}
      <div className="w-28 flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          {transaction.transactionDate
            ? formatDate(transaction.transactionDate, 'withTime')
            : formatDate(transaction.date)}
        </div>
        {showBookingDate && (
          <div className="text-xs text-muted-foreground/60">
            Booked: {formatDate(transaction.bookingDate!, 'short')}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">
            {typeof transaction.description === 'string'
              ? transaction.description
              : 'Bank transaction'}
          </p>
          {/* Reimbursement badge */}
          {isPendingReimbursement && (
            <span
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              title={`Pending ${transaction.reimbursement?.type === 'work' ? 'work' : 'personal'} reimbursement`}
            >
              <Receipt className="h-3 w-3" />
              {transaction.reimbursement?.type === 'work' ? 'Work' : 'IOU'}
            </span>
          )}
          {isClearedReimbursement && (
            <span
              className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              title="Reimbursement cleared"
            >
              <Receipt className="h-3 w-3" />
              Cleared
            </span>
          )}
        </div>
      </div>

      {/* Counterparty */}
      <div className="w-32 flex-shrink-0 truncate text-sm text-muted-foreground">
        {transaction.counterparty || '—'}
      </div>

      {/* Category */}
      <div className="w-36 flex-shrink-0">
        {isPickingCategory ? (
          <CategoryPicker
            value={transaction.categoryId}
            onChange={handleCategoryChange}
            categories={categories}
            className="h-8"
          />
        ) : category ? (
          <button
            type="button"
            onClick={handleCategoryClick}
            className="block w-full text-left transition-opacity hover:opacity-80"
          >
            <CategoryBadge category={category} size="sm" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCategoryClick}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
          >
            <span>?</span>
            Uncategorized
          </button>
        )}
      </div>

      {/* Split indicator */}
      <div className="w-6 flex-shrink-0">
        {transaction.isSplit && (
          <span title="Split transaction">
            <Split className="h-4 w-4 text-muted-foreground" />
          </span>
        )}
      </div>

      {/* Amount */}
      <div
        className={cn(
          'flex w-24 flex-shrink-0 items-center justify-end gap-1 font-medium tabular-nums',
          isPendingReimbursement
            ? getAmountColor(transaction.amount, true)
            : getAmountColor(transaction.amount)
        )}
      >
        {isIncome ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : isExpense ? (
          <ArrowDownRight className="h-3 w-3" />
        ) : null}
        {formatAmount(transaction.amount)}
      </div>

      {/* Actions - visible on hover */}
      <div className="w-8 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
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
          <div className="absolute right-0 top-full z-10 mt-1 hidden min-w-[180px] rounded-md border bg-popover p-1 shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => {
                onEdit(transaction);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            {/* Reimbursement actions */}
            {isExpense && !transaction.reimbursement && onMarkReimbursable && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-amber-600 hover:bg-accent dark:text-amber-500"
                onClick={() => {
                  onMarkReimbursable(transaction);
                }}
              >
                <Receipt className="h-4 w-4" />
                Mark as Reimbursable
              </button>
            )}

            {isIncome && onClearReimbursement && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-emerald-600 hover:bg-accent dark:text-emerald-500"
                onClick={() => {
                  onClearReimbursement(transaction);
                }}
              >
                <Banknote className="h-4 w-4" />
                Contains Reimbursement
              </button>
            )}

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
              onClick={() => {
                onDelete(transaction);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
