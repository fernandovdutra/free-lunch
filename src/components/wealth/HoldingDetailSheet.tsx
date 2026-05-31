import { useState } from 'react';
import { Sheet, SheetBody, SheetClose, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { cn, formatAmount } from '@/lib/utils';
import { formatNative, isForeign } from '@/lib/currency';
import { clipToRange, formatUnits } from '@/lib/wealth';
import type { Holding, RangeKey } from '@/types/wealth';
import { RangePicker } from './RangePicker';
import { WealthChart } from './WealthChart';

const STALE_DAYS = 30;

const SOURCE_LABELS = {
  auto: 'AUTO-PRICED',
  bank: 'BANK SYNC',
  manual: 'MANUAL',
} as const;

interface HoldingDetailSheetProps {
  holding: Holding | null;
  onClose: () => void;
  onUpdateValue: (holding: Holding) => void;
  onEditDetails: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
}

function FactRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-rule py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">{label}</span>
      <span
        className={cn('font-mono text-[12px] tabular-nums', alert ? 'text-alert' : 'text-textHi')}
      >
        {value}
      </span>
    </div>
  );
}

export function HoldingDetailSheet({
  holding,
  onClose,
  onUpdateValue,
  onEditDetails,
  onDelete,
}: HoldingDetailSheetProps) {
  const [range, setRange] = useState<RangeKey>('1Y');

  if (!holding) return null;

  const isLiability = holding.kind === 'liability';
  const stale = holding.updatedDaysAgo > STALE_DAYS;
  const foreign = isForeign(holding.currency) && holding.nativeValue != null;
  const gain = holding.value - holding.cost;
  const gainPct = holding.cost > 0 ? (gain / holding.cost) * 100 : 0;
  const chartSeries = clipToRange(holding.history, range);

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="max-h-[92vh]">
        <SheetHeader>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
            {holding.platform} · {holding.type}
          </span>
          <SheetClose className="font-mono text-[14px] text-textLo active:opacity-60">✕</SheetClose>
        </SheetHeader>

        <SheetBody className="space-y-5 px-4 pb-8">
          <div>
            <h2 className="font-sans text-[22px] text-textHi">{holding.name}</h2>
            <p
              className={cn(
                'mt-1 font-mono text-[40px] font-medium tabular-nums leading-none',
                isLiability ? 'text-alert' : 'text-textHi'
              )}
            >
              {isLiability ? '−' : ''}
              {formatAmount(holding.value, { showSign: false, noCents: true })}
            </p>
            {foreign && (
              <p className="mt-1 font-mono text-[13px] tabular-nums text-textLo">
                {formatNative(holding.nativeValue!, holding.currency, { noCents: true })}{' '}
                {holding.currency}
              </p>
            )}
            {!isLiability && holding.cost > 0 && (
              <p
                className={cn(
                  'mt-1.5 font-mono text-[12px] tabular-nums',
                  gain >= 0 ? 'text-accent' : 'text-warn'
                )}
              >
                {gain >= 0 ? '▲' : '▼'}{' '}
                {formatAmount(Math.abs(gain), { showSign: false, noCents: true })} (
                {gainPct >= 0 ? '+' : ''}
                {gainPct.toFixed(1)}%) <span className="text-textLo">vs cost</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <RangePicker value={range} onChange={setRange} />
            <WealthChart
              series={chartSeries}
              height={160}
              ariaLabel={`${holding.name} value over time`}
            />
          </div>

          <div>
            <FactRow
              label="Current value"
              value={`${isLiability ? '−' : ''}${formatAmount(holding.value, { showSign: false, noCents: true })}`}
            />
            {!isLiability && (
              <FactRow
                label="Cost basis"
                value={
                  holding.cost > 0
                    ? formatAmount(holding.cost, { showSign: false, noCents: true })
                    : '—'
                }
              />
            )}
            {holding.units != null && (
              <FactRow label="Units" value={formatUnits(holding.units, holding.type)} />
            )}
            {foreign && (
              <FactRow
                label={`Native value · ${holding.currency}`}
                value={formatNative(holding.nativeValue!, holding.currency, { noCents: true })}
              />
            )}
            <FactRow label="Currency" value={holding.currency} />
            <FactRow label="Liquidity" value={holding.liquidity.toUpperCase()} />
            <FactRow label="Update source" value={SOURCE_LABELS[holding.updateSource]} />
            <FactRow
              label="Last updated"
              value={holding.updatedDaysAgo === 0 ? 'TODAY' : `${holding.updatedDaysAgo}D AGO`}
              alert={stale}
            />
          </div>

          <div className="flex items-center justify-between border-b border-rule py-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
              Notes
            </span>
            <span className="font-mono text-[12px] text-textLo">
              {holding.notes ?? 'None — tap to add'}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onUpdateValue(holding);
              }}
              className="w-full rounded-pill bg-accent py-3 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-accent-foreground active:opacity-80"
            >
              Update value
            </button>
            <button
              type="button"
              onClick={() => {
                onEditDetails(holding);
              }}
              className="w-full rounded-pill border border-rule py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-textHi active:opacity-60"
            >
              Edit details
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(holding);
              }}
              className="w-full rounded-pill py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-warn active:opacity-60"
            >
              Delete
            </button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
