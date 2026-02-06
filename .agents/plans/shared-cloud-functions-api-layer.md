# Feature: Shared Cloud Functions API Layer

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Move duplicated business logic from the web (React) and iOS (SwiftUI) thick clients into shared Cloud Functions. Currently both clients independently fetch raw Firestore data and compute dashboard aggregations, budget progress, reimbursement summaries, and default categories. This creates divergence risk (the two clients already differ: web creates 41 default categories, iOS creates 29), makes every business logic change a two-platform effort, and forces clients to transfer more data than necessary.

This plan moves the four highest-value computations server-side while keeping simple CRUD and transaction list queries direct-to-Firestore.

**What moves to Cloud Functions:**
1. Dashboard aggregations (summary, category spending, timeline, recent transactions)
2. Budget progress calculation (with parent category rollup and split handling)
3. Reimbursement summary (pending/cleared totals)
4. Default category creation on user registration

**What stays direct-to-Firestore:**
- Transaction list queries (date range + client-side filters for search/amounts/direction)
- All CRUD writes (create/update/delete transactions, categories, budgets)
- Category list fetch + tree building
- Real-time listeners (iOS) for simple collections
- Reimbursement mutations (mark, clear, unmark)

## User Story

As a developer maintaining both web and iOS clients
I want business logic computed in shared Cloud Functions
So that both platforms show identical numbers and new logic only needs to be written once

## Problem Statement

Both the React web app and SwiftUI iOS app independently implement identical business logic for dashboard aggregations, budget progress calculations, and reimbursement summaries. This duplication has already caused divergence (different default category counts), doubles the effort for every logic change, and requires each client to fetch raw transaction data and compute summaries locally.

## Solution Statement

Create 4 new Cloud Functions that encapsulate the duplicated business logic. Both clients call these functions instead of computing locally. The functions follow the existing `onCall` patterns established by `getBankStatus`, `syncTransactions`, etc. Client hooks/ViewModels are refactored to call the new functions via `httpsCallable` (web) or Firebase Functions SDK (iOS).

## Feature Metadata

**Feature Type**: Refactor
**Estimated Complexity**: High
**Primary Systems Affected**: Cloud Functions (`functions/src/`), Web hooks (`src/hooks/`), iOS ViewModels (`ios/FreeLunch/ViewModels/`), Web client functions (`src/lib/`)
**Dependencies**: No new external libraries required. Uses existing `firebase-functions`, `firebase-admin`.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

#### Cloud Functions (patterns to follow)
- `functions/src/index.ts` — Export pattern for all functions
- `functions/src/handlers/getBankStatus.ts` — Simple read-only onCall function pattern (auth check, Firestore read, transform, return)
- `functions/src/handlers/recategorizeTransactions.ts` — Complex onCall with batch processing, error collection
- `functions/src/handlers/syncTransactions.ts` — Most complex function, shows Timestamp handling, batch writes, transform patterns
- `functions/package.json` — Available dependencies (firebase-admin ^12, firebase-functions ^5, node 20)
- `functions/tsconfig.json` — Module: NodeNext, outDir: lib, requires .js extensions in imports

#### Web hooks (logic being replaced)
- `src/hooks/useDashboardData.ts` — Dashboard aggregation: `calculateSummary()`, `calculateCategorySpending()`, `calculateTimelineData()`. Returns `{ summary, categorySpending, timeline, recentTransactions }`
- `src/hooks/useBudgetProgress.ts` — Budget progress: `calculateSpendingByCategory()` with parent rollup + split handling, `useBudgetProgress()`, `useBudgetSuggestions()`
- `src/hooks/useReimbursements.ts` — Reimbursement queries: `usePendingReimbursements()`, `useClearedReimbursements()`, `calculateReimbursementSummary()`
- `src/contexts/AuthContext.tsx` (lines 108-436) — `createDefaultCategories()` with 41 hardcoded categories

#### Web client Cloud Function call pattern
- `src/lib/bankingFunctions.ts` — Shows how `httpsCallable<Input, Output>` wrappers are defined and typed. This is the pattern to extend.

#### Web UI consumers (data shapes must not change)
- `src/pages/Dashboard.tsx` — Consumes `DashboardData` from hook
- `src/components/dashboard/SummaryCards.tsx` — Expects `SpendingSummary`
- `src/components/dashboard/SpendingByCategoryChart.tsx` — Expects `CategorySpending[]`
- `src/components/dashboard/SpendingOverTimeChart.tsx` — Expects `TimelineData[]`
- `src/components/dashboard/RecentTransactions.tsx` — Expects `Transaction[]` + `Category[]`
- `src/components/dashboard/BudgetOverview.tsx` — Uses `useBudgetProgress()` internally
- `src/pages/Budgets.tsx` — Consumes `BudgetProgress[]`
- `src/pages/Reimbursements.tsx` — Consumes pending/cleared arrays + `ReimbursementSummaryData`
- `src/components/reimbursements/ReimbursementSummary.tsx` — Expects `ReimbursementSummaryData`

#### iOS files (logic being replaced)
- `ios/FreeLunch/ViewModels/DashboardViewModel.swift` — Dashboard aggregations (income/expense calc, category spending, daily/weekly grouping, budget alerts)
- `ios/FreeLunch/ViewModels/BudgetsViewModel.swift` — Budget progress with recursive child category rollup
- `ios/FreeLunch/Services/FirestoreService.swift` (lines 403-486) — Default category creation with 29 categories
- `ios/FreeLunch/Services/BankingService.swift` — Existing Cloud Function call pattern from iOS

#### Type definitions
- `src/types/index.ts` — All shared types: `SpendingSummary`, `CategorySpending`, `TimelineData`, `BudgetProgress`, `Transaction`, `Category`, `Budget`, `ReimbursementInfo`

### New Files to Create

#### Cloud Functions
- `functions/src/handlers/getDashboardData.ts` — Dashboard aggregation function
- `functions/src/handlers/getBudgetProgress.ts` — Budget progress function
- `functions/src/handlers/getReimbursementSummary.ts` — Reimbursement summary function
- `functions/src/handlers/createDefaultCategories.ts` — Default category creation function
- `functions/src/shared/aggregations.ts` — Shared computation logic (summary, category spending, timeline, spending-by-category with rollup)

#### Web
- No new files. Extend `src/lib/bankingFunctions.ts` with new function wrappers. Modify existing hooks.

#### iOS
- No new files. Modify existing ViewModels and BankingService.

### Patterns to Follow

**Cloud Function declaration** (from `getBankStatus.ts`):
```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export const functionName = onCall(
  { region: 'europe-west1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const userId = request.auth.uid;
    const db = getFirestore();
    // ... query and transform
  }
);
```

**Web function wrapper** (from `bankingFunctions.ts`):
```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const getDashboardData = httpsCallable<
  { startDate: string; endDate: string },
  DashboardDataResponse
>(functions, 'getDashboardData');
```

**Timestamp handling in Cloud Functions** (from `getBankStatus.ts`):
```typescript
// Reading:
data.lastSync instanceof Timestamp ? data.lastSync.toDate().toISOString() : null

// Writing:
FieldValue.serverTimestamp()
```

**Import convention in Cloud Functions** — always use `.js` extensions:
```typescript
import { calculateSummary } from '../shared/aggregations.js';
```

---

## IMPLEMENTATION PLAN

### Phase 1: Shared Aggregation Logic (Cloud Functions)

Create a shared module with the computation functions that both new Cloud Functions and (temporarily) existing client code can reference for logic parity. These are direct ports of the web's `useDashboardData.ts` and `useBudgetProgress.ts` logic.

### Phase 2: Cloud Functions — getDashboardData, getBudgetProgress, getReimbursementSummary

Three new `onCall` functions that authenticate the user, query Firestore, run shared aggregation logic, and return serialized results. Follows the `getBankStatus` pattern exactly.

### Phase 3: Cloud Function — createDefaultCategories

A callable function that creates the canonical set of default categories. Consolidates the 41 web categories as the source of truth (superset of iOS's 29). Both clients call this on registration instead of creating categories locally.

### Phase 4: Web Client Refactor

Replace the Firestore-querying logic in `useDashboardData`, `useBudgetProgress`, and reimbursement hooks with `httpsCallable` wrappers. Keep the same hook signatures and return types so UI components need zero changes.

### Phase 5: iOS Client Refactor

Replace the local aggregation logic in `DashboardViewModel`, `BudgetsViewModel`, and `FirestoreService.createDefaultCategories()` with Cloud Function calls via the existing `BankingService` pattern.

### Phase 6: Testing & Validation

Unit tests for shared aggregation logic. Integration tests for Cloud Functions. Verify web and iOS display identical data. E2E tests for dashboard, budgets, and reimbursements pages.

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `functions/src/shared/aggregations.ts`

Port the business logic from the web hooks into a shared module. This is the **single source of truth** for all aggregation computations.

- **IMPLEMENT**: Port these functions from `src/hooks/useDashboardData.ts`:
  - `calculateSummary(transactions)` → `SpendingSummaryResult`
  - `calculateCategorySpending(transactions, categories)` → `CategorySpendingResult[]`
  - `calculateTimelineData(transactions, startDate, endDate)` → `TimelineDataResult[]`
- **IMPLEMENT**: Port from `src/hooks/useBudgetProgress.ts`:
  - `calculateSpendingByCategory(transactions, categories)` → `Map<string, number>` (with parent rollup + split handling)
  - `calculateBudgetProgress(budgets, spendingMap, categories)` → `BudgetProgressResult[]`
- **IMPLEMENT**: Port from `src/hooks/useReimbursements.ts`:
  - `calculateReimbursementSummary(transactions)` → `ReimbursementSummaryResult` (compute from raw transactions, not pre-filtered arrays)
- **PATTERN**: Follow the exact same computation logic as the web hooks. Key edge cases to preserve:
  - Pending reimbursements excluded from income/expenses, tracked separately
  - Category spending only counts expenses (amount < 0)
  - Uncategorized transactions get categoryId `'uncategorized'`
  - Budget progress has parent category rollup (child spending counts toward parent)
  - Split transactions: each split counted toward its own category + parent
  - Timeline data creates entries for ALL days in range (zero-filled)
  - Budget status: `exceeded` if ≥100%, `warning` if ≥alertThreshold, else `safe`
- **FIX EXISTING BUG**: Dashboard `calculateCategorySpending` does NOT handle split transactions (it only uses the parent transaction's `categoryId`). The budget progress version DOES handle splits. Use the budget progress version's approach (handle splits) for the shared implementation — this fixes the inconsistency.
- **IMPORTS**: `firebase-admin/firestore` (Timestamp), `date-fns` (for eachDayOfInterval, format). Note: add `date-fns` to `functions/package.json` if not present.
- **GOTCHA**: All dates in Cloud Functions are server-side. Use `date-fns` for interval/formatting. Avoid timezone issues by working with UTC dates.
- **GOTCHA**: Firestore Admin SDK uses `Timestamp` from `firebase-admin/firestore`, not `firebase/firestore`.

**Types to define in this file:**

```typescript
// Input types (from Firestore documents)
interface TransactionDoc {
  date: Timestamp;
  amount: number;
  categoryId: string | null;
  isSplit: boolean;
  splits: Array<{ amount: number; categoryId: string; note: string | null }> | null;
  reimbursement: { type: string; status: string; note: string | null; linkedTransactionId: string | null; clearedAt: Timestamp | null } | null;
  description: string;
  counterparty: string | null;
  externalId: string | null;
  currency: string;
  categorySource: string;
  categoryConfidence: number;
  bankAccountId: string | null;
  importedAt: Timestamp;
  updatedAt: Timestamp;
}

interface CategoryDoc {
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  order: number;
  isSystem: boolean;
}

interface BudgetDoc {
  name: string;
  categoryId: string;
  monthlyLimit: number;
  alertThreshold: number;
  isActive: boolean;
}

// Output types (serialized for client consumption)
interface SpendingSummaryResult {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  pendingReimbursements: number;
  transactionCount: number;
}

interface CategorySpendingResult {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

interface TimelineDataResult {
  date: string;       // 'MMM d' format for display
  dateKey: string;    // 'yyyy-MM-dd' for programmatic use
  income: number;
  expenses: number;
}

interface BudgetProgressResult {
  budgetId: string;
  budgetName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  monthlyLimit: number;
  alertThreshold: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}

interface ReimbursementSummaryResult {
  pendingCount: number;
  pendingTotal: number;
  pendingWorkTotal: number;
  pendingPersonalTotal: number;
  clearedCount: number;
  clearedTotal: number;
}

// Serialized transaction for recentTransactions in dashboard response
interface TransactionResult {
  id: string;
  externalId: string | null;
  date: string;              // ISO string
  description: string;
  amount: number;
  currency: string;
  counterparty: string | null;
  categoryId: string | null;
  categorySource: string;
  categoryConfidence: number;
  isSplit: boolean;
  splits: Array<{ amount: number; categoryId: string; note: string | null }> | null;
  reimbursement: { type: string; status: string; note: string | null; linkedTransactionId: string | null; clearedAt: string | null } | null;
  bankAccountId: string | null;
  importedAt: string;        // ISO string
  updatedAt: string;         // ISO string
}
```

- **VALIDATE**: `cd functions && npx tsc --noEmit`

---

### Task 2: CREATE `functions/src/handlers/getDashboardData.ts`

- **IMPLEMENT**: `onCall` function accepting `{ startDate: string, endDate: string }`
- **PATTERN**: Follow `getBankStatus.ts` exactly: auth check → Firestore query → transform → return
- **LOGIC**:
  1. Parse `startDate`/`endDate` from ISO strings to Dates
  2. Query `users/{userId}/transactions` with `date >= startDate AND date <= endDate`, ordered by `date DESC`
  3. Query `users/{userId}/categories` ordered by `order`
  4. Call shared `calculateSummary()`, `calculateCategorySpending()`, `calculateTimelineData()`
  5. Take first 5 transactions as `recentTransactions` (serialized with ISO date strings)
  6. Return `{ summary, categorySpending, timeline, recentTransactions }`
- **IMPORTS**: `../shared/aggregations.js`
- **GOTCHA**: Serialize all Dates as ISO strings. Cloud Functions can't return Date objects to clients.
- **GOTCHA**: Input validation — throw `HttpsError('invalid-argument', ...)` if dates are missing or invalid.
- **VALIDATE**: `cd functions && npx tsc --noEmit`

---

### Task 3: CREATE `functions/src/handlers/getBudgetProgress.ts`

- **IMPLEMENT**: `onCall` function accepting `{ startDate?: string, endDate?: string }` (defaults to current month)
- **LOGIC**:
  1. Parse dates or default to start/end of current month
  2. Query `users/{userId}/transactions` for date range
  3. Query `users/{userId}/categories`
  4. Query `users/{userId}/budgets` (filter `isActive == true`)
  5. Call shared `calculateSpendingByCategory()` then `calculateBudgetProgress()`
  6. Return `BudgetProgressResult[]` sorted by percentage descending
- **ALSO IMPLEMENT**: Accept optional `{ suggestions: true }` flag. When true, also compute budget suggestions (3-month average spending). Query last 3 months of transactions, calculate spending by category, divide by 3, return as `Map<string, number>` serialized to `Record<string, number>`.
- **GOTCHA**: Budget suggestions query a different date range (3 months ago → end of last month). Make this a separate Firestore query within the same function.
- **VALIDATE**: `cd functions && npx tsc --noEmit`

---

### Task 4: CREATE `functions/src/handlers/getReimbursementSummary.ts`

- **IMPLEMENT**: `onCall` function accepting `{ clearedLimit?: number }` (default 10)
- **LOGIC**:
  1. Query `users/{userId}/transactions` ordered by `date DESC`
  2. Filter server-side:
     - Pending: `reimbursement.status === 'pending' && amount < 0`
     - Cleared: `reimbursement.status === 'cleared' && amount < 0` (limited to `clearedLimit`)
  3. Call shared `calculateReimbursementSummary()` on the full pending/cleared arrays
  4. Return `{ summary: ReimbursementSummaryResult, pendingTransactions: TransactionResult[], clearedTransactions: TransactionResult[] }`
- **GOTCHA**: Reimbursement hooks currently fetch the ENTIRE transaction collection 3 separate times. This function does it ONCE and filters server-side — significant performance improvement.
- **GOTCHA**: Serialize all Timestamps to ISO strings in the response.
- **VALIDATE**: `cd functions && npx tsc --noEmit`

---

### Task 5: CREATE `functions/src/handlers/createDefaultCategories.ts`

- **IMPLEMENT**: `onCall` function accepting no parameters
- **LOGIC**:
  1. Check if user already has categories (query `users/{userId}/categories` with limit 1)
  2. If categories exist, return `{ created: false, count: 0 }` (idempotent)
  3. If no categories, create the canonical 41 categories using batch writes
  4. Use the web's category list as the canonical source (from `AuthContext.tsx` lines 109-423). These include emoji icons.
  5. Return `{ created: true, count: 41 }`
- **PATTERN**: Use `WriteBatch` from `firebase-admin/firestore`. All 41 categories fit in one batch (limit is 500).
- **GOTCHA**: This must be idempotent. Calling it when categories already exist should be a no-op.
- **GOTCHA**: Include `createdAt` and `updatedAt` as `FieldValue.serverTimestamp()`.
- **VALIDATE**: `cd functions && npx tsc --noEmit`

---

### Task 6: UPDATE `functions/src/index.ts`

- **IMPLEMENT**: Add exports for the 4 new functions:
  ```typescript
  export { getDashboardData } from './handlers/getDashboardData.js';
  export { getBudgetProgress } from './handlers/getBudgetProgress.js';
  export { getReimbursementSummary } from './handlers/getReimbursementSummary.js';
  export { createDefaultCategories } from './handlers/createDefaultCategories.js';
  ```
- **VALIDATE**: `cd functions && npx tsc --noEmit`

---

### Task 7: UPDATE `functions/package.json` — add date-fns dependency

- **IMPLEMENT**: Add `"date-fns": "^4.1.0"` to dependencies (matches web app version)
- **VALIDATE**: `cd functions && npm install`

---

### Task 8: BUILD and test Cloud Functions compilation

- **VALIDATE**: `cd functions && npm run build` (or `npx tsc`)
- **VALIDATE**: Verify `functions/lib/` contains compiled JS for all new files

---

### Task 9: UPDATE `src/lib/bankingFunctions.ts` — add new function wrappers

- **IMPLEMENT**: Add typed `httpsCallable` wrappers for the 4 new functions. Follow the exact existing pattern:

```typescript
// Dashboard
export interface DashboardDataResponse {
  summary: SpendingSummary;
  categorySpending: CategorySpending[];
  timeline: Array<TimelineData & { dateKey: string }>;
  recentTransactions: SerializedTransaction[];
}

export const getDashboardData = httpsCallable<
  { startDate: string; endDate: string },
  DashboardDataResponse
>(functions, 'getDashboardData');

// Budget Progress
export interface BudgetProgressResponse {
  budgetProgress: BudgetProgressResult[];
  suggestions?: Record<string, number>;
}

export const getBudgetProgress = httpsCallable<
  { startDate?: string; endDate?: string; suggestions?: boolean },
  BudgetProgressResponse
>(functions, 'getBudgetProgress');

// Reimbursement Summary
export interface ReimbursementSummaryResponse {
  summary: ReimbursementSummaryData;
  pendingTransactions: SerializedTransaction[];
  clearedTransactions: SerializedTransaction[];
}

export const getReimbursementSummary = httpsCallable<
  { clearedLimit?: number },
  ReimbursementSummaryResponse
>(functions, 'getReimbursementSummary');

// Default Categories
export const createDefaultCategories = httpsCallable<
  undefined,
  { created: boolean; count: number }
>(functions, 'createDefaultCategories');
```

- **ALSO IMPLEMENT**: Add a `SerializedTransaction` interface that mirrors `Transaction` but with `string` dates instead of `Date`. Add a helper `deserializeTransaction(t: SerializedTransaction): Transaction` that converts ISO strings back to Date objects.
- **IMPORTS**: Import types from `@/types` as needed
- **VALIDATE**: `npm run typecheck`

---

### Task 10: UPDATE `src/hooks/useDashboardData.ts` — call Cloud Function

- **IMPLEMENT**: Replace the Firestore query with a call to `getDashboardData`:
  ```typescript
  import { getDashboardData as getDashboardDataFn } from '@/lib/bankingFunctions';

  export function useDashboardData(dateRange: DashboardDateRange) {
    const { user } = useAuth();

    return useQuery({
      queryKey: dashboardKeys.dateRange(user?.id ?? '', ...),
      queryFn: async (): Promise<DashboardData> => {
        const result = await getDashboardDataFn({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        });
        // Deserialize dates in recentTransactions
        return {
          ...result.data,
          recentTransactions: result.data.recentTransactions.map(deserializeTransaction),
        };
      },
      enabled: !!user?.id,
    });
  }
  ```
- **REMOVE**: The `transformTransaction`, `calculateSummary`, `calculateCategorySpending`, `calculateTimelineData` functions. They are no longer needed.
- **REMOVE**: Firestore imports (`collection`, `query`, `where`, `orderBy`, `getDocs`, `Timestamp`), `date-fns` imports, `useCategories` import.
- **KEEP**: The `DashboardData` interface, `DashboardDateRange` interface, and `dashboardKeys` query key factory.
- **GOTCHA**: The hook no longer needs to depend on `categoriesLoaded` since the Cloud Function handles category lookup. Simplify the query key accordingly.
- **GOTCHA**: `BudgetOverview` component calls `useBudgetProgress()` internally — it's not affected by this change.
- **VALIDATE**: `npm run typecheck`

---

### Task 11: UPDATE `src/hooks/useBudgetProgress.ts` — call Cloud Function

- **IMPLEMENT**: Replace Firestore queries with `getBudgetProgress`:
  ```typescript
  export function useBudgetProgress(dateRange?: { startDate: Date; endDate: Date }) {
    const { user } = useAuth();

    return useQuery({
      queryKey: budgetProgressKeys.current(user?.id ?? ''),
      queryFn: async () => {
        const result = await getBudgetProgressFn({
          startDate: dateRange?.startDate.toISOString(),
          endDate: dateRange?.endDate.toISOString(),
        });
        return result.data.budgetProgress;
      },
      enabled: !!user?.id,
    });
  }

  export function useBudgetSuggestions() {
    const { user } = useAuth();

    return useQuery({
      queryKey: budgetProgressKeys.suggestions(user?.id ?? ''),
      queryFn: async () => {
        const result = await getBudgetProgressFn({ suggestions: true });
        return new Map(Object.entries(result.data.suggestions ?? {}));
      },
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 30,
    });
  }
  ```
- **REMOVE**: `calculateSpendingByCategory`, `TransactionDocument` interface, all Firestore imports, `useBudgets`/`useCategories` imports.
- **KEEP**: `budgetProgressKeys`, return type as `BudgetProgress[]`.
- **GOTCHA**: The return shape must stay `{ data: BudgetProgress[], isLoading }`. The `BudgetProgress` type in `src/types/index.ts` includes a full `Budget` object. The Cloud Function response uses `BudgetProgressResult` which flattens this. You'll need to either: (a) adapt the UI components to accept the flattened shape, or (b) reconstruct the `Budget` object in the hook. Option (a) is cleaner — `BudgetCard` only uses `budget.monthlyLimit`, `budget.alertThreshold`, and `budget.id`, all of which are in the flat response.
- **DECISION**: Update `BudgetProgress` type in `src/types/index.ts` to match the flat response, OR create a mapping in the hook. Recommend updating the type since it simplifies everything.
- **VALIDATE**: `npm run typecheck`

---

### Task 12: UPDATE `src/hooks/useReimbursements.ts` — call Cloud Function for summary

- **IMPLEMENT**: Replace `usePendingReimbursements` and `useClearedReimbursements` to call `getReimbursementSummary`:
  ```typescript
  function useReimbursementData(clearedLimit?: number) {
    const { user } = useAuth();

    return useQuery({
      queryKey: ['reimbursements', 'all', user?.id, clearedLimit],
      queryFn: async () => {
        const result = await getReimbursementSummaryFn({ clearedLimit });
        return {
          summary: result.data.summary,
          pending: result.data.pendingTransactions.map(deserializeTransaction),
          cleared: result.data.clearedTransactions.map(deserializeTransaction),
        };
      },
      enabled: !!user?.id,
    });
  }
  ```
- **REFACTOR**: `usePendingReimbursements` and `useClearedReimbursements` can become thin wrappers around the shared query, or the Reimbursements page can call `useReimbursementData` directly.
- **KEEP**: All mutation hooks (`useMarkAsReimbursable`, `useClearReimbursement`, `useUnmarkReimbursement`) stay as direct Firestore writes. These are simple CRUD operations.
- **KEEP**: `useRecentIncomeTransactions` stays as a direct Firestore query — it's an interactive search used in the clearing dialog.
- **REMOVE**: `calculateReimbursementSummary` function (moved server-side).
- **REMOVE**: The 3 separate full-collection Firestore queries (replaced by 1 Cloud Function call).
- **VALIDATE**: `npm run typecheck`

---

### Task 13: UPDATE `src/contexts/AuthContext.tsx` — call Cloud Function for default categories

- **IMPLEMENT**: Replace the inline `createDefaultCategories()` with a Cloud Function call:
  ```typescript
  import { createDefaultCategories as createDefaultCategoriesFn } from '@/lib/bankingFunctions';

  // In fetchOrCreateUser, after creating user document:
  await createDefaultCategoriesFn();
  ```
- **REMOVE**: The entire `createDefaultCategories` function (lines 108-436) and the 41 hardcoded category objects.
- **GOTCHA**: The Cloud Function is idempotent (checks if categories exist first), so it's safe to call on every `fetchOrCreateUser` if needed, or only on document creation.
- **VALIDATE**: `npm run typecheck`

---

### Task 14: UPDATE iOS `BankingService.swift` — add new function wrappers

- **IMPLEMENT**: Add function call methods following the existing pattern (see `syncTransactions` implementation):
  ```swift
  func getDashboardData(startDate: Date, endDate: Date) async throws -> DashboardDataResponse { ... }
  func getBudgetProgress(startDate: Date?, endDate: Date?, suggestions: Bool = false) async throws -> BudgetProgressResponse { ... }
  func getReimbursementSummary(clearedLimit: Int = 10) async throws -> ReimbursementSummaryResponse { ... }
  func createDefaultCategories() async throws -> DefaultCategoriesResponse { ... }
  ```
- **PATTERN**: Use `Functions.functions(app: app, region: "europe-west1").httpsCallable("functionName")`
- **IMPLEMENT**: Add corresponding response model structs matching the Cloud Function response shapes
- **VALIDATE**: Xcode build succeeds

---

### Task 15: UPDATE iOS `DashboardViewModel.swift` — call Cloud Function

- **IMPLEMENT**: Replace local aggregation logic with `BankingService.shared.getDashboardData(startDate:endDate:)`
- **REMOVE**: Local `totalIncome`, `totalExpenses`, `netBalance`, `pendingReimbursements` computed properties that iterate transactions
- **REMOVE**: Local `spendingByCategory` grouping logic
- **REMOVE**: Local `dailySpending` and `weeklySpending` computation
- **KEEP**: Listeners for `bankConnections` (used for connection alerts, not aggregations)
- **KEEP**: Budget alert display (now comes from getBudgetProgress)
- **VALIDATE**: Xcode build succeeds

---

### Task 16: UPDATE iOS `BudgetsViewModel.swift` — call Cloud Function

- **IMPLEMENT**: Replace local `calculateSpending(for:)` and `getAllCategoryIds(for:)` with `BankingService.shared.getBudgetProgress()`
- **REMOVE**: Local spending calculation, recursive category child lookup
- **KEEP**: CRUD operations for budgets (direct Firestore)
- **VALIDATE**: Xcode build succeeds

---

### Task 17: UPDATE iOS `FirestoreService.swift` — remove local default category creation

- **IMPLEMENT**: Replace `createDefaultCategories()` with a call to `BankingService.shared.createDefaultCategories()`
- **REMOVE**: The hardcoded 29 category array
- **VALIDATE**: Xcode build succeeds

---

### Task 18: WRITE unit tests for `functions/src/shared/aggregations.ts`

- **CREATE**: `functions/src/shared/__tests__/aggregations.test.ts`
- **TEST**: `calculateSummary` — income only, expenses only, mixed, with pending reimbursements, empty array
- **TEST**: `calculateCategorySpending` — regular transactions, split transactions (verify each split counted + parent rollup), pending reimbursements excluded, uncategorized transactions, empty
- **TEST**: `calculateTimelineData` — single day, full month, transactions on some days only (verify zero-fill), pending reimbursements excluded
- **TEST**: `calculateSpendingByCategory` — parent rollup, splits with parent rollup, missing categories
- **TEST**: `calculateBudgetProgress` — safe/warning/exceeded status, inactive budgets filtered, missing categories default
- **TEST**: `calculateReimbursementSummary` — work/personal breakdown, empty arrays, mixed
- **PATTERN**: Follow existing test pattern in `functions/src/categorization/__tests__/merchantDatabase.test.ts`
- **VALIDATE**: `cd functions && npx vitest run` or `npm test`

---

### Task 19: UPDATE web E2E tests

- **UPDATE**: `e2e/dashboard.spec.ts` — verify dashboard loads correctly (summary cards, charts, recent transactions)
- **UPDATE**: `e2e/budgets.spec.ts` — verify budget progress displays correctly
- **UPDATE**: `e2e/reimbursements.spec.ts` — verify reimbursement summary shows correct totals
- **GOTCHA**: E2E tests run against Firebase emulators. Cloud Functions must be deployed to emulators for these tests to work. Ensure `firebase.json` emulators config includes functions.
- **VALIDATE**: `npm run e2e`

---

## TESTING STRATEGY

### Unit Tests

**Target**: `functions/src/shared/__tests__/aggregations.test.ts`

Test all shared aggregation functions with mock Firestore documents. Focus on:
- Edge cases: empty arrays, zero amounts, null categories
- Business rules: pending reimbursement exclusion, parent rollup, split handling
- Data consistency: same inputs produce same outputs as the current web implementation

### Integration Tests

**Target**: Cloud Functions with Firebase emulators

Test each Cloud Function end-to-end:
1. Seed Firestore with test data via emulator
2. Call function with test parameters
3. Verify response matches expected aggregations

### End-to-End (E2E) Tests

**CRITICAL: E2E tests are REQUIRED for all user-facing features.**

**Existing tests to verify still pass:**
- `e2e/dashboard.spec.ts` — Dashboard loads, summary cards show correct numbers
- `e2e/budgets.spec.ts` — Budget progress bars, exceeded/warning indicators
- `e2e/reimbursements.spec.ts` — Pending/cleared counts, summary totals

**E2E Testing Requirements:**
- Tests must pass with Firebase emulators running (functions + firestore + auth)
- Verify numbers match between dashboard and transaction totals
- Test empty state (new user with no transactions)
- Test with pending reimbursements (verify exclusion from totals)

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
npm run lint
npm run format:check
cd functions && npx tsc --noEmit
```

### Level 2: Unit Tests

```bash
npm run test
cd functions && npm test
```

### Level 3: Type Checking

```bash
npm run typecheck
```

### Level 4: Cloud Functions Build

```bash
cd functions && npm run build
```

### Level 5: E2E Tests

```bash
# Start Firebase emulators (REQUIRED for authenticated tests)
npm run firebase:emulators &
sleep 10

# Run E2E tests
npm run e2e
```

### Level 6: Manual Validation

1. Start dev server + emulators: `npm run dev` and `npm run firebase:emulators`
2. Register a new user → verify 41 default categories created
3. Navigate to Dashboard → verify summary cards, charts, recent transactions load
4. Navigate to Budgets → verify budget progress shows correct spent amounts
5. Navigate to Reimbursements → verify pending/cleared counts and totals
6. Mark a transaction as reimbursable → verify dashboard excludes it from totals
7. Compare numbers between Dashboard and Transactions page filters → should match

---

## ACCEPTANCE CRITERIA

- [ ] 4 new Cloud Functions deployed and callable from both web and iOS
- [ ] Dashboard aggregations computed server-side (summary, category spending, timeline)
- [ ] Budget progress with parent rollup computed server-side
- [ ] Reimbursement summary computed server-side (single query instead of 3)
- [ ] Default category creation is a single shared Cloud Function
- [ ] Web UI shows identical data as before (no visual changes)
- [ ] iOS app shows identical data as before (no visual changes)
- [ ] Split transactions handled consistently in category spending (fixes existing dashboard bug)
- [ ] All validation commands pass with zero errors
- [ ] Unit tests cover shared aggregation logic
- [ ] E2E tests pass for dashboard, budgets, and reimbursements

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (1-19)
- [ ] Each task validation passed
- [ ] `npm run typecheck` passes
- [ ] `cd functions && npm run build` succeeds
- [ ] `npm run test` passes
- [ ] `npm run e2e` passes
- [ ] Manual testing confirms feature works on web
- [ ] iOS builds successfully
- [ ] Acceptance criteria all met

---

## NOTES

### Design Decisions

1. **Flat response for BudgetProgress**: The Cloud Function returns a flat `BudgetProgressResult` instead of nesting a full `Budget` object. This is cleaner for serialization and the UI only needs a few budget fields. The `BudgetProgress` TypeScript type will need a minor update.

2. **Timeline data includes `dateKey`**: The web chart only uses the formatted `date` string ("Jan 15"), but having the raw `yyyy-MM-dd` key enables the "click date to filter transactions" feature without re-parsing display strings.

3. **Reimbursement summary returns transactions too**: The Reimbursements page needs both the summary AND the transaction lists. Rather than making 2 calls, one function returns everything. The summary is computed from the full filtered arrays before limiting.

4. **date-fns added to Cloud Functions**: The web app uses date-fns v4.1.0. Adding the same version to Cloud Functions ensures date formatting consistency (e.g., "MMM d" produces the same output).

5. **Canonical 41 categories**: The web's category list is the superset and becomes the single source of truth. The iOS-specific SF Symbols are dropped in favor of emoji (which both platforms can render). If iOS needs SF Symbol mapping later, it can be done client-side from the emoji.

### Migration Notes

- The Cloud Functions return ISO string dates, not Firestore Timestamps or JavaScript Dates. Clients must parse these back to their native date types.
- Query key structures change slightly (no longer include `categoriesLoaded` for dashboard). Existing cached data will naturally expire.
- Reimbursement mutation hooks still invalidate `['reimbursements']` and `['dashboard']` query keys, which triggers refetch of the Cloud Function data — this is correct.

### Risk Assessment

- **Cold start latency**: First call after idle may take 1-3s. Mitigated by loading skeletons already in place on all pages.
- **Data staleness during mutations**: After a mutation (e.g., categorize transaction), the dashboard query is invalidated and refetched from the Cloud Function. There's a brief moment where the UI shows stale data. This is the same behavior as today with TanStack Query.
- **Firestore index requirements**: The Cloud Functions use the same queries as the current client code (date range + orderBy), so existing composite indexes are sufficient.

### Confidence Score: 8/10

High confidence due to:
- Well-established Cloud Function patterns to follow
- Business logic is well-understood and documented
- No new external dependencies or complex integrations
- UI components need zero changes (only hook internals change)

Risks:
- BudgetProgress type change might require minor UI component updates
- iOS refactor is less thoroughly validated (no automated iOS tests in CI)
- Cold start timing may need min-instances tuning after deployment
