import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/utils';

interface SpentHeadlineProps {
  spent: number;
  budget: number;
  delta: number | null;
  prevMonthLabel: string;
  isOver: boolean;
}

export function SpentHeadline({
  spent,
  budget,
  delta,
  prevMonthLabel,
  isOver,
}: SpentHeadlineProps) {
  const deltaArrow = delta === null ? null : delta < 0 ? '▼' : delta > 0 ? '▲' : '·';
  const deltaIsImprovement = delta !== null && delta < 0;
  const deltaTone = deltaIsImprovement ? 'text-accent' : 'text-warn';

  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-6 pb-4 hairline-b">
      <div
        className={cn(
          'nums font-mono text-ct-headline leading-none',
          isOver ? 'text-warn' : 'text-textHi'
        )}
      >
        {formatAmount(spent, { showSign: false })}
      </div>
      <div className="flex flex-col items-end gap-1 pt-1">
        {delta !== null && (
          <div className={cn('nums font-mono text-[10px] tracking-[0.04em]', deltaTone)}>
            {deltaArrow} {formatAmount(Math.abs(delta), { showSign: false })} vs {prevMonthLabel}
          </div>
        )}
        <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-textLo leading-tight text-right">
          SPENT / BUDGET
          <br />
          <span className="nums">
            {formatAmount(spent, { showSign: false })} / {formatAmount(budget, { showSign: false })}
          </span>
        </div>
      </div>
    </div>
  );
}
