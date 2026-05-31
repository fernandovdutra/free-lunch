import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { buildCashBenchmark } from '@/lib/wealth';
import type { Benchmark, BenchmarkSeries, HistoryPoint } from '@/types/wealth';

type BenchmarkKey = Exclude<Benchmark, 'NONE'>;

/** Stored benchmark history point — dates may be Timestamps or ISO strings. */
type StoredPoint = { date: Timestamp | string; value: number };

function pointToIso(date: Timestamp | string): string {
  return date instanceof Timestamp ? date.toDate().toISOString().slice(0, 10) : date.slice(0, 10);
}

const INDEX_KEYS: BenchmarkKey[] = ['SP500', 'MSCI_WORLD'];

/**
 * Real benchmark series for the Wealth chart overlay. Equity indices
 * (`SP500`, `MSCI_WORLD`) are read from the server-written, read-only
 * `marketData/indices/series` collection; `CASH` is synthesized client-side
 * (there is no market index to source). The chart feeds whichever series the
 * user selects through `normalizeBenchmark`.
 */
export function useBenchmarks() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: ['benchmarks'],
    queryFn: async (): Promise<Record<string, BenchmarkSeries>> => {
      const out: Record<string, BenchmarkSeries> = {
        CASH: { key: 'CASH', label: 'CASH 3.5%', history: buildCashBenchmark() },
      };

      const snap = await getDocs(collection(db, 'marketData', 'indices', 'series'));
      snap.forEach((docSnap) => {
        const data = docSnap.data() as {
          key?: string;
          label?: string;
          history?: StoredPoint[];
        };
        const key = data.key as BenchmarkKey | undefined;
        if (!key || !INDEX_KEYS.includes(key)) return;
        const history: HistoryPoint[] = (data.history ?? [])
          .map((p) => ({ date: pointToIso(p.date), value: p.value }))
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        out[key] = { key, label: data.label ?? key, history };
      });

      return out;
    },
    // Reads require auth (rules); the Wealth page is already behind ProtectedRoute.
    enabled: !!dataOwnerId,
    staleTime: 60 * 60 * 1000, // 1h — EOD index closes change at most daily.
  });
}
