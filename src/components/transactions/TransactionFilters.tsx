import { useMemo, useState } from 'react';
import { format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { Pill } from '@/components/redesign';
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMonth } from '@/contexts/MonthContext';
import { buildCategoryTree } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import type { TransactionFilters as Filters } from '@/hooks/useTransactions';

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  categories: Category[];
  selectedMonth: Date;
}

/**
 * Phase 5 filter bar. Horizontal-scroll row of four pills:
 *   ! UNCAT      — toggles categorizationStatus = 'uncategorized'
 *   ◐ REIMB      — toggles reimbursementStatus = 'pending'
 *   ▸ <month>    — display-only; month nav lives in TopBar arrows
 *   ◱ ALL CATS   — opens nested category sheet (single-select)
 *
 * v8 mock measurements: pills are square (no radius), 25px tall, 1px
 * border-rule on all sides, font-mono 10px, 6px gap, transparent bg
 * (active state per README §03 = accentDim bg + accent text + accent border).
 */
export function TransactionFilters({
  filters,
  onChange,
  categories,
  selectedMonth,
}: TransactionFiltersProps) {
  const { setSelectedMonth } = useMonth();
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);

  const isUncat = filters.categorizationStatus === 'uncategorized';
  const isReimb = filters.reimbursementStatus === 'pending';

  const monthLabel = `${format(selectedMonth, 'MMM').toUpperCase()} ${format(selectedMonth, 'yyyy')}`;

  const selectedCategory = filters.categoryId
    ? categories.find((c) => c.id === filters.categoryId) ?? null
    : null;
  const catLabel = selectedCategory ? selectedCategory.name.toUpperCase() : 'ALL CATS';

  const toggleUncat = () => {
    if (isUncat) {
      const { categorizationStatus: _drop, ...rest } = filters;
      void _drop;
      onChange(rest);
    } else {
      onChange({ ...filters, categorizationStatus: 'uncategorized' });
    }
  };

  const toggleReimb = () => {
    if (isReimb) {
      const { reimbursementStatus: _drop, ...rest } = filters;
      void _drop;
      onChange(rest);
    } else {
      onChange({ ...filters, reimbursementStatus: 'pending' });
    }
  };

  const setCategory = (categoryId: string | null) => {
    if (categoryId === null) {
      const { categoryId: _drop, ...rest } = filters;
      void _drop;
      onChange(rest);
    } else {
      onChange({ ...filters, categoryId });
    }
    setCatSheetOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'sticky z-30 bg-bg hairline-b',
          'top-[calc(44px+env(safe-area-inset-top,0px))]'
        )}
      >
        <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-4 py-2.5">
          <Pill active={isUncat} variant="warn" onClick={toggleUncat}>
            ! UNCAT
          </Pill>
          <Pill active={isReimb} onClick={toggleReimb}>
            ◐ REIMB
          </Pill>
          <Pill
            onClick={() => {
              setMonthSheetOpen(true);
            }}
          >
            ▸ {monthLabel}
          </Pill>
          <Pill
            active={!!selectedCategory}
            onClick={() => {
              setCatSheetOpen(true);
            }}
          >
            ◱ {catLabel}
          </Pill>
        </div>
      </div>

      <CategoryFilterSheet
        open={catSheetOpen}
        onOpenChange={setCatSheetOpen}
        categories={categories}
        selectedId={filters.categoryId ?? null}
        onPick={setCategory}
      />

      <MonthPickerSheet
        open={monthSheetOpen}
        onOpenChange={setMonthSheetOpen}
        selectedMonth={selectedMonth}
        onPick={(date) => {
          setSelectedMonth(date);
          setMonthSheetOpen(false);
          // Scroll to top so the picked month is at the top of the list,
          // not wherever the user was scrolled previously.
          window.scrollTo({ top: 0 });
        }}
      />
    </>
  );
}

interface MonthPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMonth: Date;
  onPick: (date: Date) => void;
}

/**
 * 12-month grid picker. Shows the current calendar month plus the 11
 * months before it, in a 4×3 grid. Tap a cell → set that month.
 */
function MonthPickerSheet({
  open,
  onOpenChange,
  selectedMonth,
  onPick,
}: MonthPickerSheetProps) {
  const months = useMemo(() => {
    const today = startOfMonth(new Date());
    return Array.from({ length: 12 }, (_, i) => subMonths(today, i));
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>SELECT MONTH</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <div className="grid grid-cols-4 gap-2 px-4 pb-4">
            {months.map((m) => {
              const isCurrent = isSameMonth(m, selectedMonth);
              return (
                <button
                  key={m.toISOString()}
                  type="button"
                  onClick={() => {
                    onPick(m);
                  }}
                  className={cn(
                    'press flex h-[60px] flex-col items-center justify-center border',
                    isCurrent
                      ? 'border-accent bg-accent-dim'
                      : 'border-rule bg-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-[13px] font-medium uppercase tracking-[0.08em]',
                      isCurrent ? 'text-accent' : 'text-textHi'
                    )}
                  >
                    {format(m, 'MMM')}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 font-mono text-[10px] tracking-[0.06em]',
                      isCurrent ? 'text-accent' : 'text-textLo'
                    )}
                  >
                    {format(m, 'yyyy')}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

interface CategoryFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  selectedId: string | null;
  onPick: (id: string | null) => void;
}

function CategoryFilterSheet({
  open,
  onOpenChange,
  categories,
  selectedId,
  onPick,
}: CategoryFilterSheetProps) {
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>FILTER · CATEGORY</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <ul className="pb-2">
            <li>
              <button
                type="button"
                className={cn(
                  'press hairline-b flex w-full items-center justify-between px-4 py-3 text-left',
                  selectedId === null && 'bg-surface'
                )}
                onClick={() => {
                  onPick(null);
                }}
              >
                <span className="font-sans text-[13.5px] text-textHi">All categories</span>
                {selectedId === null && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
                    ON
                  </span>
                )}
              </button>
            </li>
            {tree.map((parent) => (
              <li key={parent.id}>
                <div className="mt-3 px-4 pb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-textLo">
                  {parent.name}
                </div>
                <button
                  type="button"
                  className={cn(
                    'press hairline-b flex w-full items-center justify-between px-4 py-3 text-left',
                    selectedId === parent.id && 'bg-surface'
                  )}
                  onClick={() => {
                    onPick(parent.id);
                  }}
                >
                  <span className="font-sans text-[13.5px] text-textHi">All {parent.name}</span>
                  {selectedId === parent.id && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
                      ON
                    </span>
                  )}
                </button>
                {parent.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    className={cn(
                      'press hairline-b flex w-full items-center justify-between py-2.5 pl-7 pr-4 text-left',
                      selectedId === child.id && 'bg-surface'
                    )}
                    onClick={() => {
                      onPick(child.id);
                    }}
                  >
                    <span className="font-sans text-[13px] text-textMid">{child.name}</span>
                    {selectedId === child.id && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
                        ON
                      </span>
                    )}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
