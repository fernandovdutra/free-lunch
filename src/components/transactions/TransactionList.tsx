import { Fragment } from 'react';
import { format } from 'date-fns';
import { TransactionRow, DayHeader } from '@/components/redesign';
import { formatAmount } from '@/lib/utils';
import type { Category, Transaction } from '@/types';
import type { MonthBucket } from './groupTransactions';

interface TransactionListProps {
  months: MonthBucket[];
  categories: Category[];
  onRowTap: (transactionId: string) => void;
  /**
   * Per-month section ref callback. Used by Transactions.tsx to install an
   * IntersectionObserver that updates the sticky-bar's current month.
   */
  registerMonthSection?: (monthKey: string, el: HTMLElement | null) => void;
}

export function TransactionList({
  months,
  categories,
  onRowTap,
  registerMonthSection,
}: TransactionListProps) {
  if (months.length === 0) {
    return (
      <div className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
        No transactions match these filters.
      </div>
    );
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c] as const));

  return (
    <div className="pb-8">
      {months.map((month) => (
        <section
          key={month.key}
          data-month={month.key}
          ref={(el) => {
            registerMonthSection?.(month.key, el);
          }}
        >
          {month.days.map((day) => (
            <Fragment key={day.key}>
              <DayHeader
                label={day.label}
                total={
                  day.isSelfCanceling
                    ? '—'
                    : `${day.netTotal > 0 ? '+' : day.netTotal < 0 ? '−' : ''}${formatAmount(day.netTotal, { showSign: false })}`
                }
              />
              {day.txns.map((t) => {
                const meta = buildMetaLine(t, categoriesById);
                const variant = pickVariant(t, categoriesById);
                const sign: '+' | '-' | '' =
                  variant === 'transfer' ? '' : t.amount > 0 ? '+' : t.amount < 0 ? '-' : '';
                return (
                  <TransactionRow
                    key={t.id}
                    merchant={t.counterparty ?? t.description}
                    amount={formatAmount(t.amount, { showSign: false })}
                    sign={sign}
                    meta={meta}
                    time={format(t.transactionDate ?? t.bookingDate ?? t.date, 'HH:mm')}
                    variant={variant}
                    onClick={() => {
                      onRowTap(t.id);
                    }}
                  />
                );
              })}
            </Fragment>
          ))}
        </section>
      ))}
    </div>
  );
}

function pickVariant(
  t: Transaction,
  categoriesById: Map<string, Category>
): 'default' | 'pending' | 'transfer' | 'uncat' | 'income' {
  if (isTransferTxn(t, categoriesById)) return 'transfer';
  if (!t.categoryId) return 'uncat';
  if (t.reimbursement?.status === 'pending') return 'pending';
  if (t.amount > 0) return 'income';
  return 'default';
}

function isTransferTxn(t: Transaction, categoriesById: Map<string, Category>): boolean {
  if (!t.categoryId) return false;
  const cat = categoriesById.get(t.categoryId);
  if (!cat) return false;
  if (/^transfer/i.test(cat.name)) return true;
  if (cat.parentId) {
    const parent = categoriesById.get(cat.parentId);
    if (parent && /^transfer/i.test(parent.name)) return true;
  }
  return false;
}

function buildMetaLine(t: Transaction, categoriesById: Map<string, Category>): string {
  if (!t.categoryId) return 'UNCATEGORIZED';

  const cat = categoriesById.get(t.categoryId);
  const categoryLabel = (cat?.name ?? 'CATEGORY').toUpperCase();

  if (t.reimbursement?.status === 'pending') {
    const owed = formatAmount(Math.abs(t.amount), { showSign: false });
    return `${categoryLabel}· REIMB ${owed}`;
  }

  return categoryLabel;
}
