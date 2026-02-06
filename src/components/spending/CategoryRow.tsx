import { formatAmount, cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface CategoryRowProps {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  onClick: () => void;
}

export function CategoryRow({
  name,
  icon,
  color,
  amount,
  percentage,
  transactionCount,
  onClick,
}: CategoryRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-lg p-3',
        'text-left transition-colors hover:bg-muted/50',
        'overflow-hidden'
      )}
    >
      {/* Horizontal bar background */}
      <div
        className="absolute inset-y-0 left-0 rounded-lg"
        style={{
          width: `${Math.max(percentage, 2)}%`,
          backgroundColor: `${color}15`,
        }}
      />

      {/* Left border accent */}
      <div
        className="absolute inset-y-1 left-0 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Icon */}
      <span className="relative z-10 text-lg">{icon}</span>

      {/* Name and count */}
      <div className="relative z-10 min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Amount and percentage */}
      <div className="relative z-10 text-right">
        <p className="font-semibold tabular-nums">
          {formatAmount(amount, { showSign: false })}
        </p>
        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
      </div>

      <ChevronRight className="relative z-10 h-4 w-4 text-muted-foreground" />
    </button>
  );
}
