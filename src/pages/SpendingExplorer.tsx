import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import {
  Breadcrumb,
  buildDrillBreadcrumb,
  DrillHeadline,
  DrillRow,
  Scrubber,
  type ScrubberBar,
} from '@/components/redesign';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useMonthHighlight } from '@/hooks/useMonthHighlight';
import { useBudgets } from '@/hooks/useBudgets';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { useCategories } from '@/hooks/useCategories';
import { formatAmount } from '@/lib/utils';

/**
 * Phase 7b — L1 Drill (`/expenses` and `/income`).
 *
 * Layout per v8 frame 04 (DEEP §04):
 *   [In-page breadcrumb: ← EXPENSES]
 *   [DrillHeadline: €4,292.00 · APR 2026 · BUDGET €4,500]
 *   [Scrubber: 6-month bars + dashed budget line]
 *   [hairline]
 *   [BY CATEGORY · N TOTAL]
 *   [Numbered DrillRow list, descending by spend]
 *
 * Month-nav split (per QA round 1):
 *   - TopBar `‹ ›` chevrons drive `selectedMonth` (the WINDOW anchor).
 *   - Scrubber bar tap drives a local `breakdownMonthKey` only — bars stay
 *     in the same 6-month window, just the headline + rows refresh.
 *   - Wired via `useMonthHighlight()`: a tap that matches the global month
 *     clears the local highlight, so the page tracks the TopBar by default.
 */
export function SpendingExplorer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedMonth, highlightedMonth, selectedMonthKey, handleMonthClick } =
    useMonthHighlight();

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

  // Bars: backfill to exactly 6 months ending at the WINDOW anchor
  // (selectedMonth from MonthContext, NOT the locally-highlighted breakdown
  // month). Per QA round 1: tapping a bar must not shift the window.
  const scrubberBars: ScrubberBar[] = useMemo(() => {
    const byKey = new Map((data?.monthlyTotals ?? []).map((m) => [m.monthKey, m]));
    const bars: ScrubberBar[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = startOfMonth(subMonths(selectedMonth, i));
      const monthKey = format(d, 'yyyy-MM');
      const existing = byKey.get(monthKey);
      bars.push({
        monthKey,
        label: format(d, 'MMM').toUpperCase(),
        amount: existing?.amount ?? 0,
      });
    }
    return bars;
  }, [data, selectedMonth]);

  // The Scrubber's "selected" highlight tracks the locally-tapped month
  // (or falls back to the global month). The headline & rows show data
  // for that same month (because we passed it as breakdownMonthKey above).
  const breakdownLabel = useMemo(() => {
    const m = parseISO(`${selectedMonthKey}-01`);
    return format(m, 'MMM yyyy').toUpperCase();
  }, [selectedMonthKey]);
  const breakdownMonthShort = breakdownLabel.split(' ')[0] ?? '';

  // Per-category budget lookup → drives DrillRow's progress + over variant.
  const limitByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const bp of budgetProgress) {
      if (bp.budget.categoryId) {
        m.set(bp.budget.categoryId, bp.budget.monthlyLimit);
      }
    }
    return m;
  }, [budgetProgress]);

  const sortedCategories = useMemo(() => {
    return [...(data?.categories ?? [])].sort((a, b) => b.amount - a.amount);
  }, [data]);

  const breadcrumbSegments = buildDrillBreadcrumb({
    pathname: location.pathname,
    categories,
  });

  // breadcrumbSegments may be empty briefly while routing settles; fall back
  // to the page-name placeholder.
  const segments = breadcrumbSegments.length > 0 ? breadcrumbSegments : [{ label: directionLabel }];

  const total = data?.currentTotal ?? 0;

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
        amountFormatted={formatAmount(total)}
        monthLabel={breakdownLabel}
        {...(direction === 'expenses' && totalBudget > 0
          ? { budgetCaption: `BUDGET ${formatAmount(totalBudget, { showSign: false })}` }
          : {})}
      />

      <div className="mt-6 flex justify-center px-4">
        <Scrubber
          bars={scrubberBars}
          selectedMonthKey={selectedMonthKey}
          {...(direction === 'expenses' && totalBudget > 0 ? { budget: totalBudget } : {})}
          onSelectMonth={(monthKey) => {
            handleMonthClick(monthKey);
          }}
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
          // Meta line per QA round 1: `N TXN · X% OF MMM · €Y LEFT` (or `· €Y OVER`).
          // Drop the LEFT/OVER tail when the category has no budget.
          const tail =
            remaining === null
              ? ''
              : isOver
                ? ` · ${formatAmount(Math.abs(remaining), { showSign: false })} OVER`
                : ` · ${formatAmount(remaining, { showSign: false })} LEFT`;
          const meta = `${cat.transactionCount} TXN · ${pctLabel}${tail}`;
          return (
            <DrillRow
              key={cat.categoryId}
              index={i + 1}
              name={cat.categoryName}
              amount={formatAmount(cat.amount, { showSign: false })}
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

