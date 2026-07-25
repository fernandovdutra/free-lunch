import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { TwelveDataClient, twelveDataApiKey } from '../marketData/twelveData.js';
import { refreshHoldings } from '../marketData/refreshHoldings.js';
import { resolveDataOwner, requireRole } from '../shared/dataOwner.js';
import { enforceApiThrottle, QUOTE_CALLS_PER_HOUR } from '../shared/apiThrottle.js';

/**
 * On-demand price refresh — callable from the Wealth "refresh prices"
 * affordance. Refreshes a single holding (`{ holdingId }`) or, with no
 * argument, all of the caller's auto-priced holdings. Reuses the same
 * `refreshHoldings` routine as the scheduled job so the write shape matches.
 */
export const getLiveQuote = onCall(
  { region: 'europe-west1', cors: true, memory: '256MiB', secrets: [twelveDataApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const apiKey = twelveDataApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Live pricing not configured');
    }

    const userId = await resolveDataOwner(request.auth.uid);
    // Refreshing prices writes to the owner's holdings docs, so viewers may
    // not trigger it — same roles Firestore rules allow to write holdings.
    await requireRole(request.auth.uid, userId, ['owner', 'editor']);

    const { holdingId } = (request.data ?? {}) as { holdingId?: string };

    const db = getFirestore();
    // Per-caller throttle protecting the shared Twelve Data free tier.
    await enforceApiThrottle(db, request.auth.uid, 'quote', QUOTE_CALLS_PER_HOUR);
    const holdingsRef = db.collection('users').doc(userId).collection('holdings');

    // Fetch the target doc(s), then filter to auto-priced in memory (holding
    // counts are small) to avoid a per-user composite index.
    let docs;
    if (holdingId) {
      const docSnap = await holdingsRef.doc(holdingId).get();
      if (!docSnap.exists) throw new HttpsError('not-found', 'Holding not found');
      docs = [docSnap];
    } else {
      docs = (await holdingsRef.get()).docs;
    }

    const client = new TwelveDataClient(apiKey);
    return refreshHoldings(db, client, docs);
  }
);
