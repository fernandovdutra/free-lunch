import { useEffect, useMemo, useState } from 'react';
import { getDaysInMonth } from 'date-fns';
import {
  useBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import { BudgetWaterfall, PhosphorButton, type AllocationSlice } from '@/components/redesign';
import { CategoryIcon } from '@/lib/categoryIcons';
import { CategoryCreateSheet } from '@/components/budgets/CategoryCreateSheet';
import type { Budget, Category } from '@/types';

const CAP_FALLBACK = 5000;
const STEP_VALUE = 10;

interface LeafEntry {
  id: string;
  name: string;
  budget: number;
  matches: Budget[];
}

interface CategoryEntry {
  id: string;
  name: string;
  /**
   * If the top-level has subcategories, leafs are the children. Otherwise
   * the top-level itself is the only leaf and holds its own budget.
   */
  leafs: LeafEntry[];
  /** Whether this top-level has real children (vs being a leaf itself). */
  hasChildren: boolean;
}

function composeCategories(
  budgets: Budget[],
  categories: Category[]
): CategoryEntry[] {
  const activeBudgets = budgets.filter((b) => b.isActive);
  const budgetByCat = new Map<string, Budget[]>();
  for (const b of activeBudgets) {
    const arr = budgetByCat.get(b.categoryId) ?? [];
    arr.push(b);
    budgetByCat.set(b.categoryId, arr);
  }

  const top = categories.filter((c) => !c.parentId);
  const byParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const arr = byParent.get(c.parentId) ?? [];
    arr.push(c);
    byParent.set(c.parentId, arr);
  }

  const buildLeaf = (cat: Category, nameOverride?: string): LeafEntry => {
    const matches = budgetByCat.get(cat.id) ?? [];
    return {
      id: cat.id,
      name: nameOverride ?? cat.name,
      budget: matches.reduce((s, b) => s + b.monthlyLimit, 0),
      matches,
    };
  };

  return top
    .map((cat): CategoryEntry => {
      const childCats = byParent.get(cat.id) ?? [];
      const hasChildren = childCats.length > 0;
      const leafs = hasChildren
        ? [
            // Surface a parent-level budget (when one exists) as a `(general)`
            // leaf so it remains editable alongside the children.
            ...((budgetByCat.get(cat.id) ?? []).length > 0
              ? [buildLeaf(cat, '(general)')]
              : []),
            ...childCats.map((c) => buildLeaf(c)),
          ]
        : [buildLeaf(cat)];
      return {
        id: cat.id,
        name: cat.name,
        leafs,
        hasChildren,
      };
    })
    .filter((e) => e.leafs.some((l) => l.budget > 0) || e.hasChildren || e.leafs.length > 0)
    .sort((a, b) => {
      const aSum = a.leafs.reduce((s, l) => s + l.budget, 0);
      const bSum = b.leafs.reduce((s, l) => s + l.budget, 0);
      return bSum - aSum;
    });
}

export function Budgets() {
  const { selectedMonth } = useMonth();
  const { data: budgets = [], isLoading: budgetsLoading, error } = useBudgets();
  const { data: categories = [] } = useCategories();
  const createMut = useCreateBudget();
  const updateMut = useUpdateBudget();
  const deleteMut = useDeleteBudget();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Map<string, number>>(new Map());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<Category | null>(null);

  const entries = useMemo(
    () => composeCategories(budgets, categories),
    [budgets, categories]
  );

  // Re-sync draft when entries change while editing (in case server data updates).
  useEffect(() => {
    if (!isEditing) return;
    setDraft((prev) => {
      const next = new Map(prev);
      for (const e of entries) {
        for (const l of e.leafs) {
          if (!next.has(l.id)) next.set(l.id, l.budget);
        }
      }
      return next;
    });
  }, [isEditing, entries]);

  const leafValue = (l: LeafEntry) =>
    isEditing ? (draft.get(l.id) ?? l.budget) : l.budget;

  const entrySum = (e: CategoryEntry) =>
    e.leafs.reduce((s, l) => s + leafValue(l), 0);

  const allocated = entries.reduce((sum, e) => sum + entrySum(e), 0);
  const totalCap = Math.max(allocated, CAP_FALLBACK);
  const free = Math.max(0, totalCap - allocated);
  const daysInMonth = getDaysInMonth(selectedMonth);
  const perDay = totalCap > 0 ? totalCap / daysInMonth : 0;
  const categoryCount = entries.length;

  const slices: AllocationSlice[] = entries.map((e) => ({
    id: e.id,
    label: e.name,
    value: entrySum(e),
  }));

  const isDirty =
    isEditing &&
    entries.some((e) => e.leafs.some((l) => leafValue(l) !== l.budget));

  const isPending =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  const toggleExpand = (id: string) => {
    if (isEditing) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stepLeaf = (l: LeafEntry, delta: number) => {
    setSaveError(null);
    setDraft((prev) => {
      const next = new Map(prev);
      const current = next.get(l.id) ?? l.budget;
      next.set(l.id, Math.max(0, current + delta));
      return next;
    });
  };

  const enterEdit = () => {
    setSaveError(null);
    setExpanded(new Set());
    const initial = new Map<string, number>();
    for (const e of entries) {
      for (const l of e.leafs) initial.set(l.id, l.budget);
    }
    setDraft(initial);
    setIsEditing(true);
  };

  const discard = () => {
    setSaveError(null);
    setDraft(new Map());
    setIsEditing(false);
  };

  const save = async () => {
    setSaveError(null);
    try {
      const ops: Promise<unknown>[] = [];
      for (const e of entries) {
        for (const l of e.leafs) {
          const next = leafValue(l);
          if (next === l.budget) continue;
          if (next > 0) {
            if (l.matches.length === 1 && l.matches[0] !== undefined) {
              ops.push(
                updateMut.mutateAsync({
                  id: l.matches[0].id,
                  data: { monthlyLimit: next },
                })
              );
            } else {
              for (const m of l.matches) {
                ops.push(deleteMut.mutateAsync(m.id));
              }
              ops.push(
                createMut.mutateAsync({
                  name: l.name,
                  categoryId: l.id,
                  monthlyLimit: next,
                  alertThreshold: 80,
                })
              );
            }
          } else {
            for (const m of l.matches) {
              ops.push(deleteMut.mutateAsync(m.id));
            }
          }
        }
      }
      await Promise.all(ops);
      setDraft(new Map());
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (error) {
    return (
      <div className="px-5 py-12 font-mono text-[12px] uppercase tracking-[0.12em] text-warn">
        ▲ FAILED TO LOAD BUDGETS
      </div>
    );
  }

  if (budgetsLoading) {
    return (
      <div className="px-5 py-12 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
        LOADING…
      </div>
    );
  }

  const renderStepper = (l: LeafEntry) => {
    const value = leafValue(l);
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { stepLeaf(l, -STEP_VALUE); }}
          disabled={value <= 0 || isPending}
          className="press flex h-7 w-7 items-center justify-center border font-mono text-[14px] text-textHi disabled:opacity-30"
          style={{ borderColor: 'rgba(255,255,255,0.14)' }}
          aria-label={`Decrease ${l.name}`}
        >
          −
        </button>
        <span
          className="nums font-mono text-textHi"
          style={{ fontSize: 14, letterSpacing: '-0.02em', minWidth: 80, textAlign: 'right' }}
        >
          {formatAmount(value, { showSign: false, noCents: true })}
        </span>
        <button
          type="button"
          onClick={() => { stepLeaf(l, STEP_VALUE); }}
          disabled={isPending}
          className="press flex h-7 w-7 items-center justify-center border font-mono text-[14px] text-textHi disabled:opacity-30"
          style={{ borderColor: 'rgba(255,255,255,0.14)' }}
          aria-label={`Increase ${l.name}`}
        >
          +
        </button>
      </div>
    );
  };

  return (
    <div
      className="-mx-4 pb-8"
      style={isEditing ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 68px + 76px)' } : undefined}
    >
      {/* Section 1: MONTHLY PLAN + EDIT + hero */}
      <section className="border-b border-rule px-5 py-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <span
            className="font-mono text-[10px] text-textLo"
            style={{ letterSpacing: '0.06em' }}
          >
            MONTHLY PLAN
          </span>
          <button
            type="button"
            onClick={isEditing ? discard : enterEdit}
            disabled={isPending}
            className="press font-mono text-[10.5px]"
            style={{
              letterSpacing: '0.08em',
              padding: '3px 8px',
              border: '1px solid',
              borderColor: isEditing ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
              backgroundColor: isEditing ? 'var(--accent-dim)' : 'transparent',
              color: isEditing ? 'var(--accent)' : 'rgba(231,232,234,0.65)',
            }}
          >
            {isEditing ? '● EDITING' : '○ EDIT'}
          </button>
        </div>
        <div
          className="flex items-baseline justify-between nums font-mono"
          style={{
            fontWeight: 400,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            fontFeatureSettings: '"tnum"',
          }}
        >
          <span className="text-textHi" style={{ fontSize: 38 }}>
            {formatAmount(totalCap, { showSign: false, noCents: true })}
          </span>
          <span
            className="text-textLo"
            style={{ fontSize: 10, letterSpacing: '0.06em', alignSelf: 'flex-end', paddingBottom: 4 }}
          >
            /MONTH
          </span>
        </div>
      </section>

      {/* Section 2: ALLOCATION */}
      <section className="border-b border-rule px-5" style={{ paddingTop: 16, paddingBottom: 16 }}>
        <div
          className="mb-[10px] flex items-baseline justify-between font-mono text-[10px] text-textLo"
          style={{ letterSpacing: '0.06em' }}
        >
          <span>ALLOCATION</span>
          <span className="text-accent">
            {formatAmount(free, { showSign: false, noCents: true })} FREE
          </span>
        </div>
        <BudgetWaterfall slices={slices} total={totalCap} />
        <div
          className="mt-2 flex justify-between font-mono text-textLo"
          style={{ fontSize: 9.5, letterSpacing: '0.04em' }}
        >
          <span>{categoryCount} CATEGORIES</span>
          <span>{formatAmount(perDay, { showSign: false, noCents: true })}/DAY</span>
        </div>
      </section>

      {/* Section 3: BY CATEGORY header */}
      <header
        className="flex items-baseline justify-between font-mono text-[10px] text-textLo"
        style={{ padding: '14px 16px 8px', letterSpacing: '0.06em' }}
      >
        <span>BY CATEGORY</span>
        <span>
          {isEditing
            ? `STEP ${formatAmount(STEP_VALUE, { showSign: false, noCents: true })}`
            : `${categoryCount} · TAP TO EXPAND`}
        </span>
      </header>

      {/* Section 4: Category list */}
      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
          NO BUDGETS YET
        </div>
      ) : (
        entries.map((e) => {
          const isExpanded = isEditing || expanded.has(e.id);
          const childCount = e.hasChildren ? e.leafs.length : 0;
          const sum = entrySum(e);

          // Top-level row. In edit-mode + has children → header only (no stepper, no chevron).
          // In read-mode → tap-to-expand. If no children and edit-mode → row gets the stepper.
          const topLevelStepperLeaf =
            isEditing && !e.hasChildren ? e.leafs[0] : null;

          const TopWrapper = isEditing ? 'div' : 'button';

          return (
            <div key={e.id} className="border-b border-rule">
              <TopWrapper
                {...(isEditing
                  ? {}
                  : {
                      type: 'button' as const,
                      onClick: () => { toggleExpand(e.id); },
                    })}
                className={isEditing ? 'block w-full text-left' : 'press block w-full text-left'}
                style={{ padding: '13px 16px' }}
              >
                <div
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: isEditing ? '24px 1fr auto' : '24px 1fr auto 14px',
                    gap: 10,
                  }}
                >
                  <CategoryIcon
                    categoryId={e.id}
                    fallback={categories.find((c) => c.id === e.id)?.icon}
                    size={18}
                    className="text-accent"
                  />
                  <div className="flex flex-col">
                    <span className="font-sans text-[14px] text-textHi" style={{ letterSpacing: '-0.005em' }}>
                      {e.name}
                    </span>
                    {childCount > 0 && (
                      <span
                        className="mt-0.5 font-mono text-textLo"
                        style={{ fontSize: 9.5, letterSpacing: '0.05em' }}
                      >
                        {childCount} SUBCATEGOR{childCount === 1 ? 'Y' : 'IES'}
                      </span>
                    )}
                  </div>
                  {topLevelStepperLeaf ? (
                    renderStepper(topLevelStepperLeaf)
                  ) : (
                    <>
                      <span
                        className="nums font-mono text-textHi"
                        style={{ fontSize: 14, letterSpacing: '-0.02em' }}
                      >
                        {formatAmount(sum, { showSign: false, noCents: true })}
                      </span>
                      {!isEditing && (
                        <span
                          aria-hidden
                          className="font-mono text-textLo"
                          style={{
                            fontSize: 12,
                            lineHeight: 1,
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 180ms ease-out',
                          }}
                        >
                          ›
                        </span>
                      )}
                    </>
                  )}
                </div>
              </TopWrapper>

              {isExpanded && e.hasChildren && (
                <div className={isEditing ? '' : 'bg-surface/50'}>
                  {e.leafs.map((child) => {
                    const value = leafValue(child);
                    return (
                      <div
                        key={child.id}
                        className="grid items-center border-t border-rule"
                        style={{
                          gridTemplateColumns: isEditing ? '24px 1fr auto' : '24px 1fr auto 14px',
                          gap: 10,
                          padding: isEditing ? '10px 16px' : '10px 16px',
                        }}
                      >
                        <span />
                        <span className="font-sans text-[13px] text-textMid">{child.name}</span>
                        {isEditing ? (
                          renderStepper(child)
                        ) : (
                          <>
                            <span
                              className="nums font-mono text-textLo"
                              style={{ fontSize: 10, letterSpacing: '0.05em' }}
                            >
                              {value > 0
                                ? formatAmount(value, { showSign: false, noCents: true })
                                : 'NO BUDGET'}
                            </span>
                            <span />
                          </>
                        )}
                      </div>
                    );
                  })}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        const parent = categories.find((c) => c.id === e.id) ?? null;
                        setCreateParent(parent);
                        setCreateOpen(true);
                      }}
                      className="press flex w-full items-center gap-2 border-t border-rule px-4 py-2.5 text-left font-mono text-[10px] text-accent"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      <span style={{ marginLeft: 24 }}>+ ADD SUBCATEGORY</span>
                    </button>
                  )}
                </div>
              )}
              {isEditing && !e.hasChildren && (
                <button
                  type="button"
                  onClick={() => {
                    const parent = categories.find((c) => c.id === e.id) ?? null;
                    setCreateParent(parent);
                    setCreateOpen(true);
                  }}
                  className="press flex w-full items-center border-t border-rule px-4 py-2 text-left font-mono text-[10px] text-accent"
                  style={{ letterSpacing: '0.08em' }}
                >
                  <span style={{ marginLeft: 24 }}>+ ADD SUBCATEGORY</span>
                </button>
              )}
            </div>
          );
        })
      )}

      {isEditing && (
        <button
          type="button"
          onClick={() => {
            setCreateParent(null);
            setCreateOpen(true);
          }}
          className="press flex w-full items-center gap-2 border-b border-rule px-4 py-3 text-left font-mono text-[11px] text-accent"
          style={{ letterSpacing: '0.08em' }}
        >
          + NEW CATEGORY
        </button>
      )}

      {/* Sticky DISCARD / SAVE footer (edit mode only) */}
      {isEditing && (
        <div
          className="fixed inset-x-0 z-40 border-t border-rule bg-bg px-4"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 68px)',
            paddingTop: 12,
            paddingBottom: 12,
          }}
        >
          <div className="mx-auto flex w-full max-w-[420px] gap-3 lg:max-w-[480px]">
            <PhosphorButton onClick={discard} disabled={isPending}>
              DISCARD
            </PhosphorButton>
            <PhosphorButton
              variant="warn"
              onClick={() => { void save(); }}
              disabled={!isDirty || isPending}
            >
              {isPending ? 'SAVING…' : 'SAVE'}
            </PhosphorButton>
          </div>
          {saveError && (
            <div
              className="mt-2 text-center font-mono text-[10px] uppercase text-warn"
              style={{ letterSpacing: '0.08em' }}
            >
              ▲ {saveError}
            </div>
          )}
        </div>
      )}

      <CategoryCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        parent={createParent}
        existingCategories={categories}
      />
    </div>
  );
}
