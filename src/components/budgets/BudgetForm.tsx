import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories, buildCategoryTree, getFlatCategoriesWithLevel } from '@/hooks/useCategories';
import { useBudgetSuggestions } from '@/hooks/useBudgetProgress';
import { formatAmount } from '@/lib/utils';
import type { Budget, BudgetFormData } from '@/types';

const budgetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  monthlyLimit: z.coerce.number().positive('Limit must be greater than 0'),
  alertThreshold: z.coerce.number().min(1, 'Must be 1-100').max(100, 'Must be 1-100'),
});

type FormValues = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  isSubmitting?: boolean;
  existingBudgetCategoryIds?: string[];
}

export function BudgetForm({
  open,
  onOpenChange,
  budget,
  onSubmit,
  isSubmitting = false,
  existingBudgetCategoryIds = [],
}: BudgetFormProps) {
  const isEditing = !!budget;
  const { data: categories = [] } = useCategories();
  const { data: suggestions } = useBudgetSuggestions();

  // Build flat category list with hierarchy indication
  const flatCategories = useMemo(() => {
    const tree = buildCategoryTree(categories);
    return getFlatCategoriesWithLevel(tree);
  }, [categories]);

  // Filter out categories that already have budgets (except current one when editing)
  const availableCategories = useMemo(() => {
    return flatCategories.filter(
      (c) => !existingBudgetCategoryIds.includes(c.id) || c.id === budget?.categoryId
    );
  }, [flatCategories, existingBudgetCategoryIds, budget?.categoryId]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      monthlyLimit: 0,
      alertThreshold: 80,
    },
  });

  const selectedCategoryId = watch('categoryId');
  const suggestedAmount = suggestions?.get(selectedCategoryId);

  useEffect(() => {
    if (open) {
      if (budget) {
        reset({
          name: budget.name,
          categoryId: budget.categoryId,
          monthlyLimit: budget.monthlyLimit,
          alertThreshold: budget.alertThreshold,
        });
      } else {
        reset({
          name: '',
          categoryId: '',
          monthlyLimit: 0,
          alertThreshold: 80,
        });
      }
    }
  }, [open, budget, reset]);

  // Auto-fill name when category changes (only for new budgets)
  useEffect(() => {
    if (!isEditing && selectedCategoryId) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (category) {
        setValue('name', `${category.name} Budget`);
      }
    }
  }, [selectedCategoryId, categories, isEditing, setValue]);

  const handleFormSubmit = async (data: FormValues) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const handleUseSuggestion = () => {
    if (suggestedAmount) {
      setValue('monthlyLimit', Math.ceil(suggestedAmount));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Budget' : 'New Budget'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the budget settings below.'
              : 'Create a new budget to track spending by category.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span style={{ paddingLeft: `${cat.level * 12}px` }}>
                          {cat.icon} {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Budget Name</Label>
            <Input
              id="name"
              placeholder="e.g., Monthly Groceries"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Monthly Limit */}
          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">Monthly Limit (EUR)</Label>
            <div className="flex gap-2">
              <Input
                id="monthlyLimit"
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                className="flex-1"
                {...register('monthlyLimit')}
              />
              {suggestedAmount && suggestedAmount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseSuggestion}
                  title={`Based on your 3-month average: ${formatAmount(suggestedAmount, { showSign: false })}`}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {formatAmount(Math.ceil(suggestedAmount), { showSign: false })}
                </Button>
              )}
            </div>
            {suggestedAmount && suggestedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Your 3-month average:{' '}
                {formatAmount(suggestedAmount, { showSign: false })}/month
              </p>
            )}
            {errors.monthlyLimit && (
              <p className="text-sm text-destructive">{errors.monthlyLimit.message}</p>
            )}
          </div>

          {/* Alert Threshold */}
          <div className="space-y-2">
            <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
            <Input
              id="alertThreshold"
              type="number"
              min="1"
              max="100"
              placeholder="80"
              {...register('alertThreshold')}
            />
            <p className="text-xs text-muted-foreground">
              Progress bar turns yellow when spending reaches this percentage
            </p>
            {errors.alertThreshold && (
              <p className="text-sm text-destructive">{errors.alertThreshold.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
