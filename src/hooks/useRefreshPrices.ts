import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/** One fresh quote, mirroring `QuoteResult` from `refreshHoldings`. */
export interface LiveQuote {
  holdingId: string;
  symbol: string;
  price: number;
  previousClose: number | null;
}

/** Mirrors the `RefreshSummary` returned by the `getLiveQuote` callable. */
export interface RefreshPricesResult {
  considered: number;
  updated: number;
  missingSymbols: string[];
  quotes: LiveQuote[];
}

const getLiveQuoteFn = httpsCallable<{ holdingId?: string } | undefined, RefreshPricesResult>(
  functions,
  'getLiveQuote'
);

/**
 * Refresh live prices on demand via the `getLiveQuote` Cloud Function. Pass a
 * `holdingId` to refresh one auto-priced holding, or no argument to refresh all
 * of the user's auto holdings. Invalidates the holdings cache on success so the
 * recomputed values render.
 */
export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holdingId?: string) => {
      const res = await getLiveQuoteFn(holdingId ? { holdingId } : undefined);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

/**
 * Fetch a fresh live quote for a single auto-priced holding and return the
 * price directly — used by the update workflows, which hold a frozen snapshot
 * of the holding and so need the value back rather than relying on a cache
 * refetch. Still snapshot-safe: the callable only updates the price cache, it
 * never writes value/history. Returns null when the holding isn't auto-priced
 * or the quote is unavailable.
 */
export function useLivePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holdingId: string): Promise<LiveQuote | null> => {
      const res = await getLiveQuoteFn({ holdingId });
      return res.data.quotes.find((q) => q.holdingId === holdingId) ?? null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}
