/**
 * Pure holding mappers for the Cloud Functions side (live pricing + bank-synced
 * cash). These mirror the client mappers in `src/lib/holdingsMapping.ts`
 * one-for-one — they're duplicated here only because the Functions package has
 * its own `rootDir` and cannot import from the app's `src/`. Keep the two in
 * sync. Everything here is side-effect free and free of Firestore imports so it
 * can be unit-tested directly.
 */

export type AssetType =
  | 'Real Estate'
  | 'Vehicle'
  | 'Equities'
  | 'Crypto'
  | 'Cash'
  | 'Mortgage'
  | 'Credit'
  | 'Loan';

export type HoldingKind = 'asset' | 'liability';
export type Liquidity = 'liquid' | 'illiquid';
export type UpdateSource = 'auto' | 'bank' | 'manual';

export interface HistoryPoint {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  value: number;
}

/** ISO `YYYY-MM-DD` for a given date (defaults to now). */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// ── Live quotes ──────────────────────────────────────────────────────────────

export interface QuoteUpdate {
  /** Recomputed current value (livePrice × units), rounded to cents. */
  value: number;
  livePrice: number;
  /** The prior live price, surfaced as the ↑/↓ delta in the check-in flow. */
  prevPrice: number | null;
}

/**
 * Compute the value/price update for an auto-priced holding given a fresh unit
 * quote. The previous live price is carried into `prevPrice` so the UI can show
 * the move since last refresh. Mirrors `quoteToHoldingUpdate` in
 * `src/lib/holdingsMapping.ts`.
 */
export function quoteToHoldingUpdate(
  units: number | null,
  newPrice: number,
  currentLivePrice: number | null | undefined
): QuoteUpdate {
  const u = units ?? 0;
  return {
    value: Math.round(u * newPrice * 100) / 100,
    livePrice: newPrice,
    prevPrice: currentLivePrice ?? null,
  };
}

// ── Bank balances → cash holding ─────────────────────────────────────────────

export interface CashHoldingSeed {
  name: string;
  platform: string;
  type: AssetType;
  kind: HoldingKind;
  value: number;
  cost: number;
  units: number | null;
  liquidity: Liquidity;
  updateSource: UpdateSource;
  notes: string | null;
  symbol: string | null;
  /** Native currency. Bank-synced ABN AMRO balances are EUR. */
  currency: 'EUR';
  history: HistoryPoint[];
}

/**
 * Build the cash-holding fields for a bank account balance. The caller keys the
 * doc deterministically (`bank-${accountUid}`) so repeated syncs upsert rather
 * than duplicate. Mirrors `balanceToCashHolding` in
 * `src/lib/holdingsMapping.ts`.
 */
export function balanceToCashHolding(
  amount: number,
  opts: {
    name: string;
    platform: string;
    date?: string;
  }
): CashHoldingSeed {
  const date = opts.date ?? todayIso();
  return {
    name: opts.name,
    platform: opts.platform,
    type: 'Cash',
    kind: 'asset',
    value: amount,
    cost: 0,
    units: null,
    liquidity: 'liquid',
    updateSource: 'bank',
    notes: null,
    symbol: null,
    currency: 'EUR',
    history: [{ date, value: amount }],
  };
}

// ── History maintenance ──────────────────────────────────────────────────────

/**
 * Upsert a dated point into a history series: replaces an existing same-date
 * point (keeping the series one-point-per-day) and returns a new ascending
 * array. Used by the daily auto-sync / pricing jobs that may run several times
 * a day so the stored history stays clean.
 */
export function upsertHistoryPoint(history: HistoryPoint[], point: HistoryPoint): HistoryPoint[] {
  const next = history.filter((p) => p.date !== point.date);
  next.push(point);
  next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return next;
}
