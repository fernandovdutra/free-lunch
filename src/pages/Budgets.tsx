import { useState } from 'react';
import { Plus, AlertTriangle, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetList, BudgetForm } from '@/components/budgets';
import {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '@/hooks/useBudgets';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { formatAmount } from '@/lib/utils';
import type { Budget, BudgetFormData } from '@/types';

export function Budgets() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);

  const { data: budgets, isLoading: budgetsLoading, error } = useBudgets();
  const { data: budgetProgress, isLoading: progressLoading } = useBudgetProgress();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const isLoading = budgetsLoading || progressLoading;

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormOpen(true);
  };

  const handleDelete = (budget: Budget) => {
    setDeleteBudget(budget);
  };

  const handleFormSubmit = async (data: BudgetFormData) => {
    if (editingBudget) {
      await updateMutation.mutateAsync({ id: editingBudget.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingBudget(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteBudget) {
      await deleteMutation.mutateAsync(deleteBudget.id);
      setDeleteBudget(null);
    }
  };

  const handleNewBudget = () => {
    setEditingBudget(null);
    setFormOpen(true);
  };

  // Calculate summary stats
  const budgetsList = budgets ?? [];
  const budgetProgressList = budgetProgress;
  const totalBudgeted = budgetsList.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = budgetProgressList.reduce((sum, p) => sum + p.spent, 0);
  const exceededCount = budgetProgressList.filter((p) => p.status === 'exceeded').length;
  const warningCount = budgetProgressList.filter((p) => p.status === 'warning').length;

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load budgets</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set and monitor spending limits by category</p>
        </div>
        <Button onClick={handleNewBudget}>
          <Plus className="mr-2 h-4 w-4" />
          New Budget
        </Button>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(totalBudgeted, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">{budgetsList.length} budget(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(totalSpent, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalBudgeted > 0
                  ? `${((totalSpent / totalBudgeted) * 100).toFixed(0)}% of budget`
                  : 'No budgets set'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Track</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-emerald-500">
                {budgetProgressList.filter((p) => p.status === 'safe').length}
              </div>
              <p className="text-xs text-muted-foreground">budgets within limit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              {(exceededCount > 0 || warningCount > 0) && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                <span className="text-red-500">{exceededCount}</span>
                {warningCount > 0 && (
                  <>
                    {' / '}
                    <span className="text-amber-500">{warningCount}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">exceeded / warning</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget list */}
      <Card>
        <CardHeader>
          <CardTitle>Your Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <BudgetList
              budgetProgress={budgetProgressList}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Budget Form Dialog */}
      <BudgetForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingBudget(null);
        }}
        budget={editingBudget}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        existingBudgetCategoryIds={budgetsList.map((b) => b.categoryId)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteBudget}
        onOpenChange={(open) => {
          if (!open) setDeleteBudget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteBudget?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteBudget(null); }}>
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
