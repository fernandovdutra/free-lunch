import { Sheet, SheetContent, SheetBody, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatAmount } from '@/lib/utils';
import { fixedCostKey, type FixedCost } from '@/lib/burnUp';
import { useMarkFixedPosted, useUnmarkFixedPosted } from '@/hooks/useFixedMatches';

interface FixedCostsMonthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "YYYY-MM" of the visible month — the override scope. */
  monthKey: string;
  /** "MAY" — header label. */
  monthLabel: string;
  /** Items the matcher considers posted (auto-matched + manually marked). */
  posted: FixedCost[];
  /** Items still expected (heuristic found no matching transaction). */
  unposted: FixedCost[];
  /** Keys the user manually marked posted — distinguishes them within `posted`. */
  manualPostedKeys: ReadonlySet<string>;
}

/**
 * Per-month breakdown of scheduled fixed costs: which the matcher has paired to
 * a real transaction vs which are still outstanding. The heuristic matcher
 * (counterparty contains label + amount within 20%) misses charges that post
 * under a different name or drift in amount, so this sheet lets the user
 * manually mark such an item as already posted — dropping it from the "still to
 * post" footnote, the chart's hollow marker, and the projection. Reversible.
 */
export function FixedCostsMonthSheet({
  open,
  onOpenChange,
  monthKey,
  monthLabel,
  posted,
  unposted,
  manualPostedKeys,
}: FixedCostsMonthSheetProps) {
  const mark = useMarkFixedPosted();
  const unmark = useUnmarkFixedPosted();
  const pending = mark.isPending || unmark.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>FIXED COSTS · {monthLabel}</SheetTitle>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
            }}
            aria-label="Close"
            className="press font-mono text-[14px] leading-none text-textLo"
          >
            ✕
          </button>
        </SheetHeader>

        <SheetBody>
          {unposted.length > 0 && (
            <>
              <SectionHeader>STILL TO POST</SectionHeader>
              {unposted.map((f, i) => (
                <ItemRow
                  key={`u-${fixedCostKey(f)}-${i}`}
                  item={f}
                  action="mark"
                  disabled={pending}
                  onAction={() => {
                    mark.mutate({ monthKey, key: fixedCostKey(f) });
                  }}
                />
              ))}
            </>
          )}

          {posted.length > 0 && (
            <>
              <SectionHeader>POSTED</SectionHeader>
              {posted.map((f, i) => {
                const isManual = manualPostedKeys.has(fixedCostKey(f));
                return (
                  <ItemRow
                    key={`p-${fixedCostKey(f)}-${i}`}
                    item={f}
                    action={isManual ? 'undo' : 'auto'}
                    disabled={pending}
                    {...(isManual
                      ? {
                          onAction: () => {
                            unmark.mutate({ monthKey, key: fixedCostKey(f) });
                          },
                        }
                      : {})}
                  />
                );
              })}
            </>
          )}

          {posted.length === 0 && unposted.length === 0 && (
            <div className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
              No fixed costs scheduled
            </div>
          )}

          <div className="h-4" />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-t hairline-b bg-bg/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
      {children}
    </div>
  );
}

interface ItemRowProps {
  item: FixedCost;
  /** mark = still-to-post (offer "mark posted"); undo = manually marked; auto = heuristic match. */
  action: 'mark' | 'undo' | 'auto';
  disabled?: boolean;
  onAction?: () => void;
}

function ItemRow({ item, action, disabled, onAction }: ItemRowProps) {
  return (
    <div className="hairline-b flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="truncate font-sans text-[13.5px] text-textHi">{item.l}</div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-textLo">
          DAY {item.d}
        </div>
      </div>
      <div className="nums font-mono text-[13px] text-textMid">
        {formatAmount(item.a, { showSign: false, noCents: true })}
      </div>
      {action === 'mark' && (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="press whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.06em] text-accent disabled:opacity-50"
        >
          MARK POSTED
        </button>
      )}
      {action === 'undo' && (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="press whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.06em] text-textLo disabled:opacity-50"
        >
          UNDO
        </button>
      )}
      {action === 'auto' && (
        <span
          aria-label="matched"
          className="font-mono text-[12px] leading-none text-accent"
        >
          ✓
        </span>
      )}
    </div>
  );
}
