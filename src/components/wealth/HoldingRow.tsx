import { cn, formatAmount } from '@/lib/utils';
import { formatNative, isForeign } from '@/lib/currency';
import type { Holding } from '@/types/wealth';

const STALE_DAYS = 30;

interface HoldingRowProps {
  holding: Holding;
  onClick: () => void;
}

export function HoldingRow({ holding, onClick }: HoldingRowProps) {
  const isLiability = holding.kind === 'liability';
  const stale = holding.updatedDaysAgo > STALE_DAYS;
  const gainPct =
    !isLiability && holding.cost > 0 ? ((holding.value - holding.cost) / holding.cost) * 100 : null;
  const foreign = isForeign(holding.currency) && holding.nativeValue != null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-rule py-3 text-left active:opacity-60"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {stale && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-alert" />}
          <span className="truncate font-sans text-[14px] text-textHi">{holding.name}</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-textLo">
          {holding.platform}
        </span>
      </div>
      <div className="shrink-0 text-right">
        <div
          className={cn(
            'font-mono text-[14px] tabular-nums',
            isLiability ? 'text-alert' : 'text-textHi'
          )}
        >
          {isLiability ? '−' : ''}
          {formatAmount(holding.value, { showSign: false, noCents: true })}
        </div>
        {foreign && (
          <div className="font-mono text-[10px] tabular-nums text-textLo">
            {formatNative(holding.nativeValue!, holding.currency, { noCents: true })}
          </div>
        )}
        {!foreign && gainPct != null && (
          <div
            className={cn(
              'font-mono text-[10px] tabular-nums',
              gainPct >= 0 ? 'text-accent' : 'text-warn'
            )}
          >
            {gainPct >= 0 ? '▲' : '▼'} {gainPct >= 0 ? '+' : ''}
            {gainPct.toFixed(1)}%
          </div>
        )}
      </div>
    </button>
  );
}
