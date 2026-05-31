import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { AssetType, CurrencyCode, Holding, Liquidity, UpdateSource } from '@/types/wealth';
import { CURRENCIES } from '@/types/wealth';

const ASSET_TYPES: AssetType[] = [
  'Real Estate',
  'Vehicle',
  'Equities',
  'Crypto',
  'Cash',
  'Mortgage',
  'Credit',
  'Loan',
];

// ── Calm-terminal form atoms (match HoldingDetailSheet / CheckInFlow) ─────────
const labelCls = 'font-mono text-[10px] uppercase tracking-[0.12em] text-textLo';
const fieldCls =
  'w-full rounded-card border border-rule bg-surfaceHi px-3 py-2.5 font-mono text-[14px] text-textHi focus:border-accent focus:outline-none';

/** Holdings whose worth is naturally a quantity × price. */
const UNIT_TYPES: AssetType[] = ['Equities', 'Crypto'];

interface EditDetailsDialogProps {
  holding: Holding | null;
  onClose: () => void;
  /** Updates holding attributes (distinct from writing a value point). */
  onSubmit: (id: string, patch: Partial<Holding>) => void;
}

export function EditDetailsDialog({ holding, onClose, onSubmit }: EditDetailsDialogProps) {
  const [name, setName] = useState(holding?.name ?? '');
  const [platform, setPlatform] = useState(holding?.platform ?? '');
  const [type, setType] = useState<AssetType>(holding?.type ?? 'Cash');
  const [currency, setCurrency] = useState<CurrencyCode>(holding?.currency ?? 'EUR');
  const [cost, setCost] = useState(String(holding?.cost ?? ''));
  const [units, setUnits] = useState(holding?.units != null ? String(holding.units) : '');
  const [liquidity, setLiquidity] = useState<Liquidity>(holding?.liquidity ?? 'liquid');
  const [source, setSource] = useState<UpdateSource>(holding?.updateSource ?? 'manual');
  const [symbol, setSymbol] = useState(holding?.symbol ?? '');

  if (!holding) return null;

  const showUnits = source === 'auto' || UNIT_TYPES.includes(type) || holding.units != null;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUnits = units.trim();
    onSubmit(holding.id, {
      name,
      platform,
      type,
      currency,
      cost: parseFloat(cost) || 0,
      units: showUnits && trimmedUnits !== '' ? parseFloat(trimmedUnits) || 0 : null,
      liquidity,
      updateSource: source,
      symbol: source === 'auto' ? symbol.trim() || null : null,
    });
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
          Edit details · {holding.name}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="ed-name" className={labelCls}>
              Name
            </label>
            <input
              id="ed-name"
              className={fieldCls}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ed-platform" className={labelCls}>
              Platform
            </label>
            <input
              id="ed-platform"
              className={fieldCls}
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
              }}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="ed-type" className={labelCls}>
                Type
              </label>
              <select
                id="ed-type"
                className={fieldCls}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as AssetType);
                }}
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-currency" className={labelCls}>
                Currency
              </label>
              <select
                id="ed-currency"
                className={`${fieldCls} tabular-nums`}
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as CurrencyCode);
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {holding.kind === 'asset' && (
            <div className="space-y-1.5">
              <label htmlFor="ed-cost" className={labelCls}>
                Cost basis (€)
              </label>
              <input
                id="ed-cost"
                className={`${fieldCls} tabular-nums`}
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                }}
              />
            </div>
          )}
          {showUnits && (
            <div className="space-y-1.5">
              <label htmlFor="ed-units" className={labelCls}>
                Units / quantity
              </label>
              <input
                id="ed-units"
                className={`${fieldCls} tabular-nums`}
                type="number"
                step="any"
                value={units}
                onChange={(e) => {
                  setUnits(e.target.value);
                }}
                placeholder="e.g. 0.5 BTC, 120 shares"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="ed-liquidity" className={labelCls}>
                Liquidity
              </label>
              <select
                id="ed-liquidity"
                className={fieldCls}
                value={liquidity}
                onChange={(e) => {
                  setLiquidity(e.target.value as Liquidity);
                }}
              >
                <option value="liquid">Liquid</option>
                <option value="illiquid">Illiquid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-source" className={labelCls}>
                Source
              </label>
              <select
                id="ed-source"
                className={fieldCls}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value as UpdateSource);
                }}
              >
                <option value="manual">Manual</option>
                <option value="auto">Auto-priced</option>
                <option value="bank">Bank sync</option>
              </select>
            </div>
          </div>
          {source === 'auto' && (
            <div className="space-y-1.5">
              <label htmlFor="ed-symbol" className={labelCls}>
                Ticker / symbol
              </label>
              <input
                id="ed-symbol"
                className={fieldCls}
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                }}
                placeholder="e.g. IWDA, BTC/USD"
              />
            </div>
          )}
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
              className="rounded-pill bg-accent px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent-foreground active:opacity-80"
            >
              Save
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
