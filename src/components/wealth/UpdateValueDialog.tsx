import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { formatAmount } from '@/lib/utils';
import { formatNative, isForeign, toCents } from '@/lib/currency';
import { formatUnits } from '@/lib/wealth';
import { useFxRate } from '@/hooks/useFxRate';
import { useLivePrice } from '@/hooks/useRefreshPrices';
import type { Holding } from '@/types/wealth';

interface UpdateValueDialogProps {
  holding: Holding | null;
  onClose: () => void;
  /** Writes a new dated history point. `value` is always EUR; `nativeValue` is
   *  the amount in the holding's currency (or null when EUR). */
  onSubmit: (
    id: string,
    point: { date: string; value: number },
    nativeValue: number | null
  ) => void;
}

const labelCls = 'font-mono text-[10px] uppercase tracking-[0.12em] text-textLo';
const fieldCls =
  'w-full rounded-card border border-rule bg-surfaceHi px-3 py-2.5 font-mono text-[18px] tabular-nums text-textHi focus:border-accent focus:outline-none';

const today = () => new Date().toISOString().slice(0, 10);

export function UpdateValueDialog({ holding, onClose, onSubmit }: UpdateValueDialogProps) {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(today());
  const [rate, setRate] = useState<number | null>(null);
  const fx = useFxRate();

  // Live price for auto holdings — fetched fresh on open so the suggestion
  // doesn't wait for the nightly refresh. Falls back to the cached price.
  const liveQuote = useLivePrice();
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const foreign = holding != null && isForeign(holding.currency);

  useEffect(() => {
    setLivePrice(holding?.livePrice ?? null);
    if (!holding || holding.updateSource !== 'auto' || !holding.symbol) return;
    let active = true;
    liveQuote
      .mutateAsync(holding.id)
      .then((q) => {
        if (active && q) setLivePrice(q.price);
      })
      .catch(() => {
        /* keep cached price */
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding?.id]);

  // Fetch the spot rate once when opening a foreign holding so we can preview
  // and freeze the EUR conversion. EUR holdings need no rate (1:1).
  useEffect(() => {
    if (!holding || !foreign) {
      setRate(holding ? 1 : null);
      return;
    }
    let active = true;
    fx.mutateAsync({ from: holding.currency, to: 'EUR' })
      .then((res) => {
        if (active) setRate(res.rate);
      })
      .catch(() => {
        if (active) setRate(null);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding?.id]);

  if (!holding) return null;

  // Auto holdings suggest livePrice × units (in the holding's native currency),
  // preferring the freshly fetched price over the cached one.
  const effectiveLive = livePrice ?? holding.livePrice ?? null;
  const nativeEstimate =
    holding.updateSource === 'auto' && effectiveLive != null && holding.units != null
      ? effectiveLive * holding.units
      : null;

  const nativeInput = parseFloat(value);
  const hasInput = !Number.isNaN(nativeInput);
  const eurPreview = hasInput && rate != null ? toCents(nativeInput * rate) : null;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const native = parseFloat(value);
    if (Number.isNaN(native)) return;
    if (foreign) {
      if (rate == null) return; // can't freeze EUR without a rate
      onSubmit(holding.id, { date, value: toCents(native * rate) }, toCents(native));
    } else {
      onSubmit(holding.id, { date, value: toCents(native) }, null);
    }
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="border-rule bg-surface p-5 sm:rounded-card">
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-textHi">
          Update value · {holding.name}
        </p>
        <p className="-mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-textLo">
          Records a new dated point in this holding&apos;s history
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {holding.updateSource === 'auto' && nativeEstimate != null && (
            <div className="rounded-card border border-rule bg-surfaceHi p-3 font-mono text-[11px]">
              <div className="flex justify-between text-textLo">
                <span>LIVE PRICE{liveQuote.isPending ? ' · refreshing…' : ''}</span>
                <span className="tabular-nums text-textHi">
                  {formatNative(effectiveLive ?? 0, holding.currency)}
                </span>
              </div>
              <div className="flex justify-between text-textLo">
                <span>YOUR HOLDING</span>
                <span className="tabular-nums text-textHi">
                  {formatUnits(holding.units!, holding.type)} units
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-rule pt-1 text-textLo">
                <span>ESTIMATED VALUE</span>
                <span className="tabular-nums text-accent">
                  {formatNative(nativeEstimate, holding.currency, { noCents: true })}
                </span>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="uv-date" className={labelCls}>
              Date
            </label>
            <input
              id="uv-date"
              type="date"
              className={`${fieldCls} text-[14px]`}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="uv-value" className={labelCls}>
              New value {foreign ? `(${holding.currency})` : '(€)'}
            </label>
            <input
              id="uv-value"
              type="number"
              step="0.01"
              className={fieldCls}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
              }}
              placeholder={
                nativeEstimate != null
                  ? nativeEstimate.toFixed(2)
                  : String(holding.nativeValue ?? holding.value)
              }
              required
            />
            {foreign && (
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-textLo">
                {rate == null
                  ? fx.isPending
                    ? 'Fetching rate…'
                    : 'Rate unavailable — try again'
                  : eurPreview != null
                    ? `≈ ${formatAmount(eurPreview, { showSign: false })} · 1 ${holding.currency} = ${rate.toFixed(4)} EUR`
                    : `1 ${holding.currency} = ${rate.toFixed(4)} EUR`}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-pill border border-rule px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-textHi active:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={foreign && rate == null}
              className="rounded-pill bg-accent px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent-foreground active:opacity-80 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
