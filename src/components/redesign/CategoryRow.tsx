import { cn } from '@/lib/utils';
import { ProgressBar } from './ProgressBar';

interface CategoryRowProps {
  name: string;
  amount: string;
  meta?: string;
  progress?: number;
  max?: number;
  variant?: 'ok' | 'over';
  onClick?: () => void;
  className?: string;
}

export function CategoryRow({
  name,
  amount,
  meta,
  progress,
  max,
  variant = 'ok',
  onClick,
  className,
}: CategoryRowProps) {
  const isOver = variant === 'over';
  const showBar = progress !== undefined && max !== undefined;

  const bodyContent = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-ct-row text-textHi">{name}</span>
        <span className="nums font-mono text-ct-row text-textHi">{amount}</span>
      </div>
      {meta && (
        <div
          className={cn(
            'mt-1 font-mono text-ct-meta upper-tight',
            isOver ? 'text-warn' : 'text-textLo'
          )}
        >
          {meta}
        </div>
      )}
      {showBar && (
        <ProgressBar
          value={progress}
          max={max}
          variant={isOver ? 'warn' : 'accent'}
          className="mt-2"
        />
      )}
    </>
  );

  const baseClasses = 'block w-full px-4 py-3 hairline-b text-left';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(baseClasses, 'press', className)}
      >
        {bodyContent}
      </button>
    );
  }

  return <div className={cn(baseClasses, className)}>{bodyContent}</div>;
}
