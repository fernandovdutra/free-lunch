import { cn } from '@/lib/utils';
import { ProgressBar } from './ProgressBar';
import { CategoryIcon } from '@/lib/categoryIcons';

interface CategoryRowProps {
  name: string;
  amount: string;
  /** Small de-emphasized label rendered after the amount (e.g. "€31 left"). */
  amountTrailing?: string;
  meta?: string;
  progress?: number;
  max?: number;
  variant?: 'ok' | 'over';
  onClick?: () => void;
  className?: string;
  /** When provided, renders a Phosphor icon for the category before the name. */
  categoryId?: string;
  /** Icon string from Category.icon, used as fallback for user-created categories. */
  iconFallback?: string;
}

export function CategoryRow({
  name,
  amount,
  amountTrailing,
  meta,
  progress,
  max,
  variant = 'ok',
  onClick,
  className,
  categoryId,
  iconFallback,
}: CategoryRowProps) {
  const isOver = variant === 'over';
  const showBar = progress !== undefined && max !== undefined;
  const trailingTone = isOver ? 'text-warn' : 'text-textLo';

  const bodyContent = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 min-w-0">
          {categoryId && (
            <CategoryIcon
              categoryId={categoryId}
              fallback={iconFallback}
              size={16}
              className={cn('shrink-0', isOver ? 'text-warn' : 'text-accent')}
            />
          )}
          <span className="truncate font-sans text-[13px] text-textHi">{name}</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="nums font-mono text-ct-row text-textHi">{amount}</span>
          {amountTrailing && (
            <span className={cn('nums font-mono text-[10px]', trailingTone)}>
              {amountTrailing}
            </span>
          )}
        </span>
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
