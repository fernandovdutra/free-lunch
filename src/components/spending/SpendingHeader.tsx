import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount, cn } from '@/lib/utils';

interface SpendingHeaderProps {
  title: string;
  total: number;
  monthLabel: string;
  onBack: () => void;
  isLoading?: boolean;
  direction: 'expenses' | 'income';
}

export function SpendingHeader({
  title,
  total,
  monthLabel,
  onBack,
  isLoading,
  direction,
}: SpendingHeaderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      <div className="pl-12">
        {isLoading ? (
          <Skeleton className="h-10 w-32" />
        ) : (
          <p
            className={cn(
              'text-3xl font-bold tabular-nums',
              direction === 'expenses' ? 'text-destructive' : 'text-primary'
            )}
          >
            {formatAmount(direction === 'expenses' ? -total : total, { showSign: false })}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{monthLabel}</p>
      </div>
    </div>
  );
}
