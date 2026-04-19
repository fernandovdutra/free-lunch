import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK.
// Supports two explicit credential modes:
//   FIREBASE_SERVICE_ACCOUNT_PATH – explicit service account JSON key (used for remote deploys)
//   GOOGLE_APPLICATION_CREDENTIALS pointing to an authorized_user JSON (firebase CLI ADC) — let SDK handle it
// Falls back to Application Default Credentials (Cloud Run, etc.) when neither is set.
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '';
const projectId = process.env.FIREBASE_PROJECT_ID ?? (() => { throw new Error('Set FIREBASE_PROJECT_ID env var'); })();

let app;
if (serviceAccountPath) {
  const serviceAccount = JSON.parse(
    readFileSync(serviceAccountPath, 'utf-8')
  ) as ServiceAccount;
  app = initializeApp({ credential: cert(serviceAccount), projectId });
} else {
  // Let Google Auth Library pick up GOOGLE_APPLICATION_CREDENTIALS (service_account or
  // authorized_user) or the metadata server in Cloud environments.
  app = initializeApp({ projectId });
}

export const db = getFirestore(app);

// The single user ID — set via environment variable
export const userId = process.env.FREE_LUNCH_USER_ID ?? '';

if (!userId) {
  console.error('WARNING: FREE_LUNCH_USER_ID not set. Set this environment variable to your Firebase user ID.');
}
