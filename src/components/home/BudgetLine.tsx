import { ProgressBar } from '@/components/redesign';
import { cn, formatAmount } from '@/lib/utils';

interface BudgetLineProps {
  spent: number;
  budget: number;
  daysLeft: number | null;
  isOver: boolean;
}

export function BudgetLine({ spent, budget, daysLeft, isOver }: BudgetLineProps) {
  const remaining = Math.max(0, budget - spent);
  const over = Math.max(0, spent - budget);

  const tail =
    daysLeft !== null ? ` · ${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'} LEFT` : '';

  return (
    <div className="px-5 pt-3 pb-5">
      <ProgressBar value={spent} max={Math.max(budget, 1)} variant={isOver ? 'warn' : 'accent'} />
      <div
        className={cn(
          'mt-2 font-mono text-[10px] uppercase tracking-[0.12em]',
          isOver ? 'text-warn' : 'text-textLo'
        )}
      >
        {isOver ? (
          <>
            <span className="nums">{formatAmount(over, { showSign: false })}</span> OVER BUDGET
            {tail}
          </>
        ) : (
          <>
            <span className="nums">{formatAmount(remaining, { showSign: false })}</span> LEFT
            {tail}
          </>
        )}
      </div>
    </div>
  );
}
