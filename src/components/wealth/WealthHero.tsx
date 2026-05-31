import { cn, formatAmount } from '@/lib/utils';

interface BenchmarkLine {
  label: string;
  /** Benchmark's own return % over the range. */
  benchPct: number;
  /** Subject return − benchmark return, in percentage points. */
  ppDiff: number;
  beating: boolean;
}

interface WealthHeroProps {
  /** Subject label, e.g. "NET WORTH", "LIQUID", "EQUITIES". */
  label: string;
  value: number;
  delta: { abs: number; pct: number };
  periodLabel: string;
  benchmark?: BenchmarkLine | null;
  /** Compact liquid-assets sub-row; null hides it (e.g. when subject = LIQUID). */
  liquid?: { value: number; pct: number } | null;
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function WealthHero({ label, value, delta, periodLabel, benchmark, liquid }: WealthHeroProps) {
  const up = delta.abs >= 0;
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">{label}</p>
      <p className="font-mono text-[44px] font-medium leading-none tracking-tight text-textHi tabular-nums">
        {formatAmount(value, { showSign: false, noCents: true })}
      </p>
      <p
        className={cn(
          'font-mono text-[12px] tabular-nums',
          up ? 'text-accent' : 'text-warn'
        )}
      >
        {up ? '▲' : '▼'} {formatAmount(Math.abs(delta.abs), { showSign: false, noCents: true })} (
        {pct(delta.pct)}){' '}
        <span className="text-textLo">— {periodLabel}</span>
      </p>

      {benchmark && (
        <p
          className={cn(
            'font-mono text-[11px] tabular-nums',
            benchmark.beating ? 'text-accent' : 'text-alert'
          )}
        >
          vs {benchmark.label} {pct(benchmark.benchPct)} (
          {benchmark.ppDiff >= 0 ? '+' : ''}
          {benchmark.ppDiff.toFixed(1)}pp)
        </p>
      )}

      {liquid && (
        <p className="flex items-baseline gap-2 pt-0.5 font-mono text-[11px] tabular-nums text-textMid">
          <span className="text-[10px] uppercase tracking-[0.12em] text-textLo">Liquid assets</span>
          <span className="text-textHi">{formatAmount(liquid.value, { showSign: false, noCents: true })}</span>
          <span className={liquid.pct >= 0 ? 'text-accent' : 'text-warn'}>
            {liquid.pct >= 0 ? '▲' : '▼'} {pct(liquid.pct)}
          </span>
        </p>
      )}
    </div>
  );
}
