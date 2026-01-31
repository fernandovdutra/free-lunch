import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import { CategoryPicker } from './CategoryPicker';
import type { Transaction, TransactionFormData, Category } from '@/types';

const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  amount: z.coerce.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  categoryId: z.string().nullable(),
});

type FormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  categories,
  onSubmit,
  isSubmitting = false,
}: TransactionFormProps) {
  const isEditing = !!transaction;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      amount: 0,
      categoryId: null,
    },
  });

  // Reset form when dialog opens/closes or transaction changes
  useEffect(() => {
    if (open) {
      if (transaction) {
        reset({
          date: format(transaction.date, 'yyyy-MM-dd'),
          description: transaction.description,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
        });
      } else {
        reset({
          date: format(new Date(), 'yyyy-MM-dd'),
          description: '',
          amount: 0,
          categoryId: null,
        });
      }
    }
  }, [open, transaction, reset]);

  const handleFormSubmit = async (data: FormValues) => {
    const formData: TransactionFormData = {
      date: new Date(data.date),
      description: data.description,
      amount: data.amount,
      categoryId: data.categoryId,
    };
    await onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the transaction details below.'
              : 'Add a new transaction manually.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)} className="space-y-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register('date')} />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Grocery shopping"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (EUR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Use negative values for expenses (e.g., -50.00)
            </p>
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category (optional)</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <CategoryPicker
                  value={field.value}
                  onChange={field.onChange}
                  categories={categories}
                />
              )}
            />
          </div>

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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
