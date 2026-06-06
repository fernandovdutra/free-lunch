import { useState } from 'react';
import { cn, formatAmount } from '@/lib/utils';
import type { FixedCost, ProjectionBreakdown } from '@/lib/burnUp';
import { BurnUp } from './BurnUp';
import { FixedCostsMonthSheet } from './FixedCostsMonthSheet';

interface SpentCardProps {
  /** Total expenses in the visible month. */
  spent: number;
  /** "MAY". Used in the header label. */
  monthLabel: string;
  /** "MAY 31". Used in the bottom summary's "BY {…}". */
  monthEndLabel: string;
  /** Sum of active monthly limits. */
  budget: number;
  /** Whether actual spent has already exceeded the budget. */
  isOver: boolean;
  /** Cumulative spend per day. Index 0 = €0. */
  daily: number[];
  /** Confirmed fixed-cost schedule for the month. */
  fixed: FixedCost[];
  /** Schedule items whose matching transaction has already posted. */
  posted: FixedCost[];
  /** Schedule items still expected (upcoming or overdue). */
  unposted: FixedCost[];
  /** Days in the visible month. */
  daysInMonth: number;
  /** End-of-month projection. `null` for past months and day-zero. */
  projection: {
    amount: number;
    delta: number;
    isOver: boolean;
    breakdown: ProjectionBreakdown;
  } | null;
  /** Sum of unposted fixed costs (upcoming + overdue). */
  fixedRemainingAmount: number;
  /** "YYYY-MM" of the visible month — scope for manual "mark posted" overrides. */
  monthKey: string;
  /** Keys the user manually marked posted this month (distinguishes them in the sheet). */
  manualPostedKeys: ReadonlySet<string>;
}

function splitCents(formatted: string): { whole: string; cents: string | null } {
  const m = /^(.*)([.,])(\d{2})$/.exec(formatted);
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    return { whole: formatted, cents: null };
  }
  return { whole: m[1] + m[2], cents: m[3] };
}

export function SpentCard({
  spent,
  monthLabel,
  monthEndLabel,
  budget,
  isOver,
  daily,
  fixed,
  posted,
  unposted,
  daysInMonth,
  projection,
  fixedRemainingAmount,
  monthKey,
  manualPostedKeys,
}: SpentCardProps) {
  const today = Math.max(0, daily.length - 1);
  const { whole, cents } = splitCents(formatAmount(spent, { showSign: false, noCents: true }));
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const projOver = projection?.isOver ?? false;
  const [statusOpen, setStatusOpen] = useState(false);

  // Footnote/entry point shows when there's something to act on: outstanding
  // fixed costs, or at least one item the user manually marked posted (so the
  // mark stays reachable to undo even once nothing is outstanding).
  const showFixedFootnote = fixedRemainingAmount > 0 || manualPostedKeys.size > 0;

  return (
    <div>
      {/* Header row: SPENT label + big number on the left,
          OF €{budget} / NN% USED stack on the right. */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.05em] text-textLo">
            SPENT · {monthLabel}
          </div>
          <div
            className={cn(
              'nums font-sans font-medium leading-none mt-1',
              isOver ? 'text-alert' : 'text-textHi'
            )}
            style={{ fontSize: 44, letterSpacing: '-0.03em' }}
          >
            <span>{whole}</span>
            {cents && (
              <span
                className={cn(
                  'nums font-mono ml-px align-baseline',
                  isOver ? 'text-alert/70' : 'text-textLo'
                )}
                style={{ fontSize: 22, fontWeight: 500 }}
              >
                {cents}
              </span>
            )}
          </div>
        </div>

        {budget > 0 && (
          <div className="text-right pt-0.5 leading-tight">
            <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-textLo nums">
              OF {formatAmount(budget, { showSign: false, noCents: true })}
            </div>
            <div
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.04em] mt-0.5 nums',
                isOver ? 'text-alert' : 'text-textLo'
              )}
            >
              {pct}% USED
            </div>
          </div>
        )}
      </div>

      {/* Burn-up chart */}
      {budget > 0 && (
        <div className="mt-3">
          <BurnUp
            daily={daily}
            fixed={fixed}
            posted={posted}
            unposted={unposted}
            budget={budget}
            daysInMonth={daysInMonth}
            today={today}
            isOver={isOver}
            projOver={projOver}
          />
        </div>
      )}

      {/* Legend — names the three paths so target vs forecast is unambiguous. */}
      {budget > 0 && (
        <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.04em] text-textLo">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-0 w-3 border-t-2"
              style={{ borderColor: isOver ? 'var(--alert)' : 'var(--accent)' }}
            />
            SPENT
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-0 w-3 border-t border-dashed"
              style={{ borderColor: 'var(--text-lo)' }}
            />
            PACE
          </span>
          {projection && (
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-0 w-3 border-t border-dashed"
                style={{ borderColor: projOver ? 'var(--alert)' : 'var(--accent)' }}
              />
              PROJECTED
            </span>
          )}
        </div>
      )}

      {/* Bottom summary: projected month-end on the left, delta on the right. */}
      {projection && (
        <>
          <div className="mt-2 flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.04em]">
            <span className="text-textLo">
              PROJECTED{' '}
              <span className={cn('nums', projOver ? 'text-alert' : 'text-textHi')}>
                {formatAmount(projection.amount, { showSign: false, noCents: true })}
              </span>{' '}
              BY {monthEndLabel}
            </span>
            {projection.delta !== 0 && (
              <span className={cn('nums', projOver ? 'text-alert' : 'text-accent')}>
                {projOver ? '▲' : '▼'}{' '}
                {formatAmount(Math.abs(projection.delta), { showSign: false, noCents: true })}
              </span>
            )}
          </div>
          {/* Decomposition: how much of the projection is locked in (spent +
              bills still due) versus forecast discretionary spending — so the
              over/under is read as a variable-spending lever, not the bills. */}
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-textDim nums">
            {formatAmount(projection.breakdown.committed, { showSign: false, noCents: true })}{' '}
            COMMITTED ·{' '}
            {formatAmount(projection.breakdown.variable, { showSign: false, noCents: true })}{' '}
            DISCRETIONARY
          </div>
        </>
      )}

      {/* Footnote: tap to review which fixed costs are matched vs still to
          post, and to manually mark a missed charge as already posted. */}
      {showFixedFootnote && (
        <button
          type="button"
          onClick={() => {
            setStatusOpen(true);
          }}
          className="press mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.04em] text-textDim nums"
        >
          <span>
            {fixedRemainingAmount > 0
              ? `${formatAmount(fixedRemainingAmount, { showSign: false, noCents: true })} FIXED COSTS STILL TO POST`
              : 'ALL FIXED COSTS POSTED'}
          </span>
          <span aria-hidden className="text-textLo">
            ›
          </span>
        </button>
      )}

      <FixedCostsMonthSheet
        open={statusOpen}
        onOpenChange={setStatusOpen}
        monthKey={monthKey}
        monthLabel={monthLabel}
        posted={posted}
        unposted={unposted}
        manualPostedKeys={manualPostedKeys}
      />
    </div>
  );
}
