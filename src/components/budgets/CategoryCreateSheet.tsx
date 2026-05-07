/**
 * Bottom sheet for creating a new category (top-level or subcategory) plus
 * an optional initial monthly budget. Lives inside the Budgets edit flow.
 *
 * Storage: icon is persisted as `phosphor:${name}` so <CategoryIcon> resolves
 * via the curated Phosphor catalog. Color is auto-assigned from CHART_COLORS
 * (subcategories inherit their parent's color).
 */
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetBody } from '@/components/ui/sheet';
import { CategoryIconPicker, PhosphorButton } from '@/components/redesign';
import { CategoryIcon } from '@/lib/categoryIcons';
import { CHART_COLORS } from '@/lib/colors';
import { useCreateCategory } from '@/hooks/useCategories';
import { useCreateBudget } from '@/hooks/useBudgets';
import { formatAmount } from '@/lib/utils';
import type { Category } from '@/types';

const DEFAULT_ICON = 'Tag';
const STEP_VALUE = 50;

interface CategoryCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the new category is created as a subcategory of this id. */
  parent?: Category | null;
  /** All categories — used to pick a non-conflicting auto color. */
  existingCategories: Category[];
}

export function CategoryCreateSheet({
  open,
  onOpenChange,
  parent,
  existingCategories,
}: CategoryCreateSheetProps) {
  const createCategoryMut = useCreateCategory();
  const createBudgetMut = useCreateBudget();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [budget, setBudget] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setIcon(DEFAULT_ICON);
      setBudget(0);
      setError(null);
    }
  }, [open]);

  const isPending = createCategoryMut.isPending || createBudgetMut.isPending;
  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && !isPending;

  const colorForNew = (): string => {
    if (parent?.color) return parent.color;
    const idx = existingCategories.length % CHART_COLORS.length;
    return CHART_COLORS[idx] ?? '#9CA3A0';
  };

  const onSave = async () => {
    if (!canSave) return;
    setError(null);
    try {
      const categoryId = await createCategoryMut.mutateAsync({
        name: trimmed,
        icon: `phosphor:${icon}`,
        color: colorForNew(),
        parentId: parent?.id ?? null,
      });
      if (budget > 0) {
        await createBudgetMut.mutateAsync({
          name: trimmed,
          categoryId,
          monthlyLimit: budget,
          alertThreshold: 80,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const stepBudget = (delta: number) => {
    setBudget((v) => Math.max(0, v + delta));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetBody className="flex flex-col">
          {/* Header */}
          <div className="flex items-baseline justify-between px-4 py-3 hairline-b">
            <span
              className="font-mono text-[10px] text-textLo"
              style={{ letterSpacing: '0.12em' }}
            >
              {parent ? `NEW SUBCATEGORY · ${parent.name.toUpperCase()}` : 'NEW CATEGORY'}
            </span>
          </div>

          {/* Name */}
          <label className="flex items-center gap-3 px-4 py-3 hairline-b">
            <CategoryIcon
              fallback={`phosphor:${icon}`}
              size={20}
              className="text-accent shrink-0"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              placeholder="Category name"
              autoFocus
              className="flex-1 bg-transparent font-sans text-[15px] text-textHi placeholder:text-textLo focus:outline-none"
              aria-label="Category name"
            />
          </label>

          {/* Budget stepper */}
          <div className="flex items-center justify-between px-4 py-3 hairline-b">
            <span
              className="font-mono text-[10px] text-textLo"
              style={{ letterSpacing: '0.06em' }}
            >
              MONTHLY BUDGET
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stepBudget(-STEP_VALUE);
                }}
                disabled={budget <= 0 || isPending}
                className="press flex h-7 w-7 items-center justify-center border font-mono text-[14px] text-textHi disabled:opacity-30"
                style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                aria-label="Decrease budget"
              >
                −
              </button>
              <span
                className="nums font-mono text-textHi"
                style={{ fontSize: 14, letterSpacing: '-0.02em', minWidth: 80, textAlign: 'right' }}
              >
                {budget > 0
                  ? formatAmount(budget, { showSign: false, noCents: true })
                  : 'NONE'}
              </span>
              <button
                type="button"
                onClick={() => {
                  stepBudget(STEP_VALUE);
                }}
                disabled={isPending}
                className="press flex h-7 w-7 items-center justify-center border font-mono text-[14px] text-textHi disabled:opacity-30"
                style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                aria-label="Increase budget"
              >
                +
              </button>
            </div>
          </div>

          {/* Icon picker */}
          <div className="flex flex-col">
            <span
              className="px-4 pt-3 pb-1 font-mono text-[10px] text-textLo"
              style={{ letterSpacing: '0.06em' }}
            >
              ICON
            </span>
            <CategoryIconPicker value={icon} onChange={setIcon} />
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-2 text-center font-mono text-[10px] uppercase text-warn"
              style={{ letterSpacing: '0.08em' }}
            >
              ▲ {error}
            </div>
          )}

          {/* Actions */}
          <div
            className="border-t border-rule bg-bg px-4"
            style={{ paddingTop: 12, paddingBottom: 12 }}
          >
            <div className="flex gap-3">
              <PhosphorButton
                onClick={() => {
                  onOpenChange(false);
                }}
                disabled={isPending}
              >
                CANCEL
              </PhosphorButton>
              <PhosphorButton
                variant="warn"
                onClick={() => {
                  void onSave();
                }}
                disabled={!canSave}
              >
                {isPending ? 'SAVING…' : 'CREATE'}
              </PhosphorButton>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
