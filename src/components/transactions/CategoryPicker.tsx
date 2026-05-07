import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { buildCategoryTree } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface CategoryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** Pass `null` for uncategorized. */
  currentCategoryId: string | null;
  /** Pass `null` to clear the category (mark uncategorized). */
  onPick: (categoryId: string | null) => void;
}

/**
 * Phase 6 nested category picker — opens on top of the Transaction Edit
 * Sheet. Search at top, hierarchical category list, "Uncategorized"
 * sentinel row to clear the assignment.
 */
export function CategoryPicker({
  open,
  onOpenChange,
  categories,
  currentCategoryId,
  onPick,
}: CategoryPickerProps) {
  const [query, setQuery] = useState('');
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  const matches = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());
  const visibleParents = useMemo(() => {
    if (!query.trim()) return tree;
    return tree
      .map((p) => ({ ...p, children: p.children.filter((c) => matches(c.name)) }))
      .filter((p) => matches(p.name) || p.children.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, query]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>SELECT CATEGORY</SheetTitle>
        </SheetHeader>
        <div className="hairline-b px-4 pb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Search categories…"
            className={cn(
              'block h-9 w-full border border-rule bg-bg px-3',
              'font-sans text-[13px] text-textHi placeholder:text-textLo',
              'focus:outline-none focus:ring-1 focus:ring-accent'
            )}
            autoFocus
          />
        </div>
        <SheetBody>
          <PickerRow
            isCurrent={currentCategoryId === null}
            onClick={() => {
              onPick(null);
            }}
          >
            <span className="font-sans text-[13.5px] italic text-textMid">Uncategorized</span>
          </PickerRow>

          {visibleParents.map((parent) => (
            <div key={parent.id}>
              <div className="mt-3 px-4 pb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-textLo">
                {parent.name}
              </div>
              {(query.trim() === '' || matches(parent.name)) && (
                <PickerRow
                  isCurrent={currentCategoryId === parent.id}
                  onClick={() => {
                    onPick(parent.id);
                  }}
                >
                  <span className="font-sans text-[13.5px] text-textHi">All {parent.name}</span>
                </PickerRow>
              )}
              {parent.children.map((child) => (
                <PickerRow
                  key={child.id}
                  isCurrent={currentCategoryId === child.id}
                  indented
                  onClick={() => {
                    onPick(child.id);
                  }}
                >
                  <span className="font-sans text-[13px] text-textMid">{child.name}</span>
                </PickerRow>
              ))}
            </div>
          ))}

          {visibleParents.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
              No categories match "{query}"
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

interface PickerRowProps {
  children: React.ReactNode;
  isCurrent: boolean;
  indented?: boolean;
  onClick: () => void;
}

function PickerRow({ children, isCurrent, indented, onClick }: PickerRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'press hairline-b flex w-full items-center justify-between py-2.5 pr-4 text-left',
        indented ? 'pl-8' : 'pl-4',
        isCurrent && 'bg-surface'
      )}
    >
      {children}
      {isCurrent && (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">CURRENT</span>
      )}
    </button>
  );
}
