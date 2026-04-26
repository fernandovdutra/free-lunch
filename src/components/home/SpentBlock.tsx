import { cn } from '@/lib/utils';

interface SpentBlockProps {
  spentFormatted: string;
  monthLabel: string;
  projection: { amountFormatted: string; deltaFormatted: string; deltaSign: '+' | '-' | '·' } | null;
  isOver: boolean;
}

function splitCents(formatted: string): { whole: string; cents: string | null } {
  const m = /^(.*)([.,])(\d{2})$/.exec(formatted);
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    return { whole: formatted, cents: null };
  }
  return { whole: m[1] + m[2], cents: m[3] };
}

export function SpentBlock({ spentFormatted, monthLabel, projection, isOver }: SpentBlockProps) {
  const { whole, cents } = splitCents(spentFormatted);
  const projTone =
    projection?.deltaSign === '+'
      ? 'text-warn'
      : projection?.deltaSign === '-'
        ? 'text-accent'
        : 'text-textLo';

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.05em] text-textLo">
        SPENT · {monthLabel}
      </div>
      {projection ? (
        <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
          PROJ {monthLabel}
        </div>
      ) : (
        <span />
      )}

      <div
        className={cn(
          'nums font-sans font-medium leading-none mt-1',
          isOver ? 'text-warn' : 'text-textHi'
        )}
        style={{ fontSize: 44, letterSpacing: '-0.03em' }}
      >
        <span>{whole}</span>
        {cents && (
          <span
            className={cn('nums font-mono ml-px align-baseline', isOver ? 'text-warn/70' : 'text-textLo')}
            style={{ fontSize: 22, fontWeight: 500 }}
          >
            {cents}
          </span>
        )}
      </div>

      {projection && (
        <div className="text-right">
          <div className={cn('nums font-mono text-[13px] mt-1', isOver ? 'text-warn' : 'text-textHi')}>
            {projection.amountFormatted}
          </div>
          {projection.deltaSign !== '·' && (
            <div className={cn('nums font-mono text-[10px] tracking-[0.02em] mt-0.5', projTone)}>
              {projection.deltaSign === '+' ? '▲' : '▼'} {projection.deltaFormatted}{' '}
              {projection.deltaSign === '+' ? 'over' : 'under'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
