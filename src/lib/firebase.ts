import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent re-initialization in hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');

// Connect to emulators in development
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  console.log('🔧 Using Firebase emulators');

  const authUrl = import.meta.env.VITE_EMULATOR_AUTH_URL || 'http://localhost:9099';
  const firestoreHost = import.meta.env.VITE_EMULATOR_FIRESTORE_HOST || 'localhost:8080';

  // Only connect if not already connected
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, authUrl, { disableWarnings: true });
  }

  // @ts-expect-error - Firestore doesn't expose emulator connection status
  if (!db._settingsFrozen) {
    const [host, port] = firestoreHost.split(':');
    connectFirestoreEmulator(db, host!, parseInt(port!, 10));
  }

  // Connect functions emulator
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
