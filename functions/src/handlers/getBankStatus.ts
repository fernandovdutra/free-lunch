import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { resolveDataOwner } from '../shared/dataOwner.js';

export const getBankStatus = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = await resolveDataOwner(request.auth.uid);
    const db = getFirestore();

    const connectionsRef = db.collection('users').doc(userId).collection('bankConnections');

    const snapshot = await connectionsRef.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bankName: data.bankName,
        // Slug of the ASPSP name the connection was originally opened with
        // (see bankCallback). The reconnect button needs it to map a stored
        // connection back onto an entry in the getAvailableBanks list.
        bankId: typeof data.bankId === 'string' ? data.bankId : null,
        status: data.status,
        accountCount: data.accounts?.length ?? 0,
        accounts:
          data.accounts?.map((acc: { uid: string; iban: string; name?: string }) => ({
            uid: acc.uid,
            iban: acc.iban,
            name: acc.name,
            balance: data.accountBalances?.[acc.uid] ?? null,
          })) ?? [],
        lastSync: data.lastSync instanceof Timestamp ? data.lastSync.toDate().toISOString() : null,
        consentExpiresAt:
          data.consentExpiresAt instanceof Timestamp
            ? data.consentExpiresAt.toDate().toISOString()
            : null,
        lastAutoSyncAt:
          data.lastAutoSyncAt instanceof Timestamp
            ? data.lastAutoSyncAt.toDate().toISOString()
            : null,
        lastAutoSyncError:
          typeof data.lastAutoSyncError === 'string' ? data.lastAutoSyncError : null,
      };
    });
  }
);
