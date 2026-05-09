import { cn } from '@/lib/utils';

export interface ScrubberBar {
  monthKey: string;
  label: string;
  amount: number;
}

interface ScrubberProps {
  bars: ScrubberBar[];
  selectedMonthKey: string;
  /** Budget cap for the strip's scope. Omit at L3 (subcategories). */
  budget?: number;
  /** Right-anchored caption above the strip (e.g. "BUDGET €4,500"). Omit at L3. */
  budgetCaption?: string;
  onSelectMonth: (monthKey: string) => void;
  className?: string;
}

const STRIP_HEIGHT_PX = 73;
const BAR_WIDTH_PX = 52;
const COLUMN_GAP_PX = 6;
const DATA_LABEL_HEIGHT_PX = 12;

/**
 * Compact bar-label format: "€8.6K" for ≥1k, plain "€857" otherwise. Drops a
 * trailing ".0" so "€8.0K" → "€8K". Returns empty string for zero/empty bars.
 */
function formatBarAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1000) return `€${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `€${Math.round(n)}`;
}

/**
 * 6-month bar strip with optional dashed budget line. Each bar is a button
 * that selects its month. Selected month renders as a 2px solid-accent tip
 * (no fill); over-budget months tint amber; under/no-budget months show as
 * rule-bordered outlines. Per v8 frames 04/05/06.
 */
export function Scrubber({
  bars,
  selectedMonthKey,
  budget,
  budgetCaption,
  onSelectMonth,
  className,
}: ScrubberProps) {
  const maxAmount = bars.reduce((m, b) => Math.max(m, b.amount), 0);
  const maxScale = Math.max(maxAmount, budget ?? 0) * 1.05 || 1;
  // Reserve headroom at the top of the strip for the per-bar data labels so
  // the tallest bar's label doesn't get clipped by the strip's top edge.
  const barAreaPx = STRIP_HEIGHT_PX - DATA_LABEL_HEIGHT_PX;
  const budgetPx = budget !== undefined ? (budget / maxScale) * barAreaPx : null;
  const stripWidth = bars.length * BAR_WIDTH_PX + (bars.length - 1) * COLUMN_GAP_PX;

  return (
    <div
      className={cn('relative', className)}
      style={{ width: stripWidth }}
    >
      {budgetCaption && (
        <div className="mb-1 text-right font-mono text-[8.5px] tracking-[0.4px] text-accent">
          {budgetCaption}
        </div>
      )}

      <div className="relative" style={{ height: STRIP_HEIGHT_PX }}>
        <div
          className="flex h-full items-end justify-start"
          style={{ gap: COLUMN_GAP_PX }}
        >
          {bars.map((bar) => {
            const isSelected = bar.monthKey === selectedMonthKey;
            const isOver = budget !== undefined && bar.amount > budget;
            const heightPx = Math.max(2, (bar.amount / maxScale) * barAreaPx);
            // 3-state fill (per QA round 2: selected = full painted bar):
            //   - selected:                bg accent, no border
            //   - over budget (unselected): bg alert-dim, border alert
            //   - under/normal (unselected): bg transparent, border rule
            const fillClass = isSelected
              ? 'bg-accent'
              : isOver
                ? 'border border-alert bg-alert-dim'
                : 'border border-rule bg-transparent';
            const labelClass = isSelected
              ? 'text-accent'
              : isOver
                ? 'text-alert'
                : 'text-textLo';
            const labelText = formatBarAmount(bar.amount);
            return (
              <button
                key={bar.monthKey}
                type="button"
                onClick={() => {
                  onSelectMonth(bar.monthKey);
                }}
                aria-label={`Select ${bar.label}`}
                aria-pressed={isSelected}
                className="press relative flex-shrink-0"
                style={{ width: BAR_WIDTH_PX, height: STRIP_HEIGHT_PX }}
              >
                <div
                  className={cn('absolute inset-x-0 bottom-0', fillClass)}
                  style={{ height: heightPx }}
                />
                {labelText && (
                  <span
                    className={cn(
                      'pointer-events-none absolute inset-x-0 text-center font-mono text-[9.5px] tracking-[0.4px] tabular-nums',
                      labelClass
                    )}
                    style={{ bottom: heightPx + 1, lineHeight: `${DATA_LABEL_HEIGHT_PX}px` }}
                  >
                    {labelText}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {budgetPx !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0"
            style={{ bottom: budgetPx }}
          >
            <div
              className="border-t border-dashed"
              style={{ borderColor: 'rgba(196, 242, 90, 0.55)' }}
            />
          </div>
        )}
      </div>

      <div
        className="mt-[12px] flex"
        style={{ gap: COLUMN_GAP_PX }}
      >
        {bars.map((bar) => {
          const isSelected = bar.monthKey === selectedMonthKey;
          return (
            <div
              key={bar.monthKey}
              className={cn(
                'flex-shrink-0 text-center font-mono text-[9.5px] tracking-[0.6px]',
                isSelected ? 'text-accent' : 'text-textLo'
              )}
              style={{ width: BAR_WIDTH_PX }}
            >
              {bar.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
