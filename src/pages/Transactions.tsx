import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
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
import { useCategories } from '@/hooks/useCategories';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useUpdateTransactionCategory,
  useDeleteTransaction,
  type TransactionFilters as Filters,
} from '@/hooks/useTransactions';
import type { Transaction, TransactionFormData } from '@/types';

export function Transactions() {
  const now = new Date();
  const [filters, setFilters] = useState<Filters>({
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);

  const { data: categories = [] } = useCategories();
  const { data: transactions = [], isLoading, error } = useTransactions(filters);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const updateCategoryMutation = useUpdateTransactionCategory();
  const deleteMutation = useDeleteTransaction();

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setDeleteTransaction(transaction);
  };

  const handleCategoryChange = (transactionId: string, categoryId: string | null) => {
    updateCategoryMutation.mutate({ id: transactionId, categoryId });
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
      <TransactionFilters filters={filters} onChange={setFilters} categories={categories} />

      {/* Transaction List */}
      <Card>
        <CardContent className="p-0">
          <TransactionList
            transactions={transactions}
            categories={categories}
            isLoading={isLoading}
            onCategoryChange={handleCategoryChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
    </div>
  );
}
