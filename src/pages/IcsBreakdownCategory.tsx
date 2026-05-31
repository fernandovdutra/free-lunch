import { Fragment, useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Breadcrumb,
  DayHeader,
  DrillHeadline,
  Scrubber,
  TransactionRow,
  type BreadcrumbSegment,
  type ScrubberBar,
} from '@/components/redesign';
import { useIcsBreakdownExplorer } from '@/hooks/useIcsBreakdownExplorer';
import { useCategories } from '@/hooks/useCategories';
import { groupByMonthThenDay } from '@/components/transactions/groupTransactions';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { formatAmount } from '@/lib/utils';

/**
 * ICS L2 — the editable leaf: transactions for one category within a statement
 * (`/ics/:statementId/:categoryId`). Mirrors the Spending L3 page
 * (SpendingSubcategory): day-grouped TransactionRows, and tapping a row opens
 * the shared Edit Sheet via `?id=` — exactly like the Transactions page —
 * instead of drilling further. This is the terminal level for ICS.
 */
export function IcsBreakdownCategory() {
  const { statementId, categoryId } = useParams<{
    statementId: string;
    categoryId: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);

  const { data } = useIcsBreakdownExplorer({
    statementId,
    categoryId,
    ...(highlightedMonth ? { breakdownMonthKey: highlightedMonth } : {}),
  });
  const { data: categories } = useCategories();

  const category = (categories ?? []).find((c) => c.id === categoryId);
  const title = category?.name ?? 'Category';

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

  const segments: BreadcrumbSegment[] = [
    { label: 'CREDIT CARD', href: '/ics' },
    { label: breakdownLabel || 'STATEMENT', href: `/ics/${statementId}` },
    { label: title.toUpperCase() },
  ];

  const handleSelectMonth = (monthKey: string) => {
    setHighlightedMonth(monthKey === backendCurrentMonthKey ? undefined : monthKey);
  };

  const total = data?.currentTotal ?? 0;

  return (
    <div className="pb-8">
      <Breadcrumb
        segments={segments}
        onBack={() => {
          void navigate(`/ics/${statementId}`);
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
            No transactions for this category.
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
