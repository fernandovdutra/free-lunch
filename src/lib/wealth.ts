/**
 * Pure helpers for the Wealth module: derived totals, chart series, range
 * deltas, benchmark normalization, composition, grouping, and unit formatting.
 *
 * All functions are side-effect free so they can be unit-tested directly and
 * reused across the main screen and the holding-detail sheet.
 */

import type {
  AssetType,
  Benchmark,
  ChartSubject,
  Holding,
  HistoryPoint,
  HoldingKind,
  RangeKey,
} from '@/types/wealth';

// ── Derived totals ─────────────────────────────────────────────────────────

export function netWorth(holdings: Holding[]): number {
  return holdings.reduce(
    (sum, h) => sum + (h.kind === 'asset' ? h.value : -h.value),
    0
  );
}

export function liquidTotal(holdings: Holding[]): number {
  // Liquid = sum of liquid-flagged assets. Liabilities are NOT subtracted.
  return holdings
    .filter((h) => h.kind === 'asset' && h.liquidity === 'liquid')
    .reduce((sum, h) => sum + h.value, 0);
}

export function equitiesTotal(holdings: Holding[]): number {
  return holdings
    .filter((h) => h.kind === 'asset' && h.type === 'Equities')
    .reduce((sum, h) => sum + h.value, 0);
}

// ── Chart series ─────────────────────────────────────────────────────────────

/** Latest value of a history at or before `ts` (step / forward-fill). */
function valueAtOrBefore(history: HistoryPoint[], ts: number): number | null {
  let chosen: number | null = null;
  let chosenTs = -Infinity;
  for (const p of history) {
    const t = new Date(p.date).getTime();
    if (t <= ts && t >= chosenTs) {
      chosen = p.value;
      chosenTs = t;
    }
  }
  return chosen;
}

/** Holdings relevant to a given chart subject. */
function holdingsForSubject(holdings: Holding[], subject: ChartSubject): Holding[] {
  switch (subject) {
    case 'LIQUID':
      return holdings.filter((h) => h.kind === 'asset' && h.liquidity === 'liquid');
    case 'EQUITIES':
      return holdings.filter((h) => h.kind === 'asset' && h.type === 'Equities');
    case 'NET_WORTH':
    default:
      return holdings;
  }
}

/**
 * Build a time series for a chart subject by summing the relevant holdings'
 * own history (forward-filled) at every observed date. For NET_WORTH,
 * liabilities subtract; for LIQUID / EQUITIES only the matching assets add.
 */
export function buildSeries(holdings: Holding[], subject: ChartSubject): HistoryPoint[] {
  const relevant = holdingsForSubject(holdings, subject);
  const dates = Array.from(
    new Set(relevant.flatMap((h) => h.history.map((p) => p.date)))
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return dates.map((date) => {
    const ts = new Date(date).getTime();
    let total = 0;
    for (const h of relevant) {
      const v = valueAtOrBefore(h.history, ts);
      if (v == null) continue;
      total += h.kind === 'liability' ? -v : v;
    }
    return { date, value: total };
  });
}

// ── Range windowing + deltas ─────────────────────────────────────────────────

/** Window start timestamp for a range, relative to a reference "now". */
function windowStart(range: RangeKey, refTs: number): number {
  const ref = new Date(refTs);
  switch (range) {
    case '6M':
      return new Date(ref.getFullYear(), ref.getMonth() - 6, ref.getDate()).getTime();
    case 'YTD':
      return new Date(ref.getFullYear(), 0, 1).getTime();
    case '1Y':
      return new Date(ref.getFullYear() - 1, ref.getMonth(), ref.getDate()).getTime();
    case '3Y':
      return new Date(ref.getFullYear() - 3, ref.getMonth(), ref.getDate()).getTime();
    case 'MAX':
    default:
      return -Infinity;
  }
}

/** Clip a series to the selected range (relative to its last point). */
export function clipToRange(series: HistoryPoint[], range: RangeKey): HistoryPoint[] {
  if (series.length === 0) return series;
  const refTs = new Date(series[series.length - 1]!.date).getTime();
  const startTs = windowStart(range, refTs);
  return series.filter((p) => new Date(p.date).getTime() >= startTs);
}

export interface RangeDelta {
  abs: number;
  pct: number;
}

/** First-vs-last delta within an (already clipped) series. */
export function rangeDelta(series: HistoryPoint[]): RangeDelta {
  if (series.length < 2) return { abs: 0, pct: 0 };
  const first = series[0]!.value;
  const last = series[series.length - 1]!.value;
  const abs = last - first;
  const pct = first !== 0 ? (abs / Math.abs(first)) * 100 : 0;
  return { abs, pct };
}

const PERIOD_LABELS: Record<RangeKey, string> = {
  '6M': 'past 6mo',
  YTD: 'YTD',
  '1Y': 'past 12mo',
  '3Y': 'past 3y',
  MAX: 'all time',
};

export function periodLabel(range: RangeKey): string {
  return PERIOD_LABELS[range];
}

// ── Benchmark normalization ──────────────────────────────────────────────────

/**
 * Re-base a benchmark series to start at the subject's start value, sampled at
 * the subject's dates. The overlay then reads as *relative* performance: a
 * benchmark that grew 10% lands 10% above the subject's starting line.
 */
export function normalizeBenchmark(
  subject: HistoryPoint[],
  benchmark: HistoryPoint[]
): HistoryPoint[] {
  if (subject.length === 0 || benchmark.length === 0) return [];
  const base = subject[0]!.value;
  const startTs = new Date(subject[0]!.date).getTime();
  const benchAtStart = valueAtOrBefore(benchmark, startTs) ?? benchmark[0]!.value;
  if (benchAtStart === 0) return [];

  return subject.map((p) => {
    const ts = new Date(p.date).getTime();
    const b = valueAtOrBefore(benchmark, ts) ?? benchAtStart;
    return { date: p.date, value: (b / benchAtStart) * base };
  });
}

// ── Composition ──────────────────────────────────────────────────────────────

export interface CompositionSlice {
  type: AssetType;
  amount: number;
  pct: number;
}

/** Group holdings of one kind by type into composition slices (desc by amount). */
export function composition(holdings: Holding[], kind: HoldingKind): CompositionSlice[] {
  const ofKind = holdings.filter((h) => h.kind === kind);
  const total = ofKind.reduce((s, h) => s + h.value, 0);
  const byType = new Map<AssetType, number>();
  for (const h of ofKind) {
    byType.set(h.type, (byType.get(h.type) ?? 0) + h.value);
  }
  return Array.from(byType.entries())
    .map(([type, amount]) => ({
      type,
      amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ── Holdings grouping ────────────────────────────────────────────────────────

const ASSET_ORDER: AssetType[] = ['Real Estate', 'Vehicle', 'Equities', 'Crypto', 'Cash'];
const LIABILITY_ORDER: AssetType[] = ['Mortgage', 'Credit', 'Loan'];

export interface HoldingGroup {
  type: AssetType;
  kind: HoldingKind;
  subtotal: number;
  holdings: Holding[];
}

/** Ordered, non-empty groups: assets first (by ASSET_ORDER), then liabilities. */
export function groupHoldings(holdings: Holding[]): HoldingGroup[] {
  const order: { type: AssetType; kind: HoldingKind }[] = [
    ...ASSET_ORDER.map((type) => ({ type, kind: 'asset' as const })),
    ...LIABILITY_ORDER.map((type) => ({ type, kind: 'liability' as const })),
  ];

  return order
    .map(({ type, kind }) => {
      const items = holdings.filter((h) => h.kind === kind && h.type === type);
      return {
        type,
        kind,
        subtotal: items.reduce((s, h) => s + h.value, 0),
        holdings: items,
      };
    })
    .filter((g) => g.holdings.length > 0);
}

// ── Benchmark gating ─────────────────────────────────────────────────────────

/**
 * Which benchmarks are offered for a subject. Never benchmark *total* net worth
 * against an equity index — a property-heavy net worth always looks like it
 * "underperforms" the S&P, which is misleading. Equity benchmarks belong on the
 * slices that actually compete with markets.
 */
export function benchmarkOptions(subject: ChartSubject): Benchmark[] {
  if (subject === 'NET_WORTH') return ['NONE', 'CASH'];
  return ['NONE', 'SP500', 'MSCI_WORLD', 'CASH'];
}

// ── Unit formatting ──────────────────────────────────────────────────────────

/**
 * Smart unit formatter. Crypto up to 8 decimals (satoshis are real money),
 * equities up to 4, everything else whole. Strips invented trailing zeros.
 */
export function formatUnits(value: number, type: AssetType): string {
  const cap = type === 'Crypto' ? 8 : type === 'Equities' ? 4 : 0;
  const fixed = value.toFixed(cap);
  // Only strip the fractional tail; never touch trailing zeros of an integer.
  return cap === 0 ? fixed : fixed.replace(/\.?0+$/, '');
}
