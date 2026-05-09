import { cn, formatAmount } from '@/lib/utils';
import type { FixedCost } from '@/lib/burnUp';
import { BurnUp } from './BurnUp';

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
  /** Days in the visible month. */
  daysInMonth: number;
  /** End-of-month projection. `null` for past months and day-zero. */
  projection: { amount: number; delta: number; isOver: boolean } | null;
  /** Sum of fixed costs scheduled strictly after today. */
  fixedRemainingAmount: number;
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
  daysInMonth,
  projection,
  fixedRemainingAmount,
}: SpentCardProps) {
  const today = Math.max(0, daily.length - 1);
  const { whole, cents } = splitCents(formatAmount(spent, { showSign: false, noCents: true }));
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const projOver = projection?.isOver ?? false;

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
            budget={budget}
            daysInMonth={daysInMonth}
            today={today}
            isOver={isOver}
            projOver={projOver}
          />
        </div>
      )}

      {/* Bottom summary: pace on the left, delta on the right. */}
      {projection && (
        <div className="mt-2 flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.04em]">
          <span className="text-textLo">
            AT THIS PACE{' '}
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
      )}

      {/* Footnote: only when there are upcoming fixed costs to post. */}
      {fixedRemainingAmount > 0 && (
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.04em] text-textDim nums">
          {formatAmount(fixedRemainingAmount, { showSign: false, noCents: true })} FIXED COSTS STILL TO POST
        </div>
      )}
    </div>
  );
}
