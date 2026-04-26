import { Link, useNavigate } from 'react-router-dom';
import {
  format,
  getDate,
  getDaysInMonth,
  isAfter,
} from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import { SectionHeader, TransactionRow } from '@/components/redesign';
import {
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

  // Linear extrapolation for the current month: if 4 days into a 30-day month
  // we've spent €100, project = €100 / 4 * 30 = €750. For past months, the
  // projection collapses to the actual spent — we hide the right-stack to keep
  // the headline calm.
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
          projection.delta > 0
            ? ('+' as const)
            : projection.delta < 0
              ? ('-' as const)
              : ('·' as const),
      }
    : null;

  const pendingTotal = summary.pendingReimbursements;
  const pendingCount =
    current?.recentTransactions.filter((t) => t.reimbursement?.status === 'pending').length ?? 0;

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

  // Bank-account balance is not yet exposed by any current hook — useBankConnections
  // returns connection metadata only. The BalanceRow primitive is in place
  // (src/components/home/BalanceRow.tsx) and Phase 10 will wire it.

  return (
    <div className="pb-8">
      <PendingBanner amount={pendingTotal} count={pendingCount} />

      <SpentBlock
        spent={spent}
        spentFormatted={formatAmount(spent, { showSign: false })}
        monthLabel={monthAbbr}
        projection={projectionView}
        isOver={isOver}
      />

      <BudgetLine spent={spent} budget={budget} isOver={isOver} />

      <HomeCategoryList
        entries={categoryEntries}
        totalCount={categorySpending.length}
        moreCount={moreCategoryCount}
        onCategoryClick={handleCategoryClick}
      />

      <section className="mt-6">
        <SectionHeader
          right={
            <Link
              to="/transactions"
              className="press nums font-mono text-[10px] uppercase tracking-[0.06em] text-accent"
            >
              ALL {summary.transactionCount} →
            </Link>
          }
        >
          RECENT TRANSACTIONS
        </SectionHeader>
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
