import { MoreHorizontal, Pencil, Trash2, Split } from 'lucide-react';
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
}

export function TransactionRow({
  transaction,
  categories,
  onCategoryChange,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const [isPickingCategory, setIsPickingCategory] = useState(false);

  const category = categories.find((c) => c.id === transaction.categoryId);

  const handleCategoryClick = () => {
    setIsPickingCategory(true);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    onCategoryChange(transaction.id, categoryId);
    setIsPickingCategory(false);
  };

  return (
    <div className="group flex items-center gap-4 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50">
      {/* Date */}
      <div className="w-20 flex-shrink-0 text-sm text-muted-foreground">
        {formatDate(transaction.date)}
      </div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {typeof transaction.description === 'string'
            ? transaction.description
            : 'Bank transaction'}
        </p>
        {transaction.counterparty && typeof transaction.counterparty === 'string' && (
          <p className="truncate text-sm text-muted-foreground">{transaction.counterparty}</p>
        )}
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
            <span>❓</span>
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
          'w-24 flex-shrink-0 text-right font-medium tabular-nums',
          getAmountColor(transaction.amount)
        )}
      >
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
          <div className="absolute right-0 top-full z-10 mt-1 hidden min-w-[120px] rounded-md border bg-popover p-1 shadow-md">
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
