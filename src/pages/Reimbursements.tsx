import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useCategories } from '@/hooks/useCategories';
import {
  usePendingReimbursements,
  useClearedReimbursements,
} from '@/hooks/useReimbursements';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import type { Transaction } from '@/types';

const CLOSED_STORAGE_KEY = 'freelunch:reimbursements:closed-expanded';

function splitCents(formatted: string): { whole: string; cents: string | null } {
  const m = /^(.*)([.,])(\d{2})$/.exec(formatted);
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    return { whole: formatted, cents: null };
  }
  return { whole: m[1], cents: m[3] };
}

function daysOpenLabel(date: Date, now: Date): string {
  const diff = Math.max(0, differenceInCalendarDays(now, date));
  if (diff === 0) return 'TODAY';
  if (diff === 1) return '1d OPEN';
  return `${diff}d OPEN`;
}

export function Reimbursements() {
  const { selectedMonth } = useMonth();
  const { data: categories = [] } = useCategories();
  const {
    data: pending,
    isLoading: pendingLoading,
    error: pendingError,
  } = usePendingReimbursements();
  const {
    data: cleared,
    isLoading: clearedLoading,
    error: clearedError,
  } = useClearedReimbursements({ limit: 50 });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [closedExpanded, setClosedExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(CLOSED_STORAGE_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CLOSED_STORAGE_KEY, closedExpanded ? '1' : '0');
  }, [closedExpanded]);

  const editingTransaction = useMemo<Transaction | null>(() => {
    if (!editingId) return null;
    return (
      pending.find((t) => t.id === editingId) ??
      cleared.find((t) => t.id === editingId) ??
      null
    );
  }, [editingId, pending, cleared]);

  const now = new Date();

  const owedTotal = pending.reduce((s, t) => s + Math.abs(t.amount), 0);
  const owedFormatted = formatAmount(owedTotal, { showSign: false });
  const { whole: owedWhole, cents: owedCents } = splitCents(owedFormatted);

  const monthAbbr = format(selectedMonth, 'MMM').toUpperCase();
  const resolvedThisMonth = cleared
    .filter((t) => {
      const d = t.reimbursement?.clearedAt;
      if (!d) return false;
      return (
        d.getFullYear() === selectedMonth.getFullYear() &&
        d.getMonth() === selectedMonth.getMonth()
      );
    })
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const sublabel =
    pending.length === 0
      ? `0 OPEN · ${formatAmount(resolvedThisMonth, { showSign: false, noCents: true })} RESOLVED ${monthAbbr}`
      : `${pending.length} OPEN · ${formatAmount(resolvedThisMonth, { showSign: false, noCents: true })} RESOLVED ${monthAbbr}`;

  if (pendingError ?? clearedError) {
    return (
      <div className="px-5 py-12 font-mono text-[12px] uppercase tracking-[0.12em] text-warn">
        ▲ FAILED TO LOAD REIMBURSEMENTS
      </div>
    );
  }

  if (pendingLoading || clearedLoading) {
    return (
      <div className="px-5 py-12 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
        LOADING…
      </div>
    );
  }

  return (
    <div className="-mx-4 pb-8">
      {/* Section 1: Phosphor total */}
      <section
        className="border-b border-rule"
        style={{ padding: '14px 20px 18px' }}
      >
        <div
          className="font-mono text-[10px] text-textLo"
          style={{ letterSpacing: '0.06em', marginBottom: 8 }}
        >
          YOU&apos;RE OWED
        </div>
        <div
          className="flex items-baseline gap-2 nums font-mono text-accent"
          style={{
            fontWeight: 400,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            fontFeatureSettings: '"tnum"',
            fontSize: 48,
          }}
        >
          <span>{owedWhole.replace(/[.,]$/, '')}</span>
          {owedCents && (
            <span style={{ fontSize: 22, color: 'var(--accent-dim)', opacity: 1 }}>
              .{owedCents}
            </span>
          )}
        </div>
        <div
          className="font-mono text-[10.5px] text-textLo"
          style={{ letterSpacing: '0.05em', marginTop: 10 }}
        >
          {sublabel}
        </div>
      </section>

      {/* Section 2: OPEN list */}
      <header
        className="flex items-baseline justify-between font-mono text-[10px] text-textLo"
        style={{ padding: '16px 16px 6px', letterSpacing: '0.06em' }}
      >
        <span>OPEN</span>
        <span>{pending.length} ITEM{pending.length === 1 ? '' : 'S'}</span>
      </header>

      {pending.length === 0 ? (
        <div className="px-5 py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
          NOTHING OPEN · YOU&apos;RE EVEN
        </div>
      ) : (
        pending.map((t) => {
          const merchant = t.counterparty ?? t.description;
          const dateLabel = format(t.date, 'MMM d').toUpperCase();
          const days = daysOpenLabel(t.date, now);
          const meta = `${dateLabel} · ${days}`;
          const amountFormatted = formatAmount(Math.abs(t.amount), { showSign: false });
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setEditingId(t.id); }}
              className="press grid w-full items-center border-b border-rule text-left"
              style={{
                gridTemplateColumns: '10px 1fr auto',
                gap: 12,
                padding: '12px 16px',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 4,
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent)',
                  justifySelf: 'center',
                }}
              />
              <div className="min-w-0">
                <div
                  className="truncate text-textHi"
                  style={{ fontSize: 13.5, marginBottom: 2 }}
                >
                  {merchant}
                </div>
                <div
                  className="font-mono text-textMid"
                  style={{ fontSize: 10, letterSpacing: '0.04em' }}
                >
                  {meta}
                </div>
              </div>
              <div
                className="nums font-mono text-accent"
                style={{
                  fontSize: 14,
                  letterSpacing: '-0.02em',
                  fontFeatureSettings: '"tnum"',
                  textAlign: 'right',
                }}
              >
                +{amountFormatted}
              </div>
            </button>
          );
        })
      )}

      {/* Section 3: CLOSED — collapsible, default collapsed */}
      <button
        type="button"
        onClick={() => { setClosedExpanded((v) => !v); }}
        className="press flex w-full items-baseline justify-between font-mono text-[10px] text-textLo"
        style={{ padding: '20px 16px 12px', letterSpacing: '0.06em' }}
      >
        <span>CLOSED · LAST 90 DAYS</span>
        <span>
          {cleared.length} ·{' '}
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              transform: closedExpanded ? 'rotate(45deg)' : 'none',
              transition: 'transform 180ms ease-out',
            }}
          >
            +
          </span>
        </span>
      </button>

      {closedExpanded && (
        cleared.length === 0 ? (
          <div className="px-5 py-6 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
            NOTHING CLOSED IN THE LAST 90 DAYS
          </div>
        ) : (
          cleared.map((t) => {
            const merchant = t.counterparty ?? t.description;
            const dateLabel = format(t.date, 'MMM d').toUpperCase();
            const clearedAt = t.reimbursement?.clearedAt;
            const clearedLabel = clearedAt
              ? `CLEARED ${format(clearedAt, 'MMM d').toUpperCase()}`
              : 'CLEARED';
            const meta = `${dateLabel} · ${clearedLabel}`;
            const amountFormatted = formatAmount(Math.abs(t.amount), { showSign: false });
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setEditingId(t.id); }}
                className="press grid w-full items-center border-b border-rule text-left"
                style={{
                  gridTemplateColumns: '10px 1fr auto',
                  gap: 12,
                  padding: '12px 16px',
                  opacity: 0.65,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 4,
                    backgroundColor: 'var(--rule-hi)',
                    justifySelf: 'center',
                  }}
                />
                <div className="min-w-0">
                  <div
                    className="truncate text-textMid"
                    style={{ fontSize: 13.5, marginBottom: 2 }}
                  >
                    {merchant}
                  </div>
                  <div
                    className="font-mono text-textLo"
                    style={{ fontSize: 10, letterSpacing: '0.04em' }}
                  >
                    {meta}
                  </div>
                </div>
                <div
                  className="nums font-mono text-textMid"
                  style={{
                    fontSize: 14,
                    letterSpacing: '-0.02em',
                    fontFeatureSettings: '"tnum"',
                    textAlign: 'right',
                  }}
                >
                  +{amountFormatted}
                </div>
              </button>
            );
          })
        )
      )}

      {/* Edit Sheet (Phase 6) — opens on row tap */}
      <TransactionForm
        open={!!editingTransaction}
        onOpenChange={(o) => {
          if (!o) setEditingId(null);
        }}
        transaction={editingTransaction}
        categories={categories}
      />
    </div>
  );
}
