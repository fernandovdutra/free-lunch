import {
  MoreHorizontal,
  Split,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import { CategoryPicker } from './CategoryPicker';
import { TransactionRowActions } from './TransactionRowActions';
import { cn, formatAmount, formatDate, getAmountColor } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMediaQuery';
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
  onAICategorize?: ((transaction: Transaction) => void) | undefined;
  isAICategorizing?: boolean | undefined;
}

export function TransactionRow({
  transaction,
  categories,
  onCategoryChange,
  onEdit,
  onDelete,
  onMarkReimbursable,
  onClearReimbursement,
  onAICategorize,
  isAICategorizing,
}: TransactionRowProps) {
  const [isPickingCategory, setIsPickingCategory] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const category = categories.find((c) => c.id === transaction.categoryId);
  const isExpense = transaction.amount < 0;
  const isIncome = transaction.amount > 0;
  const isPendingReimbursement = transaction.reimbursement?.status === 'pending';
  const isClearedReimbursement = transaction.reimbursement?.status === 'cleared';
  const isIcsImport = transaction.source === 'ics_import';
  const isExcluded = transaction.excludeFromTotals === true;
  const isIcsLumpSum = (isExcluded || transaction.categoryId === 'transfer-cc') && !!transaction.icsStatementId;

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

  const description = typeof transaction.description === 'string'
    ? transaction.description
    : 'Bank transaction';

  const amountColorClass = isPendingReimbursement
    ? getAmountColor(transaction.amount, true)
    : getAmountColor(transaction.amount);

  const categoryElement = isPickingCategory ? (
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
      className="block text-left transition-opacity hover:opacity-80"
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
  );

  const badges = (
    <>
      {isPendingReimbursement && (
        <span
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary dark:bg-secondary/20"
          title={`Pending ${transaction.reimbursement?.type === 'work' ? 'work' : 'personal'} reimbursement`}
        >
          <Receipt className="h-3 w-3" />
          {transaction.reimbursement?.type === 'work' ? 'Work' : 'IOU'}
        </span>
      )}
      {isClearedReimbursement && (
        <span
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20"
          title="Reimbursement cleared"
        >
          <Receipt className="h-3 w-3" />
          Cleared
        </span>
      )}
      {isIcsImport && (
        <span
          className="inline-flex flex-shrink-0 items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          title="Imported from ICS credit card statement"
        >
          ICS
        </span>
      )}
      {isIcsLumpSum && (
        <button
          type="button"
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
          title="View ICS credit card breakdown"
          onClick={(e) => {
            e.stopPropagation();
            void navigate(`/ics/${transaction.icsStatementId}`);
          }}
        >
          ICS Breakdown
        </button>
      )}
      {isExcluded && !isIcsLumpSum && (
        <span
          className="inline-flex flex-shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          title="Excluded from totals"
        >
          Excluded
        </span>
      )}
      {transaction.isSplit && (
        <span
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
          title="Split transaction"
        >
          <Split className="h-3 w-3" />
        </span>
      )}
    </>
  );

  const actionsMenu = (
    <TransactionRowActions
      transaction={transaction}
      isExpense={isExpense}
      isIncome={isIncome}
      onEdit={onEdit}
      onDelete={onDelete}
      onMarkReimbursable={onMarkReimbursable}
      onClearReimbursement={onClearReimbursement}
      onAICategorize={onAICategorize}
      isAICategorizing={isAICategorizing}
    />
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          'border-b border-border px-3 py-3',
          isExcluded && 'opacity-50'
        )}
        title={isExcluded ? 'Excluded from totals: individual ICS transactions imported' : undefined}
      >
        {/* Row 1: Description + Amount */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{description}</p>
            {transaction.counterparty && (
              <Link
                to={`/counterparty/${encodeURIComponent(transaction.counterparty)}`}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                onClick={(e) => { e.stopPropagation(); }}
              >
                {transaction.counterparty}
              </Link>
            )}
          </div>
          <div className={cn('flex flex-shrink-0 items-center gap-1 text-sm font-medium tabular-nums', amountColorClass)}>
            {isIncome ? <ArrowUpRight className="h-3 w-3" /> : isExpense ? <ArrowDownRight className="h-3 w-3" /> : null}
            {formatAmount(transaction.amount)}
          </div>
        </div>

        {/* Row 2: Date + Category + Badges + Actions */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex-shrink-0 text-xs text-muted-foreground">
            {formatDate(transaction.date, 'short')}
          </span>
          {categoryElement}
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {badges}
          </div>
          <div className="relative flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { setShowMobileMenu(!showMobileMenu); }}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
            {showMobileMenu && actionsMenu}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-4 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50',
        isExcluded && 'opacity-50'
      )}
      title={isExcluded ? 'Excluded from totals: individual ICS transactions imported' : undefined}
    >
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
          <p className="truncate font-medium">{description}</p>
          {badges}
        </div>
        {transaction.counterparty && (
          <Link
            to={`/counterparty/${encodeURIComponent(transaction.counterparty)}`}
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
            onClick={(e) => { e.stopPropagation(); }}
          >
            {transaction.counterparty}
          </Link>
        )}
      </div>

      {/* Category */}
      <div className="w-36 flex-shrink-0">
        {categoryElement}
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
      <div className={cn('flex w-24 flex-shrink-0 items-center justify-end gap-1 font-medium tabular-nums', amountColorClass)}>
        {isIncome ? <ArrowUpRight className="h-3 w-3" /> : isExpense ? <ArrowDownRight className="h-3 w-3" /> : null}
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
          <div className="hidden">
            {actionsMenu}
          </div>
        </div>
      </div>
    </div>
  );
}
