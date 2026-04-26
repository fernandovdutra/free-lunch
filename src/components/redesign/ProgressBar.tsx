import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'accent' | 'warn';
  className?: string;
}

export function ProgressBar({ value, max, variant = 'accent', className }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const gradient =
    variant === 'warn'
      ? 'linear-gradient(to right, var(--warn-dim), var(--warn))'
      : 'linear-gradient(to right, var(--accent-dim), var(--accent))';

  return (
    <div
      className={cn('h-0.5 w-full overflow-hidden rounded-[1px] bg-rule', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full"
        style={{ width: `${pct}%`, backgroundImage: gradient }}
      />
    </div>
  );
}
