import { useState } from 'react';
import { Plus, AlertTriangle, Trash2, Pencil, Calendar } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFixedSchedule,
  useAddFixedCost,
  useUpdateFixedCost,
  useDeleteFixedCost,
} from '@/hooks/useFixedSchedule';
import { formatAmount } from '@/lib/utils';
import type { FixedCost } from '@/lib/burnUp.types';

interface EditingState {
  index: number;
  item: FixedCost;
}

export function FixedCosts() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [deleting, setDeleting] = useState<EditingState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: items, isLoading, error } = useFixedSchedule();
  const addMutation = useAddFixedCost();
  const updateMutation = useUpdateFixedCost();
  const deleteMutation = useDeleteFixedCost();

  const list = items ?? [];
  const total = list.reduce((sum, i) => sum + i.a, 0);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const label = (formData.get('label') as string).trim();
    const day = parseInt(formData.get('day') as string, 10);
    const amount = parseFloat(formData.get('amount') as string);

    if (!label) {
      setFormError('Label is required');
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setFormError('Day must be a whole number between 1 and 31');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }

    const item: FixedCost = { d: day, a: amount, l: label };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ index: editing.index, item });
      } else {
        await addMutation.mutateAsync(item);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    await deleteMutation.mutateAsync(deleting.index);
    setDeleting(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (index: number, item: FixedCost) => {
    setEditing({ index, item });
    setFormError(null);
    setFormOpen(true);
  };

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load fixed costs</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fixed costs</h1>
          <p className="text-muted-foreground">
            Recurring monthly bills used by the burn-up chart on Home.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add fixed cost
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{list.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(total, { showSign: false })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No fixed costs yet. Add your rent, utilities, and subscriptions to improve the home
              burn-up chart.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((item, index) => (
                <li
                  key={`${index}-${item.l}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-mono uppercase tracking-wide text-muted-foreground">
                      Day {item.d}
                    </span>
                    <span className="truncate font-medium">{item.l}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium">
                      {formatAmount(item.a, { showSign: false })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${item.l}`}
                      onClick={() => {
                        openEdit(index, item);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${item.l}`}
                      onClick={() => {
                        setDeleting({ index, item });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit fixed cost' : 'Add fixed cost'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update an existing recurring bill.'
                : 'Add a recurring monthly bill (rent, utilities, subscriptions).'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                name="label"
                defaultValue={editing?.item.l ?? ''}
                placeholder="Rent, Internet, Spotify…"
                maxLength={40}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day">Day of month</Label>
                <Input
                  id="day"
                  name="day"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  step={1}
                  defaultValue={editing?.item.d ?? ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (€)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  defaultValue={editing?.item.a ?? ''}
                  required
                />
              </div>
            </div>
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Save changes' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete fixed cost</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleting?.item.l}&quot;? This will affect the burn-up chart on Home.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleting(null);
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
