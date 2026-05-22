/**
 * One-time backfill: populate `bankDescription` on existing transactions.
 *
 * Newly synced transactions get `bankDescription` from `transformTransaction`,
 * but transactions synced before that change lack the field. The full raw
 * payload is archived in `users/{uid}/rawBankTransactions`, so this script
 * recomputes `bankDescription` from each raw record and writes it onto the
 * linked transaction document.
 *
 * Build first (`npm run build` in functions/), then run:
 *   - Against production:  node lib/scripts/backfillBankDescription.js
 *   - Against emulator:    FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *                          GCLOUD_PROJECT=<project-id> \
 *                          node lib/scripts/backfillBankDescription.js
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { extractBankDescription } from '../shared/syncConnection.js';
import type { EnableBankingTransaction } from '../enableBanking/types.js';

async function main(): Promise<void> {
  initializeApp();
  const db = getFirestore();

  const rawSnapshot = await db.collectionGroup('rawBankTransactions').get();
  console.log(`Found ${rawSnapshot.size} raw bank transaction records.`);

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const rawDoc of rawSnapshot.docs) {
    const data = rawDoc.data() as {
      transactionId?: string;
      rawData?: EnableBankingTransaction;
    };
    const userRef = rawDoc.ref.parent.parent;
    if (!data.transactionId || !data.rawData || !userRef) {
      skipped++;
      continue;
    }

    const bankDescription = extractBankDescription(data.rawData);
    if (bankDescription === null) {
      skipped++;
      continue;
    }

    const transactionRef = userRef.collection('transactions').doc(data.transactionId);
    try {
      await transactionRef.update({ bankDescription });
      updated++;
    } catch {
      // Transaction no longer exists (deleted by the user).
      missing++;
    }
  }

  console.log(
    `Backfill complete — updated: ${updated}, skipped: ${skipped}, missing: ${missing}.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
