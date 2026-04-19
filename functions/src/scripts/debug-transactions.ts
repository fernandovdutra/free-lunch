/**
 * Debug script to analyze transactions
 */

import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('🔧 Connecting to Firestore emulator at', process.env.FIRESTORE_EMULATOR_HOST);
    initializeApp({ projectId: 'demo-free-lunch' });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('🔐 Using service account:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-project-id',
    });
  } else {
    console.log('🔐 Connecting to production Firestore with default credentials');
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-project-id',
    });
  }
}

const db = getFirestore();

async function debugTransactions() {
  console.log('\n=== Transaction Debug Report ===\n');

  // Get specific user with transactions
  const userId = process.env.DEBUG_USER_ID ?? '';
  console.log(`📧 Analyzing User: ${userId}`);
  console.log('═'.repeat(60));

  // Get bank connection
  const connectionsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('bankConnections')
    .limit(1)
    .get();

  let userIbans: string[] = [];
  if (!connectionsSnapshot.empty) {
    const connection = connectionsSnapshot.docs[0].data();
    console.log('\n🏦 Bank Connection:');
    console.log(JSON.stringify(connection, null, 2));
    userIbans = (connection.accounts as Array<{ iban: string }>)?.map((a) => a.iban) || [];
  }

  // Get sample of transactions to analyze
  const txSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('transactions')
    .limit(10)
    .get();

  console.log(`\n📝 Sample Transactions (${txSnapshot.size} of total):`);

  for (const doc of txSnapshot.docs) {
    const tx = doc.data();
    console.log('\n' + '─'.repeat(60));
    console.log(`ID: ${doc.id}`);
    console.log(`externalId: ${tx.externalId}`);
    console.log(`amount: ${tx.amount}`);
    console.log(`description: "${tx.description}"`);
    console.log(`counterparty: "${tx.counterparty || '(empty)'}"`);
    console.log(`categoryId: ${tx.categoryId || '(none)'}`);
    console.log(`categorySource: ${tx.categorySource}`);
    console.log(`date: ${tx.date?.toDate?.() || tx.date}`);
    console.log(`bankAccountId: ${tx.bankAccountId}`);
    console.log(`status: ${tx.status}`);

    // Check if description looks like JSON
    if (tx.description?.includes('{')) {
      console.log('\n⚠️  Description contains JSON! Raw value:');
      console.log(tx.description);
    }
  }

  // Check for rawBankTransactions
  console.log('\n\n📦 Checking rawBankTransactions collection...');
  const rawSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('rawBankTransactions')
    .limit(5)
    .get();

  console.log(`Found ${rawSnapshot.size} raw bank transactions`);

  if (rawSnapshot.size > 0) {
    for (const doc of rawSnapshot.docs) {
      console.log('\n' + '─'.repeat(60));
      console.log('Raw Transaction:');
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  }

  // Also check if there's data stored in a different structure
  console.log('\n\n📂 Listing all subcollections for user...');
  const userDoc = await db.collection('users').doc(userId).get();
  console.log('User document data:', JSON.stringify(userDoc.data(), null, 2));
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
