import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { syncBankConnection } from '../shared/syncConnection.js';
import { sendInsightEmail } from '../shared/emailSender.js';
import { buildConsentExpiryEmailHtml } from '../shared/emailTemplates.js';
import { config } from '../config.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Send the consent-expiry reminder once it is within this many days of expiring.
const EXPIRY_REMINDER_WINDOW_DAYS = 7;

/**
 * Sends a one-off email reminding the user to re-authorize a bank connection
 * before its PSD2 consent expires. Stamps `expiryReminderSentAt` so the
 * reminder is not re-sent on every run within the 7-day window.
 */
async function maybeSendExpiryReminder(
  db: Firestore,
  userId: string,
  doc: QueryDocumentSnapshot
): Promise<void> {
  const data = doc.data();

  if (data.expiryReminderSentAt) return; // already reminded for this consent cycle

  const consentExpiry =
    data.consentExpiresAt instanceof Timestamp
      ? data.consentExpiresAt.toDate()
      : data.consentExpiresAt
        ? new Date(data.consentExpiresAt)
        : null;
  if (!consentExpiry) return;

  const msLeft = consentExpiry.getTime() - Date.now();
  if (msLeft <= 0) return; // already expired — too late for a heads-up

  const daysLeft = Math.ceil(msLeft / MS_PER_DAY);
  if (daysLeft > EXPIRY_REMINDER_WINDOW_DAYS) return;

  const userDoc = await db.collection('users').doc(userId).get();
  const email = userDoc.data()?.email;
  if (!email) {
    console.warn(`No email for user ${userId}; cannot send consent expiry reminder`);
    return;
  }

  const bankName = (data.bankName as string) || 'your bank';
  const html = buildConsentExpiryEmailHtml({
    bankName,
    expiresAt: consentExpiry,
    daysLeft,
    settingsUrl: `${config.appUrl}/settings`,
  });

  await sendInsightEmail(
    email,
    `Action needed: ${bankName} connection expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html
  );
  await doc.ref.update({ expiryReminderSentAt: FieldValue.serverTimestamp() });
  console.log(`Sent consent expiry reminder for ${userId}/${doc.id} (${daysLeft}d left)`);
}

/**
 * Iterates every bank connection across all users, syncing the active ones and
 * sending consent-expiry reminders. Extracted from the scheduled wrapper so it
 * can be invoked directly in tests and from the emulator.
 */
export async function runAutoSync(): Promise<void> {
  const db = getFirestore();
  const connectionsSnap = await db.collectionGroup('bankConnections').get();

  console.log(`Auto-sync: ${connectionsSnap.size} bank connection(s) found`);

  for (const doc of connectionsSnap.docs) {
    const userId = doc.ref.parent.parent?.id;
    if (!userId) continue;

    const connection = doc.data();
    if (connection.status !== 'active') continue;

    try {
      await maybeSendExpiryReminder(db, userId, doc);
    } catch (err) {
      // Reminder failures must not block the sync itself.
      console.error(`Consent expiry reminder failed for ${userId}/${doc.id}:`, err);
    }

    try {
      const result = await syncBankConnection(userId, doc.id);
      console.log(
        `Auto-sync ${userId}/${doc.id}: +${result.totalNew} new, ${result.totalUpdated} updated`
      );
      await doc.ref.update({
        lastAutoSyncAt: FieldValue.serverTimestamp(),
        lastAutoSyncError: FieldValue.delete(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Auto-sync failed for ${userId}/${doc.id}:`, message);
      await doc.ref.update({
        lastAutoSyncAt: FieldValue.serverTimestamp(),
        lastAutoSyncError: message,
      });
    }
  }
}

/**
 * Scheduled background sync — runs 4×/day across waking hours
 * (07:00, 12:00, 17:00, 22:00 CET). 4 runs/day is the PSD2 ceiling for
 * unattended bank data access without strong customer authentication.
 */
export const autoSyncTransactions = onSchedule(
  {
    schedule: '0 7,12,17,22 * * *',
    timeZone: 'Europe/Amsterdam',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: [
      'ENABLE_BANKING_APP_ID',
      'ENABLE_BANKING_PRIVATE_KEY',
      'ENABLE_BANKING_API_URL',
      'ANTHROPIC_API_KEY',
      'RESEND_API_KEY',
    ],
  },
  async () => {
    await runAutoSync();
  }
);
