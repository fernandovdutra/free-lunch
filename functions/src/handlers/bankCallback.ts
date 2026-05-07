import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { EnableBankingClient } from '../enableBanking/client.js';
import { config } from '../config.js';

export const bankCallback = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
  },
  async (req, res) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    const appUrl = config.appUrl;

    // Handle authorization error
    if (error) {
      console.error('Bank authorization error:', error);
      res.redirect(`${appUrl}/settings?bank_error=${encodeURIComponent(error as string)}`);
      return;
    }

    // Verify state and code
    if (!state || !code) {
      res.redirect(`${appUrl}/settings?bank_error=missing_params`);
      return;
    }

    const db = getFirestore();
    const pendingRef = db.collection('pendingBankConnections').doc(state);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      res.redirect(`${appUrl}/settings?bank_error=invalid_state`);
      return;
    }

    const pendingData = pendingDoc.data()!;
    const userId = pendingData.userId as string;
    const bankName = pendingData.bankName as string;

    // Check if pending connection has expired
    const expiresAt = (pendingData.expiresAt as Timestamp).toDate();
    if (new Date() > expiresAt) {
      await pendingRef.delete();
      res.redirect(`${appUrl}/settings?bank_error=expired`);
      return;
    }

    const client = new EnableBankingClient(config.enableBankingApiUrl, {
      privateKey: config.enableBankingPrivateKey,
      applicationId: config.enableBankingAppId,
    });

    try {
      // Exchange code for session
      const session = await client.createSession(code);

      const sessionAccounts = session.accounts.map((acc) => ({
        uid: acc.uid,
        iban: acc.iban || acc.account_id?.iban,
        name: acc.name,
        currency: acc.currency,
      }));
      const sessionIbans = new Set(
        sessionAccounts.map((a) => a.iban).filter((x): x is string => typeof x === 'string')
      );

      // Look for an existing connection that already covers any of these IBANs.
      // If we find one, refresh it in place so all historical transactions
      // (and any manual categorizations) stay linked, instead of creating a
      // duplicate doc that the user then has to clean up.
      const userConnectionsRef = db
        .collection('users')
        .doc(userId)
        .collection('bankConnections');
      const existingSnap = await userConnectionsRef.get();
      const existingMatch = existingSnap.docs.find((d) => {
        const accs = (d.data().accounts ?? []) as { iban?: string | null }[];
        return accs.some((a) => a.iban && sessionIbans.has(a.iban));
      });

      const connectionId =
        existingMatch?.id ??
        `${bankName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      const connectionRef = userConnectionsRef.doc(connectionId);

      if (existingMatch) {
        // Refresh existing connection: new session, fresh consent, mark active.
        await connectionRef.update({
          status: 'active',
          sessionId: session.session_id,
          accounts: sessionAccounts,
          consentExpiresAt: new Date(session.access.valid_until),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await connectionRef.set({
          id: connectionId,
          provider: 'enable_banking',
          bankId: bankName.toLowerCase().replace(/\s+/g, '_'),
          bankName: session.aspsp.name,
          status: 'active',
          sessionId: session.session_id,
          accounts: sessionAccounts,
          consentExpiresAt: new Date(session.access.valid_until),
          lastSync: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Clean up pending connection
      await pendingRef.delete();

      // Redirect back to app with success
      res.redirect(`${appUrl}/settings?bank_connected=${connectionId}`);
    } catch (err) {
      console.error('Error creating bank session:', err);
      await pendingRef.delete();
      res.redirect(`${appUrl}/settings?bank_error=session_failed`);
    }
  }
);
