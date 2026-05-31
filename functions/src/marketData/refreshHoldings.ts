/**
 * Shared auto-pricing routine: given a set of `holdings` docs, fetch fresh
 * Twelve Data quotes and write the recomputed value + live/prev price back,
 * appending a dated history point. Mirrors the write shape of the client
 * `useUpdateHoldingValue` mutation so charts read the same denormalized values.
 *
 * Used by both the scheduled `refreshMarketData` (collection-group, all users)
 * and the on-demand `getLiveQuote` callable (a single caller's auto holdings).
 */

import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import { TwelveDataClient, type TwelveDataQuote } from './twelveData.js';

// Firestore batch limit is 500 ops; one update per holding stays well under it.
const BATCH_SIZE = 450;

/** The shape we need from a holding doc — satisfied by both Query and plain
 * DocumentSnapshots, so callers can pass collection-group results or a single
 * `get()`. */
export interface HoldingSnapshot {
  ref: DocumentReference;
  data(): DocumentData | undefined;
}

export interface PricedHolding {
  ref: DocumentReference;
  symbol: string;
  units: number | null;
  livePrice: number | null;
}

export interface QuoteResult {
  holdingId: string;
  symbol: string;
  /** Fresh unit price. */
  price: number;
  /** Prior session close, for the ↑/↓ move. */
  previousClose: number | null;
}

export interface RefreshSummary {
  /** Holdings considered (had an auto source + symbol). */
  considered: number;
  /** Holdings actually written with a fresh quote. */
  updated: number;
  /** Symbols that were requested but returned no quote. */
  missingSymbols: string[];
  /** The fresh quotes, per holding — returned so on-demand callers can use the
   *  price immediately without waiting for a cache refetch. */
  quotes: QuoteResult[];
}

/** Pull the auto-priced holdings (source + non-empty symbol) from raw docs. */
export function extractPricedHoldings(docs: HoldingSnapshot[]): PricedHolding[] {
  const out: PricedHolding[] = [];
  for (const doc of docs) {
    const data = doc.data();
    if (!data || data.updateSource !== 'auto') continue;
    const symbol = typeof data.symbol === 'string' ? data.symbol.trim() : '';
    if (!symbol) continue;
    out.push({
      ref: doc.ref,
      symbol,
      units: typeof data.units === 'number' ? data.units : null,
      livePrice: typeof data.livePrice === 'number' ? data.livePrice : null,
    });
  }
  return out;
}

/**
 * Refresh the live-price *suggestion* on matching holdings in batches.
 *
 * Wealth uses a snapshot paradigm: a holding's recorded `value`/`history` only
 * changes when the user deliberately confirms a check-in. So this routine
 * (driven by both the nightly job and the on-demand callable) updates ONLY the
 * denormalized price cache — `livePrice`/`prevPrice`/`priceUpdatedAt` — which
 * the check-in flow reads to suggest a fresh value. It never writes `value`,
 * `history`, or `lastValueAt`.
 */
export async function applyQuotesToHoldings(
  db: Firestore,
  holdings: PricedHolding[],
  quotes: Map<string, TwelveDataQuote>,
  _now: Date = new Date()
): Promise<number> {
  let updated = 0;

  for (let i = 0; i < holdings.length; i += BATCH_SIZE) {
    const slice = holdings.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    let inBatch = 0;

    for (const holding of slice) {
      const quote = quotes.get(holding.symbol);
      if (!quote) continue;
      batch.update(holding.ref, {
        livePrice: quote.price,
        prevPrice: holding.livePrice ?? null,
        priceUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      inBatch++;
    }

    if (inBatch > 0) {
      await batch.commit();
      updated += inBatch;
    }
  }
  return updated;
}

/**
 * End-to-end refresh for a set of holding docs: extract auto-priced holdings,
 * fetch quotes for their unique symbols, and write the updates back.
 */
export async function refreshHoldings(
  db: Firestore,
  client: TwelveDataClient,
  docs: HoldingSnapshot[],
  now: Date = new Date()
): Promise<RefreshSummary> {
  const holdings = extractPricedHoldings(docs);
  if (holdings.length === 0) {
    return { considered: 0, updated: 0, missingSymbols: [], quotes: [] };
  }

  const symbols = Array.from(new Set(holdings.map((h) => h.symbol)));
  const quotes = await client.getQuotes(symbols);
  const updated = await applyQuotesToHoldings(db, holdings, quotes, now);
  const missingSymbols = symbols.filter((s) => !quotes.has(s));

  const quoteResults: QuoteResult[] = [];
  for (const h of holdings) {
    const q = quotes.get(h.symbol);
    if (q) {
      quoteResults.push({
        holdingId: h.ref.id,
        symbol: h.symbol,
        price: q.price,
        previousClose: q.previousClose,
      });
    }
  }

  return { considered: holdings.length, updated, missingSymbols, quotes: quoteResults };
}
