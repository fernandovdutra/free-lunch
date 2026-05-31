import { formatAmount } from '@/lib/utils';
import { composition } from '@/lib/wealth';
import type { Holding } from '@/types/wealth';

interface CompositionBarsProps {
  holdings: Holding[];
}

function rampOpacity(i: number): number {
  return Math.max(0.35, 1 - i * 0.2);
}

function Stack({
  title,
  holdings,
  color,
  negative,
}: {
  title: string;
  holdings: Holding[];
  color: string;
  negative?: boolean;
}) {
  const slices = composition(holdings, negative ? 'liability' : 'asset');
  if (slices.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">{title}</p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-pill">
        {slices.map((s, i) => (
          <div
            key={s.type}
            style={{ width: `${s.pct}%`, backgroundColor: color, opacity: rampOpacity(i) }}
            title={`${s.type} ${s.pct.toFixed(0)}%`}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {slices.map((s, i) => (
          <li key={s.type} className="flex items-center gap-2 font-mono text-[11px]">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: color, opacity: rampOpacity(i) }}
            />
            <span className="flex-1 text-textMid">{s.type}</span>
            <span className="tabular-nums text-textLo">{s.pct.toFixed(0)}%</span>
            <span className="w-24 text-right tabular-nums text-textHi">
              {negative ? '−' : ''}
              {formatAmount(s.amount, { showSign: false, noCents: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompositionBars({ holdings }: CompositionBarsProps) {
  return (
    <div className="space-y-5 rounded-card border border-rule bg-surface p-4">
      <Stack title="Assets · by type" holdings={holdings} color="var(--accent)" />
      <Stack title="Liabilities · by type" holdings={holdings} color="var(--alert)" negative />
    </div>
  );
}
