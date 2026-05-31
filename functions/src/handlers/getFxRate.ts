import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { TwelveDataClient, twelveDataApiKey } from '../marketData/twelveData.js';

/** Supported currency codes — mirror `CurrencyCode` in the app's wealth types. */
const SUPPORTED = new Set(['EUR', 'USD', 'BRL', 'GBP']);

export interface FxRateResult {
  from: string;
  to: string;
  /** Units of `to` per 1 unit of `from`. */
  rate: number;
}

/**
 * Spot FX rate for a currency pair, used to freeze a foreign holding's EUR
 * value at check-in time (the Wealth snapshot paradigm). Forex pairs resolve
 * through the same Twelve Data `/quote` path as equities/crypto. Same-currency
 * pairs short-circuit to 1 without spending an API credit.
 */
export const getFxRate = onCall(
  { region: 'europe-west1', cors: true, memory: '256MiB', secrets: [twelveDataApiKey] },
  async (request): Promise<FxRateResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { from, to } = (request.data ?? {}) as { from?: string; to?: string };
    const f = (from ?? '').toUpperCase();
    const t = (to ?? '').toUpperCase();
    if (!SUPPORTED.has(f) || !SUPPORTED.has(t)) {
      throw new HttpsError('invalid-argument', `Unsupported currency pair ${f}/${t}`);
    }
    if (f === t) return { from: f, to: t, rate: 1 };

    const apiKey = twelveDataApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'FX rates not configured');
    }

    const symbol = `${f}/${t}`;
    const client = new TwelveDataClient(apiKey);
    const quotes = await client.getQuotes([symbol]);
    const quote = quotes.get(symbol);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      throw new HttpsError('unavailable', `No FX rate for ${symbol}`);
    }

    return { from: f, to: t, rate: quote.price };
  }
);
