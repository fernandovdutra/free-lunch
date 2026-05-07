import { cn } from '@/lib/utils';

interface DrillHeadlineProps {
  /** Pre-formatted amount (e.g. `€4,292.00`). Cents are split visually. */
  amountFormatted: string;
  /** UPPER month label e.g. `APR 2026`. Right-stacked above optional budget caption. */
  monthLabel: string;
  /** Pre-formatted budget cap label (e.g. `BUDGET €4,500`). Omit at L3. */
  budgetCaption?: string;
  className?: string;
}

function splitCents(formatted: string): { whole: string; cents: string | null } {
  const m = /^(.*)([.,])(\d{2})$/.exec(formatted);
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    return { whole: formatted, cents: null };
  }
  return { whole: m[1] + m[2], cents: m[3] };
}

/**
 * Big-number headline used at the top of every drill page. Per v8 frames
 * 04/05/06: `€4,292` at 38px JBM textHi + `.00` at 17px JBM textLo (split
 * cents), with a right-stack of `APR 2026` + optional `BUDGET €4,500`.
 */
export function DrillHeadline({
  amountFormatted,
  monthLabel,
  budgetCaption,
  className,
}: DrillHeadlineProps) {
  const { whole, cents } = splitCents(amountFormatted);

  return (
    <div className={cn('flex items-start justify-between gap-3 px-4', className)}>
      <div
        className="nums font-mono leading-none text-textHi"
        style={{ fontSize: 38, letterSpacing: '-0.025em' }}
      >
        <span>{whole}</span>
        {cents && (
          <span
            className="nums font-mono ml-px align-baseline text-textLo"
            style={{ fontSize: 17, letterSpacing: '-0.025em' }}
          >
            {cents}
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 pt-1">
        <span className="font-mono text-[10px] tracking-[0.05em] text-textLo">
          {monthLabel}
        </span>
        {budgetCaption && (
          <span className="font-mono text-[8.5px] tracking-[0.04em] text-accent">
            {budgetCaption}
          </span>
        )}
      </div>
    </div>
  );
}
