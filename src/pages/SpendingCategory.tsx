import { Fragment, useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Breadcrumb,
  buildDrillBreadcrumb,
  DayHeader,
  DrillHeadline,
  DrillRow,
  Scrubber,
  TransactionRow,
  type ScrubberBar,
} from '@/components/redesign';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { useCategories } from '@/hooks/useCategories';
import { groupByMonthThenDay } from '@/components/transactions/groupTransactions';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { formatAmount } from '@/lib/utils';
import type { Category, Transaction } from '@/types';

/**
 * Phase 7c — L2 Drill (`/expenses/:categoryId` and the income mirror).
 *
 * Same shape as L1 (SpendingExplorer): in-page Breadcrumb, DrillHeadline,
 * Scrubber, indexed DrillRow list. Differences:
 *   - Breadcrumb: `← EXPENSES › <CATEGORY>` (resolved via buildDrillBreadcrumb).
 *   - Scrubber budget = parent category's rolled-up budget total (sum of any
 *     `(general)` parent line + every leaf budget under it).
 *   - Subcategory rows scale vs THEIR OWN budget (rows without a budget skip
 *     the fill and the `· OVER`/`· LEFT` tail). A sub goes warn/`over` when
 *     its spend exceeds its own cap.
 *   - Leaf-category special case: when `data.categories` is empty but
 *     `data.transactions` is present (a category with no subcategories — the
 *     backend collapses txns under the parent), render the L3 layout
 *     (TRANSACTIONS section + day-grouped rows + Phase 6 Edit Sheet) in-place.
 *
 * See the L1 doc-comment in SpendingExplorer.tsx for the backend-driven
 * Scrubber pattern (sourcing bars from `data.monthlyTotals` to dodge the
 * frontend-vs-Functions-emulator TZ quirk). Same pattern is used here.
 */
export function SpendingCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);

  const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
  const basePath = `/${direction}`;

  const { data } = useSpendingExplorer({
    direction,
    categoryId,
    ...(highlightedMonth ? { breakdownMonthKey: highlightedMonth } : {}),
  });
  const { data: budgetProgress } = useBudgetProgress();
  const { data: categories } = useCategories();

  // Per-subcategory limit lookup → drives each sub row's progress + over.
  const limitBySubcategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const bp of budgetProgress) {
      const id = bp.budget.categoryId;
      if (id) m.set(id, (m.get(id) ?? 0) + bp.budget.monthlyLimit);
    }
    return m;
  }, [budgetProgress]);

  // Headline + Scrubber cap = rolled-up budget for this parent: any
  // parent-level `(general)` line PLUS every leaf budget underneath it.
  const parentBudgetTotal = useMemo(() => {
    if (!categoryId) return undefined;
    const catById = new Map((categories ?? []).map((c) => [c.id, c] as const));
    let total = 0;
    for (const bp of budgetProgress) {
      const id = bp.budget.categoryId;
      if (!id) continue;
      if (id === categoryId) {
        total += bp.budget.monthlyLimit;
        continue;
      }
      if (catById.get(id)?.parentId === categoryId) {
        total += bp.budget.monthlyLimit;
      }
    }
    return total > 0 ? total : undefined;
  }, [budgetProgress, categories, categoryId]);

  const scrubberBars: ScrubberBar[] = useMemo(() => {
    const totals = data?.monthlyTotals ?? [];
    if (totals.length === 6) {
      return totals.map((t) => ({
        monthKey: t.monthKey,
        label: format(parseISO(`${t.monthKey}-01`), 'MMM').toUpperCase(),
        amount: t.amount,
      }));
    }
    return Array.from({ length: 6 }, (_, i) => ({
      monthKey: `placeholder-${i}`,
      label: '',
      amount: 0,
    }));
  }, [data]);

  const backendCurrentMonthKey = scrubberBars[scrubberBars.length - 1]?.monthKey ?? '';
  const selectedMonthKey = highlightedMonth ?? backendCurrentMonthKey;

  const breakdownLabel = useMemo(() => {
    const cm = data?.currentMonth;
    if (!cm) return '';
    const parsed = new Date(`${cm} 1`);
    if (Number.isNaN(parsed.getTime())) return cm.toUpperCase();
    return format(parsed, 'MMM yyyy').toUpperCase();
  }, [data]);
  const breakdownMonthShort = breakdownLabel.split(' ')[0] ?? '';

  const breadcrumbSegments = buildDrillBreadcrumb({
    pathname: location.pathname,
    categories,
  });

  const sortedSubcategories = useMemo(
    () => [...(data?.categories ?? [])].sort((a, b) => b.amount - a.amount),
    [data]
  );

  const handleSelectMonth = (monthKey: string) => {
    setHighlightedMonth(monthKey === backendCurrentMonthKey ? undefined : monthKey);
  };

  const total = data?.currentTotal ?? 0;

  // Leaf-category fall-through: when the backend returns transactions instead
  // of a subcategory breakdown, render the L3 layout right here.
  const leafTransactions =
    !data?.categories?.length && data?.transactions?.length ? data.transactions : null;

  return (
    <div className="pb-8">
      <Breadcrumb
        segments={breadcrumbSegments}
        onBack={() => {
          void navigate(basePath);
        }}
        onSegmentClick={(href) => {
          void navigate(href);
        }}
      />

      <DrillHeadline
        amountFormatted={formatAmount(total, { noCents: true })}
        monthLabel={breakdownLabel}
        {...(direction === 'expenses' && parentBudgetTotal !== undefined
          ? { budgetCaption: `BUDGET ${formatAmount(parentBudgetTotal, { showSign: false, noCents: true })}` }
          : {})}
      />

      <div className="mt-6 flex justify-center px-4">
        <Scrubber
          bars={scrubberBars}
          selectedMonthKey={selectedMonthKey}
          {...(direction === 'expenses' && parentBudgetTotal !== undefined
            ? { budget: parentBudgetTotal }
            : {})}
          onSelectMonth={handleSelectMonth}
        />
      </div>

      <div className="mt-4 h-px w-full bg-rule" />

      {leafTransactions ? (
        <LeafTransactions
          transactions={leafTransactions}
          categories={categories ?? []}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      ) : (
        <div className="mt-1">
          <DrillSectionHeader
            label="BY SUBCATEGORY"
            right={`${sortedSubcategories.length} TOTAL`}
          />

          {sortedSubcategories.length === 0 && (
            <div className="px-4 py-12 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
              No {direction} for {breakdownLabel}.
            </div>
          )}

          {sortedSubcategories.map((sub, i) => {
            const subLimit = limitBySubcategory.get(sub.categoryId);
            const hasBudget = subLimit !== undefined && subLimit > 0;
            const isOver = hasBudget && sub.amount > subLimit;
            const remaining = hasBudget ? subLimit - sub.amount : null;
            const tail =
              remaining === null
                ? ''
                : isOver
                  ? ` · ${formatAmount(Math.abs(remaining), { showSign: false, noCents: true })} OVER`
                  : ` · ${formatAmount(remaining, { showSign: false, noCents: true })} LEFT`;
            const meta = `${sub.transactionCount} TXN · ${sub.percentage.toFixed(1)}% OF ${breakdownMonthShort}${tail}`;
            return (
              <DrillRow
                key={sub.categoryId}
                index={i + 1}
                name={sub.categoryName}
                amount={formatAmount(sub.amount, { showSign: false, noCents: true })}
                {...(hasBudget
                  ? { budgetLabel: formatAmount(subLimit, { showSign: false, noCents: true }) }
                  : {})}
                meta={meta}
                {...(hasBudget ? { progress: sub.amount, max: subLimit } : {})}
                variant={isOver ? 'over' : 'ok'}
                onClick={() => {
                  void navigate(`${basePath}/${categoryId}/${sub.categoryId}`);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LeafTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  searchParams: URLSearchParams;
  setSearchParams: (
    updater: (prev: URLSearchParams) => URLSearchParams,
    opts?: { replace?: boolean }
  ) => void;
}

/**
 * The leaf-category branch of L2: same content as the L3 page (TRANSACTIONS
 * section, day-grouped rows, ?id-driven Edit Sheet) but mounted inside the L2
 * page so the URL stays at `/expenses/:categoryId`.
 */
function LeafTransactions({ transactions, categories, searchParams, setSearchParams }: LeafTransactionsProps) {
  const months = useMemo(() => groupByMonthThenDay(transactions), [transactions]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c] as const)), [categories]);

  const editId = searchParams.get('id');
  const editingTransaction = useMemo(
    () => (editId ? transactions.find((t) => t.id === editId) ?? null : null),
    [editId, transactions]
  );

  const openEdit = useCallback(
    (id: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('id', id);
        return next;
      });
    },
    [setSearchParams]
  );
  const closeEdit = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const totalCount = transactions.length;

  return (
    <div className="mt-1">
      <DrillSectionHeader label="TRANSACTIONS" right={`${totalCount} TXN`} />

      {months.map((month) => (
        <Fragment key={month.key}>
          {month.days.map((day) => (
            <Fragment key={day.key}>
              <DayHeader
                label={day.label}
                total={
                  day.isSelfCanceling
                    ? '—'
                    : `${day.netTotal > 0 ? '+' : day.netTotal < 0 ? '−' : ''}${formatAmount(day.netTotal, { showSign: false, noCents: true })}`
                }
              />
              {day.txns.map((t) => {
                const cat = t.categoryId ? categoriesById.get(t.categoryId) : undefined;
                const meta = (cat?.name ?? 'UNCATEGORIZED').toUpperCase();
                const sign: '+' | '-' | '' = t.amount > 0 ? '+' : t.amount < 0 ? '-' : '';
                return (
                  <TransactionRow
                    key={t.id}
                    merchant={t.counterparty ?? t.description}
                    amount={formatAmount(t.amount, { showSign: false })}
                    sign={sign}
                    meta={meta}
                    time={format(t.transactionDate ?? t.bookingDate ?? t.date, 'HH:mm')}
                    variant={t.categoryId ? 'default' : 'uncat'}
                    {...(t.categoryId ? {} : { flag: '!' })}
                    onClick={() => {
                      openEdit(t.id);
                    }}
                  />
                );
              })}
            </Fragment>
          ))}
        </Fragment>
      ))}

      <TransactionForm
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
        transaction={editingTransaction}
        categories={categories}
      />
    </div>
  );
}

function DrillSectionHeader({ label, right }: { label: string; right?: string }) {
  return (
    <header className="flex items-baseline justify-between px-4 pt-3 pb-2 font-mono text-[9.5px] uppercase tracking-[0.04em] text-textLo">
      <span>{label}</span>
      {right && <span className="nums">{right}</span>}
    </header>
  );
}
