import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { endOfDay, format, getDate, getDaysInMonth, isAfter } from 'date-fns';
import { useBankConnections } from '@/hooks/useBankConnection';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { useFixedSchedule } from '@/hooks/useFixedSchedule';
import { useFixedMatches } from '@/hooks/useFixedMatches';
import { usePendingReimbursements } from '@/hooks/useReimbursements';
import { useTransactions } from '@/hooks/useTransactions';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import {
  buildDailyActual,
  computeProjection,
  fixedRemaining as fixedRemainingSum,
  matchFixedToActuals,
  type ProjectionBreakdown,
} from '@/lib/burnUp';
import { TransactionRow } from '@/components/redesign';

// Stable empty default so the `matched` memo doesn't re-run every render while
// the fixedMatches query is loading (a fresh `new Set()` would break ===).
const EMPTY_KEYS: ReadonlySet<string> = new Set();
import {
  BalanceRow,
  HomeCategoryList,
  IcsReminderBanner,
  PendingBanner,
  SpentCard,
  type HomeCategoryEntry,
} from '@/components/home';

export function Home() {
  const navigate = useNavigate();
  const { selectedMonth, isCurrentMonth, dateRange } = useMonth();

  // "Spent so far" counts only transactions dated up to today, so the
  // headline, the burn-up dot, and the projection agree. For the current
  // month the range ends at end-of-today (real bank data can carry
  // future value-dated debits that haven't happened yet); past months
  // use the full month. endOfDay is stable within a day, so the
  // react-query key stays stable across renders. Scoped to the home view
  // only — other pages still show the whole month.
  const homeRange = useMemo(
    () => ({
      startDate: dateRange.startDate,
      endDate: isCurrentMonth ? endOfDay(new Date()) : dateRange.endDate,
    }),
    [dateRange.startDate, dateRange.endDate, isCurrentMonth]
  );

  const { data: current, error } = useDashboardData(homeRange);
  const { data: budgets = [] } = useBudgets();
  const { data: budgetProgress } = useBudgetProgress(homeRange);
  const { data: categories = [] } = useCategories();
  const { data: pendingReimbursements } = usePendingReimbursements();
  const { data: connections = [] } = useBankConnections();
  const { data: fixedSchedule = [] } = useFixedSchedule();
  const monthKey = format(selectedMonth, 'yyyy-MM');
  // Fixed costs the user manually marked "already posted" this month (the
  // heuristic missed the real charge). Treated as posted by the matcher.
  const { data: manualPostedKeys = EMPTY_KEYS } = useFixedMatches(monthKey);
  // Month transactions, used to match scheduled fixed costs against
  // what's actually posted so the projection doesn't double-count.
  const { data: monthTxns = [] } = useTransactions({
    startDate: homeRange.startDate,
    endDate: homeRange.endDate,
  });

  // Match scheduled fixed costs against actual transactions so already-
  // paid items aren't double-counted in the projection and overdue ones
  // (scheduled day passed without a matching posted txn) keep showing
  // up as still-expected. Memoized before any early return so hook order
  // stays stable.
  const matched = useMemo(() => {
    const eligible = monthTxns.filter(
      (t) => !t.excludeFromTotals && t.reimbursement?.status !== 'pending'
    );
    return matchFixedToActuals(fixedSchedule, eligible, undefined, manualPostedKeys);
  }, [fixedSchedule, monthTxns, manualPostedKeys]);

  if (error) {
    return (
      <div className="px-5 py-12 font-mono text-[12px] uppercase tracking-[0.12em] text-warn">
        ▲ FAILED TO LOAD HOME
      </div>
    );
  }

  const monthAbbr = format(selectedMonth, 'MMM').toUpperCase();

  const summary = current?.summary ?? {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    pendingReimbursements: 0,
    transactionCount: 0,
  };

  const spent = summary.totalExpenses;
  const budget = budgets
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + b.monthlyLimit, 0);
  const isOver = budget > 0 && spent > budget;

  const today = new Date();
  const daysInMonth = getDaysInMonth(selectedMonth);
  const dayOfMonth = isCurrentMonth ? getDate(today) : daysInMonth;
  const isFutureMonth = isAfter(selectedMonth, today);

  // Cumulative spend per day, anchored to whichever day "today" is in the
  // visible month. For past months, today === daysInMonth. The timeline
  // covers exactly the visible (Amsterdam) month — see buildDailyActual.
  const dailyActual = buildDailyActual(current?.timeline ?? [], dayOfMonth);

  // Burn-up projection. Both the chart's central dashed line and the
  // bottom-summary "PROJECTED €X" use this number, so the line and
  // the readout always agree.
  const fixedSum = fixedSchedule.reduce((s, f) => s + f.a, 0);
  const burnProjection = !isFutureMonth && dayOfMonth > 0
    ? computeProjection(
        dailyActual,
        matched.posted,
        matched.unposted,
        dayOfMonth,
        daysInMonth,
        budget,
        fixedSum
      )
    : null;

  const projection: {
    amount: number;
    delta: number;
    isOver: boolean;
    breakdown: ProjectionBreakdown;
  } | null =
    isCurrentMonth && spent > 0 && burnProjection
      ? (() => {
          const projectedAmount = burnProjection.projectedEnd;
          const delta = projectedAmount - budget;
          return {
            amount: projectedAmount,
            delta,
            isOver: budget > 0 && projectedAmount > budget,
            breakdown: burnProjection.breakdown,
          };
        })()
      : null;

  const monthEndLabel = format(
    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), daysInMonth),
    'MMM d'
  ).toUpperCase();

  const fixedRemainingAmount = isCurrentMonth ? fixedRemainingSum(matched.unposted) : 0;

  // Pending reimbursements: derive from the dedicated hook so the banner
  // shows even when the dashboard summary aggregator is stale (e.g., right
  // after a transaction was tagged via mutation). Sum of absolute amounts
  // since pending txns are normally negative (an expense the user is owed
  // back for).
  const pendingCount = pendingReimbursements.length;
  const pendingTotal = pendingReimbursements.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const categorySpending = current?.categorySpending ?? [];
  const topCategories = categorySpending.slice(0, 4);
  const moreCategoryCount = Math.max(0, categorySpending.length - topCategories.length);

  const progressByCategory = new Map(budgetProgress.map((p) => [p.budget.categoryId, p]));

  const categoryEntries: HomeCategoryEntry[] = topCategories.map((c) => {
    const bp = progressByCategory.get(c.categoryId);
    const isCatOver = bp ? c.amount > bp.budget.monthlyLimit : false;

    let trailing: string | undefined;
    if (bp) {
      trailing = isCatOver
        ? `${formatAmount(c.amount - bp.budget.monthlyLimit, { showSign: false, noCents: true })} over`
        : `${formatAmount(bp.remaining, { showSign: false, noCents: true })} left`;
    }

    return {
      categoryId: c.categoryId,
      name: c.categoryName,
      amount: formatAmount(c.amount, { showSign: false, noCents: true }),
      ...(trailing ? { amountTrailing: trailing } : {}),
      ...(bp ? { progress: c.amount, max: bp.budget.monthlyLimit } : {}),
      variant: isCatOver ? 'over' : 'ok',
    };
  });

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const recentTransactions = (current?.recentTransactions ?? []).slice(0, 4);

  const handleCategoryClick = (categoryId: string) => {
    const cat = categoryById.get(categoryId);
    const topLevelId = cat?.parentId ?? categoryId;
    void navigate(`/expenses/${topLevelId}`);
  };

  const liveBankBalance = connections
    .filter((c) => c.status === 'active')
    .flatMap((c) => c.accounts)
    .reduce((sum, a) => sum + (a.balance?.amount ?? 0), 0);
  const balance = { label: 'ABN AMRO BALANCE', amount: liveBankBalance };

  return (
    <div className="-mx-4 pb-8">
      <PendingBanner amount={pendingTotal} count={pendingCount} />
      <IcsReminderBanner />
      <BalanceRow label={balance.label} amount={balance.amount} />

      <section className="mt-5 border-b border-rule px-5 pb-4">
        <SpentCard
          spent={spent}
          monthLabel={monthAbbr}
          monthEndLabel={monthEndLabel}
          budget={budget}
          isOver={isOver}
          daily={dailyActual}
          fixed={fixedSchedule}
          posted={matched.posted}
          unposted={matched.unposted}
          daysInMonth={daysInMonth}
          projection={projection}
          fixedRemainingAmount={fixedRemainingAmount}
          monthKey={monthKey}
          manualPostedKeys={manualPostedKeys}
        />
      </section>

      <HomeCategoryList
        entries={categoryEntries}
        totalCount={categorySpending.length}
        moreCount={moreCategoryCount}
        onCategoryClick={handleCategoryClick}
      />

      <section className="mt-5 px-5">
        <header className="flex items-baseline justify-between py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
            RECENT TRANSACTIONS
          </span>
          <Link
            to="/transactions"
            className="press nums font-mono text-[10px] uppercase tracking-[0.06em] text-accent"
          >
            ALL {summary.transactionCount} →
          </Link>
        </header>
        {recentTransactions.map((t) => {
          const category = t.categoryId ? categoryById.get(t.categoryId) : null;
          const isIncome = t.amount > 0;
          const isPending = t.reimbursement?.status === 'pending';
          const isUncat = !t.categoryId;
          const time = format(t.date, 'HH:mm');
          const categoryLabel = category?.name.toUpperCase() ?? 'UNCATEGORIZED';
          const variant = isPending
            ? 'pending'
            : isIncome
              ? 'income'
              : isUncat
                ? 'uncat'
                : 'default';

          return (
            <TransactionRow
              key={t.id}
              className="!px-0"
              merchant={t.counterparty ?? t.description}
              amount={formatAmount(t.amount, { showSign: false })}
              sign={isIncome ? '+' : '-'}
              meta={categoryLabel}
              time={time}
              variant={variant}
              onClick={() => {
                void navigate(`/transactions?id=${t.id}`);
              }}
            />
          );
        })}
      </section>
    </div>
  );
}
