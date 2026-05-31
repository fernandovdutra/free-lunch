import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { TwelveDataClient, twelveDataApiKey } from '../marketData/twelveData.js';
import { refreshHoldings } from '../marketData/refreshHoldings.js';

/**
 * Scheduled auto-pricing — runs once daily at 23:30 CET (after market close).
 * Collection-group-queries every auto-priced holding with a symbol, batches the
 * symbols into Twelve Data `/quote` calls, and writes the recomputed value +
 * live/prev price back to each holding (appending a dated history point).
 */
export const refreshMarketData = onSchedule(
  {
    schedule: '30 23 * * *',
    timeZone: 'Europe/Amsterdam',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '256MiB',
    secrets: [twelveDataApiKey],
  },
  async () => {
    const apiKey = twelveDataApiKey.value();
    if (!apiKey) {
      console.error('TWELVEDATA_API_KEY not configured');
      return;
    }

    const db = getFirestore();
    const snap = await db
      .collectionGroup('holdings')
      .where('updateSource', '==', 'auto')
      .where('symbol', '!=', null)
      .get();

    if (snap.empty) {
      console.log('refreshMarketData: no auto-priced holdings');
      return;
    }

    const client = new TwelveDataClient(apiKey);
    const summary = await refreshHoldings(db, client, snap.docs);

    console.log(
      `refreshMarketData: priced ${summary.updated}/${summary.considered} holding(s)` +
        (summary.missingSymbols.length > 0
          ? `; no quote for: ${summary.missingSymbols.join(', ')}`
          : '')
    );
  }
);
