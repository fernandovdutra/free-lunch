import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/** Mirrors the `RefreshSummary` returned by the `getLiveQuote` callable. */
export interface RefreshPricesResult {
  considered: number;
  updated: number;
  missingSymbols: string[];
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
