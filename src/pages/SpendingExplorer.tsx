import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import {
  Breadcrumb,
  buildDrillBreadcrumb,
  DrillHeadline,
  DrillRow,
  Scrubber,
  SectionHeader,
  type ScrubberBar,
} from '@/components/redesign';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useMonth } from '@/contexts/MonthContext';
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
 *   [SectionHeader: BY CATEGORY · 10 TOTAL]
 *   [Numbered DrillRow list, descending by spend]
 */
export function SpendingExplorer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedMonth, setSelectedMonth } = useMonth();

  const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
  const basePath = `/${direction}`;
  const directionLabel = direction === 'income' ? 'INCOME' : 'EXPENSES';

  const { data } = useSpendingExplorer({ direction });
  const { data: budgets } = useBudgets();
  const { data: budgetProgress } = useBudgetProgress();
  const { data: categories } = useCategories();

  const totalBudget = useMemo(
    () => (budgets ?? []).filter((b) => b.isActive).reduce((s, b) => s + b.monthlyLimit, 0),
    [budgets]
  );

  const selectedMonthKey = format(selectedMonth, 'yyyy-MM');

  // Backfill the bar strip to exactly 6 months. The backend's `monthlyTotals`
  // already returns up to 6 months, but we backfill here to keep the strip
  // shape stable when data is sparse (e.g. a brand-new user).
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

  const monthLabel = format(selectedMonth, 'MMM yyyy').toUpperCase();
  const total = data?.currentTotal ?? 0;

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

  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonth(parseISO(`${monthKey}-01`));
  };

  return (
    <div className="pb-8">
      <Breadcrumb
        segments={breadcrumbSegments.length > 0 ? breadcrumbSegments : [{ label: directionLabel }]}
        onBack={() => {
          void navigate('/');
        }}
        onSegmentClick={(href) => {
          void navigate(href);
        }}
      />

      <DrillHeadline
        amountFormatted={formatAmount(total)}
        monthLabel={monthLabel}
        {...(direction === 'expenses' && totalBudget > 0
          ? { budgetCaption: `BUDGET ${formatAmount(totalBudget, { showSign: false })}` }
          : {})}
      />

      <div className="mt-6 flex justify-center">
        <Scrubber
          bars={scrubberBars}
          selectedMonthKey={selectedMonthKey}
          {...(direction === 'expenses' && totalBudget > 0 ? { budget: totalBudget } : {})}
          onSelectMonth={handleSelectMonth}
        />
      </div>

      <div className="mt-6">
        <SectionHeader right={`${sortedCategories.length} TOTAL`}>
          BY CATEGORY
        </SectionHeader>

        {sortedCategories.length === 0 && (
          <div className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
            No {direction} for {monthLabel}.
          </div>
        )}

        {sortedCategories.map((cat, i) => {
          const limit = limitByCategory.get(cat.categoryId);
          const isOver = limit !== undefined && cat.amount > limit;
          const remaining = limit !== undefined ? limit - cat.amount : null;
          // Meta line: "· €31 LEFT" or "· €58 OVER" or omitted (no budget)
          const meta =
            limit === undefined
              ? undefined
              : isOver
                ? `· ${formatAmount(Math.abs(remaining as number), { showSign: false })} OVER`
                : `· ${formatAmount(remaining as number, { showSign: false })} LEFT`;
          return (
            <DrillRow
              key={cat.categoryId}
              index={i + 1}
              name={cat.categoryName}
              amount={formatAmount(cat.amount, { showSign: false })}
              {...(meta ? { meta } : {})}
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
