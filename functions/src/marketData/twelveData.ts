/**
 * Twelve Data client — the single price provider for the Wealth module
 * (equities, crypto and index proxies). The pure response parsers / batching
 * helpers are exported separately from the network class so they can be
 * unit-tested without hitting the API.
 *
 * Free-tier limits (Basic plan): 8 API credits per minute, 800 per day. A
 * `/quote` or `/time_series` request spends one credit per symbol, so we batch
 * comma-separated symbols and throttle to stay under the per-minute ceiling.
 */

import { defineSecret } from 'firebase-functions/params';
import type { HistoryPoint } from '../shared/holdings.js';

/** Twelve Data API key — provided via Firebase Secrets (`TWELVEDATA_API_KEY`). */
export const twelveDataApiKey = defineSecret('TWELVEDATA_API_KEY');

const BASE_URL = 'https://api.twelvedata.com';

/** Free-tier rate limits. */
export const FREE_TIER_PER_MINUTE = 8;

/** A single resolved quote for a symbol. */
export interface TwelveDataQuote {
  symbol: string;
  /** Latest price (the `close` field of the quote). */
  price: number;
  /** Prior session close, used to surface the move since last refresh. */
  previousClose: number | null;
}

/**
 * Split symbols into batches no larger than `size`. Each symbol in a
 * comma-separated `/quote` request still spends one credit, so the batch size
 * is bounded by the per-minute credit ceiling.
 */
export function chunkSymbols(symbols: string[], size: number = FREE_TIER_PER_MINUTE): string[][] {
  if (size < 1) throw new Error('chunk size must be >= 1');
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += size) {
    batches.push(symbols.slice(i, i + size));
  }
  return batches;
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a `/quote` response into a symbol→quote map. Twelve Data returns a flat
 * object for a single symbol and a keyed object (`{ AAPL: {...}, MSFT: {...} }`)
 * for a comma-separated batch; per-symbol errors come back as
 * `{ status: 'error', ... }` and are skipped rather than aborting the batch.
 */
export function parseQuoteResponse(
  json: unknown,
  requestedSymbols: string[]
): Map<string, TwelveDataQuote> {
  const out = new Map<string, TwelveDataQuote>();
  if (json == null || typeof json !== 'object') return out;
  const obj = json as Record<string, unknown>;

  // Single-symbol response: a flat quote object carrying its own `symbol`.
  const single = parseSingleQuote(obj);
  if (single) {
    out.set(single.symbol, single);
    return out;
  }

  // Batched response: one entry per requested symbol, keyed by symbol.
  for (const symbol of requestedSymbols) {
    const entry = obj[symbol];
    if (entry == null || typeof entry !== 'object') continue;
    const quote = parseSingleQuote(entry as Record<string, unknown>, symbol);
    if (quote) out.set(symbol, quote);
  }
  return out;
}

function parseSingleQuote(
  obj: Record<string, unknown>,
  fallbackSymbol?: string
): TwelveDataQuote | null {
  if (obj.status === 'error') return null;
  const symbol = (typeof obj.symbol === 'string' ? obj.symbol : fallbackSymbol) ?? null;
  const price = toFiniteNumber(obj.close ?? obj.price);
  if (!symbol || price == null) return null;
  return {
    symbol,
    price,
    previousClose: toFiniteNumber(obj.previous_close),
  };
}

/**
 * Parse a `/time_series` response into ascending dated close points. Returns an
 * empty array on an error payload or a missing `values` array.
 */
export function parseTimeSeries(json: unknown): HistoryPoint[] {
  if (json == null || typeof json !== 'object') return [];
  const obj = json as Record<string, unknown>;
  if (obj.status === 'error' || !Array.isArray(obj.values)) return [];

  const points: HistoryPoint[] = [];
  for (const raw of obj.values) {
    if (raw == null || typeof raw !== 'object') continue;
    const v = raw as Record<string, unknown>;
    const date = typeof v.datetime === 'string' ? v.datetime.slice(0, 10) : null;
    const close = toFiniteNumber(v.close);
    if (date && close != null) points.push({ date, value: close });
  }
  // Twelve Data returns newest-first; charts expect ascending dates.
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return points;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class TwelveDataClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = BASE_URL,
    /** Throttle between batches to respect the per-minute credit ceiling. */
    private readonly throttleMs: number = 60_000
  ) {}

  /**
   * Fetch quotes for many symbols, batching comma-separated requests and
   * throttling between batches to stay within the free-tier per-minute ceiling.
   */
  async getQuotes(symbols: string[]): Promise<Map<string, TwelveDataQuote>> {
    const unique = Array.from(new Set(symbols.filter((s) => s.trim().length > 0)));
    const merged = new Map<string, TwelveDataQuote>();
    const batches = chunkSymbols(unique);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;
      const url = new URL(`${this.baseUrl}/quote`);
      url.searchParams.set('symbol', batch.join(','));
      url.searchParams.set('apikey', this.apiKey);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Twelve Data /quote failed: ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as unknown;
      for (const [symbol, quote] of parseQuoteResponse(json, batch)) {
        merged.set(symbol, quote);
      }

      // Throttle between batches only (not after the final one).
      if (i < batches.length - 1 && this.throttleMs > 0) {
        await sleep(this.throttleMs);
      }
    }
    return merged;
  }

  /**
   * Fetch a daily-close time series for a single symbol (ascending dates).
   * `outputsize` caps the number of returned points (Twelve Data max 5000).
   */
  async getTimeSeries(
    symbol: string,
    opts: { outputsize?: number; startDate?: string } = {}
  ): Promise<HistoryPoint[]> {
    const url = new URL(`${this.baseUrl}/time_series`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', '1day');
    url.searchParams.set('outputsize', String(opts.outputsize ?? 30));
    if (opts.startDate) url.searchParams.set('start_date', opts.startDate);
    url.searchParams.set('apikey', this.apiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Twelve Data /time_series failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as unknown;
    return parseTimeSeries(json);
  }
}
