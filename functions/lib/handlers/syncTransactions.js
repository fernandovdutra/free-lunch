'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.syncTransactions = void 0;
const https_1 = require('firebase-functions/v2/https');
const firestore_1 = require('firebase-admin/firestore');
const client_js_1 = require('../enableBanking/client.js');
const config_js_1 = require('../config.js');
const index_js_1 = require('../categorization/index.js');
// Firestore batch limit is 500 operations
const BATCH_SIZE = 250; // Use 250 to have room for both transaction + raw writes
exports.syncTransactions = (0, https_1.onCall)(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 300, // 5 minutes for large syncs
    secrets: ['ENABLE_BANKING_APP_ID', 'ENABLE_BANKING_PRIVATE_KEY', 'ENABLE_BANKING_API_URL'],
  },
  async (request) => {
    if (!request.auth) {
      throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { connectionId } = request.data;
    if (!connectionId) {
      throw new https_1.HttpsError('invalid-argument', 'Connection ID is required');
    }
    const userId = request.auth.uid;
    const db = (0, firestore_1.getFirestore)();
    // Get bank connection
    const connectionRef = db
      .collection('users')
      .doc(userId)
      .collection('bankConnections')
      .doc(connectionId);
    const connectionDoc = await connectionRef.get();
    if (!connectionDoc.exists) {
      throw new https_1.HttpsError('not-found', 'Bank connection not found');
    }
    const connection = connectionDoc.data();
    // Check if consent is still valid
    const consentExpiry =
      connection.consentExpiresAt instanceof firestore_1.Timestamp
        ? connection.consentExpiresAt.toDate()
        : new Date(connection.consentExpiresAt);
    if (new Date() > consentExpiry) {
      await connectionRef.update({
        status: 'expired',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
      });
      throw new https_1.HttpsError('failed-precondition', 'Bank consent has expired');
    }
    const client = new client_js_1.EnableBankingClient(config_js_1.config.enableBankingApiUrl, {
      privateKey: config_js_1.config.enableBankingPrivateKey,
      applicationId: config_js_1.config.enableBankingAppId,
    });
    // Initialize categorizer for this user
    const categorizer = new index_js_1.Categorizer(userId);
    await categorizer.initialize();
    const results = [];
    const accounts = connection.accounts;
    // Sync each account
    for (const account of accounts) {
      const result = {
        accountId: account.uid,
        newTransactions: 0,
        updatedTransactions: 0,
        errors: [],
      };
      try {
        // Calculate date range (last 90 days or since last sync)
        const dateTo = new Date().toISOString().split('T')[0];
        let dateFrom;
        if (connection.lastSync) {
          const lastSync =
            connection.lastSync instanceof firestore_1.Timestamp
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
        let continuationKey;
        const allTransactions = [];
        do {
          const response = await client.getTransactions(account.uid, {
            date_from: dateFrom,
            date_to: dateTo,
            continuation_key: continuationKey,
          });
          allTransactions.push(...response.transactions);
          continuationKey = response.continuation_key;
        } while (continuationKey);
        // Process transactions in batches
        const transactionsRef = db.collection('users').doc(userId).collection('transactions');
        const rawTransactionsRef = db
          .collection('users')
          .doc(userId)
          .collection('rawBankTransactions');
        // Collect new transactions for batch processing
        const newTransactionsToCreate = [];
        for (const tx of allTransactions) {
          const externalId = tx.entry_reference;
          // Check for existing transaction
          const existingQuery = await transactionsRef
            .where('externalId', '==', externalId)
            .limit(1)
            .get();
          if (existingQuery.empty) {
            // Collect for batch creation
            const transactionData = transformTransaction(tx, account.iban, connectionId);
            // Apply auto-categorization
            const categorizationResult = categorizer.categorize(
              transactionData.description,
              transactionData.counterparty
            );
            transactionData.categoryId = categorizationResult.categoryId;
            transactionData.categoryConfidence = categorizationResult.confidence;
            transactionData.categorySource =
              categorizationResult.source === 'none' ? 'auto' : categorizationResult.source;
            newTransactionsToCreate.push({ tx, transactionData });
          } else {
            // Update existing transaction (status might have changed)
            const existingDoc = existingQuery.docs[0];
            const existingData = existingDoc.data();
            // Only update if status changed from pending to booked
            if (existingData.status === 'pending' && tx.status === 'booked') {
              await existingDoc.ref.update({
                status: tx.status,
                bookingDate: tx.booking_date,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
              });
              result.updatedTransactions++;
            }
          }
        }
        // Process new transactions in batches
        for (let i = 0; i < newTransactionsToCreate.length; i += BATCH_SIZE) {
          const batchItems = newTransactionsToCreate.slice(i, i + BATCH_SIZE);
          const batch = db.batch();
          for (const { tx, transactionData } of batchItems) {
            // Create transaction document
            const transactionRef = transactionsRef.doc();
            batch.set(transactionRef, {
              ...transactionData,
              importedAt: firestore_1.FieldValue.serverTimestamp(),
              updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            // Store raw transaction data for debugging/audit
            const rawRef = rawTransactionsRef.doc();
            batch.set(rawRef, {
              transactionId: transactionRef.id,
              accountUid: account.uid,
              connectionId,
              rawData: tx,
              importedAt: firestore_1.FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();
          result.newTransactions += batchItems.length;
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
      lastSync: firestore_1.FieldValue.serverTimestamp(),
      updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return {
      success: true,
      results,
      totalNew: results.reduce((sum, r) => sum + r.newTransactions, 0),
      totalUpdated: results.reduce((sum, r) => sum + r.updatedTransactions, 0),
    };
  }
);
function transformTransaction(tx, accountIban, connectionId) {
  const amount = parseFloat(tx.transaction_amount.amount);
  const isCredit = amount > 0;
  // Get counterparty name
  let counterparty = null;
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
    date: firestore_1.Timestamp.fromDate(new Date(bookingDate)),
    description,
    amount,
    currency: tx.transaction_amount.currency,
    counterparty,
    categoryId: null,
    categoryConfidence: 0,
    categorySource: 'auto',
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: accountIban,
    bankConnectionId: connectionId,
    status: tx.status,
  };
}
//# sourceMappingURL=syncTransactions.js.map
