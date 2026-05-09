import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/lib/categoryIcons';

interface DrillRowProps {
  /** 1-based rank rendered as zero-padded `01`/`02`/.. at the row's left edge. */
  index: number;
  /** Optional category id — when set, renders a Phosphor icon next to the index. */
  categoryId?: string;
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
 * funnel. When `progress`/`max` are provided, the row paints a left-aligned
 * background fill whose width = min(100%, progress/max). The fill uses the
 * dim accent (or dim warn when over budget) so the bright Phosphor icon
 * still pops against it.
 */
export function DrillRow({
  index,
  categoryId,
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
  const indexLabel = index.toString().padStart(2, '0');
  const showIcon = Boolean(categoryId);
  const leadingIndent = showIcon ? 'pl-7' : 'pl-9';

  const showFill = progress !== undefined && max !== undefined && max > 0;
  const fillPct = showFill ? Math.min(100, Math.max(0, (progress / max) * 100)) : 0;

  const bodyContent = (
    <>
      <div className="flex items-center gap-3">
        {showIcon ? (
          <CategoryIcon categoryId={categoryId} size={18} className={cn('shrink-0', isOver ? 'text-warn' : 'text-accent')} />
        ) : (
          <span className="nums font-mono text-[10px] tracking-[0.05em] text-textLo">
            {indexLabel}
          </span>
        )}
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
            'mt-1 font-mono text-[9.5px] tracking-[0.04em]',
            leadingIndent,
            isOver ? 'text-warn' : 'text-textLo'
          )}
        >
          {meta}
        </div>
      )}
    </>
  );

  const baseClasses = 'relative block w-full overflow-hidden px-4 py-3 hairline-b text-left';
  const fill = showFill ? (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0"
      style={{
        width: `${fillPct}%`,
        backgroundColor: isOver ? 'var(--warn-dim)' : 'var(--accent-dim)',
      }}
    />
  ) : null;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(baseClasses, 'press', className)}
        aria-valuenow={showFill ? Math.round(fillPct) : undefined}
        aria-valuemin={showFill ? 0 : undefined}
        aria-valuemax={showFill ? 100 : undefined}
      >
        {fill}
        <div className="relative">{bodyContent}</div>
      </button>
    );
  }

  return (
    <div className={cn(baseClasses, className)}>
      {fill}
      <span className="relative block">{bodyContent}</span>
    </div>
  );
}
