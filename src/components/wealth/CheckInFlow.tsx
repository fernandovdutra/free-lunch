import { useMemo, useState } from 'react';
import { cn, formatAmount } from '@/lib/utils';
import { formatUnits, netWorth } from '@/lib/wealth';
import type { Holding } from '@/types/wealth';

const SOURCE_ORDER: Record<Holding['updateSource'], number> = { auto: 0, bank: 1, manual: 2 };

interface CheckInFlowProps {
  holdings: Holding[];
  onConfirm: (id: string, value: number) => void;
  onClose: () => void;
}

export function CheckInFlow({ holdings, onConfirm, onClose }: CheckInFlowProps) {
  // Snapshot order + starting net worth once (component remounts on each open).
  const ordered = useMemo(
    () => [...holdings].sort((a, b) => SOURCE_ORDER[a.updateSource] - SOURCE_ORDER[b.updateSource]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [startNW] = useState(() => netWorth(holdings));

  const [step, setStep] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [done, setDone] = useState(false);
  // Editable per-card inputs, keyed by holding id.
  const [units, setUnits] = useState<Record<string, number>>({});
  const [manualValue, setManualValue] = useState<Record<string, string>>({});

  const n = ordered.length;
  const current = ordered[step];

  if (done) {
    const newNW = netWorth(holdings);
    const delta = newNW - startNW;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <span className="font-mono text-[40px] text-accent">✓</span>
        <p className="font-mono text-[14px] uppercase tracking-[0.12em] text-textHi">Done</p>
        <p className="font-mono text-[12px] text-textMid">
          {confirmedCount} of {n} holdings updated
        </p>
        <div className="mt-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">Net worth</p>
          <p className="font-mono text-[32px] font-medium tabular-nums text-textHi">
            {formatAmount(newNW, { showSign: false, noCents: true })}
          </p>
          <p
            className={cn(
              'font-mono text-[12px] tabular-nums',
              delta >= 0 ? 'text-accent' : 'text-warn'
            )}
          >
            {delta >= 0 ? '▲' : '▼'} {formatAmount(Math.abs(delta), { showSign: false, noCents: true })} since last check
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-pill bg-accent px-8 py-3 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-accent-foreground active:opacity-80"
        >
          Finish
        </button>
      </div>
    );
  }

  if (!current) {
    // No holdings to check in — close out.
    onClose();
    return null;
  }

  const isLast = step === n - 1;
  const cardUnits = units[current.id] ?? current.units ?? 0;
  const estimate = current.livePrice != null ? current.livePrice * cardUnits : current.value;
  const priceUp = current.livePrice != null && current.prevPrice != null
    ? current.livePrice >= current.prevPrice
    : true;

  const confirmValue = (): number => {
    if (current.updateSource === 'auto') return estimate;
    if (current.updateSource === 'bank') return current.value;
    const v = parseFloat(manualValue[current.id] ?? '');
    return Number.isNaN(v) ? current.value : v;
  };

  const advance = (didConfirm: boolean) => {
    if (didConfirm) {
      onConfirm(current.id, confirmValue());
      setConfirmedCount((c) => c + 1);
    }
    if (isLast) setDone(true);
    else setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-textHi">
          Wealth Check-in
        </span>
        <span className="font-mono text-[11px] tabular-nums text-textLo">
          {step + 1} / {n}
        </span>
        <button type="button" onClick={onClose} className="font-mono text-[14px] text-textLo active:opacity-60">
          ✕
        </button>
      </div>
      {/* Progress strip */}
      <div className="flex gap-1 px-4 py-2">
        {ordered.map((_, i) => (
          <span
            key={i}
            className={cn('h-0.5 flex-1 rounded-pill', i <= step ? 'bg-accent' : 'bg-rule')}
          />
        ))}
      </div>

      {/* Card */}
      <div className="flex flex-1 flex-col justify-center px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
          {current.platform} · {current.type}
        </p>
        <h2 className="mt-1 font-sans text-[24px] text-textHi">{current.name}</h2>

        {current.updateSource === 'auto' && (
          <div className="mt-6 space-y-3">
            <Row label="Last value" value={formatAmount(current.value, { showSign: false, noCents: true })} />
            <Row
              label="Live price"
              value={formatAmount(current.livePrice ?? 0, { showSign: false })}
              hint={priceUp ? '↑' : '↓'}
              hintClass={priceUp ? 'text-accent' : 'text-warn'}
            />
            <Row label="Your holding" value={`${formatUnits(cardUnits, current.type)} units`} />
            <div className="mt-4 border-t border-rule pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">Estimated value</p>
              <p className="font-mono text-[36px] font-medium tabular-nums text-accent">
                {formatAmount(estimate, { showSign: false, noCents: true })}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-mono text-[11px] text-textMid">Has the amount of units changed?</span>
              <input
                aria-label="Edit units"
                type="number"
                step="any"
                value={cardUnits}
                onChange={(e) =>
                  { setUnits((u) => ({ ...u, [current.id]: parseFloat(e.target.value) || 0 })); }
                }
                className="w-28 rounded-card border border-rule bg-surfaceHi px-2 py-1 text-right font-mono text-[12px] tabular-nums text-textHi"
              />
            </div>
          </div>
        )}

        {current.updateSource === 'bank' && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
                Bank sync · synced 2 min ago
              </span>
            </div>
            <div className="border-t border-rule pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">Value to confirm</p>
              <p className="font-mono text-[36px] font-medium tabular-nums text-textHi">
                {formatAmount(current.value, { showSign: false, noCents: true })}
              </p>
            </div>
          </div>
        )}

        {current.updateSource === 'manual' && (
          <div className="mt-6 space-y-4">
            <Row
              label="Last value"
              value={formatAmount(current.value, { showSign: false, noCents: true })}
              hint={current.updatedDaysAgo === 0 ? 'today' : `${current.updatedDaysAgo}d ago`}
            />
            <div className="space-y-2">
              <label
                htmlFor="ci-value"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo"
              >
                New value (€)
              </label>
              <input
                id="ci-value"
                type="number"
                step="0.01"
                value={manualValue[current.id] ?? ''}
                onChange={(e) => { setManualValue((m) => ({ ...m, [current.id]: e.target.value })); }}
                placeholder={String(current.value)}
                className="w-full rounded-card border border-rule bg-surfaceHi px-3 py-2.5 font-mono text-[18px] tabular-nums text-textHi"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-rule px-4 py-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => { setStep((s) => Math.max(0, s - 1)); }}
          className={cn(
            'font-mono text-[11px] uppercase tracking-[0.12em] active:opacity-60',
            step === 0 ? 'text-textDim' : 'text-textLo'
          )}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => { advance(false); }}
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em] text-textLo active:opacity-60"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => { advance(true); }}
          className="rounded-pill bg-accent px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent-foreground active:opacity-80"
        >
          {isLast ? 'Confirm & Finish' : 'Confirm & Next →'}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  hintClass,
}: {
  label: string;
  value: string;
  hint?: string;
  hintClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">{label}</span>
      <span className="flex items-baseline gap-2 font-mono text-[14px] tabular-nums text-textHi">
        {value}
        {hint && <span className={cn('text-[11px]', hintClass ?? 'text-textLo')}>{hint}</span>}
      </span>
    </div>
  );
}
