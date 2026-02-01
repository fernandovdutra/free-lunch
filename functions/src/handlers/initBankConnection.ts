import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { EnableBankingClient } from '../enableBanking/client.js';
import { config } from '../config.js';

export const initBankConnection = onCall(
  {
    region: 'europe-west1',
    cors: true,
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { bankName, bankCountry = 'NL' } = request.data as {
      bankName: string;
      bankCountry?: string;
    };

    if (!bankName) {
      throw new HttpsError('invalid-argument', 'Bank name is required');
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // Generate state token for OAuth verification
    const state = randomBytes(32).toString('hex');

    // Calculate access validity (90 days max per PSD2)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 90);

    // Store pending connection in Firestore
    const pendingRef = db.collection('pendingBankConnections').doc(state);
    await pendingRef.set({
      userId,
      bankName,
      bankCountry,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });

    const client = new EnableBankingClient(config.enableBankingApiUrl, {
      privateKey: config.enableBankingPrivateKey,
      applicationId: config.enableBankingAppId,
    });

    try {
      const callbackUrl = `https://europe-west1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/bankCallback`;

      const authResponse = await client.startAuthorization({
        aspsp: {
          name: bankName,
          country: bankCountry,
        },
        redirect_url: callbackUrl,
        psu_type: 'personal',
        access: {
          valid_until: validUntil.toISOString(),
        },
        state,
      });

      return {
        authUrl: authResponse.url,
        state,
      };
    } catch (error) {
      console.error('Error starting bank authorization:', error);
      await pendingRef.delete();
      throw new HttpsError('internal', 'Failed to start bank connection');
    }
  }
);
