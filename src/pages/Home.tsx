import { Link, useNavigate } from 'react-router-dom';
import { format, getDate, getDaysInMonth, isAfter } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { usePendingReimbursements } from '@/hooks/useReimbursements';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import { TransactionRow } from '@/components/redesign';
import {
  BalanceRow,
  BudgetLine,
  HomeCategoryList,
  PendingBanner,
  SpentBlock,
  type HomeCategoryEntry,
} from '@/components/home';

export function Home() {
  const navigate = useNavigate();
  const { selectedMonth, isCurrentMonth, dateRange } = useMonth();

  const { data: current, error } = useDashboardData(dateRange);
  const { data: budgets = [] } = useBudgets();
  const { data: budgetProgress } = useBudgetProgress(dateRange);
  const { data: categories = [] } = useCategories();
  const { data: pendingReimbursements = [] } = usePendingReimbursements();

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

  const projection: { amount: number; delta: number } | null =
    isCurrentMonth && spent > 0 && dayOfMonth > 0 && !isFutureMonth
      ? (() => {
          const projectedAmount = (spent / dayOfMonth) * daysInMonth;
          const delta = projectedAmount - budget;
          return { amount: projectedAmount, delta };
        })()
      : null;

  const projectionView = projection
    ? {
        amountFormatted: formatAmount(projection.amount, { showSign: false }),
        deltaFormatted: formatAmount(Math.abs(projection.delta), { showSign: false }),
        deltaSign:
          projection.delta > 0 ? ('+' as const) : projection.delta < 0 ? ('-' as const) : ('·' as const),
      }
    : null;

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

  const progressByCategory = new Map((budgetProgress ?? []).map((p) => [p.budget.categoryId, p]));

  const categoryEntries: HomeCategoryEntry[] = topCategories.map((c) => {
    const bp = progressByCategory.get(c.categoryId);
    const isCatOver = bp ? c.amount > bp.budget.monthlyLimit : false;

    let trailing: string | undefined;
    if (bp) {
      trailing = isCatOver
        ? `${formatAmount(c.amount - bp.budget.monthlyLimit, { showSign: false })} over`
        : `${formatAmount(bp.remaining, { showSign: false })} left`;
    }

    return {
      categoryId: c.categoryId,
      name: c.categoryName,
      amount: formatAmount(c.amount, { showSign: false }),
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

  // Bank-account balance is not yet exposed by any current hook —
  // useBankConnections returns connection metadata only. Until Phase 10 wires
  // a real balance hook, fall back to net cashflow for the period as a
  // stand-in. Label per v8 (only ABN AMRO is supported in MVP).
  const balance = { label: 'ABN AMRO BALANCE', amount: summary.netBalance };

  return (
    <div className="-mx-4 pb-8">
      <PendingBanner amount={pendingTotal} count={pendingCount} />
      <BalanceRow label={balance.label} amount={balance.amount} />

      <section className="mt-5 border-b border-rule px-5 pb-4">
        <SpentBlock
          spentFormatted={formatAmount(spent, { showSign: false })}
          monthLabel={monthAbbr}
          projection={projectionView}
          isOver={isOver}
        />
        <BudgetLine spent={spent} budget={budget} isOver={isOver} />
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
