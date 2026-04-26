import { cn } from '@/lib/utils';
import { ProgressBar } from './ProgressBar';

interface DrillRowProps {
  /** 1-based rank rendered as zero-padded `01`/`02`/.. at the row's left edge. */
  index: number;
  name: string;
  /** Pre-formatted amount — e.g. `€919`, `−€44.20`. */
  amount: string;
  /**
   * Optional meta line (e.g. "· €31 LEFT" or "· €58 OVER"). Caller is
   * responsible for the leading bullet/space separator so the meta line
   * matches v8 (which prefixes with " · " before the LEFT/OVER token).
   */
  meta?: string;
  progress?: number;
  max?: number;
  variant?: 'ok' | 'over';
  onClick?: () => void;
  className?: string;
}

/**
 * Indexed row used at L1 (categories) and L2 (subcategories) of the drill
 * funnel. Per v8 frames 04/05:
 *   01  Groceries                         €919  ›
 *         · €31 LEFT
 *         ━━━━━━━━━━━━━━━━━━━━━━━━━━ (bar)
 *
 * The ProgressBar's max can be the row's own budget (L1) or the parent
 * category's budget (L2 subcategories), depending on caller.
 */
export function DrillRow({
  index,
  name,
  amount,
  meta,
  progress,
  max,
  variant = 'ok',
  onClick,
  className,
}: DrillRowProps) {
  const isOver = variant === 'over';
  const showBar = progress !== undefined && max !== undefined;
  const indexLabel = index.toString().padStart(2, '0');

  const bodyContent = (
    <>
      <div className="flex items-baseline gap-3">
        <span className="nums font-mono text-[10px] tracking-[0.05em] text-textLo">
          {indexLabel}
        </span>
        <span className="flex-1 truncate font-sans text-[14px] tracking-[-0.005em] text-textHi">
          {name}
        </span>
        <span className="nums font-mono text-[14px] tracking-[-0.02em] text-textHi">
          {amount}
        </span>
        {onClick && (
          <span
            aria-hidden
            className="font-mono text-[12px] leading-none text-textLo"
          >
            ›
          </span>
        )}
      </div>
      {meta && (
        <div
          className={cn(
            'mt-1 pl-9 font-mono text-[9.5px] tracking-[0.04em]',
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
          className="mt-2 ml-9"
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
