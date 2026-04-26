import { ProgressBar } from '@/components/redesign';
import { cn, formatAmount } from '@/lib/utils';

interface BudgetLineProps {
  spent: number;
  budget: number;
  isOver: boolean;
}

export function BudgetLine({ spent, budget, isOver }: BudgetLineProps) {
  if (budget <= 0) return null;
  const remaining = Math.max(0, budget - spent);
  const over = Math.max(0, spent - budget);
  const pct = Math.round((spent / budget) * 100);

  return (
    <div className="mt-3">
      <div
        className={cn(
          'flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.04em] mb-1.5',
          isOver ? 'text-warn' : 'text-textLo'
        )}
      >
        <span>
          {isOver ? (
            <>
              <span className="nums">{formatAmount(over, { showSign: false })}</span> OVER OF{' '}
              <span className="nums">{formatAmount(budget, { showSign: false })}</span>
            </>
          ) : (
            <>
              <span className="nums">{formatAmount(remaining, { showSign: false })}</span> LEFT OF{' '}
              <span className="nums">{formatAmount(budget, { showSign: false })}</span>
            </>
          )}
        </span>
        <span className="nums">{pct}%</span>
      </div>
      <ProgressBar value={spent} max={budget} variant={isOver ? 'warn' : 'accent'} />
    </div>
  );
}
