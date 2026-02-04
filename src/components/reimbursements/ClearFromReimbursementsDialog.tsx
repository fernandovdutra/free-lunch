import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatAmount, formatDate, cn } from '@/lib/utils';
import { useRecentIncomeTransactions } from '@/hooks/useReimbursements';
import type { Transaction } from '@/types';

type Step = 'select-expenses' | 'select-income' | 'confirm';

interface ClearFromReimbursementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingReimbursements: Transaction[];
  onSubmit: (incomeId: string, expenseIds: string[]) => Promise<void>;
  isSubmitting: boolean;
}

export function ClearFromReimbursementsDialog({
  open,
  onOpenChange,
  pendingReimbursements,
  onSubmit,
  isSubmitting,
}: ClearFromReimbursementsDialogProps) {
  const [step, setStep] = useState<Step>('select-expenses');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [incomeSearch, setIncomeSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: incomeTransactions = [], isLoading: isLoadingIncome } =
    useRecentIncomeTransactions(debouncedSearch);

  // Debounce income search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(incomeSearch);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [incomeSearch]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('select-expenses');
      setSelectedExpenseIds(new Set());
      setSelectedIncomeId(null);
      setIncomeSearch('');
      setDebouncedSearch('');
    }
  }, [open]);

  const toggleExpense = (id: string) => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedExpenses = pendingReimbursements.filter((t) => selectedExpenseIds.has(t.id));
  const expenseTotal = selectedExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const selectedIncome = incomeTransactions.find((t) => t.id === selectedIncomeId);

  const handleSubmit = async () => {
    if (!selectedIncomeId || selectedExpenseIds.size === 0) return;
    await onSubmit(selectedIncomeId, Array.from(selectedExpenseIds));
    onOpenChange(false);
  };

  const stepTitle: Record<Step, string> = {
    'select-expenses': 'Select Expenses to Clear',
    'select-income': 'Select Income Transaction',
    confirm: 'Confirm Clearing',
  };

  const stepDescription: Record<Step, string> = {
    'select-expenses': 'Choose which pending reimbursements to clear.',
    'select-income': 'Choose the income transaction to match against.',
    confirm: 'Review and confirm the clearing.',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{stepTitle[step]}</DialogTitle>
          <DialogDescription>{stepDescription[step]}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Expenses */}
        {step === 'select-expenses' && (
          <div className="space-y-4">
            {pendingReimbursements.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No pending reimbursements to clear.
              </p>
            ) : (
              <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-lg border p-1">
                {pendingReimbursements.map((expense) => (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => {
                      toggleExpense(expense.id);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
                      selectedExpenseIds.has(expense.id)
                        ? 'bg-primary/10 ring-1 ring-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border',
                        selectedExpenseIds.has(expense.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {selectedExpenseIds.has(expense.id) && <Check className="h-3 w-3" />}
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

            {selectedExpenseIds.size > 0 && (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">
                  {selectedExpenseIds.size} expense{selectedExpenseIds.size > 1 ? 's' : ''} selected
                </span>
                <span className="font-medium">{formatAmount(-expenseTotal)}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selectedExpenseIds.size === 0}
                onClick={() => {
                  setStep('select-income');
                }}
              >
                Next
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Select Income */}
        {step === 'select-income' && (
          <div className="space-y-4">
            {/* Selected expenses summary */}
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Clearing:</span>
              <span className="ml-2 font-medium">
                {selectedExpenseIds.size} expense{selectedExpenseIds.size > 1 ? 's' : ''} totalling{' '}
                {formatAmount(-expenseTotal)}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search income transactions..."
                value={incomeSearch}
                onChange={(e) => {
                  setIncomeSearch(e.target.value);
                }}
                className="pl-9"
              />
            </div>

            {/* Income list */}
            {isLoadingIncome ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : incomeTransactions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No income transactions found.
              </p>
            ) : (
              <div className="max-h-[250px] space-y-1 overflow-y-auto rounded-lg border p-1">
                {incomeTransactions.map((income) => (
                  <button
                    key={income.id}
                    type="button"
                    onClick={() => {
                      setSelectedIncomeId(income.id);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
                      selectedIncomeId === income.id
                        ? 'bg-primary/10 ring-1 ring-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
                        selectedIncomeId === income.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {selectedIncomeId === income.id && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{income.description}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(income.date)}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium text-emerald-600">
                      {formatAmount(income.amount)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('select-expenses');
                }}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                disabled={!selectedIncomeId}
                onClick={() => {
                  setStep('confirm');
                }}
              >
                Next
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Income summary */}
            {selectedIncome && (
              <div className="rounded-lg border bg-emerald-50 p-3 dark:bg-emerald-950/20">
                <p className="text-sm font-medium text-muted-foreground">Income Transaction</p>
                <p className="font-medium">{selectedIncome.description}</p>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(selectedIncome.date)}</span>
                  <span className="font-medium text-emerald-600">
                    {formatAmount(selectedIncome.amount)}
                  </span>
                </div>
              </div>
            )}

            {/* Expenses summary */}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Expenses to clear ({selectedExpenses.length})
              </p>
              <div className="max-h-[150px] space-y-1 overflow-y-auto rounded-lg border p-1">
                {selectedExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 rounded-md p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{expense.description}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(expense.date)}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium text-red-500">
                      {formatAmount(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals comparison */}
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expenses total:</span>
                <span className="font-medium">{formatAmount(-expenseTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Income:</span>
                <span className="font-medium text-emerald-600">
                  {selectedIncome ? formatAmount(selectedIncome.amount) : '-'}
                </span>
              </div>
              {selectedIncome && (
                <>
                  <hr />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Difference:</span>
                    <span
                      className={cn(
                        'font-medium',
                        selectedIncome.amount - expenseTotal >= 0
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      )}
                    >
                      {formatAmount(selectedIncome.amount - expenseTotal)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('select-income');
                }}
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  void handleSubmit();
                }}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear {selectedExpenseIds.size} Expense{selectedExpenseIds.size > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
