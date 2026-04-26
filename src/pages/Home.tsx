import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  differenceInDays,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
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
  SpentHeadline,
  type HomeCategoryEntry,
} from '@/components/home';

export function Home() {
  const navigate = useNavigate();
  const { selectedMonth, dateRange, isCurrentMonth } = useMonth();

  const prevRange = useMemo(() => {
    const prev = subMonths(dateRange.startDate, 1);
    return { startDate: startOfMonth(prev), endDate: endOfMonth(prev) };
  }, [dateRange.startDate]);

  const { data: current, error } = useDashboardData(dateRange);
  const { data: previous } = useDashboardData(prevRange);
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
  const prevMonthAbbr = format(prevRange.startDate, 'MMM').toUpperCase();

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

  const delta = previous ? spent - previous.summary.totalExpenses : null;

  const daysLeft = isCurrentMonth
    ? Math.max(0, differenceInDays(endOfMonth(new Date()), new Date()))
    : null;

  const pendingTotal = summary.pendingReimbursements;
  const pendingCount =
    current?.recentTransactions.filter((t) => t.reimbursement?.status === 'pending').length ?? 0;

  const categorySpending = current?.categorySpending ?? [];
  const topCategories = categorySpending.slice(0, 4);
  const moreCategoryCount = Math.max(0, categorySpending.length - topCategories.length);

  const progressByCategory = new Map(budgetProgress.map((p) => [p.budget.categoryId, p]));

  const categoryEntries: HomeCategoryEntry[] = topCategories.map((c) => {
    const bp = progressByCategory.get(c.categoryId);
    const isCatOver = bp ? c.amount > bp.budget.monthlyLimit : false;

    const metaParts = [
      `${c.transactionCount} TXN`,
      `${c.percentage.toFixed(1)}% OF ${monthAbbr}`,
    ];
    if (bp) {
      if (isCatOver) {
        metaParts.push(
          `OVER ${formatAmount(c.amount - bp.budget.monthlyLimit, { showSign: false })}`
        );
      } else {
        metaParts.push(`${formatAmount(bp.remaining, { showSign: false })} LEFT`);
      }
    }

    return {
      categoryId: c.categoryId,
      name: c.categoryName,
      amount: formatAmount(c.amount, { showSign: false }),
      meta: metaParts.join(' · '),
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

  return (
    <div className="pb-8">
      <PendingBanner amount={pendingTotal} count={pendingCount} />

      <SpentHeadline
        spent={spent}
        budget={budget}
        delta={delta}
        prevMonthLabel={prevMonthAbbr}
        isOver={isOver}
      />

      <BudgetLine spent={spent} budget={budget} daysLeft={daysLeft} isOver={isOver} />

      <HomeCategoryList
        entries={categoryEntries}
        moreCount={moreCategoryCount}
        onCategoryClick={handleCategoryClick}
      />

      <section>
        <SectionHeader
          tether
          right={
            <Link to="/transactions" className="press text-textMid">
              VIEW ALL ›
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
          const dateLabel = format(t.date, 'MMM d').toUpperCase();
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
              meta={`${dateLabel} · ${categoryLabel}`}
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
