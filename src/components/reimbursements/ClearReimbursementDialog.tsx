import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatAmount, formatDate, cn } from '@/lib/utils';
import type { Transaction } from '@/types';

interface ClearReimbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeTransaction: Transaction | null;
  pendingReimbursements: Transaction[];
  onSubmit: (expenseIds: string[]) => Promise<void>;
  isSubmitting: boolean;
}

export function ClearReimbursementDialog({
  open,
  onOpenChange,
  incomeTransaction,
  pendingReimbursements,
  onSubmit,
  isSubmitting,
}: ClearReimbursementDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedTotal = pendingReimbursements
    .filter((t) => selectedIds.has(t.id))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    await onSubmit(Array.from(selectedIds));
    onOpenChange(false);
  };

  if (!incomeTransaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Clear Reimbursements</DialogTitle>
          <DialogDescription>
            Match this incoming payment to pending reimbursable expenses.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          {/* Income transaction details */}
          <div className="rounded-lg border bg-emerald-50 p-3 dark:bg-emerald-950/20">
            <p className="text-sm font-medium text-muted-foreground">Incoming Payment</p>
            <p className="font-medium">{incomeTransaction.description}</p>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{formatDate(incomeTransaction.date)}</span>
              <span className="font-medium text-emerald-600">
                {formatAmount(incomeTransaction.amount)}
              </span>
            </div>
          </div>

          {/* Pending reimbursements list */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Select expenses to clear</p>
            {pendingReimbursements.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No pending reimbursements to clear
              </p>
            ) : (
              <div className="max-h-[250px] space-y-1 overflow-y-auto rounded-lg border p-1">
                {pendingReimbursements.map((expense) => (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => {
                      toggleSelection(expense.id);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
                      selectedIds.has(expense.id)
                        ? 'bg-primary/10 ring-1 ring-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border',
                        selectedIds.has(expense.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {selectedIds.has(expense.id) && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{expense.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(expense.date)}</span>
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {expense.reimbursement?.type === 'work' ? 'Work' : 'Personal'}
                        </span>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium text-red-500">
                      {formatAmount(expense.amount)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary comparison */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Selected total:</span>
                <span className="ml-2 font-medium">{formatAmount(-selectedTotal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Income:</span>
                <span className="ml-2 font-medium text-emerald-600">
                  {formatAmount(incomeTransaction.amount)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedIds.size === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clear{' '}
              {selectedIds.size > 0
                ? `${selectedIds.size} Expense${selectedIds.size > 1 ? 's' : ''}`
                : 'Selected'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
