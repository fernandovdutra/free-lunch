import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
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
  /** Distinct tags across the loaded window, for the tag filter sheet. */
  availableTags?: string[];
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
  availableTags = [],
}: TransactionFiltersProps) {
  const { setSelectedMonth } = useMonth();
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);

  // Search box: the input stays responsive locally while propagation to the
  // query filters is debounced — every keystroke otherwise mints a fresh
  // TanStack query key and re-reads Firestore.
  const [searchInput, setSearchInput] = useState(filters.searchText ?? '');
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last value this input pushed up — lets the sync effect distinguish a
  // genuine external change (sessionStorage restore, deep-link) from the
  // echo of our own debounced update mid-typing.
  const lastPropagatedRef = useRef(filters.searchText ?? '');

  useEffect(() => {
    const external = filters.searchText ?? '';
    if (external !== lastPropagatedRef.current) {
      lastPropagatedRef.current = external;
      setSearchInput(external);
    }
  }, [filters.searchText]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed === lastPropagatedRef.current) return;
      lastPropagatedRef.current = trimmed;
      const current = filtersRef.current;
      if (trimmed) {
        onChange({ ...current, searchText: trimmed });
      } else {
        const { searchText: _drop, ...rest } = current;
        void _drop;
        onChange(rest);
      }
    }, 250);
  };

  const isUncat = filters.categorizationStatus === 'uncategorized';
  const isReimb = filters.reimbursementStatus === 'pending';

  const monthLabel = `${format(selectedMonth, 'MMM').toUpperCase()} ${format(selectedMonth, 'yyyy')}`;

  const selectedCategory = filters.categoryId
    ? categories.find((c) => c.id === filters.categoryId) ?? null
    : null;
  const catLabel = selectedCategory ? selectedCategory.name.toUpperCase() : 'ALL CATS';

  const selectedTag = filters.tag ?? null;
  const tagLabel = selectedTag ? selectedTag.toUpperCase() : 'ALL TAGS';

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

  const setTag = (tag: string | null) => {
    if (tag === null) {
      const { tag: _drop, ...rest } = filters;
      void _drop;
      onChange(rest);
    } else {
      onChange({ ...filters, tag });
    }
    setTagSheetOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'sticky z-30 bg-bg hairline-b',
          'top-[calc(44px+env(safe-area-inset-top,0px))]'
        )}
      >
        <div className="px-4 pt-2.5">
          <div className="flex h-[30px] items-center gap-2 border border-rule px-2.5">
            <MagnifyingGlassIcon
              size={14}
              weight="regular"
              className="shrink-0 text-textLo"
              aria-hidden
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                handleSearchChange(e.target.value);
              }}
              placeholder="SEARCH DESCRIPTION OR PAYEE"
              aria-label="Search transactions"
              className="flex-1 bg-transparent font-mono text-[11px] tracking-[0.04em] text-textHi placeholder:text-textLo focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  handleSearchChange('');
                }}
                aria-label="Clear search"
                className="press shrink-0 text-textLo"
              >
                <XIcon size={13} weight="bold" aria-hidden />
              </button>
            )}
          </div>
        </div>
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
          <Pill
            active={!!selectedTag}
            onClick={() => {
              setTagSheetOpen(true);
            }}
          >
            # {tagLabel}
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

      <TagFilterSheet
        open={tagSheetOpen}
        onOpenChange={setTagSheetOpen}
        tags={availableTags}
        selectedTag={selectedTag}
        onPick={setTag}
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

interface TagFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Distinct tags across the loaded window (most frequent first). */
  tags: string[];
  selectedTag: string | null;
  onPick: (tag: string | null) => void;
}

/**
 * Single-select tag filter sheet, mirroring the category sheet's structure.
 * Matching is exact and case-sensitive, same as the MCP server's tag filter.
 */
function TagFilterSheet({ open, onOpenChange, tags, selectedTag, onPick }: TagFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>FILTER · TAG</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {tags.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
              No tags yet — add one from a transaction.
            </div>
          ) : (
            <ul className="pb-2">
              <li>
                <button
                  type="button"
                  className={cn(
                    'press hairline-b flex w-full items-center justify-between px-4 py-3 text-left',
                    selectedTag === null && 'bg-surface'
                  )}
                  onClick={() => {
                    onPick(null);
                  }}
                >
                  <span className="font-sans text-[13.5px] text-textHi">All tags</span>
                  {selectedTag === null && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
                      ON
                    </span>
                  )}
                </button>
              </li>
              {tags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    className={cn(
                      'press hairline-b flex w-full items-center justify-between px-4 py-3 text-left',
                      selectedTag === tag && 'bg-surface'
                    )}
                    onClick={() => {
                      onPick(tag);
                    }}
                  >
                    <span className="font-mono text-[13px] text-textHi"># {tag}</span>
                    {selectedTag === tag && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
                        ON
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
