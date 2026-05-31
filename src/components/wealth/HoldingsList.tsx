import { Fragment, useState } from 'react';
import { formatAmount } from '@/lib/utils';
import { groupHoldings, isClosed } from '@/lib/wealth';
import type { Holding } from '@/types/wealth';
import { HoldingRow } from './HoldingRow';

interface HoldingsListProps {
  holdings: Holding[];
  onSelect: (holding: Holding) => void;
  onAdd: () => void;
}

export function HoldingsList({ holdings, onSelect, onAdd }: HoldingsListProps) {
  const [showClosed, setShowClosed] = useState(false);

  const active = holdings.filter((h) => !isClosed(h));
  const closed = holdings.filter(isClosed);
  const groups = groupHoldings(active);

  return (
    <section className="rounded-card border border-rule bg-surface p-4">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
        Holdings · {active.length} items
      </p>

      {groups.map((group, idx) => {
        const isLiability = group.kind === 'liability';
        const prevWasAsset = idx > 0 && groups[idx - 1]!.kind === 'asset';
        const showLiabilityDivider = isLiability && (idx === 0 || prevWasAsset);

        return (
          <Fragment key={`${group.kind}-${group.type}`}>
            {showLiabilityDivider && (
              <p className="mt-4 border-t border-ruleHi pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
                Liabilities
              </p>
            )}
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-textMid">
                {group.type}
              </span>
              <span
                className={`font-mono text-[11px] tabular-nums ${isLiability ? 'text-alert' : 'text-textLo'}`}
              >
                {isLiability ? '−' : ''}
                {formatAmount(group.subtotal, { showSign: false, noCents: true })}
              </span>
            </div>
            {group.holdings.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                onClick={() => {
                  onSelect(h);
                }}
              />
            ))}
          </Fragment>
        );
      })}

      {closed.length > 0 && (
        <div className="mt-4 border-t border-rule pt-3">
          <button
            type="button"
            onClick={() => {
              setShowClosed((s) => !s);
            }}
            className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-textLo active:opacity-60"
          >
            <span>Closed · {closed.length}</span>
            <span aria-hidden>{showClosed ? '▾' : '▸'}</span>
          </button>
          {showClosed &&
            closed.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                onClick={() => {
                  onSelect(h);
                }}
              />
            ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 w-full rounded-pill border border-dashed border-rule py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-textLo active:opacity-60"
      >
        + Add holding
      </button>
    </section>
  );
}
