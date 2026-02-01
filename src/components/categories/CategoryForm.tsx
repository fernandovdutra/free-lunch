import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import type { Category, CategoryFormData } from '@/types';
import { CHART_COLORS } from '@/lib/colors';

const DEFAULT_COLOR = CHART_COLORS[0] ?? '#2D5A4A';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  parentId: z.string().nullable(),
});

type FormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  parentCategories: Category[];
  onSubmit: (data: CategoryFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const EMOJI_OPTIONS = [
  '💰',
  '💵',
  '🎁',
  '💸',
  '🏠',
  '🏡',
  '⚡',
  '🛡️',
  '🚗',
  '⛽',
  '🚇',
  '🔧',
  '🍽️',
  '🛒',
  '🍴',
  '☕',
  '🛍️',
  '👕',
  '🖥️',
  '📦',
  '🎬',
  '🎥',
  '🎮',
  '📚',
  '❤️',
  '💊',
  '🏥',
  '🏋️',
  '👤',
  '💇',
  '🎓',
  '📋',
  '❓',
  '✨',
  '🎉',
  '🌟',
  '💎',
  '🔥',
  '💡',
  '🎯',
];

export function CategoryForm({
  open,
  onOpenChange,
  category,
  parentCategories,
  onSubmit,
  isSubmitting = false,
}: CategoryFormProps) {
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      icon: '📋',
      color: DEFAULT_COLOR,
      parentId: null,
    },
  });

  const selectedIcon = watch('icon');
  const selectedColor = watch('color');

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        reset({
          name: category.name,
          icon: category.icon,
          color: category.color,
          parentId: category.parentId,
        });
      } else {
        reset({
          name: '',
          icon: '📋',
          color: DEFAULT_COLOR,
          parentId: null,
        });
      }
    }
  }, [open, category, reset]);

  const handleFormSubmit = async (data: FormValues) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  // Filter parent categories - can't select self or children as parent
  const availableParents = parentCategories.filter((cat) => {
    // Only allow top-level categories as parents
    if (cat.parentId !== null) return false;
    // Can't be own parent when editing
    if (category && cat.id === category.id) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the category details below.'
              : 'Create a new category to organize your transactions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Category name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg transition-colors ${
                    selectedIcon === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:bg-muted'
                  }`}
                  onClick={() => {
                    setValue('icon', emoji);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {errors.icon && <p className="text-sm text-destructive">{errors.icon.message}</p>}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CHART_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    selectedColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setValue('color', color);
                  }}
                />
              ))}
            </div>
            {errors.color && <p className="text-sm text-destructive">{errors.color.message}</p>}
          </div>

          {/* Parent Category */}
          <div className="space-y-2">
            <Label htmlFor="parentId">Parent Category (optional)</Label>
            <Select
              value={watch('parentId') ?? 'none'}
              onValueChange={(value) => {
                setValue('parentId', value === 'none' ? null : value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top level)</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
