/**
 * Benchmark index series stored under `marketData` (server-written, read-only).
 *
 * Firestore path: `marketData/indices/series/{key}` — the `series` subcollection
 * is an artifact of Firestore's collection/doc alternation; conceptually each
 * doc is "the index series for {key}". Each doc holds an ascending daily-close
 * `history: HistoryPoint[]` that the client feeds through `normalizeBenchmark`.
 *
 * Symbols are liquid ETF proxies that are available on the Twelve Data free
 * tier (the underlying indices themselves require a paid plan). Because the
 * chart re-bases the overlay to *relative* performance via `normalizeBenchmark`,
 * a faithfully-tracking ETF is equivalent to the index for the comparison.
 */

import type { Firestore } from 'firebase-admin/firestore';
import type { HistoryPoint } from '../shared/holdings.js';

export interface BenchmarkIndex {
  /** Matches the client `Benchmark` union (excluding NONE / synthetic CASH). */
  key: 'SP500' | 'MSCI_WORLD';
  label: string;
  /** Twelve Data symbol used to source the close series. */
  symbol: string;
}

export const BENCHMARK_INDICES: BenchmarkIndex[] = [
  { key: 'SP500', label: 'S&P 500', symbol: 'SPY' },
  { key: 'MSCI_WORLD', label: 'MSCI WORLD', symbol: 'URTH' },
];

/** Collection holding one document per benchmark index. */
export function indexSeriesCollection(db: Firestore) {
  return db.collection('marketData').doc('indices').collection('series');
}

/**
 * Merge a fresh close series into an existing one: upsert by date (incoming
 * wins on collision) and return a new ascending, one-point-per-day array.
 */
export function mergeTimeSeries(
  existing: HistoryPoint[],
  incoming: HistoryPoint[]
): HistoryPoint[] {
  const byDate = new Map<string, number>();
  for (const p of existing) byDate.set(p.date, p.value);
  for (const p of incoming) byDate.set(p.date, p.value);
  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
