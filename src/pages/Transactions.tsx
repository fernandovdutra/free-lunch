import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const FILTERS_STORAGE_KEY = 'transactions-filters';
import { Plus, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { ApplyToSimilarDialog } from '@/components/transactions/ApplyToSimilarDialog';
import { MarkReimbursableDialog, ClearReimbursementDialog } from '@/components/reimbursements';
import { useCategories } from '@/hooks/useCategories';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useUpdateTransactionCategory,
  useDeleteTransaction,
  useBulkUpdateCategory,
  useCountMatchingTransactions,
  type TransactionFilters as Filters,
} from '@/hooks/useTransactions';
import {
  usePendingReimbursements,
  useMarkAsReimbursable,
  useClearReimbursement,
} from '@/hooks/useReimbursements';
import { useCreateRule } from '@/hooks/useRules';
import { useMonth } from '@/contexts/MonthContext';
import type { Transaction, TransactionFormData } from '@/types';

export function Transactions() {
  const { dateRange: monthDateRange } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Restore filters from sessionStorage on initial mount if URL has no filters
  useEffect(() => {
    const hasUrlFilters = Array.from(searchParams.keys()).some((key) =>
      ['category', 'search', 'direction', 'categorizationStatus', 'reimbursementStatus'].includes(key)
    );

    if (!hasUrlFilters) {
      try {
        const stored = sessionStorage.getItem(FILTERS_STORAGE_KEY);
        if (stored) {
          const savedFilters = JSON.parse(stored) as Record<string, string>;
          if (Object.keys(savedFilters).length > 0) {
            setSearchParams(savedFilters, { replace: true });
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse filters from URL, falling back to month context for dates
  const filters: Filters = useMemo(() => {
    const categoryId = searchParams.get('category');
    const searchText = searchParams.get('search');
    const direction = searchParams.get('direction') as 'income' | 'expense' | undefined;
    const categorizationStatus = searchParams.get('categorizationStatus') as
      | 'auto'
      | 'manual'
      | 'uncategorized'
      | undefined;
    const reimbursementStatus = searchParams.get('reimbursementStatus') as
      | 'none'
      | 'pending'
      | 'cleared'
      | undefined;

    return {
      startDate: monthDateRange.startDate,
      endDate: monthDateRange.endDate,
      ...(categoryId && { categoryId }),
      ...(searchText && { searchText }),
      ...(direction && { direction }),
      ...(categorizationStatus && { categorizationStatus }),
      ...(reimbursementStatus && { reimbursementStatus }),
    };
  }, [searchParams, monthDateRange]);

  // Update URL and sessionStorage when filters change
  const handleFiltersChange = useCallback(
    (newFilters: Filters) => {
      const params: Record<string, string> = {};
      if (newFilters.categoryId) params.category = newFilters.categoryId;
      if (newFilters.searchText) params.search = newFilters.searchText;
      if (newFilters.direction) params.direction = newFilters.direction;
      if (newFilters.categorizationStatus) params.categorizationStatus = newFilters.categorizationStatus;
      if (newFilters.reimbursementStatus) params.reimbursementStatus = newFilters.reimbursementStatus;

      // Save to sessionStorage for persistence across navigation
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(params));

      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);
  const [markReimbursableTransaction, setMarkReimbursableTransaction] =
    useState<Transaction | null>(null);
  const [clearReimbursementTransaction, setClearReimbursementTransaction] =
    useState<Transaction | null>(null);

  // Rule creation state
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [pendingCategoryChange, setPendingCategoryChange] = useState<{
    transactionId: string;
    newCategoryId: string;
    transaction: Transaction;
  } | null>(null);

  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading, error } = useTransactions(filters);
  const { data: pendingReimbursements } = usePendingReimbursements();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const updateCategoryMutation = useUpdateTransactionCategory();
  const deleteMutation = useDeleteTransaction();
  const markReimbursableMutation = useMarkAsReimbursable();
  const clearReimbursementMutation = useClearReimbursement();
  const createRuleMutation = useCreateRule();
  const bulkUpdateMutation = useBulkUpdateCategory();
  const { data: matchingCount = 0 } = useCountMatchingTransactions(
    pendingCategoryChange?.transaction.counterparty ?? null
  );

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setDeleteTransaction(transaction);
  };

  const handleCategoryChange = async (transactionId: string, categoryId: string | null) => {
    const transaction = transactions.find((t) => t.id === transactionId);
    await updateCategoryMutation.mutateAsync({ id: transactionId, categoryId });

    // Only offer to apply to similar if:
    // 1. A category was selected (not uncategorized)
    // 2. The transaction has a counterparty (so we can match)
    // 3. The transaction was auto-categorized or uncategorized before
    if (
      categoryId &&
      transaction &&
      transaction.counterparty &&
      (transaction.categorySource !== 'manual' || !transaction.categoryId)
    ) {
      setPendingCategoryChange({ transactionId, newCategoryId: categoryId, transaction });
      setRuleDialogOpen(true);
    }
  };

  const handleApplyToSimilar = async (options: {
    applyToSimilar: boolean;
    createRule: boolean;
    pattern: string;
    matchType: 'contains' | 'exact';
  }) => {
    if (!pendingCategoryChange) return;

    try {
      // Apply to similar transactions if requested
      if (options.applyToSimilar && pendingCategoryChange.transaction.counterparty) {
        await bulkUpdateMutation.mutateAsync({
          counterparty: pendingCategoryChange.transaction.counterparty,
          categoryId: pendingCategoryChange.newCategoryId,
          excludeTransactionId: pendingCategoryChange.transactionId,
        });
      }

      // Create rule if requested
      if (options.createRule && options.pattern) {
        await createRuleMutation.mutateAsync({
          pattern: options.pattern,
          matchType: options.matchType,
          categoryId: pendingCategoryChange.newCategoryId,
          isLearned: true,
        });
      }
    } finally {
      setRuleDialogOpen(false);
      setPendingCategoryChange(null);
    }
  };

  const handleFormSubmit = async (data: TransactionFormData) => {
    if (editingTransaction) {
      await updateMutation.mutateAsync({ id: editingTransaction.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingTransaction(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteTransaction) {
      await deleteMutation.mutateAsync(deleteTransaction.id);
      setDeleteTransaction(null);
    }
  };

  const handleNewTransaction = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleMarkReimbursable = (transaction: Transaction) => {
    setMarkReimbursableTransaction(transaction);
  };

  const handleClearReimbursement = (transaction: Transaction) => {
    setClearReimbursementTransaction(transaction);
  };

  const handleMarkReimbursableSubmit = async (data: {
    type: 'work' | 'personal';
    note?: string | undefined;
  }) => {
    if (markReimbursableTransaction) {
      await markReimbursableMutation.mutateAsync({
        id: markReimbursableTransaction.id,
        type: data.type,
        note: data.note,
      });
      setMarkReimbursableTransaction(null);
    }
  };

  const handleClearReimbursementSubmit = async (expenseIds: string[]) => {
    if (clearReimbursementTransaction) {
      await clearReimbursementMutation.mutateAsync({
        incomeTransactionId: clearReimbursementTransaction.id,
        expenseTransactionIds: expenseIds,
      });
      setClearReimbursementTransaction(null);
    }
  };

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load transactions</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">View and manage your transactions</p>
        </div>
        <Button onClick={handleNewTransaction}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <TransactionFilters filters={filters} onChange={handleFiltersChange} categories={categories} />

      {/* Transaction List */}
      <Card>
        <CardContent className="p-0">
          <TransactionList
            transactions={transactions}
            categories={categories}
            isLoading={isLoading}
            onCategoryChange={(id, categoryId) => void handleCategoryChange(id, categoryId)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMarkReimbursable={handleMarkReimbursable}
            onClearReimbursement={handleClearReimbursement}
          />
        </CardContent>
      </Card>

      {/* Transaction summary */}
      {!isLoading && transactions.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </span>
          <span>
            Total:{' '}
            <span
              className={
                transactions.reduce((sum, t) => sum + t.amount, 0) >= 0
                  ? 'text-emerald-500'
                  : 'text-red-500'
              }
            >
              {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(
                transactions.reduce((sum, t) => sum + t.amount, 0)
              )}
            </span>
          </span>
        </div>
      )}

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        categories={categories}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Apply to Similar Dialog */}
      <ApplyToSimilarDialog
        open={ruleDialogOpen}
        onOpenChange={(open) => {
          setRuleDialogOpen(open);
          if (!open) setPendingCategoryChange(null);
        }}
        transaction={pendingCategoryChange?.transaction ?? null}
        newCategoryId={pendingCategoryChange?.newCategoryId ?? ''}
        categories={categories}
        matchingCount={matchingCount - 1} // Subtract 1 because we already updated the original
        onApply={(options) => void handleApplyToSimilar(options)}
        isApplying={bulkUpdateMutation.isPending || createRuleMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTransaction}
        onOpenChange={(open) => {
          if (!open) setDeleteTransaction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTransaction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Reimbursable Dialog */}
      <MarkReimbursableDialog
        open={!!markReimbursableTransaction}
        onOpenChange={(open) => {
          if (!open) setMarkReimbursableTransaction(null);
        }}
        transaction={markReimbursableTransaction}
        onSubmit={handleMarkReimbursableSubmit}
        isSubmitting={markReimbursableMutation.isPending}
      />

      {/* Clear Reimbursement Dialog */}
      <ClearReimbursementDialog
        open={!!clearReimbursementTransaction}
        onOpenChange={(open) => {
          if (!open) setClearReimbursementTransaction(null);
        }}
        incomeTransaction={clearReimbursementTransaction}
        pendingReimbursements={pendingReimbursements}
        onSubmit={handleClearReimbursementSubmit}
        isSubmitting={clearReimbursementMutation.isPending}
      />

    </div>
  );
}
