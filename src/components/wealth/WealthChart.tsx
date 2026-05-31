import { useEffect, useId, useRef, useState } from 'react';
import type { HistoryPoint } from '@/types/wealth';

interface WealthChartProps {
  /** Subject series (already clipped to the selected range). */
  series: HistoryPoint[];
  /**
   * Optional benchmark overlay — already normalized to the subject's start
   * value (see `normalizeBenchmark`). Rendered as a dashed dim line.
   */
  benchmark?: { label: string; series: HistoryPoint[] } | null;
  height?: number;
  ariaLabel?: string;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function compactEuro(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}€${Math.round(abs / 1000)}k`;
  return `${sign}€${Math.round(abs)}`;
}

function xLabel(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

const tsOf = (iso: string) => new Date(iso).getTime();

/** Measure the container's pixel width so the SVG renders crisp (no scaling). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setW(cr.width);
    });
    ro.observe(el);
    setW(el.clientWidth);
    return () => {
      ro.disconnect();
    };
  }, []);
  return [ref, w] as const;
}

/** Adaptive number of x-axis labels for a series of length `n`. */
function tickCount(n: number): number {
  if (n <= 1) return 1;
  return Math.min(n >= 24 ? 6 : n >= 12 ? 5 : 3, n);
}

const PAD = { l: 8, r: 46, t: 12, b: 18 };

export function WealthChart({ series, benchmark, height = 180, ariaLabel }: WealthChartProps) {
  const [ref, w] = useWidth();
  const gradId = `wealth-fill-${useId().replace(/:/g, '')}`;

  const innerW = Math.max(0, w - PAD.l - PAD.r);
  const innerH = Math.max(0, height - PAD.t - PAD.b);
  const n = series.length;

  // Combined vertical extent across subject + benchmark, padded.
  const allValues = [
    ...series.map((p) => p.value),
    ...(benchmark?.series.map((p) => p.value) ?? []),
  ];
  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const rawMax = allValues.length ? Math.max(...allValues) : 1;
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const yMin = rawMin - span * 0.06;
  const yMax = rawMax + span * 0.06;

  // Horizontal axis is real time: the subject series defines the date domain,
  // and every point (subject or benchmark) is placed by its own date — so
  // uneven gaps between updates render at their true proportional width.
  const minTs = n > 0 ? tsOf(series[0]!.date) : 0;
  const maxTs = n > 0 ? tsOf(series[n - 1]!.date) : 1;
  const spanTs = maxTs - minTs || 1;

  const xOf = (ts: number) =>
    n <= 1 ? PAD.l + innerW / 2 : PAD.l + ((ts - minTs) / spanTs) * innerW;
  const yOf = (v: number) => PAD.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const toPath = (pts: HistoryPoint[]) =>
    pts
      .map(
        (p, i) => `${i === 0 ? 'M' : 'L'}${xOf(tsOf(p.date)).toFixed(2)},${yOf(p.value).toFixed(2)}`
      )
      .join(' ');

  const linePath = toPath(series);
  const baselineY = PAD.t + innerH;
  const areaPath =
    n > 1
      ? `${linePath} L${xOf(maxTs).toFixed(2)},${baselineY.toFixed(2)} L${xOf(minTs).toFixed(2)},${baselineY.toFixed(2)} Z`
      : '';
  const benchPath = benchmark && benchmark.series.length > 1 ? toPath(benchmark.series) : '';

  const yLevels = [yMax, (yMax + yMin) / 2, yMin];
  // Evenly spaced in time (not by point index), so labels track the real scale.
  const nTicks = tickCount(n);
  const tickTimes =
    nTicks <= 1
      ? [minTs]
      : Array.from({ length: nTicks }, (_, k) => minTs + (k / (nTicks - 1)) * spanTs);
  const ready = w > 0 && n > 0;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {benchmark && (
        <div className="absolute right-1 top-0 z-10 flex items-center gap-1.5">
          <span aria-hidden className="h-px w-4 border-t border-dashed border-textLo" />
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-textLo">
            {benchmark.label}
          </span>
        </div>
      )}
      {ready && (
        <svg
          width={w}
          height={height}
          viewBox={`0 0 ${w} ${height}`}
          className="block"
          role="img"
          aria-label={ariaLabel ?? 'Value over time'}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid at the three y-levels */}
          {yLevels.map((v, i) => (
            <line
              key={`grid-${i}`}
              x1={PAD.l}
              x2={w - PAD.r}
              y1={yOf(v)}
              y2={yOf(v)}
              stroke="var(--rule-hi)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />}

          {/* Benchmark (dashed, dim) */}
          {benchPath && (
            <path
              d={benchPath}
              fill="none"
              stroke="var(--text-lo)"
              strokeWidth="1.25"
              strokeDasharray="4 3"
            />
          )}

          {/* Subject line */}
          {n > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Y-axis labels at the right edge */}
          {yLevels.map((v, i) => (
            <text
              key={`yl-${i}`}
              x={w - 4}
              y={yOf(v) + (i === 0 ? 8 : i === 2 ? -2 : 3)}
              textAnchor="end"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="9"
              fill="var(--text-lo)"
            >
              {compactEuro(v)}
            </text>
          ))}

          {/* X-axis labels — positioned by date, evenly spaced in time */}
          {tickTimes.map((ts, i) => (
            <text
              key={`xl-${i}`}
              x={xOf(ts)}
              y={height - 4}
              textAnchor={i === 0 ? 'start' : i === tickTimes.length - 1 ? 'end' : 'middle'}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="9"
              fill="var(--text-lo)"
            >
              {xLabel(ts)}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
