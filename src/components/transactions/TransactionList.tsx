import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  defaultRangeExtractor,
  useWindowVirtualizer,
  type Range,
} from '@tanstack/react-virtual';
import { TransactionRow, DayHeader } from '@/components/redesign';
import { formatAmount } from '@/lib/utils';
import type { Category, Transaction } from '@/types';
import type { DayBucket, MonthBucket } from './groupTransactions';

interface TransactionListProps {
  months: MonthBucket[];
  categories: Category[];
  onRowTap: (transactionId: string) => void;
}

// Flattened row model — months → days → txns become one linear list so the
// window virtualizer can render only the visible slice regardless of count.
type ListRow =
  | { kind: 'month'; key: string; label: string; netTotal: number; count: number }
  | { kind: 'day'; key: string; label: string; total: string }
  | { kind: 'txn'; key: string; txn: Transaction };

// Sticky month header pins this far below the viewport top: 44px TopBar +
// 46px filter pill row (safe-area inset handled in the CSS calc).
const STICKY_TOP = 'top-[calc(44px+46px+env(safe-area-inset-top,0px))]';

// Per-kind size estimates (px). Rows have regular heights — every txn row
// renders a meta line — so these are close; the virtualizer still measures
// each mounted row via `measureElement` to correct any wrapping.
function estimateRowSize(kind: ListRow['kind']): number {
  switch (kind) {
    case 'txn':
      return 62;
    case 'day':
      return 32;
    case 'month':
      return 38;
  }
}

function dayTotalLabel(day: DayBucket): string {
  if (day.isSelfCanceling) return '—';
  const prefix = day.netTotal > 0 ? '+' : day.netTotal < 0 ? '−' : '';
  return `${prefix}${formatAmount(day.netTotal, { showSign: false })}`;
}

function flattenMonths(months: MonthBucket[]): ListRow[] {
  const rows: ListRow[] = [];
  for (const month of months) {
    rows.push({
      kind: 'month',
      key: `m:${month.key}`,
      label: month.label,
      netTotal: month.netTotal,
      count: month.count,
    });
    for (const day of month.days) {
      rows.push({ kind: 'day', key: `d:${day.key}`, label: day.label, total: dayTotalLabel(day) });
      for (const t of day.txns) {
        rows.push({ kind: 'txn', key: t.id, txn: t });
      }
    }
  }
  return rows;
}

/**
 * Phase 5 list rendering, virtualized. The flat row list is windowed with
 * `useWindowVirtualizer` (the page scrolls at window level) so only the
 * on-screen rows are mounted. Each month header still pins to the top of the
 * scroll viewport — implemented with the standard react-virtual sticky pattern:
 * `rangeExtractor` always keeps the active month-header index rendered, and
 * that row is given `position: sticky` while the rest are absolutely
 * positioned. Same visual behaviour as iOS Contacts / Photos.
 */
export function TransactionList({ months, categories, onRowTap }: TransactionListProps) {
  const rows = useMemo(() => flattenMonths(months), [months]);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories]
  );

  // Indices of month-header rows — the sticky candidates.
  const stickyIndexes = useMemo(
    () => rows.flatMap((r, i) => (r.kind === 'month' ? [i] : [])),
    [rows]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    setScrollMargin(parentRef.current?.offsetTop ?? 0);
  }, [rows.length]);

  // Tracks which month header is currently pinned, so render can mark it sticky.
  const activeStickyIndexRef = useRef(0);
  const rangeExtractor = useCallback(
    (range: Range) => {
      const active = [...stickyIndexes].reverse().find((i) => i <= range.startIndex) ?? 0;
      activeStickyIndexRef.current = active;
      const next = new Set([active, ...defaultRangeExtractor(range)]);
      return [...next].sort((a, b) => a - b);
    },
    [stickyIndexes]
  );

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (i) => estimateRowSize(rows[i]!.kind),
    overscan: 8,
    scrollMargin,
    rangeExtractor,
  });

  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
        No transactions match these filters.
      </div>
    );
  }

  return (
    <div ref={parentRef} className="pb-8">
      <div
        style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const row = rows[vItem.index]!;
          const sticky = row.kind === 'month' && activeStickyIndexRef.current === vItem.index;
          return (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              className={sticky ? `sticky z-10 ${STICKY_TOP}` : undefined}
              style={
                sticky
                  ? { width: '100%' }
                  : {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vItem.start - scrollMargin}px)`,
                    }
              }
            >
              {row.kind === 'month' ? (
                <MonthHeaderRow label={row.label} netTotal={row.netTotal} count={row.count} />
              ) : row.kind === 'day' ? (
                <DayHeader label={row.label} total={row.total} />
              ) : (
                <TxnRow txn={row.txn} categoriesById={categoriesById} onRowTap={onRowTap} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TxnRowProps {
  txn: Transaction;
  categoriesById: Map<string, Category>;
  onRowTap: (transactionId: string) => void;
}

function TxnRow({ txn, categoriesById, onRowTap }: TxnRowProps) {
  const meta = buildMetaLine(txn, categoriesById);
  const variant = pickVariant(txn, categoriesById);
  const sign: '+' | '-' | '' =
    variant === 'transfer' ? '' : txn.amount > 0 ? '+' : txn.amount < 0 ? '-' : '';
  return (
    <TransactionRow
      merchant={txn.counterparty ?? txn.description}
      amount={formatAmount(txn.amount, { showSign: false })}
      sign={sign}
      meta={meta}
      time={format(txn.transactionDate ?? txn.bookingDate ?? txn.date, 'HH:mm')}
      {...(variant === 'uncat' ? { flag: '!' } : {})}
      variant={variant}
      onClick={() => {
        onRowTap(txn.id);
      }}
    />
  );
}

interface MonthHeaderRowProps {
  label: string;
  netTotal: number;
  count: number;
}

/**
 * Single month row. Positioning (sticky vs. absolute) is owned by the
 * virtualizer wrapper above; this component is just the opaque `bg-bg` content
 * so scrolled rows never show through. v8 measurements: APR label font-mono
 * 13px / weight 500 / letterSpacing ~0.09em / textHi; total `€X · N TXN`
 * font-mono 11px / letterSpacing ~0.04em / textLo.
 */
function MonthHeaderRow({ label, netTotal, count }: MonthHeaderRowProps) {
  return (
    <div className="flex items-baseline justify-between bg-bg px-4 py-2 hairline-b">
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
