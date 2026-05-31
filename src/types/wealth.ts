/**
 * Wealth module type definitions.
 *
 * Wealth = assets − liabilities, tracked over time. Holdings are manually
 * maintained with help (auto-priced / bank-synced / manual). Every confirmed
 * value writes a dated history point, so charts reflect observed values.
 */

export type HoldingKind = 'asset' | 'liability';

export type AssetType =
  | 'Real Estate'
  | 'Equities'
  | 'Crypto'
  | 'Cash'
  | 'Mortgage'
  | 'Credit'
  | 'Loan';

export type Liquidity = 'liquid' | 'illiquid';

export type UpdateSource = 'auto' | 'bank' | 'manual';

/** A dated value observation — the atomic unit charts are built from. */
export interface HistoryPoint {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  value: number;
}

export interface Holding {
  id: string;
  name: string; // "Bitcoin", "Apartment Amsterdam"
  platform: string; // "Kraken", "DEGIRO", "Self-held"
  type: AssetType;
  kind: HoldingKind;
  value: number; // current value (always positive; sign comes from `kind`)
  cost: number; // cost basis (assets); 0 if N/A
  units: number | null; // for auto-priced; null otherwise
  liquidity: Liquidity;
  updateSource: UpdateSource;
  updatedDaysAgo: number; // derived from last history entry
  notes?: string | null;
  /** Ticker / coin id for auto-priced holdings (drives the pricing job). */
  symbol?: string | null;
  /** Auto-priced holdings expose a live unit price for the check-in flow. */
  livePrice?: number;
  /** Previous live price, to surface the ↑/↓ delta during check-in. */
  prevPrice?: number;
  history: HistoryPoint[]; // dated points → charts
}

/** Chart time windows. */
export type RangeKey = '6M' | 'YTD' | '1Y' | '3Y' | 'MAX';

/** What the main chart + hero deltas describe. */
export type ChartSubject = 'NET_WORTH' | 'LIQUID' | 'EQUITIES';

/** Optional benchmark overlay. */
export type Benchmark = 'NONE' | 'SP500' | 'MSCI_WORLD' | 'CASH';

/** A named index series used for the (relative) benchmark overlay. */
export interface BenchmarkSeries {
  key: Exclude<Benchmark, 'NONE'>;
  label: string;
  history: HistoryPoint[];
}
