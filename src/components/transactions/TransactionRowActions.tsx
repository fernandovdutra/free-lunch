import { Pencil, Trash2, Receipt, Banknote, Wand2 } from 'lucide-react';
import type { Transaction } from '@/types';

interface TransactionRowActionsProps {
  transaction: Transaction;
  isExpense: boolean;
  isIncome: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onMarkReimbursable?: ((transaction: Transaction) => void) | undefined;
  onClearReimbursement?: ((transaction: Transaction) => void) | undefined;
  onAICategorize?: ((transaction: Transaction) => void) | undefined;
  isAICategorizing?: boolean | undefined;
}

export function TransactionRowActions({
  transaction,
  isExpense,
  isIncome,
  onEdit,
  onDelete,
  onMarkReimbursable,
  onClearReimbursement,
  onAICategorize,
  isAICategorizing,
}: TransactionRowActionsProps) {
  return (
    <div className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-md border bg-popover p-1 shadow-md">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={() => { onEdit(transaction); }}
      >
        <Pencil className="h-4 w-4" />
        Edit
      </button>
      {onAICategorize && (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-violet-600 hover:bg-accent dark:text-violet-400"
          onClick={() => { onAICategorize(transaction); }}
          disabled={isAICategorizing}
        >
          <Wand2 className="h-4 w-4" />
          AI Categorize
        </button>
      )}
      {isExpense && !transaction.reimbursement && onMarkReimbursable && (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-secondary hover:bg-accent dark:text-secondary"
          onClick={() => { onMarkReimbursable(transaction); }}
        >
          <Receipt className="h-4 w-4" />
          Mark as Reimbursable
        </button>
      )}
      {isIncome && onClearReimbursement && (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent dark:text-primary"
          onClick={() => { onClearReimbursement(transaction); }}
        >
          <Banknote className="h-4 w-4" />
          Contains Reimbursement
        </button>
      )}
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
        onClick={() => { onDelete(transaction); }}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}
