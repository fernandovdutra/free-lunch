import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Breadcrumb,
  buildDrillBreadcrumb,
  DrillHeadline,
  DrillRow,
  Scrubber,
  type ScrubberBar,
} from '@/components/redesign';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useBudgets } from '@/hooks/useBudgets';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { useCategories } from '@/hooks/useCategories';
import { formatAmount } from '@/lib/utils';

/**
 * Phase 7b — L1 Drill (`/expenses` and `/income`).
 *
 * Source of truth for the bar strip is the backend's `monthlyTotals`
 * response, NOT the local `selectedMonth` (the Functions emulator runs
 * in UTC and the frontend's `toISOString()` shifts CEST start-of-month
 * by an hour — at month boundaries the backend bucket can be one
 * month off from the frontend's local view). By driving the strip
 * from `data.monthlyTotals + data.currentMonth`, the page stays
 * internally consistent regardless of TZ. (The TopBar still shows
 * the local-time month — that's a pre-existing app-wide quirk.)
 *
 * Month-nav split:
 *   - TopBar `‹ ›` chevrons drive `selectedMonth` (the WINDOW anchor).
 *   - Scrubber bar tap drives a local `highlightedMonth` only —
 *     bars stay in the same window, just headline + rows refresh.
 */
export function SpendingExplorer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);

  const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
  const basePath = `/${direction}`;
  const directionLabel = direction === 'income' ? 'INCOME' : 'EXPENSES';

  const { data } = useSpendingExplorer({
    direction,
    ...(highlightedMonth ? { breakdownMonthKey: highlightedMonth } : {}),
  });
  const { data: budgets } = useBudgets();
  const { data: budgetProgress } = useBudgetProgress();
  const { data: categories } = useCategories();

  const totalBudget = useMemo(
    () => (budgets ?? []).filter((b) => b.isActive).reduce((s, b) => s + b.monthlyLimit, 0),
    [budgets]
  );

  // Bars derived directly from the backend's `monthlyTotals` (already 6
  // entries, oldest → newest). When data is loading, render a placeholder
  // 6-bar strip so the layout doesn't jump.
  const scrubberBars: ScrubberBar[] = useMemo(() => {
    const totals = data?.monthlyTotals ?? [];
    if (totals.length === 6) {
      return totals.map((t) => ({
        monthKey: t.monthKey,
        label: format(parseISO(`${t.monthKey}-01`), 'MMM').toUpperCase(),
        amount: t.amount,
      }));
    }
    // Loading or sparse: render 6 empty placeholder bars.
    return Array.from({ length: 6 }, (_, i) => ({
      monthKey: `placeholder-${i}`,
      label: '',
      amount: 0,
    }));
  }, [data]);

  // Backend's "current" month for the strip = the last entry of monthlyTotals.
  // Falls back to placeholder while loading.
  const backendCurrentMonthKey = scrubberBars[scrubberBars.length - 1]?.monthKey ?? '';
  const selectedMonthKey = highlightedMonth ?? backendCurrentMonthKey;

  // Headline label comes from `data.currentMonth` (e.g. "March 2026"), which
  // is the backend's authoritative breakdown month. Format → "MAR 2026".
  const breakdownLabel = useMemo(() => {
    const cm = data?.currentMonth;
    if (!cm) return '';
    // `data.currentMonth` is "MMMM yyyy"; convert to "MMM yyyy" UPPER.
    const parsed = new Date(`${cm} 1`);
    if (Number.isNaN(parsed.getTime())) return cm.toUpperCase();
    return format(parsed, 'MMM yyyy').toUpperCase();
  }, [data]);
  const breakdownMonthShort = breakdownLabel.split(' ')[0] ?? '';

  // Per-top-level-category budget lookup → drives DrillRow's progress + over
  // variant. Budgets are stored per leaf (subcategory) in this app, but L1
  // rows are top-level categories with rolled-up spend, so we roll the
  // matching leaf budgets up into their parent for the comparison.
  const limitByCategory = useMemo(() => {
    const m = new Map<string, number>();
    const catById = new Map((categories ?? []).map((c) => [c.id, c] as const));
    for (const bp of budgetProgress) {
      const budgetCatId = bp.budget.categoryId;
      if (!budgetCatId) continue;
      const cat = catById.get(budgetCatId);
      const topLevelId = cat?.parentId ?? budgetCatId;
      m.set(topLevelId, (m.get(topLevelId) ?? 0) + bp.budget.monthlyLimit);
    }
    return m;
  }, [budgetProgress, categories]);

  const sortedCategories = useMemo(() => {
    return [...(data?.categories ?? [])].sort((a, b) => b.amount - a.amount);
  }, [data]);

  const breadcrumbSegments = buildDrillBreadcrumb({
    pathname: location.pathname,
    categories,
  });
  const segments = breadcrumbSegments.length > 0 ? breadcrumbSegments : [{ label: directionLabel }];

  const total = data?.currentTotal ?? 0;

  const handleSelectMonth = (monthKey: string) => {
    // Tapping the backend's current month clears the highlight (= track
    // global default).  Otherwise set as the local override.
    setHighlightedMonth(monthKey === backendCurrentMonthKey ? undefined : monthKey);
  };

  return (
    <div className="pb-8">
      <Breadcrumb
        segments={segments}
        onBack={() => {
          void navigate('/');
        }}
        onSegmentClick={(href) => {
          void navigate(href);
        }}
      />

      <DrillHeadline
        amountFormatted={formatAmount(total, { noCents: true })}
        monthLabel={breakdownLabel}
        {...(direction === 'expenses' && totalBudget > 0
          ? { budgetCaption: `BUDGET ${formatAmount(totalBudget, { showSign: false, noCents: true })}` }
          : {})}
      />

      <div className="mt-6 flex justify-center px-4">
        <Scrubber
          bars={scrubberBars}
          selectedMonthKey={selectedMonthKey}
          {...(direction === 'expenses' && totalBudget > 0 ? { budget: totalBudget } : {})}
          onSelectMonth={handleSelectMonth}
        />
      </div>

      {/* Hairline below the Scrubber + month labels (QA round 1). */}
      <div className="mt-4 h-px w-full bg-rule" />

      <div className="mt-1">
        <DrillSectionHeader
          label={direction === 'expenses' ? 'BY CATEGORY' : 'BY SOURCE'}
          right={`${sortedCategories.length} TOTAL`}
        />

        {sortedCategories.length === 0 && (
          <div className="px-4 py-12 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
            No {direction} for {breakdownLabel}.
          </div>
        )}

        {sortedCategories.map((cat, i) => {
          const limit = limitByCategory.get(cat.categoryId);
          const isOver = limit !== undefined && cat.amount > limit;
          const remaining = limit !== undefined ? limit - cat.amount : null;
          const pctLabel = `${cat.percentage.toFixed(1)}% OF ${breakdownMonthShort}`;
          const budgetPctLabel =
            limit !== undefined && limit > 0
              ? ` · ${Math.round((cat.amount / limit) * 100)}% OF BUDGET`
              : '';
          const tail =
            remaining === null
              ? ''
              : isOver
                ? ` · ${formatAmount(Math.abs(remaining), { showSign: false, noCents: true })} OVER`
                : ` · ${formatAmount(remaining, { showSign: false, noCents: true })} LEFT`;
          const meta = `${cat.transactionCount} TXN · ${pctLabel}${budgetPctLabel}${tail}`;
          return (
            <DrillRow
              key={cat.categoryId}
              index={i + 1}
              categoryId={cat.categoryId}
              name={cat.categoryName}
              amount={formatAmount(cat.amount, { showSign: false, noCents: true })}
              meta={meta}
              {...(limit !== undefined
                ? { progress: cat.amount, max: limit }
                : {})}
              variant={isOver ? 'over' : 'ok'}
              onClick={() => {
                void navigate(`${basePath}/${cat.categoryId}`);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Section header tuned for drill pages — smaller than the redesign's shared
 * `SectionHeader` (9.5px vs 10px, tighter tracking) per QA round 1.
 */
function DrillSectionHeader({ label, right }: { label: string; right?: string }) {
  return (
    <header className="flex items-baseline justify-between px-4 pt-3 pb-2 font-mono text-[9.5px] uppercase tracking-[0.04em] text-textLo">
      <span>{label}</span>
      {right && <span className="nums">{right}</span>}
    </header>
  );
}
