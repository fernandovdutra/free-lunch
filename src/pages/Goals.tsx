import { useState } from 'react';
import { Plus, AlertTriangle, Target, CheckCircle2, Pause, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { formatAmount } from '@/lib/utils';
import type { Goal, GoalFormData } from '@/types';

const goalTypeLabels: Record<Goal['type'], string> = {
  savings: 'Savings',
  debt_payoff: 'Debt Payoff',
  spending_limit: 'Spending Limit',
  investment: 'Investment',
};

const goalTypeIcons: Record<Goal['type'], string> = {
  savings: '💰',
  debt_payoff: '💳',
  spending_limit: '🔒',
  investment: '📈',
};

export function Goals() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);

  const { data: goals, isLoading, error } = useGoals();
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();

  const goalsList = goals ?? [];
  const activeGoals = goalsList.filter((g) => g.status === 'active');
  const completedGoals = goalsList.filter((g) => g.status === 'completed');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: GoalFormData = {
      name: formData.get('name') as string,
      type: formData.get('type') as Goal['type'],
      targetAmount: parseFloat(formData.get('targetAmount') as string),
      currentAmount: parseFloat(formData.get('currentAmount') as string) || 0,
      startDate: new Date(formData.get('startDate') as string),
      targetDate: formData.get('targetDate')
        ? new Date(formData.get('targetDate') as string)
        : null,
      linkedCategoryIds: null,
      notes: (formData.get('notes') as string) || null,
    };

    if (editingGoal) {
      await updateMutation.mutateAsync({ id: editingGoal.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setFormOpen(false);
    setEditingGoal(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteGoal) {
      await deleteMutation.mutateAsync(deleteGoal.id);
      setDeleteGoal(null);
    }
  };

  const handleToggleStatus = async (goal: Goal, status: Goal['status']) => {
    await updateMutation.mutateAsync({ id: goal.id, data: { status } });
  };

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load goals</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">Track your financial goals and milestones</p>
        </div>
        <Button onClick={() => { setEditingGoal(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{activeGoals.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(activeGoals.reduce((s, g) => s + g.targetAmount, 0), { showSign: false })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-emerald-500">{completedGoals.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Active Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : activeGoals.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No active goals. Create one to start tracking!
            </div>
          ) : (
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const pct = goal.targetAmount > 0
                  ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                  : 0;
                return (
                  <div key={goal.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{goalTypeIcons[goal.type]}</span>
                        <div>
                          <h3 className="font-semibold">{goal.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {goalTypeLabels[goal.type]}
                            {goal.targetDate && ` · Due ${format(goal.targetDate, 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingGoal(goal); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleToggleStatus(goal, 'completed')}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleToggleStatus(goal, 'paused')}>
                          <Pause className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteGoal(goal); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{formatAmount(goal.currentAmount, { showSign: false })}</span>
                        <span className="text-muted-foreground">{formatAmount(goal.targetAmount, { showSign: false })}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</p>
                    </div>
                    {goal.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{goal.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between rounded-lg border p-3 opacity-70">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <h3 className="font-medium">{goal.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatAmount(goal.targetAmount, { showSign: false })} · {goalTypeLabels[goal.type]}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleToggleStatus(goal, 'active')}
                  >
                    Reopen
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingGoal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Goal'}</DialogTitle>
            <DialogDescription>
              {editingGoal ? 'Update your goal details.' : 'Set a financial goal to track your progress.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={editingGoal?.name ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={editingGoal?.type ?? 'savings'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="debt_payoff">Debt Payoff</SelectItem>
                  <SelectItem value="spending_limit">Spending Limit</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Target Amount</Label>
                <Input id="targetAmount" name="targetAmount" type="number" step="0.01" defaultValue={editingGoal?.targetAmount ?? ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentAmount">Current Amount</Label>
                <Input id="currentAmount" name="currentAmount" type="number" step="0.01" defaultValue={editingGoal?.currentAmount ?? 0} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={editingGoal ? format(editingGoal.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date (optional)</Label>
                <Input id="targetDate" name="targetDate" type="date" defaultValue={editingGoal?.targetDate ? format(editingGoal.targetDate, 'yyyy-MM-dd') : ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" name="notes" defaultValue={editingGoal?.notes ?? ''} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingGoal ? 'Save Changes' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteGoal} onOpenChange={(open) => { if (!open) setDeleteGoal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteGoal?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteGoal(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleConfirmDelete()} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
