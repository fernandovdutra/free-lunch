import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { Categorizer } from '../categorization/index.js';

// ============================================================================
// Request/Response types
// ============================================================================

interface IcsTransactionInput {
  transactionDate: string; // ISO date
  bookingDate: string;     // ISO date
  description: string;
  city: string;
  country: string;
  foreignAmount: number | null;
  foreignCurrency: string | null;
  exchangeRate: number | null;
  amountEur: number;
  direction: 'Af' | 'Bij';
}

interface ImportIcsRequest {
  statementId: string;
  statementDate: string; // ISO date
  customerNumber: string;
  totalNewExpenses: number;
  estimatedDebitDate: string; // ISO date
  debitIban: string;
  transactions: IcsTransactionInput[];
}

interface ImportIcsResponse {
  transactionsCreated: number;
  lumpSumMatched: boolean;
  lumpSumTransactionId: string | null;
  message: string;
}

// Firestore batch limit: use 250 to leave headroom
const BATCH_SIZE = 250;

// ============================================================================
// Cloud Function
// ============================================================================

export const importIcsStatement = onCall(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 60,
  },
  async (request): Promise<ImportIcsResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const data = request.data as ImportIcsRequest;

    // Validate input
    if (!data.statementId || !data.transactions?.length) {
      throw new HttpsError('invalid-argument', 'statementId and transactions are required');
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);

    // 1. Check for duplicate import
    const existingStatement = await userRef
      .collection('icsStatements')
      .doc(data.statementId)
      .get();

    if (existingStatement.exists) {
      throw new HttpsError(
        'already-exists',
        `Statement ${data.statementId} has already been imported`
      );
    }

    // 2. Filter to only "Af" (expense) transactions
    const expenseTransactions = data.transactions.filter((t) => t.direction === 'Af');

    // 3. Initialize categorizer
    const categorizer = new Categorizer(userId);
    await categorizer.initialize();

    // 4. Find matching ABN AMRO lump sum transaction
    //    Look for a transaction ±7 days of estimated debit date, containing "ICS" in description,
    //    with amount close to the total
    let lumpSumMatched = false;
    let lumpSumTransactionId: string | null = null;

    const estimatedDebitDate = new Date(data.estimatedDebitDate);
    const searchStart = new Date(estimatedDebitDate);
    searchStart.setDate(searchStart.getDate() - 7);
    const searchEnd = new Date(estimatedDebitDate);
    searchEnd.setDate(searchEnd.getDate() + 7);

    const lumpSumQuery = await userRef
      .collection('transactions')
      .where('date', '>=', Timestamp.fromDate(searchStart))
      .where('date', '<=', Timestamp.fromDate(searchEnd))
      .get();

    for (const doc of lumpSumQuery.docs) {
      const txData = doc.data();
      const desc = (txData.description ?? '').toUpperCase();
      const counterparty = (txData.counterparty ?? '').toUpperCase();
      const amount = txData.amount as number;

      // Match: negative amount close to total, description or counterparty contains ICS variants
      // ABN AMRO shows it as "INT CARD SERVICES" in the bank feed
      const searchFields = desc + ' ' + counterparty;
      const containsICS =
        searchFields.includes('INT CARD SERVICES') ||
        searchFields.includes('INTERNATIONAL CARD SERVICES') ||
        searchFields.includes('ICS');

      if (containsICS && amount < 0) {
        const diff = Math.abs(Math.abs(amount) - data.totalNewExpenses);
        if (diff <= 0.05) {
          lumpSumTransactionId = doc.id;
          break;
        }
      }
    }

    // 5. Batch create ICS transactions
    let transactionsCreated = 0;

    for (let i = 0; i < expenseTransactions.length; i += BATCH_SIZE) {
      const batchItems = expenseTransactions.slice(i, i + BATCH_SIZE);
      const batch: WriteBatch = db.batch();

      for (let j = 0; j < batchItems.length; j++) {
        const tx = batchItems[j];
        const globalIndex = i + j;

        // Build description for categorization: "MERCHANT CITY COUNTRY"
        const fullDescription = [tx.description, tx.city, tx.country].filter(Boolean).join(' ');
        const counterparty = tx.description;

        // Auto-categorize
        const catResult = categorizer.categorize(fullDescription, counterparty);

        const transactionRef = userRef.collection('transactions').doc();
        batch.set(transactionRef, {
          externalId: `ics_${data.statementId}_${globalIndex}`,
          date: Timestamp.fromDate(new Date(tx.transactionDate)),
          bookingDate: Timestamp.fromDate(new Date(tx.bookingDate)),
          transactionDate: Timestamp.fromDate(new Date(tx.transactionDate)),
          description: fullDescription,
          amount: -tx.amountEur, // Expenses are negative
          currency: 'EUR',
          counterparty,
          categoryId: catResult.categoryId,
          categoryConfidence: catResult.confidence,
          categorySource: catResult.source === 'none' ? 'none' : catResult.source,
          isSplit: false,
          splits: null,
          reimbursement: null,
          bankAccountId: null,
          source: 'ics_import',
          icsStatementId: data.statementId,
          importedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      transactionsCreated += batchItems.length;
    }

    // 6. Mark ABN AMRO lump sum as excluded
    if (lumpSumTransactionId) {
      await userRef.collection('transactions').doc(lumpSumTransactionId).update({
        excludeFromTotals: true,
        icsStatementId: data.statementId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      lumpSumMatched = true;
    }

    // 7. Record the import
    await userRef.collection('icsStatements').doc(data.statementId).set({
      statementDate: Timestamp.fromDate(new Date(data.statementDate)),
      customerNumber: data.customerNumber,
      totalNewExpenses: data.totalNewExpenses,
      transactionsCreated,
      lumpSumTransactionId,
      importedAt: FieldValue.serverTimestamp(),
    });

    // 8. Return summary
    const matchMessage = lumpSumMatched
      ? ' ABN AMRO lump sum matched and excluded.'
      : ' No matching ABN AMRO lump sum found.';

    return {
      transactionsCreated,
      lumpSumMatched,
      lumpSumTransactionId,
      message: `${transactionsCreated} transactions imported.${matchMessage}`,
    };
  }
);
