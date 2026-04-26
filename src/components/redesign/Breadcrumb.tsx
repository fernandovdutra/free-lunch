import { cn } from '@/lib/utils';

export interface BreadcrumbSegment {
  label: string;
  /** Path to navigate to. Omitted (or undefined) for the current segment. */
  href?: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  /** Tap handler for the leading `←` arrow. Typically `() => navigate(-1)` or
   *  navigate to the immediate parent's href. */
  onBack: () => void;
  /** Optional click handler for parent segments (passed `href`). Defaults to
   *  in-app navigate via the React Router history API. */
  onSegmentClick?: (href: string) => void;
  className?: string;
}

const MAX_VISIBLE_SEGMENTS = 2;

/**
 * In-page breadcrumb shown at the top of drill pages. Per v8 frames 04/05/06:
 * - L1: `← EXPENSES` (single segment, current = textHi)
 * - L2: `← EXPENSES › GROCERIES` (parent = textLo, current = textHi)
 * - L3: `← GROCERIES › SUPERMARKET` (truncates to last 2 segments)
 *
 * The `←` arrow renders in accent color (lime) and tapping it calls onBack.
 */
export function Breadcrumb({
  segments,
  onBack,
  onSegmentClick,
  className,
}: BreadcrumbProps) {
  const visible = segments.slice(-MAX_VISIBLE_SEGMENTS);
  const lastIdx = visible.length - 1;

  return (
    <div
      className={cn(
        'flex items-baseline gap-2 px-4 py-3',
        className
      )}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="press font-mono text-[14px] tracking-[0.6px] text-accent leading-none"
      >
        ←
      </button>
      {visible.map((seg, i) => {
        const isCurrent = i === lastIdx;
        const isClickable = !isCurrent && seg.href && onSegmentClick;
        const labelClass = cn(
          'font-mono text-[10px] uppercase leading-none',
          isCurrent ? 'text-textHi tracking-[0.12em]' : 'text-textLo tracking-[0.06em]'
        );
        return (
          <span key={`${seg.label}-${i}`} className="flex items-baseline gap-2">
            {isClickable ? (
              <button
                type="button"
                onClick={() => {
                  onSegmentClick(seg.href as string);
                }}
                className={cn('press', labelClass)}
              >
                {seg.label}
              </button>
            ) : (
              <span className={labelClass}>{seg.label}</span>
            )}
            {i < lastIdx && (
              <span
                aria-hidden
                className="font-mono text-[10px] text-textLo leading-none"
              >
                ›
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
