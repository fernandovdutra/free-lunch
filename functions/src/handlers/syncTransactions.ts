import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { syncTransactionsSchema } from '../validation/schemas.js';
import { resolveDataOwner, requireRole } from '../shared/dataOwner.js';
import { syncBankConnection } from '../shared/syncConnection.js';

export const syncTransactions = onCall(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 300, // 5 minutes for large syncs
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL', 'ANTHROPIC_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const parseResult = syncTransactionsSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', parseResult.error.issues.map(i => i.message).join(', '));
    }
    const { connectionId } = parseResult.data;

    const userId = await resolveDataOwner(request.auth.uid);
    await requireRole(request.auth.uid, userId, ['owner']);

    return syncBankConnection(userId, connectionId);
  }
);
