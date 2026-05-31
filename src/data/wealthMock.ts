/**
 * Mock data for the Wealth module UI pass.
 *
 * A typed Holding[] covering every visual state (auto-priced crypto/equities,
 * bank-synced cash, stale manual real estate, three liability types) with ~3
 * years of monthly history so all chart ranges and benchmark overlays render.
 * Replaced by real Firestore + live-pricing data in a later pass.
 */

import type { BenchmarkSeries, Holding, HistoryPoint } from '@/types/wealth';

// Anchor "now" for the mock — matches the app's current date.
const ANCHOR_YEAR = 2026;
const ANCHOR_MONTH = 4; // 0-indexed → May

function isoMonth(monthsAgo: number): string {
  const d = new Date(ANCHOR_YEAR, ANCHOR_MONTH - monthsAgo, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Deterministic monthly series interpolating `from`→`to` over `months` points
 * (oldest first), with a sine wiggle (percent amplitude) for organic shape.
 */
function series(
  months: number,
  from: number,
  to: number,
  opts?: { wiggle?: number; phase?: number; endsMonthsAgo?: number }
): HistoryPoint[] {
  const { wiggle = 0, phase = 0, endsMonthsAgo = 0 } = opts ?? {};
  const points: HistoryPoint[] = [];
  for (let i = 0; i < months; i++) {
    const t = months === 1 ? 1 : i / (months - 1);
    const base = from + (to - from) * t;
    const w = wiggle ? Math.sin(i * 0.7 + phase) * (wiggle / 100) : 0;
    const value = Math.round(base * (1 + w));
    const monthsAgo = months - 1 - i + endsMonthsAgo;
    points.push({ date: isoMonth(monthsAgo), value });
  }
  return points;
}

function last(points: HistoryPoint[]): number {
  return points[points.length - 1]!.value;
}

// ── Holdings ─────────────────────────────────────────────────────────────────

const realEstateHistory = series(34, 430_000, 521_000, { wiggle: 1.5, endsMonthsAgo: 3 });
const etfHistory = series(37, 58_000, 84_000, { wiggle: 7, phase: 1 });
const btcHistory = series(37, 9_500, 28_000, { wiggle: 18, phase: 2 });
const cashHistory = series(37, 11_200, 18_500, { wiggle: 4, phase: 0.5 });
const mortgageHistory = series(37, 318_000, 294_500, { wiggle: 0 });
const creditHistory = series(37, 1_900, 2_350, { wiggle: 30, phase: 3 });
const loanHistory = series(37, 21_000, 13_800, { wiggle: 0 });

export const MOCK_HOLDINGS: Holding[] = [
  {
    id: 'apt-ams',
    name: 'Apartment Amsterdam',
    platform: 'Self-held',
    type: 'Real Estate',
    kind: 'asset',
    value: last(realEstateHistory),
    cost: 430_000,
    units: null,
    liquidity: 'illiquid',
    updateSource: 'manual',
    updatedDaysAgo: 118, // stale → amber dot
    notes: 'Valued via WOZ + comparable sales',
    history: realEstateHistory,
  },
  {
    id: 'world-etf',
    name: 'World ETF',
    platform: 'DEGIRO',
    type: 'Equities',
    kind: 'asset',
    value: last(etfHistory),
    cost: 62_000,
    units: 850,
    liquidity: 'liquid',
    updateSource: 'auto',
    updatedDaysAgo: 1,
    livePrice: 98.8,
    prevPrice: 97.2,
    history: etfHistory,
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    platform: 'Kraken',
    type: 'Crypto',
    kind: 'asset',
    value: last(btcHistory),
    cost: 12_000,
    units: 0.42,
    liquidity: 'liquid',
    updateSource: 'auto',
    updatedDaysAgo: 1,
    livePrice: 66_667,
    prevPrice: 63_900,
    history: btcHistory,
  },
  {
    id: 'savings',
    name: 'Savings',
    platform: 'ABN AMRO',
    type: 'Cash',
    kind: 'asset',
    value: last(cashHistory),
    cost: 0,
    units: null,
    liquidity: 'liquid',
    updateSource: 'bank',
    updatedDaysAgo: 0,
    history: cashHistory,
  },
  {
    id: 'mortgage',
    name: 'Mortgage',
    platform: 'ING',
    type: 'Mortgage',
    kind: 'liability',
    value: last(mortgageHistory),
    cost: 0,
    units: null,
    liquidity: 'illiquid',
    updateSource: 'manual',
    updatedDaysAgo: 12,
    history: mortgageHistory,
  },
  {
    id: 'credit',
    name: 'Credit Card',
    platform: 'ICS',
    type: 'Credit',
    kind: 'liability',
    value: last(creditHistory),
    cost: 0,
    units: null,
    liquidity: 'liquid',
    updateSource: 'manual',
    updatedDaysAgo: 5, // most recent manual update → drives top-bar freshness
    history: creditHistory,
  },
  {
    id: 'student-loan',
    name: 'Student Loan',
    platform: 'DUO',
    type: 'Loan',
    kind: 'liability',
    value: last(loanHistory),
    cost: 0,
    units: null,
    liquidity: 'illiquid',
    updateSource: 'manual',
    updatedDaysAgo: 20,
    history: loanHistory,
  },
];

// ── Benchmark series (absolute index levels; normalized at render) ───────────

const sp500History = series(37, 4_180, 5_760, { wiggle: 6, phase: 1.5 });
const msciHistory = series(37, 2_850, 3_640, { wiggle: 5, phase: 2.5 });

// Cash at 3.5% APY, compounded monthly from a base of 100.
const cashApyHistory: HistoryPoint[] = (() => {
  const months = 37;
  const pts: HistoryPoint[] = [];
  let v = 100;
  for (let i = 0; i < months; i++) {
    pts.push({ date: isoMonth(months - 1 - i), value: Math.round(v * 1000) / 1000 });
    v *= 1 + 0.035 / 12;
  }
  return pts;
})();

export const MOCK_BENCHMARKS: Record<string, BenchmarkSeries> = {
  SP500: { key: 'SP500', label: 'S&P 500', history: sp500History },
  MSCI_WORLD: { key: 'MSCI_WORLD', label: 'MSCI WORLD', history: msciHistory },
  CASH: { key: 'CASH', label: 'CASH 3.5%', history: cashApyHistory },
};
