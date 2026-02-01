import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { EnableBankingClient } from '../enableBanking/client.js';
import { config } from '../config.js';

export const getAvailableBanks = onCall(
  {
    region: 'europe-west1',
    cors: true,
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { country = 'NL' } = request.data as { country?: string };

    const client = new EnableBankingClient(config.enableBankingApiUrl, {
      privateKey: config.enableBankingPrivateKey,
      applicationId: config.enableBankingAppId,
    });

    try {
      const aspsps = await client.getASPSPs(country);

      // Return simplified bank list
      return aspsps.map((aspsp) => ({
        name: aspsp.name,
        country: aspsp.country,
        logo: aspsp.logo,
        bic: aspsp.bic,
      }));
    } catch (error) {
      console.error('Error fetching banks:', error);
      throw new HttpsError('internal', 'Failed to fetch available banks');
    }
  }
);
