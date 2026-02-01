# Feature: Phase 5 - Raw Transaction Storage & Auto-Categorization Engine

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

This phase implements two related features:

1. **Raw Transaction Storage**: Store the original Enable Banking API response alongside transformed transactions for debugging, auditing, and future data extraction.

2. **Auto-Categorization Engine**: Automatically categorize imported bank transactions using a multi-tier approach: user-defined rules → merchant database → learned patterns.

These features work together - raw data provides audit trail, and categorization runs on fresh imports.

## User Stories

### Raw Transaction Storage

As a developer/admin
I want to store raw bank API responses separately
So that I can debug issues, audit data transformations, and extract additional fields later without re-syncing

### Auto-Categorization

As a Free Lunch user
I want my transactions to be automatically categorized
So that I don't have to manually organize hundreds of transactions

## Problem Statement

**Current Issues:**

1. Raw Enable Banking API data is processed and discarded - fields like `value_date`, counterparty IBANs, and `bank_transaction_code` are lost forever
2. Transactions are imported with `categoryId: null` - no auto-categorization happens
3. Users must manually categorize every single transaction
4. No way to debug or audit what data the bank actually sent

## Solution Statement

1. **Raw Storage**: Create a parallel Firestore collection `users/{userId}/rawBankTransactions/{id}` storing the original Enable Banking response, linked to the processed transaction by `transactionId`.

2. **Auto-Categorization**: Implement a categorization engine that runs during sync:
   - Check user-defined rules first (highest priority)
   - Match against Dutch merchant database (pre-populated)
   - Fall back to learned rules (from user corrections)
   - Set confidence scores based on match quality

3. **Rule Learning**: When users manually re-categorize a transaction, offer to create a learned rule for future matching.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High
**Primary Systems Affected**:

- `functions/src/handlers/syncTransactions.ts` - Store raw data, apply categorization
- `functions/src/categorization/` - New categorization module
- `src/hooks/useTransactions.ts` - Rule learning on manual categorization
- `src/types/index.ts` - New types for raw transactions and rules
- Firestore rules and indexes

**Dependencies**:

- Enable Banking API types (existing)
- Firestore (existing)
- No new external libraries required

---

## CONTEXT REFERENCES

### Relevant Codebase Files - MUST READ BEFORE IMPLEMENTING

**Current Transaction Sync:**

- `functions/src/handlers/syncTransactions.ts` (full file) - Current sync logic, `transformTransaction()` function at lines 175-224
- `functions/src/enableBanking/types.ts` (full file) - `EnableBankingTransaction` interface (lines 56-81) - the raw data we want to preserve
- `functions/src/enableBanking/client.ts` (lines 71-84) - How transactions are fetched

**Type Definitions:**

- `src/types/index.ts` (lines 60-113) - `Transaction`, `ReimbursementInfo`, `CategorizationRule` types
- `src/types/index.ts` (lines 105-113) - `CategorizationRule` interface already exists with `pattern`, `matchType`, `categoryId`, `priority`, `isLearned`

**Category System:**

- `src/hooks/useCategories.ts` (full file) - How categories are stored and queried
- `src/hooks/useTransactions.ts` (lines 205-246) - `useUpdateTransactionCategory` with optimistic updates

**Firestore Security:**

- `firestore.rules` (lines 30-33) - Rules subcollection already defined

**PRD Specifications:**

- `PRD.md` (lines 701-725) - Auto-categorization approach specification
- `PRD.md` (lines 2100-2158) - Dutch merchant database examples

**Testing Patterns:**

- `src/hooks/__tests__/useTransactions.test.ts` - Unit test structure
- `e2e/transactions.spec.ts` - E2E test patterns with auth

### New Files to Create

**Backend (Cloud Functions):**

- `functions/src/categorization/index.ts` - Barrel export
- `functions/src/categorization/categorizer.ts` - Main categorization engine
- `functions/src/categorization/merchantDatabase.ts` - Dutch merchant mappings
- `functions/src/categorization/ruleEngine.ts` - Rule matching logic
- `functions/src/categorization/types.ts` - Categorization-specific types

**Frontend:**

- `src/hooks/useRules.ts` - Hook for managing categorization rules
- `src/components/transactions/CreateRuleDialog.tsx` - Dialog for creating rules from corrections

**Tests:**

- `functions/src/categorization/__tests__/categorizer.test.ts` - Categorizer unit tests
- `functions/src/categorization/__tests__/merchantDatabase.test.ts` - Merchant matching tests
- `src/hooks/__tests__/useRules.test.ts` - Rules hook tests
- `e2e/categorization.spec.ts` - E2E tests for auto-categorization

### Relevant Documentation

- [Firebase Firestore Data Model](https://firebase.google.com/docs/firestore/data-model) - Subcollection patterns
- [Enable Banking Transaction API](https://enablebanking.com/docs/api/reference/#/paths/~1accounts~1%7Baccount_uid%7D~1transactions/get) - Full transaction response schema

### Patterns to Follow

**Cloud Function Pattern (from syncTransactions.ts):**

```typescript
export const functionName = onCall(
  {
    region: 'europe-west1',
    cors: true,
    secrets: ['ENABLE_BANKING_APP_ID', ...],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    // ... implementation
  }
);
```

**Firestore Batch Write Pattern:**

```typescript
const batch = db.batch();
batch.set(doc1Ref, data1);
batch.set(doc2Ref, data2);
await batch.commit();
```

**Type Definition Pattern (from src/types/index.ts):**

```typescript
export interface TypeName {
  id: string;
  field: string;
  createdAt: Date;
  // ...
}
```

**Hook Pattern (from useCategories.ts):**

```typescript
export function useCreateEntity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: FormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      // ... Firestore operations
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entity'] });
    },
  });
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Raw Transaction Storage

Create the infrastructure to store raw bank API responses alongside processed transactions.

**Tasks:**

- Define `RawBankTransaction` type
- Update Firestore rules for new collection
- Modify `syncTransactions.ts` to store raw data
- Link raw records to processed transactions

### Phase 2: Categorization Infrastructure

Build the categorization engine components.

**Tasks:**

- Create merchant database with Dutch merchants
- Implement rule matching engine
- Build main categorizer that orchestrates the tiers
- Add types for categorization results

### Phase 3: Integration with Sync

Wire categorization into the transaction sync flow.

**Tasks:**

- Call categorizer during transaction import
- Store categorization results on transactions
- Handle batch categorization efficiently

### Phase 4: Rule Learning (Frontend)

Enable users to create rules from manual corrections.

**Tasks:**

- Create rules hook for CRUD operations
- Build "Create Rule" dialog
- Integrate with transaction category changes
- Add rule management UI (optional, can be deferred)

### Phase 5: Testing

Comprehensive testing of both features.

**Tasks:**

- Unit tests for categorizer and merchant database
- Unit tests for rule engine
- E2E tests for categorization flow
- Manual testing with real bank data

---

## STEP-BY-STEP TASKS

### PHASE 1: RAW TRANSACTION STORAGE

#### Task 1.1: ADD raw transaction type to `functions/src/enableBanking/types.ts`

- **ADD**: `RawBankTransactionRecord` interface after `EnableBankingTransaction`
- **IMPLEMENT**:

```typescript
/**
 * Raw bank transaction as stored in Firestore for debugging/audit
 */
export interface RawBankTransactionRecord {
  /** Reference to the processed transaction document */
  transactionId: string;
  /** The Enable Banking account UID this transaction came from */
  accountUid: string;
  /** The bank connection ID */
  connectionId: string;
  /** Raw transaction data exactly as received from Enable Banking API */
  rawData: EnableBankingTransaction;
  /** When this was imported */
  importedAt: FirebaseFirestore.Timestamp;
}
```

- **VALIDATE**: `cd functions && npm run build`

#### Task 1.2: UPDATE Firestore rules for raw transactions

- **UPDATE**: `firestore.rules`
- **ADD**: After `bankConnections` subcollection (line 38), add:

```javascript
      // Raw bank transactions subcollection (for debugging/audit)
      match /rawBankTransactions/{rawId} {
        allow read: if isOwner(userId);
        // Write only allowed by Cloud Functions (admin SDK bypasses rules)
        allow write: if false;
      }
```

- **VALIDATE**: `firebase deploy --only firestore:rules --project <project-id>` (or verify in emulator)

#### Task 1.3: UPDATE `functions/src/handlers/syncTransactions.ts` to store raw data

- **UPDATE**: `functions/src/handlers/syncTransactions.ts`
- **IMPORT**: Add `WriteBatch` to imports
- **IMPLEMENT**: After line 125 (before `if (existingQuery.empty)`), add batch logic:

```typescript
// Store raw transaction data for debugging/audit
const rawRef = db.collection('users').doc(userId).collection('rawBankTransactions').doc();
```

- **MODIFY**: Change individual writes to use a batch:
  - Create batch before the transaction loop
  - Add raw transaction write to batch
  - Add processed transaction write to batch
  - Commit batch after loop (in chunks of 500 for Firestore limit)
- **PATTERN**: Use batch writes for atomicity
- **GOTCHA**: Firestore batch limit is 500 operations - process in chunks if needed
- **VALIDATE**: `cd functions && npm run build`

#### Task 1.4: ADD `rawTransactionId` field to processed transaction

- **UPDATE**: `functions/src/handlers/syncTransactions.ts` in `transformTransaction` function
- **ADD**: Field `rawTransactionId: string` to returned object
- **IMPLEMENT**: Pass raw document ID to link them
- **VALIDATE**: `cd functions && npm run build`

---

### PHASE 2: CATEGORIZATION INFRASTRUCTURE

#### Task 2.1: CREATE `functions/src/categorization/types.ts`

- **CREATE**: New file for categorization types
- **IMPLEMENT**:

```typescript
/**
 * Result from the categorization engine
 */
export interface CategorizationResult {
  categoryId: string | null;
  confidence: number; // 0.0 - 1.0
  source: 'rule' | 'merchant' | 'learned' | 'none';
  matchedPattern?: string; // For debugging
  ruleId?: string; // If matched by user rule
}

/**
 * Rule stored in Firestore
 */
export interface StoredRule {
  id: string;
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  priority: number;
  isLearned: boolean;
  isSystem: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Merchant mapping entry
 */
export interface MerchantMapping {
  pattern: string;
  categorySlug: string; // e.g., 'groceries', 'transport.public'
  confidence: number;
}
```

- **VALIDATE**: `cd functions && npm run build`

#### Task 2.2: CREATE `functions/src/categorization/merchantDatabase.ts`

- **CREATE**: Dutch merchant database
- **IMPLEMENT**: Based on PRD Appendix C (lines 2100-2158)

```typescript
import type { MerchantMapping } from './types.js';

/**
 * Pre-populated Dutch merchant patterns mapped to category slugs.
 * These slugs are resolved to actual category IDs at runtime based on user's categories.
 */
export const DUTCH_MERCHANTS: MerchantMapping[] = [
  // Groceries - high confidence
  { pattern: 'ALBERT HEIJN', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'JUMBO', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'LIDL', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'ALDI', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'PLUS', categorySlug: 'groceries', confidence: 0.9 },
  { pattern: 'DIRK', categorySlug: 'groceries', confidence: 0.95 },
  { pattern: 'COOP', categorySlug: 'groceries', confidence: 0.9 },

  // Transport - Public
  { pattern: 'NS ', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'GVB', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'RET', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'HTM', categorySlug: 'transport.public', confidence: 0.95 },
  { pattern: 'OV-CHIPKAART', categorySlug: 'transport.public', confidence: 0.9 },

  // Transport - Fuel
  { pattern: 'SHELL', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'BP ', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'ESSO', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TINQ', categorySlug: 'transport.fuel', confidence: 0.95 },
  { pattern: 'TANGO', categorySlug: 'transport.fuel', confidence: 0.95 },

  // Shopping
  { pattern: 'BOL.COM', categorySlug: 'shopping.general', confidence: 0.95 },
  { pattern: 'HEMA', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'IKEA', categorySlug: 'shopping.home', confidence: 0.95 },
  { pattern: 'ACTION', categorySlug: 'shopping.general', confidence: 0.9 },
  { pattern: 'COOLBLUE', categorySlug: 'shopping.electronics', confidence: 0.95 },
  { pattern: 'MEDIAMARKT', categorySlug: 'shopping.electronics', confidence: 0.95 },

  // Food & Drink
  { pattern: 'THUISBEZORGD', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'UBER EATS', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'DELIVEROO', categorySlug: 'food.restaurants', confidence: 0.95 },
  { pattern: 'MCDONALDS', categorySlug: 'food.restaurants', confidence: 0.9 },
  { pattern: 'STARBUCKS', categorySlug: 'food.coffee', confidence: 0.95 },

  // Health
  { pattern: 'KRUIDVAT', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'ETOS', categorySlug: 'health.pharmacy', confidence: 0.95 },
  { pattern: 'APOTHEEK', categorySlug: 'health.pharmacy', confidence: 0.9 },

  // Entertainment
  { pattern: 'NETFLIX', categorySlug: 'entertainment', confidence: 0.95 },
  { pattern: 'SPOTIFY', categorySlug: 'entertainment', confidence: 0.95 },
  { pattern: 'PATHE', categorySlug: 'entertainment', confidence: 0.95 },

  // Utilities
  { pattern: 'VATTENFALL', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ENECO', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'ESSENT', categorySlug: 'housing.utilities', confidence: 0.95 },
  { pattern: 'KPN', categorySlug: 'housing.utilities', confidence: 0.9 },
  { pattern: 'VODAFONE', categorySlug: 'housing.utilities', confidence: 0.9 },
  { pattern: 'T-MOBILE', categorySlug: 'housing.utilities', confidence: 0.9 },
  { pattern: 'ZIGGO', categorySlug: 'housing.utilities', confidence: 0.95 },
];

/**
 * Match a transaction description against the merchant database.
 * Returns the first match with highest confidence, or null if no match.
 */
export function matchMerchant(description: string): MerchantMapping | null {
  const upperDesc = description.toUpperCase();

  let bestMatch: MerchantMapping | null = null;

  for (const merchant of DUTCH_MERCHANTS) {
    if (upperDesc.includes(merchant.pattern)) {
      if (!bestMatch || merchant.confidence > bestMatch.confidence) {
        bestMatch = merchant;
      }
    }
  }

  return bestMatch;
}
```

- **VALIDATE**: `cd functions && npm run build`

#### Task 2.3: CREATE `functions/src/categorization/ruleEngine.ts`

- **CREATE**: Rule matching engine
- **IMPLEMENT**:

```typescript
import type { StoredRule, CategorizationResult } from './types.js';

/**
 * Match a transaction description against user rules.
 * Rules are checked in priority order (highest first).
 */
export function matchRules(description: string, rules: StoredRule[]): CategorizationResult | null {
  // Sort by priority descending
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (matchesRule(description, rule)) {
      return {
        categoryId: rule.categoryId,
        confidence: rule.isLearned ? 0.85 : 0.95,
        source: rule.isLearned ? 'learned' : 'rule',
        matchedPattern: rule.pattern,
        ruleId: rule.id,
      };
    }
  }

  return null;
}

/**
 * Check if a description matches a single rule
 */
function matchesRule(description: string, rule: StoredRule): boolean {
  const desc = description.toUpperCase();
  const pattern = rule.pattern.toUpperCase();

  switch (rule.matchType) {
    case 'exact':
      return desc === pattern;

    case 'contains':
      return desc.includes(pattern);

    case 'regex':
      try {
        const regex = new RegExp(rule.pattern, 'i');
        return regex.test(description);
      } catch {
        // Invalid regex, skip this rule
        return false;
      }

    default:
      return false;
  }
}
```

- **VALIDATE**: `cd functions && npm run build`

#### Task 2.4: CREATE `functions/src/categorization/categorizer.ts`

- **CREATE**: Main categorization engine
- **IMPLEMENT**:

```typescript
import { getFirestore } from 'firebase-admin/firestore';
import type { CategorizationResult, StoredRule } from './types.js';
import { matchRules } from './ruleEngine.js';
import { matchMerchant } from './merchantDatabase.js';

interface CategoryDoc {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * Main categorization engine.
 * Applies categorization in priority order:
 * 1. User-defined rules (highest priority)
 * 2. Merchant database
 * 3. Learned rules (from corrections)
 */
export class Categorizer {
  private db = getFirestore();
  private userId: string;
  private rules: StoredRule[] = [];
  private categories: CategoryDoc[] = [];
  private categorySlugMap: Map<string, string> = new Map(); // slug -> categoryId
  private initialized = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the categorizer by loading user's rules and categories.
   * Call this once before categorizing multiple transactions.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load user's categorization rules
    const rulesSnapshot = await this.db
      .collection('users')
      .doc(this.userId)
      .collection('rules')
      .orderBy('priority', 'desc')
      .get();

    this.rules = rulesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StoredRule[];

    // Load user's categories for slug resolution
    const categoriesSnapshot = await this.db
      .collection('users')
      .doc(this.userId)
      .collection('categories')
      .get();

    this.categories = categoriesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      parentId: doc.data().parentId ?? null,
    }));

    // Build slug map for merchant database resolution
    this.buildCategorySlugMap();

    this.initialized = true;
  }

  /**
   * Build a map from category slugs to category IDs.
   * Handles hierarchical slugs like 'transport.public' by matching category names.
   */
  private buildCategorySlugMap(): void {
    this.categorySlugMap.clear();

    for (const cat of this.categories) {
      // Simple name match (lowercase)
      const simpleName = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      this.categorySlugMap.set(simpleName, cat.id);

      // If has parent, also create hierarchical slug
      if (cat.parentId) {
        const parent = this.categories.find((c) => c.id === cat.parentId);
        if (parent) {
          const hierarchicalSlug = `${parent.name.toLowerCase()}.${cat.name.toLowerCase()}`.replace(
            /[^a-z.]/g,
            ''
          );
          this.categorySlugMap.set(hierarchicalSlug, cat.id);
        }
      }
    }
  }

  /**
   * Resolve a category slug to an actual category ID.
   */
  private resolveCategorySlug(slug: string): string | null {
    // Try exact match first
    if (this.categorySlugMap.has(slug)) {
      return this.categorySlugMap.get(slug)!;
    }

    // Try partial match (e.g., 'groceries' matches 'Food > Groceries')
    const normalizedSlug = slug.toLowerCase().replace(/[^a-z.]/g, '');
    for (const [key, value] of this.categorySlugMap) {
      if (key.includes(normalizedSlug) || normalizedSlug.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Categorize a transaction.
   * Returns categorization result with category ID, confidence, and source.
   */
  categorize(description: string, counterparty: string | null): CategorizationResult {
    if (!this.initialized) {
      throw new Error('Categorizer not initialized. Call initialize() first.');
    }

    const searchText = [description, counterparty].filter(Boolean).join(' ');

    // 1. Try user-defined rules first (non-learned)
    const userRules = this.rules.filter((r) => !r.isLearned);
    const userRuleMatch = matchRules(searchText, userRules);
    if (userRuleMatch) {
      return userRuleMatch;
    }

    // 2. Try merchant database
    const merchantMatch = matchMerchant(searchText);
    if (merchantMatch) {
      const categoryId = this.resolveCategorySlug(merchantMatch.categorySlug);
      if (categoryId) {
        return {
          categoryId,
          confidence: merchantMatch.confidence,
          source: 'merchant',
          matchedPattern: merchantMatch.pattern,
        };
      }
    }

    // 3. Try learned rules (lower priority)
    const learnedRules = this.rules.filter((r) => r.isLearned);
    const learnedMatch = matchRules(searchText, learnedRules);
    if (learnedMatch) {
      return learnedMatch;
    }

    // 4. No match found
    return {
      categoryId: null,
      confidence: 0,
      source: 'none',
    };
  }
}
```

- **VALIDATE**: `cd functions && npm run build`

#### Task 2.5: CREATE `functions/src/categorization/index.ts`

- **CREATE**: Barrel export
- **IMPLEMENT**:

```typescript
export { Categorizer } from './categorizer.js';
export { matchMerchant, DUTCH_MERCHANTS } from './merchantDatabase.js';
export { matchRules } from './ruleEngine.js';
export type { CategorizationResult, StoredRule, MerchantMapping } from './types.js';
```

- **VALIDATE**: `cd functions && npm run build`

---

### PHASE 3: INTEGRATION WITH SYNC

#### Task 3.1: UPDATE `functions/src/handlers/syncTransactions.ts` to use categorizer

- **UPDATE**: `functions/src/handlers/syncTransactions.ts`
- **IMPORT**: Add `import { Categorizer } from '../categorization/index.js';`
- **IMPLEMENT**: After line 67 (after client creation), initialize categorizer:

```typescript
// Initialize categorizer for this user
const categorizer = new Categorizer(userId);
await categorizer.initialize();
```

- **MODIFY**: In `transformTransaction` function or after it's called, apply categorization:

```typescript
// Apply auto-categorization
const categorizationResult = categorizer.categorize(
  transactionData.description,
  transactionData.counterparty
);

transactionData.categoryId = categorizationResult.categoryId;
transactionData.categoryConfidence = categorizationResult.confidence;
transactionData.categorySource =
  categorizationResult.source === 'none' ? 'auto' : categorizationResult.source;
```

- **GOTCHA**: Initialize categorizer once, reuse for all transactions in sync batch
- **VALIDATE**: `cd functions && npm run build`

#### Task 3.2: UPDATE `transformTransaction` to include new fields

- **UPDATE**: `functions/src/handlers/syncTransactions.ts` function at line 175
- **MODIFY**: Update return type to include categorization fields properly
- **ADD**: `matchedPattern` and `ruleId` fields if needed for debugging
- **VALIDATE**: `cd functions && npm run build`

---

### PHASE 4: RULE LEARNING (FRONTEND)

#### Task 4.1: ADD `CategorizationRule` to frontend types if not complete

- **UPDATE**: `src/types/index.ts`
- **VERIFY**: `CategorizationRule` interface exists (lines 105-113)
- **ADD** if missing any fields for frontend use:

```typescript
export interface CategorizationRule {
  id: string;
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  priority: number;
  isLearned: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- **VALIDATE**: `npm run typecheck`

#### Task 4.2: CREATE `src/hooks/useRules.ts`

- **CREATE**: Hook for rule management
- **PATTERN**: Follow `src/hooks/useCategories.ts` structure
- **IMPLEMENT**:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { CategorizationRule } from '@/types';
import { generateId } from '@/lib/utils';

// Query keys
export const ruleKeys = {
  all: (userId: string) => ['rules', userId] as const,
};

// Transform Firestore data
function transformRule(docSnap: QueryDocumentSnapshot): CategorizationRule {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    pattern: data.pattern,
    matchType: data.matchType,
    categoryId: data.categoryId,
    priority: data.priority ?? 0,
    isLearned: data.isLearned ?? false,
    isSystem: data.isSystem ?? false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ruleKeys.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const rulesRef = collection(db, 'users', user.id, 'rules');
      const q = query(rulesRef, orderBy('priority', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformRule);
    },
    enabled: !!user?.id,
  });
}

export interface CreateRuleData {
  pattern: string;
  matchType: 'contains' | 'exact' | 'regex';
  categoryId: string;
  isLearned?: boolean;
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateRuleData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const ruleRef = doc(db, 'users', user.id, 'rules', id);
      await setDoc(ruleRef, {
        pattern: data.pattern,
        matchType: data.matchType,
        categoryId: data.categoryId,
        priority: Date.now(), // Higher = newer = checked first
        isLearned: data.isLearned ?? true,
        isSystem: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const ruleRef = doc(db, 'users', user.id, 'rules', id);
      await deleteDoc(ruleRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}
```

- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 4.3: CREATE `src/components/transactions/CreateRuleDialog.tsx`

- **CREATE**: Dialog for creating rules from manual categorization
- **PATTERN**: Follow `src/components/transactions/TransactionForm.tsx` dialog pattern
- **IMPLEMENT**:

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Transaction, Category } from '@/types';

interface CreateRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  newCategoryId: string;
  categories: Category[];
  onCreateRule: (pattern: string, matchType: 'contains' | 'exact') => void;
  isCreating: boolean;
}

export function CreateRuleDialog({
  open,
  onOpenChange,
  transaction,
  newCategoryId,
  categories,
  onCreateRule,
  isCreating,
}: CreateRuleDialogProps) {
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact'>('contains');

  // Pre-fill pattern from transaction
  const suggestedPattern = transaction?.counterparty ||
    transaction?.description.split(' ').slice(0, 2).join(' ') || '';

  const categoryName = categories.find((c) => c.id === newCategoryId)?.name || 'Unknown';

  const handleCreate = () => {
    const finalPattern = pattern || suggestedPattern;
    if (finalPattern.trim()) {
      onCreateRule(finalPattern.trim(), matchType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Categorization Rule</DialogTitle>
          <DialogDescription>
            Create a rule to automatically categorize similar transactions as "{categoryName}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pattern">Match Pattern</Label>
            <Input
              id="pattern"
              placeholder={suggestedPattern}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Transactions containing this text will be auto-categorized.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchType">Match Type</Label>
            <Select value={matchType} onValueChange={(v) => setMatchType(v as 'contains' | 'exact')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains (recommended)</SelectItem>
                <SelectItem value="exact">Exact match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <strong>Preview:</strong> Transactions {matchType === 'contains' ? 'containing' : 'exactly matching'}{' '}
            "{pattern || suggestedPattern}" will be categorized as "{categoryName}"
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 4.4: UPDATE `src/pages/Transactions.tsx` to offer rule creation

- **UPDATE**: `src/pages/Transactions.tsx`
- **IMPORT**: Add `CreateRuleDialog` and `useCreateRule`
- **ADD**: State for rule creation dialog:

```typescript
const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
const [pendingCategoryChange, setPendingCategoryChange] = useState<{
  transactionId: string;
  newCategoryId: string;
  transaction: Transaction;
} | null>(null);
```

- **MODIFY**: `handleCategoryChange` to show rule creation dialog after successful update:

```typescript
const handleCategoryChange = async (transactionId: string, categoryId: string | null) => {
  const transaction = transactions?.find((t) => t.id === transactionId);
  await updateCategory.mutateAsync({ id: transactionId, categoryId });

  // Only offer to create rule if:
  // 1. A category was selected (not uncategorized)
  // 2. The transaction was auto-categorized or uncategorized before
  if (
    categoryId &&
    transaction &&
    (transaction.categorySource === 'auto' || !transaction.categoryId)
  ) {
    setPendingCategoryChange({ transactionId, newCategoryId: categoryId, transaction });
    setRuleDialogOpen(true);
  }
};
```

- **ADD**: Dialog component in JSX
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### PHASE 5: TESTING

#### Task 5.1: CREATE `functions/src/categorization/__tests__/merchantDatabase.test.ts`

- **CREATE**: Unit tests for merchant matching
- **NOTE**: You may need to set up Vitest or Jest for functions (check functions/package.json)
- **IMPLEMENT**: Test cases for:
  - Exact merchant matches (e.g., "ALBERT HEIJN 1234" → groceries)
  - Case insensitivity
  - Multiple potential matches returning highest confidence
  - No match returning null
  - Edge cases (empty string, special characters)
- **VALIDATE**: `cd functions && npm test` (if test script exists)

#### Task 5.2: CREATE `functions/src/categorization/__tests__/ruleEngine.test.ts`

- **CREATE**: Unit tests for rule matching
- **IMPLEMENT**: Test cases for:
  - 'contains' match type
  - 'exact' match type
  - 'regex' match type
  - Priority ordering
  - Invalid regex handling
  - No rules matching
- **VALIDATE**: `cd functions && npm test`

#### Task 5.3: CREATE `src/hooks/__tests__/useRules.test.ts`

- **CREATE**: Unit tests for rules hook types
- **PATTERN**: Follow `src/hooks/__tests__/useTransactions.test.ts`
- **IMPLEMENT**: Type validation tests similar to existing pattern
- **VALIDATE**: `npm run test src/hooks/__tests__/useRules.test.ts`

#### Task 5.4: CREATE `e2e/categorization.spec.ts`

- **CREATE**: E2E tests for auto-categorization
- **PATTERN**: Follow `e2e/transactions.spec.ts` exactly
- **IMPLEMENT**:

```typescript
import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

const test = base.extend({});

test.describe('Auto-Categorization', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      const registered = await register(page);
      authAvailable = registered || (await login(page));
    } catch {
      authAvailable = false;
    }
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available');
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should auto-categorize transaction with known merchant', async ({ page }) => {
    // This test requires bank sync with real/mock data
    // For now, verify the UI shows categorization source
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();

    // Add a transaction manually and verify it appears
    // (Auto-categorization only works on bank sync, not manual entry)
  });

  test('should offer to create rule when manually categorizing', async ({ page }) => {
    await page.goto('/transactions');

    // Create a transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill('ALBERT HEIJN Test');
    await page.getByLabel(/amount/i).fill('-25');
    await page
      .getByRole('button', { name: /add transaction/i })
      .last()
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Wait for transaction to appear
    await expect(page.getByText('ALBERT HEIJN Test')).toBeVisible({ timeout: 10000 });

    // Change category (this should trigger rule creation dialog)
    // Note: Implementation depends on how category picker is integrated
  });
});
```

- **VALIDATE**: `npm run e2e e2e/categorization.spec.ts`

---

## TESTING STRATEGY

### Unit Tests

**Merchant Database (`functions/src/categorization/__tests__/merchantDatabase.test.ts`):**

- Test all Dutch merchant patterns match correctly
- Test case insensitivity
- Test confidence scores
- Test no-match scenarios

**Rule Engine (`functions/src/categorization/__tests__/ruleEngine.test.ts`):**

- Test each match type (contains, exact, regex)
- Test priority ordering
- Test invalid regex handling
- Test empty rule set

**Categorizer (`functions/src/categorization/__tests__/categorizer.test.ts`):**

- Test categorization priority (user rules > merchant > learned)
- Test category slug resolution
- Test initialization

### Integration Tests

- Test full sync flow with categorization
- Test rule creation from manual categorization
- Test rule application on new transactions

### End-to-End (E2E) Tests

**CRITICAL: E2E tests verify the user-facing functionality works correctly.**

**Categorization Flow (`e2e/categorization.spec.ts`):**

- Verify transaction list shows category badges
- Verify category picker works
- Verify rule creation dialog appears after manual categorization
- Verify rules are applied to new transactions

### Edge Cases

- Transaction with no description
- Transaction matching multiple merchant patterns
- Regex rule with invalid syntax
- User with no categories set up
- Concurrent sync and manual categorization

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# Frontend
npm run typecheck
npm run lint
npm run format:check

# Backend
cd functions && npm run build
```

### Level 2: Unit Tests

```bash
# Frontend tests
npm run test

# Specific test files
npm run test src/hooks/__tests__/useRules.test.ts

# Backend tests (if configured)
cd functions && npm test
```

### Level 3: Build

```bash
npm run build
cd functions && npm run build
```

### Level 4: E2E Tests

**REQUIRED: Run E2E tests in a real browser to verify user-facing functionality**

```bash
# Terminal 1: Start Firebase emulators
npm run firebase:emulators

# Terminal 2: Run E2E tests
npm run e2e

# Or run specific test file:
npm run e2e e2e/categorization.spec.ts

# Or run in headed mode for debugging:
npm run e2e:headed
```

### Level 5: Manual Validation

1. **Raw Transaction Storage:**
   - Connect a bank account and sync
   - Check Firestore console for `rawBankTransactions` collection
   - Verify raw data matches Enable Banking API response
   - Verify `transactionId` links to processed transaction

2. **Auto-Categorization:**
   - Sync transactions from a bank with known merchants
   - Verify ALBERT HEIJN → Groceries, NS → Transport, etc.
   - Check `categorySource` shows 'merchant' for matched transactions
   - Verify `categoryConfidence` is set appropriately

3. **Rule Learning:**
   - Manually change a transaction's category
   - Verify rule creation dialog appears
   - Create a rule
   - Add a new transaction with similar description
   - Sync or verify rule would match (may need backend re-run)

---

## ACCEPTANCE CRITERIA

- [ ] Raw bank transactions are stored in `users/{userId}/rawBankTransactions/`
- [ ] Raw records are linked to processed transactions via `transactionId`
- [ ] Raw records contain complete Enable Banking API response
- [ ] Transactions are auto-categorized during bank sync
- [ ] Dutch merchant database correctly maps common merchants
- [ ] User-defined rules take priority over merchant database
- [ ] Learned rules are created when user manually categorizes
- [ ] Category confidence scores reflect match quality
- [ ] Category source correctly indicates 'rule', 'merchant', 'learned', or 'auto'
- [ ] All validation commands pass with zero errors
- [ ] E2E tests cover critical flows
- [ ] No regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] `functions/src/enableBanking/types.ts` updated with `RawBankTransactionRecord`
- [ ] `firestore.rules` updated for `rawBankTransactions` collection
- [ ] `functions/src/handlers/syncTransactions.ts` stores raw data
- [ ] `functions/src/categorization/types.ts` created
- [ ] `functions/src/categorization/merchantDatabase.ts` created with Dutch merchants
- [ ] `functions/src/categorization/ruleEngine.ts` created
- [ ] `functions/src/categorization/categorizer.ts` created
- [ ] `functions/src/categorization/index.ts` barrel export created
- [ ] `syncTransactions.ts` integrates categorizer
- [ ] `src/hooks/useRules.ts` created
- [ ] `src/components/transactions/CreateRuleDialog.tsx` created
- [ ] `src/pages/Transactions.tsx` offers rule creation on manual categorization
- [ ] Unit tests for merchant database pass
- [ ] Unit tests for rule engine pass
- [ ] E2E tests pass
- [ ] TypeScript strict mode passes
- [ ] Lint passes with no errors
- [ ] Manual testing completed

---

## NOTES

### Design Decisions

1. **Raw Storage Location**: Store in subcollection `rawBankTransactions` rather than embedding in transaction document to:
   - Keep processed transactions lightweight
   - Allow independent querying of raw data
   - Support future archival/cleanup policies

2. **Categorization Tiers**: User rules > Merchant DB > Learned rules because:
   - User explicit rules should always win
   - Merchant DB is highly accurate for known patterns
   - Learned rules may be less reliable (based on single correction)

3. **Category Slug Resolution**: Use flexible slug matching to handle user-created category names that may not exactly match our slugs.

4. **Batch Processing**: Process categorization during sync rather than as separate Cloud Function to reduce latency and complexity.

5. **Rule Learning is Optional**: Dialog offers "Skip" to avoid annoying users who make one-off corrections.

### Data Flow

```
Bank Sync Flow:
  Enable Banking API → Raw Transaction → Store in rawBankTransactions
                                      ↓
                    Transform to App Format
                                      ↓
                    Run through Categorizer
                    (Rules → Merchant DB → Learned)
                                      ↓
                    Store with categoryId, confidence, source

Rule Learning Flow:
  User changes category → Update transaction
                       ↓
                 Show "Create Rule?" dialog
                       ↓
                 User confirms pattern
                       ↓
                 Store rule in users/{userId}/rules/
                       ↓
                 Future syncs apply this rule
```

### Known Limitations

- Categorization only runs during bank sync, not on manual transaction entry
- No ML/AI categorization yet - only pattern matching
- Rule learning is per-user (no cross-user learning)
- Category slugs in merchant DB must be manually kept in sync with default categories

### Security Considerations

- Raw bank data is user-scoped (Firestore rules enforce)
- Cloud Functions write raw data using Admin SDK (bypasses client rules)
- Rules collection is user-writable (users manage their own rules)

### Future Enhancements

- Scheduled re-categorization job for uncategorized transactions
- ML-based categorization for unknown merchants
- Cross-user anonymous pattern learning
- Category suggestions based on similar users
- Raw data retention policy (auto-delete after X days)
