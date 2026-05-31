/**
 * Pure mappers between the unified Wealth `Holding` model and the various
 * sources that feed it (manual entry, the old investments/debts collections,
 * bank balances, and live market quotes).
 *
 * Everything here is side-effect free and free of Firestore imports so it can
 * be unit-tested directly and shared between the client hooks, the importer,
 * and the Cloud Functions pricing/sync jobs. Firestore Timestamp conversion is
 * handled by the callers (history dates are plain ISO `YYYY-MM-DD` strings).
 */

import type { Debt, Investment } from '@/types';
import type {
  AssetType,
  HistoryPoint,
  HoldingKind,
  Liquidity,
  UpdateSource,
} from '@/types/wealth';

const MS_PER_DAY = 86_400_000;

/** ISO `YYYY-MM-DD` for a given date (defaults to now). */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Days since the last confirmed value, derived from `lastValueAt`. Drives the
 * UI's freshness dot. Future / invalid timestamps clamp to 0.
 */
export function deriveUpdatedDaysAgo(lastValueMs: number, nowMs: number): number {
  if (!Number.isFinite(lastValueMs)) return 0;
  const diff = nowMs - lastValueMs;
  return diff <= 0 ? 0 : Math.floor(diff / MS_PER_DAY);
}

/**
 * The writable shape of a holding (everything except the server-managed id and
 * createdAt/updatedAt). History dates are ISO strings; callers convert to
 * Firestore Timestamps on write.
 */
export interface HoldingSeed {
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
  history: HistoryPoint[];
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
 * the move since last refresh.
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

/**
 * Build the cash-holding fields for a bank account balance. Keyed
 * deterministically by the bank account uid (`bank-${accountUid}`) by the
 * caller so repeated syncs upsert rather than duplicate.
 */
export function balanceToCashHolding(
  amount: number,
  opts: {
    name: string;
    platform: string;
    date?: string;
  }
): HoldingSeed {
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
    history: [{ date, value: amount }],
  };
}

// ── Fallback migration: old investments / debts → holdings ───────────────────

const INVESTMENT_TYPE_TO_ASSET: Record<Investment['type'], AssetType> = {
  etf: 'Equities',
  stock: 'Equities',
  bond: 'Equities',
  crypto: 'Crypto',
  savings: 'Cash',
  pension: 'Equities',
  other: 'Equities',
};

const DEBT_TYPE_TO_ASSET: Record<Debt['type'], AssetType> = {
  mortgage: 'Mortgage',
  personal_loan: 'Loan',
  student_loan: 'Loan',
  credit_card: 'Credit',
  other: 'Loan',
};

/** Cash-like investment types are liquid; everything else defaults to liquid too. */
function investmentLiquidity(type: Investment['type']): Liquidity {
  return type === 'pension' ? 'illiquid' : 'liquid';
}

/**
 * Best-effort fallback mapper for the superseded `investments` collection.
 * `value`/`cost` come from the latest entry; `history` from every entry's
 * marketValue.
 */
export function investmentToHolding(inv: Investment): HoldingSeed {
  const sorted = [...inv.entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  const latest = sorted[sorted.length - 1];
  const isCrypto = inv.type === 'crypto';
  return {
    name: inv.name,
    platform: inv.platform,
    type: INVESTMENT_TYPE_TO_ASSET[inv.type],
    kind: 'asset',
    value: latest?.marketValue ?? 0,
    cost: latest?.costBasis ?? 0,
    units: null,
    liquidity: investmentLiquidity(inv.type),
    // Equities/crypto can later be made auto-priced by adding a symbol; default manual.
    updateSource: isCrypto ? 'auto' : 'manual',
    notes: inv.notes ?? null,
    symbol: null,
    history: sorted.map((e) => ({ date: todayIso(e.date), value: e.marketValue })),
  };
}

/** Best-effort fallback mapper for the superseded `debts` collection. */
export function debtToHolding(debt: Debt, asOf: string = todayIso()): HoldingSeed {
  const type = DEBT_TYPE_TO_ASSET[debt.type];
  return {
    name: debt.name,
    platform: '',
    type,
    kind: 'liability',
    value: debt.balance,
    cost: 0,
    units: null,
    liquidity: type === 'Credit' ? 'liquid' : 'illiquid',
    updateSource: 'manual',
    notes: debt.notes ?? null,
    symbol: null,
    history: [{ date: asOf, value: debt.balance }],
  };
}
