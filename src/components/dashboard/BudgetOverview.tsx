import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { formatAmount, cn } from '@/lib/utils';

export function BudgetOverview() {
  const { data: budgetProgress, isLoading } = useBudgetProgress();

  // Show top 4 budgets, prioritizing exceeded/warning
  const displayBudgets = [...budgetProgress]
    .sort((a, b) => {
      // Sort by status priority (exceeded > warning > safe), then by percentage
      const statusOrder = { exceeded: 0, warning: 1, safe: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.percentage - a.percentage;
    })
    .slice(0, 4);

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (budgetProgress.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-sm text-muted-foreground">No budgets set up yet</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/budgets">Create your first budget</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const exceededCount = budgetProgress.filter((p) => p.status === 'exceeded').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Budget Status</CardTitle>
          {exceededCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {exceededCount} exceeded
            </span>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/budgets">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayBudgets.map((progress) => (
          <div key={progress.budget.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span>{progress.categoryIcon}</span>
                {progress.budget.name}
              </span>
              <span className={cn('tabular-nums', statusTextColors[progress.status])}>
                {progress.percentage.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={Math.min(progress.percentage, 100)}
              className="h-2"
              indicatorClassName={statusColors[progress.status]}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatAmount(progress.spent, { showSign: false })} /{' '}
                {formatAmount(progress.budget.monthlyLimit, { showSign: false })}
              </span>
              <span>
                {progress.status === 'exceeded'
                  ? `${formatAmount(progress.spent - progress.budget.monthlyLimit, { showSign: false })} over`
                  : `${formatAmount(progress.remaining, { showSign: false })} left`}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
