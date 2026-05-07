import { Fragment, useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Breadcrumb,
  buildDrillBreadcrumb,
  DayHeader,
  DrillHeadline,
  Scrubber,
  TransactionRow,
  type ScrubberBar,
} from '@/components/redesign';
import { useSpendingExplorer } from '@/hooks/useSpendingExplorer';
import { useCategories } from '@/hooks/useCategories';
import { groupByMonthThenDay } from '@/components/transactions/groupTransactions';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { formatAmount } from '@/lib/utils';

/**
 * Phase 7d — L3 Drill (`/expenses/:categoryId/:subcategoryId` and the income
 * mirror).
 *
 * Differences vs L2:
 *   - Breadcrumb truncates to last 2 segments (handled by the primitive).
 *   - DrillHeadline has no `budgetCaption` (subcats have no budget).
 *   - Scrubber has no `budget` prop (no dashed line, no over-budget tint).
 *   - Section: `TRANSACTIONS · N TXN`. Rows are day-grouped TransactionRows.
 *   - Tap a row → open Phase 6 Edit Sheet via `?id=…` deep-link, mirroring
 *     `src/pages/Transactions.tsx`. Closing returns to the L3 URL.
 *
 * Backend-driven Scrubber pattern same as L1/L2 — see SpendingExplorer.tsx
 * doc-comment for context on the TZ quirk.
 */
export function SpendingSubcategory() {
  const { categoryId, subcategoryId } = useParams<{
    categoryId: string;
    subcategoryId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);

  const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
  const basePath = `/${direction}`;

  const { data } = useSpendingExplorer({
    direction,
    categoryId,
    subcategoryId,
    ...(highlightedMonth ? { breakdownMonthKey: highlightedMonth } : {}),
  });
  const { data: categories } = useCategories();

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

  const breadcrumbSegments = buildDrillBreadcrumb({
    pathname: location.pathname,
    categories,
  });

  const transactions = useMemo(() => data?.transactions ?? [], [data]);
  const months = useMemo(() => groupByMonthThenDay(transactions), [transactions]);
  const categoriesById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c] as const)),
    [categories]
  );

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

  const handleSelectMonth = (monthKey: string) => {
    setHighlightedMonth(monthKey === backendCurrentMonthKey ? undefined : monthKey);
  };

  const total = data?.currentTotal ?? 0;

  return (
    <div className="pb-8">
      <Breadcrumb
        segments={breadcrumbSegments}
        onBack={() => {
          void navigate(`${basePath}/${categoryId}`);
        }}
        onSegmentClick={(href) => {
          void navigate(href);
        }}
      />

      <DrillHeadline
        amountFormatted={formatAmount(total, { noCents: true })}
        monthLabel={breakdownLabel}
      />

      <div className="mt-6 flex justify-center px-4">
        <Scrubber
          bars={scrubberBars}
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={handleSelectMonth}
        />
      </div>

      <div className="mt-4 h-px w-full bg-rule" />

      <div className="mt-1">
        <DrillSectionHeader label="TRANSACTIONS" right={`${transactions.length} TXN`} />

        {transactions.length === 0 && (
          <div className="px-4 py-12 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
            No transactions for {breakdownLabel}.
          </div>
        )}

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
      </div>

      <TransactionForm
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
        transaction={editingTransaction}
        categories={categories ?? []}
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
