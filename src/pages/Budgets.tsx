import { useMemo, useState } from 'react';
import { getDaysInMonth } from 'date-fns';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import { AllocationStrip, type AllocationSlice } from '@/components/redesign';
import type { Budget, Category } from '@/types';

const CAP_FALLBACK = 5000;

interface CategoryEntry {
  id: string;
  name: string;
  budget: number;
  children: { id: string; name: string; budget: number }[];
}

function composeCategories(
  budgets: Budget[],
  categories: Category[]
): CategoryEntry[] {
  const budgetByCat = new Map<string, number>();
  for (const b of budgets) {
    if (!b.isActive) continue;
    budgetByCat.set(b.categoryId, (budgetByCat.get(b.categoryId) ?? 0) + b.monthlyLimit);
  }

  const top = categories.filter((c) => !c.parentId);
  const byParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const arr = byParent.get(c.parentId) ?? [];
    arr.push(c);
    byParent.set(c.parentId, arr);
  }

  return top
    .map((cat) => {
      const children = (byParent.get(cat.id) ?? []).map((child) => ({
        id: child.id,
        name: child.name,
        budget: budgetByCat.get(child.id) ?? 0,
      }));
      const childTotal = children.reduce((s, c) => s + c.budget, 0);
      const direct = budgetByCat.get(cat.id) ?? 0;
      return {
        id: cat.id,
        name: cat.name,
        budget: Math.max(direct, childTotal),
        children,
      };
    })
    .filter((e) => e.budget > 0 || e.children.length > 0)
    .sort((a, b) => b.budget - a.budget);
}

export function Budgets() {
  const { selectedMonth } = useMonth();
  const { data: budgets = [], isLoading: budgetsLoading, error } = useBudgets();
  const { data: categories = [] } = useCategories();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const entries = useMemo(
    () => composeCategories(budgets, categories),
    [budgets, categories]
  );

  const allocated = entries.reduce((sum, e) => sum + e.budget, 0);
  const totalCap = Math.max(allocated, CAP_FALLBACK);
  const free = Math.max(0, totalCap - allocated);
  const daysInMonth = getDaysInMonth(selectedMonth);
  const perDay = totalCap > 0 ? totalCap / daysInMonth : 0;
  const categoryCount = entries.length;

  const slices: AllocationSlice[] = entries.map((e) => ({
    id: e.id,
    label: e.name,
    value: e.budget,
  }));

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  return (
    <div className="-mx-4 pb-8">
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
            disabled
            className="press font-mono text-[10.5px] text-textMid"
            style={{
              letterSpacing: '0.08em',
              padding: '3px 8px',
              border: '1px solid rgba(255,255,255,0.07)',
              opacity: 0.6,
              cursor: 'not-allowed',
            }}
          >
            ○ EDIT
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
            {formatAmount(totalCap, { showSign: false })}
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
          <span className="text-textMid">
            {formatAmount(free, { showSign: false })} FREE
          </span>
        </div>
        <AllocationStrip slices={slices} total={totalCap} />
        <div
          className="mt-2 flex justify-between font-mono text-textLo"
          style={{ fontSize: 9.5, letterSpacing: '0.04em' }}
        >
          <span>{categoryCount} CATEGORIES</span>
          <span>{formatAmount(perDay, { showSign: false })}/DAY</span>
        </div>
      </section>

      {/* Section 3: BY CATEGORY header */}
      <header
        className="flex items-baseline justify-between font-mono text-[10px] text-textLo"
        style={{ padding: '14px 16px 8px', letterSpacing: '0.06em' }}
      >
        <span>BY CATEGORY</span>
        <span>{categoryCount} · TAP TO EXPAND</span>
      </header>

      {/* Section 4: Category list (expandable) */}
      {entries.length === 0 ? (
        <div className="px-5 py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
          NO BUDGETS YET
        </div>
      ) : (
        entries.map((e, i) => {
          const isExpanded = expanded.has(e.id);
          const childCount = e.children.length;
          return (
            <div key={e.id} className="border-b border-rule">
              <button
                type="button"
                onClick={() => { toggleExpand(e.id); }}
                className="press block w-full text-left"
                style={{ padding: '13px 16px' }}
              >
                <div
                  className="grid items-center"
                  style={{ gridTemplateColumns: '24px 1fr auto 14px', gap: 10 }}
                >
                  <span
                    className="nums font-mono text-textLo"
                    style={{ fontSize: 10, letterSpacing: '0.05em' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
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
                  <span
                    className="nums font-mono text-textHi"
                    style={{ fontSize: 14, letterSpacing: '-0.02em' }}
                  >
                    {formatAmount(e.budget, { showSign: false })}
                  </span>
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
                </div>
              </button>
              {isExpanded && childCount > 0 && (
                <div className="bg-surface/50">
                  {e.children.map((child) => (
                    <div
                      key={child.id}
                      className="grid items-baseline border-t border-rule"
                      style={{
                        gridTemplateColumns: '24px 1fr auto 14px',
                        gap: 10,
                        padding: '10px 16px',
                      }}
                    >
                      <span />
                      <span className="font-sans text-[13px] text-textMid">{child.name}</span>
                      <span
                        className="nums font-mono text-textLo"
                        style={{ fontSize: 10, letterSpacing: '0.05em' }}
                      >
                        {child.budget > 0
                          ? formatAmount(child.budget, { showSign: false })
                          : 'NO BUDGET'}
                      </span>
                      <span />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
