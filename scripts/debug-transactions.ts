/**
 * Debug script to compare raw bank transactions with processed transactions
 * Run with: npx tsx scripts/debug-transactions.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (uses default credentials or emulator)
if (getApps().length === 0) {
  // Check if we're connecting to emulators
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('🔧 Connecting to Firestore emulator at', process.env.FIRESTORE_EMULATOR_HOST);
    initializeApp({ projectId: 'demo-free-lunch' });
  } else {
    // Production - needs service account
    console.log('⚠️  No FIRESTORE_EMULATOR_HOST set. Set it to connect to emulators.');
    console.log(
      '   Run: FIRESTORE_EMULATOR_HOST=localhost:8080 npx tsx scripts/debug-transactions.ts'
    );
    process.exit(1);
  }
}

const db = getFirestore();

async function debugTransactions() {
  console.log('\n=== Transaction Debug Report ===\n');

  // Get all users
  const usersSnapshot = await db.collection('users').get();

  if (usersSnapshot.empty) {
    console.log('No users found in database');
    return;
  }

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    console.log(`\n📧 User: ${userId}`);
    console.log('─'.repeat(60));

    // Get raw bank transactions
    const rawTxSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('rawBankTransactions')
      .limit(10)
      .get();

    console.log(`\n📦 Raw Bank Transactions (${rawTxSnapshot.size} shown):`);

    for (const rawDoc of rawTxSnapshot.docs) {
      const rawData = rawDoc.data();
      const raw = rawData.rawData;

      console.log('\n  --- Raw Transaction ---');
      console.log(`  ID: ${rawDoc.id}`);
      console.log(`  entry_reference: ${raw?.entry_reference}`);
      console.log(`  transaction_amount: ${JSON.stringify(raw?.transaction_amount)}`);
      console.log(`  creditor: ${JSON.stringify(raw?.creditor)}`);
      console.log(`  debtor: ${JSON.stringify(raw?.debtor)}`);
      console.log(`  creditor_account: ${JSON.stringify(raw?.creditor_account)}`);
      console.log(`  debtor_account: ${JSON.stringify(raw?.debtor_account)}`);
      console.log(
        `  remittance_information_unstructured: ${raw?.remittance_information_unstructured}`
      );
      console.log(
        `  remittance_information_unstructured_array: ${JSON.stringify(raw?.remittance_information_unstructured_array)}`
      );
      console.log(`  bank_transaction_code: ${JSON.stringify(raw?.bank_transaction_code)}`);
      console.log(`  booking_date: ${raw?.booking_date}`);
      console.log(`  status: ${raw?.status}`);

      // Find corresponding processed transaction
      const processedSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .where('externalId', '==', raw?.entry_reference)
        .limit(1)
        .get();

      if (!processedSnapshot.empty) {
        const processed = processedSnapshot.docs[0].data();
        console.log('\n  --- Processed Transaction ---');
        console.log(`  ID: ${processedSnapshot.docs[0].id}`);
        console.log(`  amount: ${processed.amount}`);
        console.log(`  description: ${processed.description}`);
        console.log(`  counterparty: ${processed.counterparty}`);
        console.log(`  categoryId: ${processed.categoryId}`);
        console.log(`  categorySource: ${processed.categorySource}`);
        console.log(`  date: ${processed.date?.toDate?.() || processed.date}`);

        // Analysis
        console.log('\n  🔍 Analysis:');
        const rawAmount = parseFloat(raw?.transaction_amount?.amount || '0');
        if (processed.amount > 0 && raw?.creditor?.name) {
          console.log(
            `  ⚠️  ISSUE: Amount is positive (${processed.amount}) but has creditor (${raw?.creditor?.name})`
          );
          console.log(`     This should be NEGATIVE (expense) because we paid the creditor`);
        }
        if (processed.amount > 0 && raw?.debtor_account?.iban) {
          console.log(`  ⚠️  ISSUE: User IBAN in debtor_account means this is an outgoing payment`);
        }
        if (!processed.counterparty && (raw?.creditor?.name || raw?.debtor?.name)) {
          console.log(`  ⚠️  ISSUE: Counterparty is empty but raw has creditor/debtor names`);
        }
        if (processed.description?.includes('{') || processed.description?.includes('}')) {
          console.log(`  ⚠️  ISSUE: Description contains JSON: "${processed.description}"`);
        }
      } else {
        console.log('\n  ⚠️  No processed transaction found for this raw transaction');
      }
    }

    // Get bank connection to find user's IBAN
    const connectionsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('bankConnections')
      .limit(1)
      .get();

    if (!connectionsSnapshot.empty) {
      const connection = connectionsSnapshot.docs[0].data();
      console.log(`\n🏦 Bank Connection:`);
      console.log(`  accounts: ${JSON.stringify(connection.accounts)}`);
    }

    // Summary of all transactions
    const allTxSnapshot = await db.collection('users').doc(userId).collection('transactions').get();

    let positiveCount = 0;
    let negativeCount = 0;
    let emptyCounterparty = 0;
    let uncategorized = 0;
    let jsonDescriptions = 0;

    for (const doc of allTxSnapshot.docs) {
      const tx = doc.data();
      if (tx.amount > 0) positiveCount++;
      if (tx.amount < 0) negativeCount++;
      if (!tx.counterparty) emptyCounterparty++;
      if (!tx.categoryId) uncategorized++;
      if (tx.description?.includes('{')) jsonDescriptions++;
    }

    console.log(`\n📊 Transaction Summary (${allTxSnapshot.size} total):`);
    console.log(`  Positive (income): ${positiveCount}`);
    console.log(`  Negative (expense): ${negativeCount}`);
    console.log(`  Empty counterparty: ${emptyCounterparty}`);
    console.log(`  Uncategorized: ${uncategorized}`);
    console.log(`  JSON in description: ${jsonDescriptions}`);
  }
}

debugTransactions()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
