import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export const getBankStatus = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    const connectionsRef = db.collection('users').doc(userId).collection('bankConnections');

    const snapshot = await connectionsRef.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bankName: data.bankName,
        status: data.status,
        accountCount: data.accounts?.length ?? 0,
        lastSync: data.lastSync instanceof Timestamp ? data.lastSync.toDate().toISOString() : null,
        consentExpiresAt:
          data.consentExpiresAt instanceof Timestamp
            ? data.consentExpiresAt.toDate().toISOString()
            : null,
      };
    });
  }
);
