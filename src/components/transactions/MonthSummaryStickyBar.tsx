import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MonthSummaryStickyBarProps {
  monthLabel: string;
  netTotal: number;
  count: number;
  className?: string;
}

/**
 * Phase 5 sticky month summary. Sits between the filter pill row and the
 * day-grouped list. Format: `APR · €4,672 · 72 TXN`.
 *
 * Sticky offset is `top: 44px (TopBar) + ~46px (filter pill row)`. The pill
 * row is itself sticky one level up, so this bar's top is the cumulative
 * height of TopBar + filter bar.
 *
 * The `monthLabel`, `netTotal`, `count` props are driven by an
 * IntersectionObserver in Transactions.tsx that watches each month section.
 */
export function MonthSummaryStickyBar({
  monthLabel,
  netTotal,
  count,
  className,
}: MonthSummaryStickyBarProps) {
  return (
    <div
      className={cn(
        'sticky z-20 hairline-b bg-surfaceHi',
        // 44px TopBar + ~46px pill row (25px pill + 2*10.5px py-2.5)
        'top-[calc(44px+46px+env(safe-area-inset-top,0px))]',
        className
      )}
    >
      <div className="flex items-baseline justify-between px-4 py-2">
        <span className="font-mono text-[13px] font-medium uppercase tracking-[0.09em] text-textHi">
          {monthLabel}
        </span>
        <span className="nums font-mono text-[11px] tracking-[0.04em] text-textLo">
          {formatAmount(netTotal, { showSign: false })} · {count} TXN
        </span>
      </div>
    </div>
  );
}
