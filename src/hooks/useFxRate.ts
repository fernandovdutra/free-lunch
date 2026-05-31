import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { CurrencyCode } from '@/types/wealth';

/** Mirrors `FxRateResult` from the `getFxRate` callable. */
export interface FxRateResult {
  from: CurrencyCode;
  to: CurrencyCode;
  /** Units of `to` per 1 unit of `from`. */
  rate: number;
}

const getFxRateFn = httpsCallable<{ from: CurrencyCode; to: CurrencyCode }, FxRateResult>(
  functions,
  'getFxRate'
);

/**
 * Fetch a spot FX rate via the `getFxRate` Cloud Function. Used to freeze a
 * foreign holding's EUR value at check-in time. Same-currency pairs resolve to
 * 1 server-side without spending an API credit.
 */
export function useFxRate() {
  return useMutation({
    mutationFn: async (pair: { from: CurrencyCode; to: CurrencyCode }) => {
      const res = await getFxRateFn(pair);
      return res.data;
    },
  });
}
