import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, formatAmount } from '@/lib/utils';
import type { BudgetProgress } from '@/types';

interface BudgetCardProps {
  progress: BudgetProgress;
  onClick?: () => void;
}

export function BudgetCard({ progress, onClick }: BudgetCardProps) {
  const { budget, categoryName, categoryIcon, spent, remaining, percentage, status } = progress;

  const statusColors = {
    safe: 'bg-emerald-500',
    warning: 'bg-amber-500',
    exceeded: 'bg-red-500',
  };

  const statusTextColors = {
    safe: 'text-emerald-500',
    warning: 'text-amber-500',
    exceeded: 'text-red-500',
  };

  return (
    <Card
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span>{categoryIcon}</span>
          <span>{budget.name}</span>
        </CardTitle>
        {status === 'exceeded' && (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
        {status === 'warning' && (
          <TrendingUp className="h-4 w-4 text-amber-500" />
        )}
        {status === 'safe' && percentage > 0 && (
          <TrendingDown className="h-4 w-4 text-emerald-500" />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress
          value={Math.min(percentage, 100)}
          className="h-2"
          indicatorClassName={statusColors[status]}
        />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {formatAmount(spent, { showSign: false })} of{' '}
            {formatAmount(budget.monthlyLimit, { showSign: false })}
          </span>
          <span className={cn('font-medium tabular-nums', statusTextColors[status])}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{categoryName}</span>
          <span>
            {status === 'exceeded'
              ? `${formatAmount(spent - budget.monthlyLimit, { showSign: false })} over`
              : `${formatAmount(remaining, { showSign: false })} left`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
