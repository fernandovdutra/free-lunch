import { HttpsError } from 'firebase-functions/v2/https';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Per-user hourly limits for endpoints that spend Twelve Data API credits
 * (free tier: 800 credits/day shared across all users). Generous for real
 * usage, tight enough that a single account cannot exhaust the shared quota.
 */
export const QUOTE_CALLS_PER_HOUR = 30;
export const FX_CALLS_PER_HOUR = 20;

export type ThrottledApi = 'quote' | 'fx';

interface UsageEntry {
  bucket?: number;
  count?: number;
}

/**
 * Fixed-window per-user throttle backed by Firestore.
 *
 * Usage lives at `users/{uid}/meta/apiUsage` as `{ [api]: { bucket, count } }`
 * where `bucket` is the epoch hour. The counter is incremented inside a
 * transaction so concurrent calls cannot bypass the limit. The `meta`
 * subcollection is not matched by any security rule, so clients cannot read
 * or tamper with their own counters.
 *
 * Throws `HttpsError('resource-exhausted')` once the hourly limit is reached;
 * the frontend can surface this directly.
 */
export async function enforceApiThrottle(
  db: Firestore,
  uid: string,
  api: ThrottledApi,
  limit: number,
  now: number = Date.now()
): Promise<void> {
  const ref = db.collection('users').doc(uid).collection('meta').doc('apiUsage');
  const bucket = Math.floor(now / 3_600_000); // current epoch hour

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const entry = (snap.exists ? (snap.data()?.[api] as UsageEntry | undefined) : undefined) ?? {};
    const count = entry.bucket === bucket ? (entry.count ?? 0) : 0;

    if (count >= limit) {
      throw new HttpsError(
        'resource-exhausted',
        'Market data request limit reached — please try again in an hour.'
      );
    }

    txn.set(ref, { [api]: { bucket, count: count + 1 } }, { merge: true });
  });
}
