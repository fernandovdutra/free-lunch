import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { EnableBankingClient } from '../enableBanking/client.js';
import type { EnableBankingTransaction } from '../enableBanking/types.js';
import { config } from '../config.js';
import { Categorizer } from '../categorization/index.js';

interface SyncResult {
  accountId: string;
  newTransactions: number;
  updatedTransactions: number;
  errors: string[];
}

// Firestore batch limit is 500 operations
const BATCH_SIZE = 250; // Use 250 to have room for both transaction + raw writes

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

    // Initialize categorizer for this user
    const categorizer = new Categorizer(userId);
    await categorizer.initialize();

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
        // Calculate date range using local dates (avoid UTC shift)
        const today = new Date();
        const dateTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let dateFrom: string;
        if (connection.lastSync) {
          const lastSync =
            connection.lastSync instanceof Timestamp
              ? connection.lastSync.toDate()
              : new Date(connection.lastSync);
          lastSync.setDate(lastSync.getDate() - 1); // Overlap by 1 day
          dateFrom = `${lastSync.getFullYear()}-${String(lastSync.getMonth() + 1).padStart(2, '0')}-${String(lastSync.getDate()).padStart(2, '0')}`;
        } else {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          dateFrom = `${ninetyDaysAgo.getFullYear()}-${String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(ninetyDaysAgo.getDate()).padStart(2, '0')}`;
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

        // Process transactions in batches
        const transactionsRef = db.collection('users').doc(userId).collection('transactions');
        const rawTransactionsRef = db
          .collection('users')
          .doc(userId)
          .collection('rawBankTransactions');

        // Collect new transactions for batch processing
        const newTransactionsToCreate: Array<{
          tx: EnableBankingTransaction;
          transactionData: ReturnType<typeof transformTransaction>;
        }> = [];

        // Log first few raw transactions for debugging
        if (allTransactions.length > 0) {
          console.log('=== RAW API TRANSACTIONS (first 3) ===');
          for (let i = 0; i < Math.min(3, allTransactions.length); i++) {
            const tx = allTransactions[i];
            console.log(`Transaction ${i + 1}:`, JSON.stringify({
              entry_reference: tx.entry_reference,
              transaction_amount: tx.transaction_amount,
              credit_debit_indicator: tx.credit_debit_indicator,
              creditor: tx.creditor,
              debtor: tx.debtor,
              creditor_account: tx.creditor_account,
              debtor_account: tx.debtor_account,
              remittance_information_unstructured: tx.remittance_information_unstructured,
              remittance_information: (tx as unknown as Record<string, unknown>).remittance_information,
              bank_transaction_code: tx.bank_transaction_code,
              booking_date: tx.booking_date,
              status: tx.status,
            }, null, 2));
          }
        }

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
              categorizationResult.source === 'none' ? 'none' : categorizationResult.source;

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
                updatedAt: FieldValue.serverTimestamp(),
              });
              result.updatedTransactions++;
            }
          }
        }

        // Process new transactions in batches
        for (let i = 0; i < newTransactionsToCreate.length; i += BATCH_SIZE) {
          const batchItems = newTransactionsToCreate.slice(i, i + BATCH_SIZE);
          const batch: WriteBatch = db.batch();

          for (const { tx, transactionData } of batchItems) {
            // Create transaction document
            const transactionRef = transactionsRef.doc();
            batch.set(transactionRef, {
              ...transactionData,
              importedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });

            // Store raw transaction data for debugging/audit
            const rawRef = rawTransactionsRef.doc();
            batch.set(rawRef, {
              transactionId: transactionRef.id,
              accountUid: account.uid,
              connectionId,
              rawData: tx,
              importedAt: FieldValue.serverTimestamp(),
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
  // 1. Parse amount (always positive from API)
  const rawAmount = parseFloat(tx.transaction_amount.amount);

  // 2. Determine direction using multiple strategies in priority order:
  // Strategy A: Use credit_debit_indicator if present (most reliable - standard PSD2 field)
  // Strategy B: Check IBAN to see if user is debtor or creditor
  // Strategy C: Fallback to checking if creditor name exists

  let isDebit: boolean; // true = money going out (expense), false = money coming in (income)

  if (tx.credit_debit_indicator) {
    // DBIT = debit = money out = expense, CRDT = credit = money in = income
    isDebit = tx.credit_debit_indicator === 'DBIT';
  } else {
    // Fallback: check IBAN matching
    const userIsDebtor = tx.debtor_account?.iban === accountIban;
    const userIsCreditor = tx.creditor_account?.iban === accountIban;

    if (userIsDebtor || userIsCreditor) {
      // If user's account is in debtor_account, they sent money (expense)
      isDebit = userIsDebtor;
    } else {
      // Last fallback: if creditor name exists, assume we paid them (expense)
      isDebit = !!tx.creditor?.name;
    }
  }

  // 3. Set amount sign: negative for expenses (debit), positive for income (credit)
  const amount = isDebit ? -Math.abs(rawAmount) : Math.abs(rawAmount);

  // 4. Get counterparty: for debits (expenses), show who we paid; for credits (income), show who paid us
  let counterparty = isDebit
    ? tx.creditor?.name || null
    : tx.debtor?.name || null;

  // 5. Extract description from remittance_information
  // The API returns remittance_information as an array with multiple lines
  const remittanceInfo = tx.remittance_information || tx.remittance_information_unstructured_array || [];
  const remittanceText = tx.remittance_information_unstructured || '';

  let description = 'Bank transaction';

  if (remittanceText) {
    description = remittanceText;
  } else if (remittanceInfo.length > 0) {
    // For POS transactions, the format is often:
    // ["BEA, Apple Pay", "Albert Heijn 1657,PAS462", "NR:BS158124, 31.01.26/15:33", "EINDHOVEN"]
    // The merchant name is typically in the second line for POS, or first line for others

    // Check if first line indicates POS/card payment
    const firstLine = remittanceInfo[0] || '';
    const isPOS = firstLine.startsWith('BEA') || firstLine.includes('Apple Pay') || firstLine.includes('Google Pay');

    if (isPOS && remittanceInfo.length > 1) {
      // For POS: use second line as description (contains merchant name)
      // Extract just the merchant name (before any comma with PAS number)
      const merchantLine = remittanceInfo[1] || '';
      const merchantMatch = merchantLine.match(/^([^,]+)/);
      description = merchantMatch ? merchantMatch[1].trim() : merchantLine;

      // Also use as counterparty if not set
      if (!counterparty) {
        counterparty = description;
      }
    } else if (firstLine.startsWith('SEPA') && remittanceInfo.length > 3) {
      // For SEPA: look for "Naam:" line which contains the merchant name
      const naamLine = remittanceInfo.find(line => line.startsWith('Naam:'));
      if (naamLine) {
        description = naamLine.replace('Naam:', '').trim();
        if (!counterparty) {
          counterparty = description;
        }
      } else {
        // Fallback: use first non-SEPA line
        description = remittanceInfo.find(line => !line.startsWith('SEPA') && !line.startsWith('IBAN') && !line.startsWith('BIC')) || firstLine;
      }
    } else {
      // Generic: join first 2 lines
      description = remittanceInfo.slice(0, 2).join(' - ');
    }
  } else if (tx.bank_transaction_code) {
    // Fallback to bank_transaction_code
    if (typeof tx.bank_transaction_code === 'string') {
      description = tx.bank_transaction_code;
    } else if (typeof tx.bank_transaction_code === 'object' && tx.bank_transaction_code !== null) {
      const btc = tx.bank_transaction_code as { description?: string; code?: string };
      description = btc.description || `Transaction ${btc.code || ''}`.trim();
    }
  }

  // Use counterparty as description if description is still generic
  if (counterparty && (description === 'Bank transaction' || description.startsWith('SEPA iDEAL') || !description.trim())) {
    description = counterparty;
  }

  // 6. Parse booking date (official bank date)
  const bookingDateStr = tx.booking_date || tx.value_date || tx.transaction_date;
  if (!bookingDateStr) {
    throw new Error('Transaction has no date');
  }

  // Parse booking date as local date
  const [bookYear, bookMonth, bookDay] = bookingDateStr.split('-').map(Number);
  const bookingDateObj = new Date(bookYear, bookMonth - 1, bookDay, 12, 0, 0);

  // 7. Try to extract actual transaction date/time from remittance_information
  // Formats seen in the data:
  // - "NR:BS158124, 31.01.26/15:33" (POS transactions)
  // - "Kenmerk: 31-01-2026 18:24 714056" (SEPA transactions)
  let transactionDateObj: Date | null = null;

  for (const line of remittanceInfo) {
    // Try POS format: "31.01.26/15:33" or "31.01.2026/15:33"
    const posMatch = line.match(/(\d{2})\.(\d{2})\.(\d{2,4})\/(\d{2}):(\d{2})/);
    if (posMatch) {
      const [, d, m, y, hour, min] = posMatch;
      const fullYear = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
      transactionDateObj = new Date(fullYear, parseInt(m) - 1, parseInt(d), parseInt(hour), parseInt(min));
      break;
    }

    // Try SEPA format: "31-01-2026 18:24"
    const sepaMatch = line.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
    if (sepaMatch) {
      const [, d, m, y, hour, min] = sepaMatch;
      transactionDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hour), parseInt(min));
      break;
    }
  }

  // Use transaction date if found, otherwise fall back to booking date
  const primaryDate = transactionDateObj || bookingDateObj;

  return {
    externalId: tx.entry_reference,
    date: Timestamp.fromDate(primaryDate),
    bookingDate: Timestamp.fromDate(bookingDateObj),
    transactionDate: transactionDateObj ? Timestamp.fromDate(transactionDateObj) : null,
    description,
    amount,
    currency: tx.transaction_amount.currency as 'EUR',
    counterparty,
    categoryId: null as string | null,
    categoryConfidence: 0,
    categorySource: 'auto' as 'auto' | 'rule' | 'merchant' | 'learned' | 'none',
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: accountIban,
    bankConnectionId: connectionId,
    status: tx.status,
  };
}
