import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { TwelveDataClient, twelveDataApiKey } from '../marketData/twelveData.js';
import {
  BENCHMARK_INDICES,
  indexSeriesCollection,
  mergeTimeSeries,
} from '../marketData/benchmarks.js';
import type { HistoryPoint } from '../shared/holdings.js';

// On first population (or a near-empty doc) pull a long history to seed the
// chart's full range; routine daily runs only need the last few closes.
const BACKFILL_OUTPUTSIZE = 5000;
const DAILY_OUTPUTSIZE = 5;
const BACKFILL_THRESHOLD = 30;

/**
 * Scheduled benchmark refresh — runs once daily at 23:45 CET (after market
 * close, just after auto-pricing). For each configured index it appends the
 * latest Twelve Data daily close into `marketData/indices/series/{key}`,
 * backfilling a long history the first time the series is seen.
 */
export const refreshBenchmarks = onSchedule(
  {
    schedule: '45 23 * * *',
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
    const client = new TwelveDataClient(apiKey);
    const col = indexSeriesCollection(db);

    for (const index of BENCHMARK_INDICES) {
      try {
        const ref = col.doc(index.key);
        const existingSnap = await ref.get();
        const existing = (existingSnap.data()?.history as HistoryPoint[] | undefined) ?? [];

        const outputsize =
          existing.length < BACKFILL_THRESHOLD ? BACKFILL_OUTPUTSIZE : DAILY_OUTPUTSIZE;
        const fresh = await client.getTimeSeries(index.symbol, { outputsize });

        if (fresh.length === 0) {
          console.warn(`refreshBenchmarks: no data for ${index.key} (${index.symbol})`);
          continue;
        }

        const history = mergeTimeSeries(existing, fresh);
        await ref.set(
          {
            key: index.key,
            label: index.label,
            symbol: index.symbol,
            history,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log(
          `refreshBenchmarks: ${index.key} now has ${history.length} point(s) ` +
            `(+${fresh.length} fetched)`
        );
      } catch (err) {
        // Isolate per-index failures so one bad symbol cannot abort the rest.
        console.error(`refreshBenchmarks failed for ${index.key}:`, err);
      }
    }
  }
);
