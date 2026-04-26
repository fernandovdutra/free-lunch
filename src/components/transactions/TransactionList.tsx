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
}

/**
 * Phase 5 list rendering. Each month is its own `<section>`; the month
 * header at the top of each section uses `position: sticky` so it pins
 * to the top of the scroll viewport (just below the filter pill row)
 * until the next month's header arrives and pushes it up — same as
 * iOS Contacts / Photos. No global "month overlay" — each header is
 * a real row in the flow.
 */
export function TransactionList({ months, categories, onRowTap }: TransactionListProps) {
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
        <section key={month.key} data-month={month.key}>
          <MonthHeaderRow
            label={month.label}
            netTotal={month.netTotal}
            count={month.count}
          />
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

interface MonthHeaderRowProps {
  label: string;
  netTotal: number;
  count: number;
}

/**
 * Single sticky month row. Sits at the top of each `<section data-month>`
 * with `position: sticky; top: 90px` (44 TopBar + 46 filter pills). Uses
 * `bg-bg` (page background) so when content scrolls beneath it the row
 * remains opaque. v8 measurements: APR label font-mono 13px / weight 500
 * / letterSpacing ~0.09em / textHi; total `€X · N TXN` font-mono 11px /
 * letterSpacing ~0.04em / textLo.
 */
function MonthHeaderRow({ label, netTotal, count }: MonthHeaderRowProps) {
  return (
    <div
      className="sticky z-10 flex items-baseline justify-between bg-bg px-4 py-2 hairline-b top-[calc(44px+46px+env(safe-area-inset-top,0px))]"
    >
      <span className="font-mono text-[13px] font-medium uppercase tracking-[0.09em] text-textHi">
        {label}
      </span>
      <span className="nums font-mono text-[11px] tracking-[0.04em] text-textLo">
        {formatAmount(netTotal, { showSign: false })} · {count} TXN
      </span>
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
