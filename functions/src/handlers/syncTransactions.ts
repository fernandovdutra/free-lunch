import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { EnableBankingClient } from '../enableBanking/client.js';
import type { EnableBankingTransaction } from '../enableBanking/types.js';
import { config } from '../config.js';

interface SyncResult {
  accountId: string;
  newTransactions: number;
  updatedTransactions: number;
  errors: string[];
}

export const syncTransactions = onCall(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 300, // 5 minutes for large syncs
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { connectionId } = request.data as { connectionId: string };

    if (!connectionId) {
      throw new HttpsError('invalid-argument', 'Connection ID is required');
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // Get bank connection
    const connectionRef = db
      .collection('users')
      .doc(userId)
      .collection('bankConnections')
      .doc(connectionId);

    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
      throw new HttpsError('not-found', 'Bank connection not found');
    }

    const connection = connectionDoc.data()!;

    // Check if consent is still valid
    const consentExpiry =
      connection.consentExpiresAt instanceof Timestamp
        ? connection.consentExpiresAt.toDate()
        : new Date(connection.consentExpiresAt);
    if (new Date() > consentExpiry) {
      await connectionRef.update({
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new HttpsError('failed-precondition', 'Bank consent has expired');
    }

    const client = new EnableBankingClient(config.enableBankingApiUrl, {
      privateKey: config.enableBankingPrivateKey,
      applicationId: config.enableBankingAppId,
    });

    const results: SyncResult[] = [];
    const accounts = connection.accounts as Array<{ uid: string; iban: string }>;

    // Sync each account
    for (const account of accounts) {
      const result: SyncResult = {
        accountId: account.uid,
        newTransactions: 0,
        updatedTransactions: 0,
        errors: [],
      };

      try {
        // Calculate date range (last 90 days or since last sync)
        const dateTo = new Date().toISOString().split('T')[0];
        let dateFrom: string;

        if (connection.lastSync) {
          const lastSync =
            connection.lastSync instanceof Timestamp
              ? connection.lastSync.toDate()
              : new Date(connection.lastSync);
          lastSync.setDate(lastSync.getDate() - 1); // Overlap by 1 day
          dateFrom = lastSync.toISOString().split('T')[0];
        } else {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          dateFrom = ninetyDaysAgo.toISOString().split('T')[0];
        }

        // Fetch all transactions with pagination
        let continuationKey: string | undefined;
        const allTransactions: EnableBankingTransaction[] = [];

        do {
          const response = await client.getTransactions(account.uid, {
            date_from: dateFrom,
            date_to: dateTo,
            continuation_key: continuationKey,
          });

          allTransactions.push(...response.transactions);
          continuationKey = response.continuation_key;
        } while (continuationKey);

        // Process transactions
        const transactionsRef = db.collection('users').doc(userId).collection('transactions');

        for (const tx of allTransactions) {
          const externalId = tx.entry_reference;

          // Check for existing transaction
          const existingQuery = await transactionsRef
            .where('externalId', '==', externalId)
            .limit(1)
            .get();

          const transactionData = transformTransaction(tx, account.iban, connectionId);

          if (existingQuery.empty) {
            // Create new transaction
            await transactionsRef.add({
              ...transactionData,
              importedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            result.newTransactions++;
          } else {
            // Update existing transaction (status might have changed)
            const existingDoc = existingQuery.docs[0];
            const existingData = existingDoc.data();

            // Only update if status changed from pending to booked
            if (existingData.status === 'pending' && tx.status === 'booked') {
              await existingDoc.ref.update({
                status: tx.status,
                bookingDate: tx.booking_date,
                updatedAt: FieldValue.serverTimestamp(),
              });
              result.updatedTransactions++;
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(error);
        console.error(`Error syncing account ${account.uid}:`, error);
      }

      results.push(result);
    }

    // Update last sync time
    await connectionRef.update({
      lastSync: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      results,
      totalNew: results.reduce((sum, r) => sum + r.newTransactions, 0),
      totalUpdated: results.reduce((sum, r) => sum + r.updatedTransactions, 0),
    };
  }
);

function transformTransaction(
  tx: EnableBankingTransaction,
  accountIban: string,
  connectionId: string
) {
  const amount = parseFloat(tx.transaction_amount.amount);
  const isCredit = amount > 0;

  // Get counterparty name
  let counterparty: string | null = null;
  if (isCredit && tx.debtor?.name) {
    counterparty = tx.debtor.name;
  } else if (!isCredit && tx.creditor?.name) {
    counterparty = tx.creditor.name;
  }

  // Get description from remittance info - ensure it's always a string
  const rawDescription =
    tx.remittance_information_unstructured ||
    tx.remittance_information_unstructured_array?.join(' ') ||
    tx.bank_transaction_code ||
    'Bank transaction';

  // Handle case where API returns an error object instead of string
  const description =
    typeof rawDescription === 'string' ? rawDescription : JSON.stringify(rawDescription);

  const bookingDate = tx.booking_date || tx.value_date || tx.transaction_date;
  if (!bookingDate) {
    throw new Error('Transaction has no date');
  }

  return {
    externalId: tx.entry_reference,
    date: Timestamp.fromDate(new Date(bookingDate)),
    description,
    amount,
    currency: tx.transaction_amount.currency as 'EUR',
    counterparty,
    categoryId: null, // Will be set by auto-categorization
    categoryConfidence: 0,
    categorySource: 'auto' as const,
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: accountIban,
    bankConnectionId: connectionId,
    status: tx.status,
  };
}
