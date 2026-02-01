# Feature: Phase 3 - ABN AMRO Bank Integration via Enable Banking API

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Implement automatic bank transaction synchronization with ABN AMRO (and other Dutch banks) using the Enable Banking API. This enables users to connect their bank accounts via PSD2-compliant OAuth flow and automatically import transactions without manual file uploads.

**Key Technical Approach:**

- Enable Banking API in "restricted production mode" - free for personal use when linking your own accounts
- Firebase Cloud Functions handle OAuth callbacks and token storage (server-side for security)
- Frontend initiates connection, backend manages tokens and sync
- Support for manual sync trigger + future scheduled sync (Cloud Scheduler)

## User Story

As a Free Lunch user
I want to connect my ABN AMRO bank account securely
So that my transactions are automatically imported without manual work

## Problem Statement

Currently, users have no way to import transactions. The app requires manual data entry which is tedious and error-prone. Users expect automatic bank sync similar to the original Grip app.

**Why Enable Banking over alternatives:**

- GoCardless Bank Account Data stopped accepting new accounts (July 2025)
- Salt Edge discontinued free tier (October 2025)
- Direct ABN AMRO API requires PSD2 license (~€10k+) and QWAC certificates (€358+/year)
- Enable Banking offers "restricted production mode" - free access for personal accounts without contract

## Solution Statement

Implement Enable Banking integration using their API:

1. User initiates bank connection from Settings page
2. Frontend calls Cloud Function to get authorization URL
3. User authenticates with bank (Enable Banking handles OAuth)
4. Cloud Function receives callback with authorization code
5. Backend exchanges code for session, stores encrypted tokens
6. Backend fetches transactions and stores in Firestore
7. Transactions sync with auto-categorization

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**:

- `functions/` - New Firebase Cloud Functions directory
- `src/components/settings/` - Bank connection UI components
- `src/pages/Settings.tsx` - Integration with bank connection
- `src/hooks/` - New hooks for bank sync
- `src/types/index.ts` - New bank-related types

**Dependencies**:

- Enable Banking API account (restricted production mode)
- Firebase Cloud Functions (Node.js 20)
- Firebase Cloud Scheduler (for automatic sync)
- jsonwebtoken (for Enable Banking API auth)
- node-fetch (for API calls from functions)

---

## CONTEXT REFERENCES

### Relevant Codebase Files - MUST READ BEFORE IMPLEMENTING

- `src/types/index.ts` (full file) - Existing type definitions including `BankConnection`, `Transaction`
- `src/lib/firebase.ts` - Firebase initialization pattern
- `src/lib/utils.ts` - Utility functions including `generateId()`
- `src/contexts/AuthContext.tsx` (lines 56-90) - Firestore CRUD patterns
- `src/hooks/useTransactions.ts` - Transaction hook pattern for queries/mutations
- `src/pages/Settings.tsx` - Current Settings page structure
- `firebase.json` - Current Firebase configuration (needs functions added)
- `firestore.rules` - Security rules (includes bankConnections subcollection)
- `.env.example` - Environment variable patterns

### New Files to Create

**Cloud Functions (`functions/`):**

- `functions/package.json` - Dependencies for Cloud Functions
- `functions/tsconfig.json` - TypeScript config for functions
- `functions/src/index.ts` - Main exports
- `functions/src/config.ts` - Configuration and secrets
- `functions/src/enableBanking/auth.ts` - JWT generation for Enable Banking API
- `functions/src/enableBanking/client.ts` - API client wrapper
- `functions/src/enableBanking/types.ts` - Enable Banking API types
- `functions/src/handlers/initBankConnection.ts` - Initiate OAuth flow
- `functions/src/handlers/bankCallback.ts` - OAuth callback handler
- `functions/src/handlers/syncTransactions.ts` - Fetch and store transactions
- `functions/src/handlers/getBankStatus.ts` - Get connection status

**Frontend Components:**

- `src/components/settings/BankConnectionCard.tsx` - Main bank connection UI
- `src/components/settings/BankConnectionStatus.tsx` - Connection status display
- `src/components/settings/BankSelector.tsx` - Bank selection dropdown
- `src/hooks/useBankConnection.ts` - Hook for bank connection state
- `src/hooks/useSyncTransactions.ts` - Hook for triggering sync

### Relevant Documentation - READ BEFORE IMPLEMENTING

- [Enable Banking Quick Start](https://enablebanking.com/docs/api/quick-start/)
  - Authentication flow overview
  - Why: Core API flow reference

- [Enable Banking API Reference](https://enablebanking.com/docs/api/reference/)
  - All endpoints and data models
  - Why: Request/response formats

- [Enable Banking Sandbox](https://enablebanking.com/docs/sandbox/)
  - Mock ASPSP for testing
  - Why: Development without real bank

- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
  - 2nd gen functions with Node.js 20
  - Why: Backend implementation

- [Firebase Secrets Manager](https://firebase.google.com/docs/functions/config-env#secret-manager)
  - Storing API keys securely
  - Why: Enable Banking credentials

### Patterns to Follow

**Enable Banking JWT Authentication:**

```typescript
// JWT header
{
  "typ": "JWT",
  "alg": "RS256",
  "kid": "YOUR_APPLICATION_ID"
}

// JWT payload
{
  "iss": "enablebanking.com",
  "aud": "api.enablebanking.com",
  "iat": <current_timestamp>,
  "exp": <current_timestamp + max_86400>
}
```

**Enable Banking Authorization Flow:**

```
1. GET /aspsps?country=NL → List available banks
2. POST /auth → Start authorization, get redirect URL
3. User authenticates at bank
4. Callback with ?code=xxx
5. POST /sessions (with code) → Get session_id + accounts
6. GET /accounts/{id}/transactions → Fetch transactions
```

**Cloud Functions Pattern:**

```typescript
// functions/src/handlers/example.ts
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const myFunction = onCall({ region: 'europe-west1', cors: true }, async (request) => {
  // Verify auth
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const userId = request.auth.uid;
  const db = getFirestore();

  // Implementation
  return { success: true };
});
```

**Calling Functions from Frontend:**

```typescript
// src/lib/functions.ts
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'europe-west1');

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export const initBankConnection = httpsCallable<
  { bankId: string },
  { authUrl: string; state: string }
>(functions, 'initBankConnection');
```

---

## IMPLEMENTATION PLAN

### Phase 1: Firebase Functions Setup

Set up the Firebase Cloud Functions infrastructure with TypeScript, including configuration and Enable Banking authentication.

**Tasks:**

- Initialize functions directory with TypeScript
- Configure Firebase project for functions
- Implement Enable Banking JWT authentication
- Create API client wrapper
- Test with Mock ASPSP in sandbox

### Phase 2: OAuth Flow Implementation

Implement the complete OAuth authorization flow with Enable Banking.

**Tasks:**

- Create initBankConnection callable function
- Create bankCallback HTTP function for OAuth redirect
- Implement session creation and account retrieval
- Store bank connection in Firestore
- Handle errors and edge cases

### Phase 3: Transaction Sync

Implement transaction fetching and storage with deduplication.

**Tasks:**

- Create syncTransactions function
- Transform Enable Banking transactions to app format
- Implement deduplication by external ID
- Trigger auto-categorization
- Update sync timestamp

### Phase 4: Frontend Integration

Build the UI components for bank connection management.

**Tasks:**

- Create bank connection components
- Implement connection status display
- Add manual sync trigger
- Handle connection errors
- Update Settings page

### Phase 5: Scheduled Sync (Post-MVP)

Add automatic daily sync via Cloud Scheduler.

**Tasks:**

- Configure Cloud Scheduler
- Create scheduled function
- Handle token refresh
- Send consent expiry notifications

---

## STEP-BY-STEP TASKS

### PHASE 1: FIREBASE FUNCTIONS SETUP

#### Task 1.1: CREATE `functions/package.json`

- **IMPLEMENT**: Dependencies for Cloud Functions with Enable Banking
- **PATTERN**: Standard Firebase Functions setup with TypeScript
- **VALIDATE**: `cd functions && npm install`

```json
{
  "name": "free-lunch-functions",
  "version": "1.0.0",
  "private": true,
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.7.0"
  }
}
```

#### Task 1.2: CREATE `functions/tsconfig.json`

- **IMPLEMENT**: TypeScript configuration for functions
- **PATTERN**: Strict mode, ES2022 target
- **VALIDATE**: `cd functions && npm run build`

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "noEmit": false,
    "outDir": "lib",
    "rootDir": "src",
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

#### Task 1.3: UPDATE `firebase.json`

- **UPDATE**: Add functions configuration
- **PATTERN**: Existing firebase.json structure
- **VALIDATE**: `firebase emulators:start`

Add to firebase.json:

```json
{
  "functions": {
    "source": "functions",
    "codebase": "default",
    "runtime": "nodejs20",
    "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"]
  },
  "emulators": {
    "functions": {
      "port": 5001
    }
  }
}
```

#### Task 1.4: CREATE `functions/src/config.ts`

- **IMPLEMENT**: Configuration for Enable Banking credentials
- **PATTERN**: Use Firebase Secrets for sensitive data
- **IMPORTS**: `firebase-functions/v2/params`
- **VALIDATE**: `npm run build`

```typescript
import { defineSecret, defineString } from 'firebase-functions/params';

// Secrets (stored in Secret Manager)
export const ENABLE_BANKING_PRIVATE_KEY = defineSecret('ENABLE_BANKING_PRIVATE_KEY');
export const ENABLE_BANKING_APP_ID = defineSecret('ENABLE_BANKING_APP_ID');

// Config (stored in Firebase config)
export const ENABLE_BANKING_API_URL = defineString('ENABLE_BANKING_API_URL', {
  default: 'https://api.enablebanking.com',
});

export const APP_URL = defineString('APP_URL', {
  default: 'http://localhost:5173',
});
```

#### Task 1.5: CREATE `functions/src/enableBanking/types.ts`

- **IMPLEMENT**: TypeScript types for Enable Banking API
- **PATTERN**: Match API documentation exactly
- **VALIDATE**: `npm run build`

```typescript
// Enable Banking API Types
export interface ASPSP {
  name: string;
  country: string;
  logo: string;
  bic: string;
  transaction_total_days: number;
  payment_auth_methods: AuthMethod[];
  auth_methods: AuthMethod[];
}

export interface AuthMethod {
  name: string;
  credentials: CredentialField[];
  approach: 'redirect' | 'decoupled' | 'embedded';
}

export interface CredentialField {
  name: string;
  type: 'text' | 'password' | 'select';
  values?: string[];
}

export interface AuthResponse {
  url: string;
}

export interface SessionResponse {
  session_id: string;
  accounts: AccountInfo[];
  aspsp: {
    name: string;
    country: string;
  };
  access: {
    valid_until: string;
  };
}

export interface AccountInfo {
  uid: string;
  iban: string;
  account_id: {
    iban: string;
  };
  name?: string;
  currency: string;
  identification_hash: string;
}

export interface TransactionResponse {
  transactions: EnableBankingTransaction[];
  continuation_key?: string;
}

export interface EnableBankingTransaction {
  entry_reference: string;
  transaction_amount: {
    amount: string;
    currency: string;
  };
  creditor?: {
    name?: string;
  };
  debtor?: {
    name?: string;
  };
  creditor_account?: {
    iban?: string;
  };
  debtor_account?: {
    iban?: string;
  };
  booking_date: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information_unstructured?: string;
  remittance_information_unstructured_array?: string[];
  bank_transaction_code?: string;
  status: 'booked' | 'pending';
}
```

#### Task 1.6: CREATE `functions/src/enableBanking/auth.ts`

- **IMPLEMENT**: JWT generation for Enable Banking API
- **PATTERN**: RS256 signing with private key
- **IMPORTS**: `jsonwebtoken`, config
- **GOTCHA**: Private key must be PEM format with newlines preserved
- **VALIDATE**: `npm run build`

```typescript
import jwt from 'jsonwebtoken';

export interface JWTConfig {
  privateKey: string;
  applicationId: string;
}

export function generateJWT(config: JWTConfig): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const options: jwt.SignOptions = {
    algorithm: 'RS256',
    header: {
      typ: 'JWT',
      alg: 'RS256',
      kid: config.applicationId,
    },
  };

  return jwt.sign(payload, config.privateKey, options);
}
```

#### Task 1.7: CREATE `functions/src/enableBanking/client.ts`

- **IMPLEMENT**: API client wrapper for Enable Banking
- **PATTERN**: Class-based client with JWT auth
- **IMPORTS**: auth, types
- **GOTCHA**: Handle API errors with proper error types
- **VALIDATE**: `npm run build`

```typescript
import { generateJWT, type JWTConfig } from './auth';
import type {
  ASPSP,
  AuthResponse,
  SessionResponse,
  TransactionResponse,
  AccountInfo,
} from './types';

export class EnableBankingClient {
  private baseUrl: string;
  private jwtConfig: JWTConfig;

  constructor(baseUrl: string, jwtConfig: JWTConfig) {
    this.baseUrl = baseUrl;
    this.jwtConfig = jwtConfig;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const jwt = generateJWT(this.jwtConfig);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Enable Banking API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getASPSPs(country: string): Promise<ASPSP[]> {
    return this.request<ASPSP[]>('GET', `/aspsps?country=${country}`);
  }

  async startAuthorization(params: {
    aspsp: { name: string; country: string };
    redirect_url: string;
    psu_type: 'personal' | 'business';
    access: {
      valid_until: string;
    };
    state?: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/auth', params);
  }

  async createSession(code: string): Promise<SessionResponse> {
    return this.request<SessionResponse>('POST', '/sessions', { code });
  }

  async getSession(sessionId: string): Promise<SessionResponse> {
    return this.request<SessionResponse>('GET', `/sessions/${sessionId}`);
  }

  async getTransactions(
    accountId: string,
    params?: { date_from?: string; date_to?: string; continuation_key?: string }
  ): Promise<TransactionResponse> {
    const query = new URLSearchParams();
    if (params?.date_from) query.set('date_from', params.date_from);
    if (params?.date_to) query.set('date_to', params.date_to);
    if (params?.continuation_key) query.set('continuation_key', params.continuation_key);

    const queryString = query.toString();
    const path = `/accounts/${accountId}/transactions${queryString ? `?${queryString}` : ''}`;

    return this.request<TransactionResponse>('GET', path);
  }

  async getBalances(accountId: string) {
    return this.request('GET', `/accounts/${accountId}/balances`);
  }
}
```

#### Task 1.8: CREATE `functions/src/index.ts`

- **IMPLEMENT**: Main exports for Cloud Functions
- **PATTERN**: Export all handler functions
- **IMPORTS**: firebase-admin, handlers
- **VALIDATE**: `npm run build`

```typescript
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin
initializeApp();

// Export handlers
export { initBankConnection } from './handlers/initBankConnection';
export { bankCallback } from './handlers/bankCallback';
export { syncTransactions } from './handlers/syncTransactions';
export { getBankStatus } from './handlers/getBankStatus';
export { getAvailableBanks } from './handlers/getAvailableBanks';
```

---

### PHASE 2: OAUTH FLOW IMPLEMENTATION

#### Task 2.1: CREATE `functions/src/handlers/getAvailableBanks.ts`

- **IMPLEMENT**: Callable function to list available banks
- **PATTERN**: onCall with auth check
- **IMPORTS**: EnableBankingClient, config
- **VALIDATE**: `npm run build` then test via emulator

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { EnableBankingClient } from '../enableBanking/client';
import {
  ENABLE_BANKING_PRIVATE_KEY,
  ENABLE_BANKING_APP_ID,
  ENABLE_BANKING_API_URL,
} from '../config';

export const getAvailableBanks = onCall(
  {
    region: 'europe-west1',
    cors: true,
    secrets: [ENABLE_BANKING_PRIVATE_KEY, ENABLE_BANKING_APP_ID],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { country = 'NL' } = request.data as { country?: string };

    const client = new EnableBankingClient(ENABLE_BANKING_API_URL.value(), {
      privateKey: ENABLE_BANKING_PRIVATE_KEY.value(),
      applicationId: ENABLE_BANKING_APP_ID.value(),
    });

    try {
      const aspsps = await client.getASPSPs(country);

      // Return simplified bank list
      return aspsps.map((aspsp) => ({
        name: aspsp.name,
        country: aspsp.country,
        logo: aspsp.logo,
        bic: aspsp.bic,
      }));
    } catch (error) {
      console.error('Error fetching banks:', error);
      throw new HttpsError('internal', 'Failed to fetch available banks');
    }
  }
);
```

#### Task 2.2: CREATE `functions/src/handlers/initBankConnection.ts`

- **IMPLEMENT**: Start OAuth flow with Enable Banking
- **PATTERN**: Generate state token, store in Firestore, return auth URL
- **IMPORTS**: EnableBankingClient, Firestore, config
- **GOTCHA**: State token must be stored to verify callback
- **VALIDATE**: `npm run build` then test via emulator

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { EnableBankingClient } from '../enableBanking/client';
import {
  ENABLE_BANKING_PRIVATE_KEY,
  ENABLE_BANKING_APP_ID,
  ENABLE_BANKING_API_URL,
  APP_URL,
} from '../config';

export const initBankConnection = onCall(
  {
    region: 'europe-west1',
    cors: true,
    secrets: [ENABLE_BANKING_PRIVATE_KEY, ENABLE_BANKING_APP_ID],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const { bankName, bankCountry = 'NL' } = request.data as {
      bankName: string;
      bankCountry?: string;
    };

    if (!bankName) {
      throw new HttpsError('invalid-argument', 'Bank name is required');
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // Generate state token for OAuth verification
    const state = randomBytes(32).toString('hex');

    // Calculate access validity (90 days max per PSD2)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 90);

    // Store pending connection in Firestore
    const pendingRef = db.collection('pendingBankConnections').doc(state);
    await pendingRef.set({
      userId,
      bankName,
      bankCountry,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });

    const client = new EnableBankingClient(ENABLE_BANKING_API_URL.value(), {
      privateKey: ENABLE_BANKING_PRIVATE_KEY.value(),
      applicationId: ENABLE_BANKING_APP_ID.value(),
    });

    try {
      const callbackUrl = `https://europe-west1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/bankCallback`;

      const authResponse = await client.startAuthorization({
        aspsp: {
          name: bankName,
          country: bankCountry,
        },
        redirect_url: callbackUrl,
        psu_type: 'personal',
        access: {
          valid_until: validUntil.toISOString().split('T')[0],
        },
        state,
      });

      return {
        authUrl: authResponse.url,
        state,
      };
    } catch (error) {
      console.error('Error starting bank authorization:', error);
      await pendingRef.delete();
      throw new HttpsError('internal', 'Failed to start bank connection');
    }
  }
);
```

#### Task 2.3: CREATE `functions/src/handlers/bankCallback.ts`

- **IMPLEMENT**: HTTP function for OAuth callback
- **PATTERN**: onRequest handler, verify state, exchange code for session
- **IMPORTS**: EnableBankingClient, Firestore
- **GOTCHA**: Redirect user back to app after completion
- **VALIDATE**: `npm run build` then test via emulator

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { EnableBankingClient } from '../enableBanking/client';
import {
  ENABLE_BANKING_PRIVATE_KEY,
  ENABLE_BANKING_APP_ID,
  ENABLE_BANKING_API_URL,
  APP_URL,
} from '../config';

export const bankCallback = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    secrets: [ENABLE_BANKING_PRIVATE_KEY, ENABLE_BANKING_APP_ID],
  },
  async (req, res) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    const appUrl = APP_URL.value();

    // Handle authorization error
    if (error) {
      console.error('Bank authorization error:', error);
      res.redirect(`${appUrl}/settings?bank_error=${encodeURIComponent(error as string)}`);
      return;
    }

    // Verify state and code
    if (!state || !code) {
      res.redirect(`${appUrl}/settings?bank_error=missing_params`);
      return;
    }

    const db = getFirestore();
    const pendingRef = db.collection('pendingBankConnections').doc(state);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      res.redirect(`${appUrl}/settings?bank_error=invalid_state`);
      return;
    }

    const pendingData = pendingDoc.data()!;
    const userId = pendingData.userId as string;
    const bankName = pendingData.bankName as string;

    // Check if pending connection has expired
    const expiresAt = (pendingData.expiresAt as Timestamp).toDate();
    if (new Date() > expiresAt) {
      await pendingRef.delete();
      res.redirect(`${appUrl}/settings?bank_error=expired`);
      return;
    }

    const client = new EnableBankingClient(ENABLE_BANKING_API_URL.value(), {
      privateKey: ENABLE_BANKING_PRIVATE_KEY.value(),
      applicationId: ENABLE_BANKING_APP_ID.value(),
    });

    try {
      // Exchange code for session
      const session = await client.createSession(code);

      // Store bank connection in user's document
      const connectionId = `${bankName}_${Date.now()}`;
      const connectionRef = db
        .collection('users')
        .doc(userId)
        .collection('bankConnections')
        .doc(connectionId);

      await connectionRef.set({
        id: connectionId,
        provider: 'enable_banking',
        bankId: bankName.toLowerCase().replace(/\s+/g, '_'),
        bankName: session.aspsp.name,
        status: 'active',
        sessionId: session.session_id,
        accounts: session.accounts.map((acc) => ({
          uid: acc.uid,
          iban: acc.iban || acc.account_id?.iban,
          name: acc.name,
          currency: acc.currency,
        })),
        consentExpiresAt: new Date(session.access.valid_until),
        lastSync: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Clean up pending connection
      await pendingRef.delete();

      // Redirect back to app with success
      res.redirect(`${appUrl}/settings?bank_connected=${connectionId}`);
    } catch (err) {
      console.error('Error creating bank session:', err);
      await pendingRef.delete();
      res.redirect(`${appUrl}/settings?bank_error=session_failed`);
    }
  }
);
```

#### Task 2.4: CREATE `functions/src/handlers/getBankStatus.ts`

- **IMPLEMENT**: Get user's bank connection status
- **PATTERN**: onCall with Firestore read
- **VALIDATE**: `npm run build`

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const getBankStatus = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    const connectionsRef = db.collection('users').doc(userId).collection('bankConnections');

    const snapshot = await connectionsRef.get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bankName: data.bankName,
        status: data.status,
        accountCount: data.accounts?.length ?? 0,
        lastSync: data.lastSync?.toDate()?.toISOString() ?? null,
        consentExpiresAt: data.consentExpiresAt?.toDate()?.toISOString() ?? null,
      };
    });
  }
);
```

---

### PHASE 3: TRANSACTION SYNC

#### Task 3.1: CREATE `functions/src/handlers/syncTransactions.ts`

- **IMPLEMENT**: Fetch transactions from bank and store in Firestore
- **PATTERN**: Callable function with deduplication
- **IMPORTS**: EnableBankingClient, Firestore
- **GOTCHA**: Use entry_reference for deduplication
- **GOTCHA**: Handle pagination with continuation_key
- **VALIDATE**: `npm run build`

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { EnableBankingClient } from '../enableBanking/client';
import type { EnableBankingTransaction } from '../enableBanking/types';
import {
  ENABLE_BANKING_PRIVATE_KEY,
  ENABLE_BANKING_APP_ID,
  ENABLE_BANKING_API_URL,
} from '../config';

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
    secrets: [ENABLE_BANKING_PRIVATE_KEY, ENABLE_BANKING_APP_ID],
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
    const consentExpiry = (connection.consentExpiresAt as Timestamp).toDate();
    if (new Date() > consentExpiry) {
      await connectionRef.update({
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new HttpsError('failed-precondition', 'Bank consent has expired');
    }

    const client = new EnableBankingClient(ENABLE_BANKING_API_URL.value(), {
      privateKey: ENABLE_BANKING_PRIVATE_KEY.value(),
      applicationId: ENABLE_BANKING_APP_ID.value(),
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
          const lastSync = (connection.lastSync as Timestamp).toDate();
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

  // Get description from remittance info
  const description =
    tx.remittance_information_unstructured ||
    tx.remittance_information_unstructured_array?.join(' ') ||
    tx.bank_transaction_code ||
    'Bank transaction';

  return {
    externalId: tx.entry_reference,
    date: Timestamp.fromDate(new Date(tx.booking_date || tx.value_date || tx.transaction_date!)),
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
```

---

### PHASE 4: FRONTEND INTEGRATION

#### Task 4.1: UPDATE `src/lib/firebase.ts`

- **UPDATE**: Add Functions initialization
- **PATTERN**: Existing emulator connection pattern
- **VALIDATE**: `npm run typecheck`

```typescript
// Add to imports
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Add after db initialization
export const functions = getFunctions(app, 'europe-west1');

// Add to emulator section
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  // ... existing emulator code ...

  // Connect functions emulator
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

#### Task 4.2: CREATE `src/lib/bankingFunctions.ts`

- **IMPLEMENT**: Typed callable function wrappers
- **PATTERN**: httpsCallable with TypeScript generics
- **IMPORTS**: firebase/functions, firebase config
- **VALIDATE**: `npm run typecheck`

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Types
export interface Bank {
  name: string;
  country: string;
  logo: string;
  bic: string;
}

export interface BankConnectionStatus {
  id: string;
  bankName: string;
  status: 'active' | 'expired' | 'error';
  accountCount: number;
  lastSync: string | null;
  consentExpiresAt: string | null;
}

export interface InitConnectionResponse {
  authUrl: string;
  state: string;
}

export interface SyncResult {
  success: boolean;
  totalNew: number;
  totalUpdated: number;
  results: Array<{
    accountId: string;
    newTransactions: number;
    updatedTransactions: number;
    errors: string[];
  }>;
}

// Function wrappers
export const getAvailableBanks = httpsCallable<{ country?: string }, Bank[]>(
  functions,
  'getAvailableBanks'
);

export const initBankConnection = httpsCallable<
  { bankName: string; bankCountry?: string },
  InitConnectionResponse
>(functions, 'initBankConnection');

export const getBankStatus = httpsCallable<void, BankConnectionStatus[]>(
  functions,
  'getBankStatus'
);

export const syncTransactions = httpsCallable<{ connectionId: string }, SyncResult>(
  functions,
  'syncTransactions'
);
```

#### Task 4.3: CREATE `src/hooks/useBankConnection.ts`

- **IMPLEMENT**: Hook for bank connection state and actions
- **PATTERN**: TanStack Query mutations
- **IMPORTS**: @tanstack/react-query, bankingFunctions, useAuth
- **VALIDATE**: `npm run typecheck`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAvailableBanks,
  getBankStatus,
  initBankConnection,
  syncTransactions,
  type Bank,
  type BankConnectionStatus,
} from '@/lib/bankingFunctions';

export function useAvailableBanks(country = 'NL') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['availableBanks', country],
    queryFn: async () => {
      const result = await getAvailableBanks({ country });
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useBankConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bankConnections', user?.id],
    queryFn: async () => {
      const result = await getBankStatus();
      return result.data;
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

export function useInitBankConnection() {
  return useMutation({
    mutationFn: async (params: { bankName: string; bankCountry?: string }) => {
      const result = await initBankConnection(params);
      return result.data;
    },
    onSuccess: (data) => {
      // Redirect to bank authorization
      window.location.href = data.authUrl;
    },
  });
}

export function useSyncTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const result = await syncTransactions({ connectionId });
      return result.data;
    },
    onSuccess: () => {
      // Invalidate transactions and bank connections
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
    },
  });
}
```

#### Task 4.4: CREATE `src/components/settings/BankConnectionCard.tsx`

- **IMPLEMENT**: Main bank connection management UI
- **PATTERN**: Card with bank list and connection status
- **IMPORTS**: UI components, hooks
- **VALIDATE**: `npm run typecheck`

```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAvailableBanks,
  useBankConnections,
  useInitBankConnection,
  useSyncTransactions,
} from '@/hooks/useBankConnection';
import { formatDate } from '@/lib/utils';

export function BankConnectionCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: banks = [], isLoading: banksLoading } = useAvailableBanks();
  const { data: connections = [], isLoading: connectionsLoading } = useBankConnections();
  const initConnection = useInitBankConnection();
  const sync = useSyncTransactions();

  // Handle callback messages from URL
  useEffect(() => {
    const bankConnected = searchParams.get('bank_connected');
    const bankError = searchParams.get('bank_error');

    if (bankConnected) {
      setMessage({ type: 'success', text: 'Bank account connected successfully!' });
      setSearchParams({});
    } else if (bankError) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Authorization failed - missing parameters',
        invalid_state: 'Authorization failed - invalid session',
        expired: 'Authorization session expired - please try again',
        session_failed: 'Failed to create bank session',
      };
      setMessage({
        type: 'error',
        text: errorMessages[bankError] || `Authorization error: ${bankError}`,
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = () => {
    if (!selectedBank) return;
    initConnection.mutate({ bankName: selectedBank });
  };

  const handleSync = (connectionId: string) => {
    sync.mutate(connectionId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Connection</CardTitle>
        <CardDescription>Connect your bank account to sync transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status messages */}
        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Existing connections */}
        {connections.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Connected Accounts</p>
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(connection.status)}
                  <div>
                    <p className="font-medium">{connection.bankName}</p>
                    <p className="text-sm text-muted-foreground">
                      {connection.accountCount} account{connection.accountCount !== 1 ? 's' : ''}
                      {connection.lastSync && (
                        <>
                          {' · '}Last synced {formatDate(new Date(connection.lastSync), 'relative')}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(connection.id)}
                  disabled={sync.isPending || connection.status === 'expired'}
                >
                  {sync.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new connection */}
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {connections.length > 0 ? 'Add Another Bank' : 'Connect Your Bank'}
          </p>
          <div className="flex gap-2">
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {banksLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading banks...
                  </SelectItem>
                ) : (
                  banks.map((bank) => (
                    <SelectItem key={bank.name} value={bank.name}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {bank.name}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleConnect}
              disabled={!selectedBank || initConnection.isPending}
            >
              {initConnection.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </div>

        {/* Consent expiry warning */}
        {connections.some((c) => {
          if (!c.consentExpiresAt) return false;
          const daysUntilExpiry = Math.ceil(
            (new Date(c.consentExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 7;
        }) && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            Bank consent expires soon. You may need to reconnect to continue syncing.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### Task 4.5: UPDATE `src/pages/Settings.tsx`

- **UPDATE**: Integrate BankConnectionCard component
- **PATTERN**: Replace placeholder with real component
- **IMPORTS**: BankConnectionCard
- **VALIDATE**: `npm run dev` and verify UI

Replace the placeholder bank connection card with:

```typescript
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';

// In JSX, replace the placeholder Card with:
<BankConnectionCard />
```

---

### PHASE 5: TESTING & VALIDATION

#### Task 5.1: CREATE `functions/src/__tests__/enableBanking.test.ts`

- **IMPLEMENT**: Unit tests for Enable Banking client
- **PATTERN**: Jest tests with mocked fetch
- **VALIDATE**: `cd functions && npm test`

#### Task 5.2: CREATE `src/hooks/__tests__/useBankConnection.test.ts`

- **IMPLEMENT**: Unit tests for bank connection hooks
- **PATTERN**: React Testing Library with mocked functions
- **VALIDATE**: `npm run test`

#### Task 5.3: UPDATE E2E tests

- **IMPLEMENT**: E2E test for bank connection flow
- **FILE**: `e2e/bank-connection.spec.ts`
- **PATTERN**: Mock Enable Banking callback
- **VALIDATE**: `npm run e2e`

---

## TESTING STRATEGY

### Unit Tests

**Functions Tests (`functions/src/__tests__/`):**

- Test JWT generation with mock private key
- Test transaction transformation logic
- Test deduplication logic

**Frontend Tests (`src/hooks/__tests__/`):**

- Test useBankConnection hook states
- Mock callable functions

### Integration Tests

Test the complete OAuth flow using Enable Banking's Mock ASPSP:

1. Set up sandbox environment
2. Initiate connection to Mock ASPSP
3. Complete authorization with test credentials
4. Verify session creation
5. Test transaction sync

### E2E Tests

**CRITICAL: E2E tests for bank connection flow**

```typescript
// e2e/bank-connection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Bank Connection', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should display bank connection card on settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Bank Connection')).toBeVisible();
    await expect(page.getByText('Connect your bank account')).toBeVisible();
  });

  test('should show bank selector', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="bank-selector"]');
    await expect(page.getByText('ABN AMRO')).toBeVisible();
  });

  test('should handle connection success callback', async ({ page }) => {
    await page.goto('/settings?bank_connected=test_connection');
    await expect(page.getByText('Bank account connected successfully!')).toBeVisible();
  });

  test('should handle connection error callback', async ({ page }) => {
    await page.goto('/settings?bank_error=session_failed');
    await expect(page.getByText('Failed to create bank session')).toBeVisible();
  });
});
```

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
# Frontend
npm run typecheck
npm run lint
npm run format:check

# Functions
cd functions && npm run build && cd ..
```

### Level 2: Unit Tests

```bash
npm run test
cd functions && npm test && cd ..
```

### Level 3: Build

```bash
npm run build
cd functions && npm run build && cd ..
```

### Level 4: Integration Testing with Emulators

```bash
# Terminal 1: Start emulators
npm run firebase:emulators

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Run tests
npm run e2e
```

### Level 5: Manual Validation

1. Start emulators: `npm run firebase:emulators`
2. Start dev server: `npm run dev`
3. Log in with test account
4. Navigate to Settings
5. Verify bank selector shows Dutch banks
6. Select "Mock ASPSP" (sandbox bank)
7. Click Connect
8. Complete mock authorization flow
9. Verify redirect back to Settings with success
10. Verify bank connection shows in list
11. Click Sync and verify transactions appear

---

## ACCEPTANCE CRITERIA

- [ ] Enable Banking API authentication works (JWT generation)
- [ ] Available banks list loads from Enable Banking API
- [ ] User can select a bank and initiate connection
- [ ] OAuth redirect flow completes successfully
- [ ] Bank connection is stored in Firestore
- [ ] Transactions sync from connected bank
- [ ] Duplicate transactions are not created
- [ ] Connection status displays correctly
- [ ] Manual sync works
- [ ] Consent expiry warning shows when appropriate
- [ ] Error states are handled gracefully
- [ ] All validation commands pass with zero errors
- [ ] E2E tests cover critical flows

---

## COMPLETION CHECKLIST

- [ ] functions/ directory created with package.json and tsconfig.json
- [ ] firebase.json updated with functions configuration
- [ ] Enable Banking client implemented (auth.ts, client.ts, types.ts)
- [ ] Cloud Functions implemented (init, callback, sync, status)
- [ ] Frontend hooks created (useBankConnection.ts)
- [ ] BankConnectionCard component created
- [ ] Settings page updated with real bank connection
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Manual testing completed
- [ ] TypeScript strict mode passes
- [ ] Lint passes with no errors

---

## NOTES

### Design Decisions

1. **Enable Banking over direct API**: Using Enable Banking aggregation layer because direct ABN AMRO API requires costly PSD2 license and QWAC certificates. Enable Banking's restricted production mode allows free personal use.

2. **Server-side OAuth handling**: OAuth callback goes to Cloud Function (not frontend) for security - tokens never exposed to client.

3. **Deduplication by entry_reference**: Enable Banking provides unique entry_reference for each transaction. Use this to prevent duplicates when re-syncing.

4. **90-day consent validity**: Per PSD2, bank consent expires after max 90 days. Store expiry date and warn users before it expires.

5. **Sync date range**: Fetch 90 days on initial sync, then only since last sync (with 1-day overlap for safety).

### Known Limitations

- Maximum 90-day transaction history per PSD2
- Consent expires and needs re-authorization
- Rate limits may apply (varies by bank)
- Real-time sync not available (polling only)

### Security Considerations

- Enable Banking private key stored in Firebase Secrets Manager
- OAuth state token prevents CSRF attacks
- Pending connections expire after 10 minutes
- Bank session IDs stored encrypted in Firestore
- No sensitive tokens sent to frontend

### Future Improvements

- Add Cloud Scheduler for automatic daily sync
- Implement token refresh when needed
- Add push notifications for consent expiry
- Support multiple banks (ING, Rabobank, etc.)
- Add transaction webhook support if Enable Banking supports it
