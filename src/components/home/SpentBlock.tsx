import { cn } from '@/lib/utils';

interface SpentBlockProps {
  /** Big spent number (already formatted, e.g. "€4,292"). The cents fragment
   *  ".00" is rendered at smaller size by splitting at the trailing two
   *  decimal positions. */
  spent: number;
  /** Locale-formatted amount string for the headline (cents will be split). */
  spentFormatted: string;
  monthLabel: string;
  /** Projected end-of-month spend (already formatted). Pass null to hide
   *  the right-stack entirely (e.g. for historical months). */
  projection: { amountFormatted: string; deltaFormatted: string; deltaSign: '+' | '-' | '·' } | null;
  isOver: boolean;
}

function splitCents(formatted: string): { whole: string; cents: string | null } {
  // Match a trailing decimal separator + 2 digits (Dutch ',00' or English '.00').
  const m = /^(.*)([.,])(\d{2})$/.exec(formatted);
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    return { whole: formatted, cents: null };
  }
  return { whole: m[1] + m[2], cents: m[3] };
}

export function SpentBlock({
  spentFormatted,
  monthLabel,
  projection,
  isOver,
}: SpentBlockProps) {
  const { whole, cents } = splitCents(spentFormatted);
  const projTone =
    projection?.deltaSign === '+' ? 'text-warn' : projection?.deltaSign === '-' ? 'text-accent' : 'text-textLo';

  return (
    <div className="mt-5 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-textLo">
          SPENT · {monthLabel}
        </div>
        <div
          className={cn(
            'nums mt-2 font-sans font-medium leading-none',
            isOver ? 'text-warn' : 'text-textHi'
          )}
          style={{ fontSize: 44, letterSpacing: '-0.03em' }}
        >
          <span>{whole}</span>
          {cents && (
            <span className={cn('ml-px', isOver ? 'text-warn/70' : 'text-textLo')} style={{ fontSize: 24 }}>
              {cents}
            </span>
          )}
        </div>
      </div>
      {projection && (
        <div className="flex flex-col items-end gap-0.5 pt-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-textLo">
            PROJ {monthLabel}
          </span>
          <span className={cn('nums font-mono text-[14px]', isOver ? 'text-warn' : 'text-textHi')}>
            {projection.amountFormatted}
          </span>
          {projection.deltaSign !== '·' && (
            <span className={cn('nums font-mono text-[10px] tracking-[0.02em]', projTone)}>
              {projection.deltaSign === '+' ? '▲' : '▼'} {projection.deltaFormatted}{' '}
              {projection.deltaSign === '+' ? 'over' : 'under'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
