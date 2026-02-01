# Feature: Account Balance, Extended History, Advanced Filters & Re-categorize

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

This feature bundle implements several improvements to the Free Lunch app:

1. **Account Balance from Bank API**: Fetch and display the actual account balance(s) from the Enable Banking API rather than calculating from transactions. Show each account's balance explicitly on the dashboard and settings page.

2. **Extended Transaction History**: Increase the initial sync period from 90 days to the maximum supported by the bank (typically 1 year+). Only applicable during the first sync after authorization when full history is accessible.

3. **Advanced Transaction Filters**: Add more filter options beyond text search - filter by amount range, transaction direction (income/expense), reimbursement status, and categorization status.

4. **Re-categorize Button**: Add a "Re-run Auto-categorization" button that re-applies the categorization algorithm to all transactions that haven't been manually categorized. This eliminates the need to delete and re-sync data when improving categorization logic.

## User Story

As a Free Lunch user
I want to see my actual bank balance, filter transactions more precisely, and re-run categorization
So that I can have accurate account information, find specific transactions easily, and keep categorizations up to date as the algorithm improves

## Problem Statement

1. **Balance Issue**: Currently, there's no display of account balance. The Enable Banking API can provide the actual balance directly from the bank, which is more accurate than summing transactions.

2. **History Limitation**: The 90-day default for initial sync is conservative. Many banks provide 1+ years of history during the initial authorization window.

3. **Limited Filtering**: Users can only filter by search text, category, and date range. There's no way to filter by amount, direction (income vs expense), reimbursement status, or categorization status.

4. **Categorization Friction**: To test categorization improvements, users must delete all transactions and re-sync, losing manual categorizations and reimbursement data.

## Solution Statement

1. **Balance**: Add `getBalances()` call during sync, store balance per account in Firestore, and display on dashboard/settings.

2. **Extended History**: Change initial sync from 90 days to 365 days (or max supported). The API research shows 1+ years is typically available during initial auth.

3. **Filters**: Add filter options for:
   - Amount range (min/max)
   - Direction (income/expense/all)
   - Reimbursement status (none/pending/cleared)
   - Categorization status (auto/manual/uncategorized)

4. **Re-categorize**: Add a Cloud Function and UI button to re-apply categorization to transactions where `categorySource !== 'manual'`.

## Feature Metadata

**Feature Type**: Enhancement Bundle
**Estimated Complexity**: Medium
**Primary Systems Affected**:

- `functions/src/handlers/syncTransactions.ts` - Balance fetch, extended history
- `functions/src/enableBanking/client.ts` - Balance API types
- `functions/src/enableBanking/types.ts` - Balance response types
- `src/hooks/useTransactions.ts` - Extended filters
- `src/components/transactions/TransactionFilters.tsx` - Filter UI
- `src/components/dashboard/SummaryCards.tsx` - Balance display
- `src/components/settings/BankConnectionCard.tsx` - Balance display
- `src/pages/Settings.tsx` - Re-categorize button
  **Dependencies**: None (all internal)

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `functions/src/handlers/syncTransactions.ts` (lines 89-105) - **CRITICAL**: Date range calculation for sync, change from 90 to 365 days
- `functions/src/enableBanking/client.ts` (lines 74-76) - Existing `getBalances()` method stub
- `functions/src/enableBanking/types.ts` (lines 40-49) - AccountInfo interface, needs balance fields
- `functions/src/handlers/getBankStatus.ts` - Returns bank connection info, add balance data
- `src/hooks/useTransactions.ts` (lines 48-55) - TransactionFilters interface, add new filter fields
- `src/components/transactions/TransactionFilters.tsx` - Current filter UI implementation
- `src/components/dashboard/SummaryCards.tsx` - Summary display, add account balance
- `src/components/settings/BankConnectionCard.tsx` (lines 95-136) - Connection display, add balance
- `src/pages/Settings.tsx` (lines 151-172) - Danger zone section, add re-categorize near here
- `functions/src/categorization/categorizer.ts` - The Categorizer class used for re-categorization

### New Files to Create

- `functions/src/handlers/recategorizeTransactions.ts` - New Cloud Function for bulk re-categorization

### Relevant Documentation

- [Enable Banking Balances API](https://enablebanking.com/docs/api/reference/)
  - Endpoint: `GET /accounts/{id}/balances`
  - Returns multiple balance types (CLBD, ITAV, XPCD)
  - Why: Needed to understand balance response structure

- [Enable Banking Transaction History](https://enablebanking.com/docs/faq/)
  - Most banks provide 1+ years during initial auth
  - Why: Confirms we can extend from 90 to 365 days

### Patterns to Follow

**Filter Interface Pattern (from useTransactions.ts):**

```typescript
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string | null;
  searchText?: string;
  minAmount?: number;
  maxAmount?: number;
  // Add new fields following this pattern
}
```

**Cloud Function Pattern (from existing handlers):**

```typescript
export const functionName = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    // ... implementation
  }
);
```

**Select Component Pattern (from TransactionFilters.tsx):**

```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="All" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend - Balance Retrieval & Extended History

Add balance fetching to the sync process and extend history period.

**Tasks:**

1. Add Balance types to Enable Banking types
2. Call getBalances() during sync and store in Firestore
3. Update getBankStatus to return balance information
4. Change initial sync from 90 to 365 days

### Phase 2: Backend - Re-categorize Function

Create a Cloud Function to bulk re-categorize non-manual transactions.

**Tasks:**

1. Create recategorizeTransactions Cloud Function
2. Export from functions index
3. Add frontend function wrapper

### Phase 3: Frontend - Balance Display

Show account balances on dashboard and settings.

**Tasks:**

1. Update BankConnectionStatus type with balance
2. Display balance in BankConnectionCard
3. Add account balance card to Dashboard

### Phase 4: Frontend - Advanced Filters

Add new filter options to the transactions page.

**Tasks:**

1. Extend TransactionFilters interface
2. Add filter UI components
3. Implement client-side filtering logic

### Phase 5: Frontend - Re-categorize UI

Add the re-categorize button and flow.

**Tasks:**

1. Add re-categorize hook
2. Add UI button to Settings page
3. Add success/loading states

### Phase 6: Testing

Add tests for all new functionality.

**Tasks:**

1. Add E2E tests for filters
2. Add E2E test for re-categorize
3. Unit tests for filter logic

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: UPDATE `functions/src/enableBanking/types.ts` - Add Balance types

- **IMPLEMENT**: Add balance-related type definitions after the existing types:

```typescript
/**
 * Balance information from Enable Banking API
 */
export interface AccountBalance {
  balance_amount: {
    amount: string;
    currency: string;
  };
  balance_type: 'CLBD' | 'ITAV' | 'XPCD' | 'PRCD' | 'AVBL' | 'OTHR';
  credit_line_included?: boolean;
  reference_date?: string;
}

export interface BalanceResponse {
  balances: AccountBalance[];
}
```

- **PATTERN**: Follow existing type definition style in this file
- **VALIDATE**: `cd functions && npm run build`

---

### Task 2: UPDATE `functions/src/enableBanking/client.ts` - Type the getBalances method

- **IMPLEMENT**: Update the `getBalances` method (lines 74-76) with proper typing:

```typescript
async getBalances(accountId: string): Promise<BalanceResponse> {
  return this.request<BalanceResponse>('GET', `/accounts/${accountId}/balances`);
}
```

- **IMPORTS**: Add `BalanceResponse` to imports from `./types.js`
- **VALIDATE**: `cd functions && npm run build`

---

### Task 3: UPDATE `functions/src/handlers/syncTransactions.ts` - Extend history to 365 days

- **IMPLEMENT**: Update the date range calculation (lines 101-105) from 90 to 365 days:

Change:

```typescript
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
```

To:

```typescript
// Fetch up to 1 year of history on initial sync (banks typically support this during auth window)
const oneYearAgo = new Date();
oneYearAgo.setDate(oneYearAgo.getDate() - 365);
```

Also update the variable name `dateFrom` calculation accordingly.

- **GOTCHA**: Only first sync gets full history; subsequent syncs use lastSync date
- **VALIDATE**: `cd functions && npm run build`

---

### Task 4: UPDATE `functions/src/handlers/syncTransactions.ts` - Fetch and store balances

- **IMPLEMENT**: After fetching transactions for each account, also fetch balances. Add inside the `for (const account of accounts)` loop, after successful transaction sync but before the result push:

```typescript
// Fetch and store account balances
try {
  const balanceResponse = await client.getBalances(account.uid);

  // Find the most relevant balance (prefer CLBD = closing booked balance)
  const primaryBalance =
    balanceResponse.balances.find((b) => b.balance_type === 'CLBD') ||
    balanceResponse.balances.find((b) => b.balance_type === 'AVBL') ||
    balanceResponse.balances[0];

  if (primaryBalance) {
    // Update the account with balance info
    await connectionRef.update({
      [`accountBalances.${account.uid}`]: {
        amount: parseFloat(primaryBalance.balance_amount.amount),
        currency: primaryBalance.balance_amount.currency,
        type: primaryBalance.balance_type,
        referenceDate: primaryBalance.reference_date || new Date().toISOString().split('T')[0],
        updatedAt: FieldValue.serverTimestamp(),
      },
    });
  }
} catch (balanceErr) {
  console.warn(`Failed to fetch balance for account ${account.uid}:`, balanceErr);
  // Non-fatal - continue with sync
}
```

- **PATTERN**: Follow existing error handling pattern
- **GOTCHA**: Balance fetch failure should not fail the entire sync
- **VALIDATE**: `cd functions && npm run build`

---

### Task 5: UPDATE `functions/src/handlers/getBankStatus.ts` - Return balance in status

- **IMPLEMENT**: Update the return object to include account balances:

```typescript
return snapshot.docs.map((doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    bankName: data.bankName,
    status: data.status,
    accountCount: data.accounts?.length ?? 0,
    accounts:
      data.accounts?.map((acc: { uid: string; iban: string; name?: string }) => ({
        uid: acc.uid,
        iban: acc.iban,
        name: acc.name,
        balance: data.accountBalances?.[acc.uid] ?? null,
      })) ?? [],
    lastSync: data.lastSync instanceof Timestamp ? data.lastSync.toDate().toISOString() : null,
    consentExpiresAt:
      data.consentExpiresAt instanceof Timestamp
        ? data.consentExpiresAt.toDate().toISOString()
        : null,
  };
});
```

- **VALIDATE**: `cd functions && npm run build`

---

### Task 6: CREATE `functions/src/handlers/recategorizeTransactions.ts` - Re-categorization function

- **IMPLEMENT**: Create new file with the recategorization Cloud Function:

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { Categorizer } from '../categorization/index.js';

interface RecategorizeResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Firestore batch limit
const BATCH_SIZE = 500;

export const recategorizeTransactions = onCall(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 300, // 5 minutes for large datasets
  },
  async (request): Promise<RecategorizeResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // Initialize categorizer
    const categorizer = new Categorizer(userId);
    await categorizer.initialize();

    // Get all non-manually categorized transactions
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const snapshot = await transactionsRef.where('categorySource', '!=', 'manual').get();

    const result: RecategorizeResult = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Process in batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch: WriteBatch = db.batch();
      const batchDocs = docs.slice(i, i + BATCH_SIZE);
      let batchUpdates = 0;

      for (const doc of batchDocs) {
        result.processed++;

        try {
          const data = doc.data();
          const description = data.description || '';
          const counterparty = data.counterparty || null;

          // Re-run categorization
          const categorizationResult = categorizer.categorize(description, counterparty);

          // Only update if we found a category (don't un-categorize)
          if (
            categorizationResult.categoryId &&
            categorizationResult.categoryId !== data.categoryId
          ) {
            batch.update(doc.ref, {
              categoryId: categorizationResult.categoryId,
              categoryConfidence: categorizationResult.confidence,
              categorySource: categorizationResult.source,
              updatedAt: FieldValue.serverTimestamp(),
            });
            batchUpdates++;
            result.updated++;
          } else {
            result.skipped++;
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`Transaction ${doc.id}: ${error}`);
        }
      }

      // Only commit if there are updates
      if (batchUpdates > 0) {
        await batch.commit();
      }
    }

    return result;
  }
);
```

- **PATTERN**: Mirror `syncTransactions.ts` structure and error handling
- **VALIDATE**: `cd functions && npm run build`

---

### Task 7: UPDATE `functions/src/index.ts` - Export recategorize function

- **IMPLEMENT**: Add export for the new function:

```typescript
export { recategorizeTransactions } from './handlers/recategorizeTransactions.js';
```

- **VALIDATE**: `cd functions && npm run build`

---

### Task 8: UPDATE `src/lib/bankingFunctions.ts` - Add types and function wrappers

- **IMPLEMENT**: Update the BankConnectionStatus type and add recategorize function:

```typescript
export interface AccountInfo {
  uid: string;
  iban: string;
  name?: string;
  balance: {
    amount: number;
    currency: string;
    type: string;
    referenceDate: string;
    updatedAt: string;
  } | null;
}

export interface BankConnectionStatus {
  id: string;
  bankName: string;
  status: 'active' | 'expired' | 'error';
  accountCount: number;
  accounts: AccountInfo[];
  lastSync: string | null;
  consentExpiresAt: string | null;
}

export interface RecategorizeResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Add new function wrapper
export const recategorizeTransactions = httpsCallable<undefined, RecategorizeResult>(
  functions,
  'recategorizeTransactions'
);
```

- **VALIDATE**: `npm run typecheck`

---

### Task 9: UPDATE `src/hooks/useTransactions.ts` - Extend TransactionFilters

- **IMPLEMENT**: Add new filter fields to the TransactionFilters interface (around line 48):

```typescript
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string | null;
  searchText?: string;
  minAmount?: number;
  maxAmount?: number;
  // New filter fields
  direction?: 'income' | 'expense' | 'all';
  reimbursementStatus?: 'none' | 'pending' | 'cleared' | 'all';
  categorizationStatus?: 'auto' | 'manual' | 'uncategorized' | 'all';
}
```

- **IMPLEMENT**: Add client-side filtering logic in useTransactions (after line 145):

```typescript
// Client-side filtering for direction
if (filters.direction && filters.direction !== 'all') {
  transactions = transactions.filter((t) =>
    filters.direction === 'income' ? t.amount > 0 : t.amount < 0
  );
}

// Client-side filtering for reimbursement status
if (filters.reimbursementStatus && filters.reimbursementStatus !== 'all') {
  transactions = transactions.filter((t) => {
    switch (filters.reimbursementStatus) {
      case 'none':
        return !t.reimbursement;
      case 'pending':
        return t.reimbursement?.status === 'pending';
      case 'cleared':
        return t.reimbursement?.status === 'cleared';
      default:
        return true;
    }
  });
}

// Client-side filtering for categorization status
if (filters.categorizationStatus && filters.categorizationStatus !== 'all') {
  transactions = transactions.filter((t) => {
    switch (filters.categorizationStatus) {
      case 'manual':
        return t.categorySource === 'manual';
      case 'auto':
        return t.categorySource !== 'manual' && t.categorySource !== 'none' && t.categoryId;
      case 'uncategorized':
        return !t.categoryId || t.categorySource === 'none';
      default:
        return true;
    }
  });
}
```

- **VALIDATE**: `npm run typecheck`

---

### Task 10: UPDATE `src/components/transactions/TransactionFilters.tsx` - Add filter UI

- **IMPLEMENT**: Add new imports at top:

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
```

- **IMPLEMENT**: Add new filter dropdowns after the category filter (around line 124):

```tsx
{
  /* Direction filter */
}
<Select
  value={filters.direction ?? 'all'}
  onValueChange={(value: 'income' | 'expense' | 'all') => {
    const newFilters = { ...filters };
    if (value === 'all') {
      delete newFilters.direction;
    } else {
      newFilters.direction = value;
    }
    onChange(newFilters);
  }}
>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Direction" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
    <SelectItem value="income">
      <span className="flex items-center gap-1">
        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
        Income
      </span>
    </SelectItem>
    <SelectItem value="expense">
      <span className="flex items-center gap-1">
        <ArrowDownRight className="h-3 w-3 text-red-500" />
        Expense
      </span>
    </SelectItem>
  </SelectContent>
</Select>;

{
  /* Categorization status filter */
}
<Select
  value={filters.categorizationStatus ?? 'all'}
  onValueChange={(value: 'auto' | 'manual' | 'uncategorized' | 'all') => {
    const newFilters = { ...filters };
    if (value === 'all') {
      delete newFilters.categorizationStatus;
    } else {
      newFilters.categorizationStatus = value;
    }
    onChange(newFilters);
  }}
>
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Cat. Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Categories</SelectItem>
    <SelectItem value="manual">Manually Set</SelectItem>
    <SelectItem value="auto">Auto-categorized</SelectItem>
    <SelectItem value="uncategorized">Uncategorized</SelectItem>
  </SelectContent>
</Select>;

{
  /* Reimbursement filter */
}
<Select
  value={filters.reimbursementStatus ?? 'all'}
  onValueChange={(value: 'none' | 'pending' | 'cleared' | 'all') => {
    const newFilters = { ...filters };
    if (value === 'all') {
      delete newFilters.reimbursementStatus;
    } else {
      newFilters.reimbursementStatus = value;
    }
    onChange(newFilters);
  }}
>
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Reimbursement" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
    <SelectItem value="none">No Reimbursement</SelectItem>
    <SelectItem value="pending">Pending</SelectItem>
    <SelectItem value="cleared">Cleared</SelectItem>
  </SelectContent>
</Select>;
```

- **IMPLEMENT**: Update the `hasActiveFilters` check and `clearFilters` function to include new filters:

```typescript
const hasActiveFilters =
  !!filters.searchText ||
  !!filters.categoryId ||
  !!filters.direction ||
  !!filters.categorizationStatus ||
  !!filters.reimbursementStatus ||
  activePreset !== 'this-month';

const clearFilters = () => {
  setSearchValue('');
  setActivePreset('this-month');
  const now = new Date();
  onChange({
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
  });
};
```

- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 11: UPDATE `src/components/settings/BankConnectionCard.tsx` - Display account balances

- **IMPLEMENT**: Update the connection display (around lines 99-136) to show account balances:

```tsx
{
  connections.map((connection) => (
    <div key={connection.id} className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border p-3">
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
          onClick={() => {
            handleSync(connection.id);
          }}
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

      {/* Account balances */}
      {connection.accounts && connection.accounts.length > 0 && (
        <div className="ml-7 space-y-1">
          {connection.accounts.map((account) => (
            <div key={account.uid} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {account.name || `Account ${account.iban.slice(-4)}`}
              </span>
              {account.balance ? (
                <span className="font-medium tabular-nums">
                  {new Intl.NumberFormat('nl-NL', {
                    style: 'currency',
                    currency: account.balance.currency,
                  }).format(account.balance.amount)}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  ));
}
```

- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 12: UPDATE `src/hooks/useBankConnection.ts` - Add recategorize hook

- **IMPLEMENT**: Add the recategorize mutation hook after `useResetTransactionData`:

```typescript
import { recategorizeTransactions } from '@/lib/bankingFunctions';

/**
 * Re-run auto-categorization on all non-manually categorized transactions.
 */
export function useRecategorizeTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await recategorizeTransactions();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate transactions to reflect new categories
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

- **VALIDATE**: `npm run typecheck`

---

### Task 13: UPDATE `src/pages/Settings.tsx` - Add re-categorize button

- **IMPLEMENT**: Import the new hook:

```typescript
import { useResetTransactionData, useRecategorizeTransactions } from '@/hooks/useBankConnection';
```

- **IMPLEMENT**: Add state and mutation:

```typescript
const recategorizeMutation = useRecategorizeTransactions();
```

- **IMPLEMENT**: Add a new section before the Danger Zone (around line 140):

```tsx
{
  /* Re-categorization Section */
}
<Card>
  <CardHeader>
    <CardTitle>Auto-Categorization</CardTitle>
    <CardDescription>
      Re-run the auto-categorization algorithm on existing transactions
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          This will re-apply auto-categorization to all transactions that weren't manually
          categorized. Manually set categories will not be changed.
        </p>
        {recategorizeMutation.data && (
          <p className="text-sm text-emerald-600">
            Processed {recategorizeMutation.data.processed} transactions, updated{' '}
            {recategorizeMutation.data.updated}, skipped {recategorizeMutation.data.skipped}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        onClick={() => void recategorizeMutation.mutateAsync()}
        disabled={recategorizeMutation.isPending || transactions.length === 0}
      >
        {recategorizeMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {recategorizeMutation.isPending ? 'Re-categorizing...' : 'Re-categorize'}
      </Button>
    </div>
  </CardContent>
</Card>;
```

- **IMPORTS**: Add `RefreshCw` to lucide-react imports
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 14: UPDATE E2E tests - Add filter tests

- **IMPLEMENT**: Add new tests to `e2e/transactions.spec.ts`:

```typescript
test('should display direction filter dropdown', async ({ page }) => {
  await page.waitForTimeout(1000);
  // Look for the direction filter
  const directionFilter = page
    .getByRole('combobox')
    .filter({ hasText: /all|income|expense/i })
    .first();
  await expect(directionFilter).toBeVisible();
});

test('should filter transactions by income', async ({ page }) => {
  // Create an income transaction
  const uniqueDescription = `Income Filter Test ${Date.now()}`;
  await page.getByRole('button', { name: /add transaction/i }).click();
  await page.getByLabel(/description/i).fill(uniqueDescription);
  await page.getByLabel(/amount/i).fill('100');
  await page
    .getByRole('button', { name: /add transaction/i })
    .last()
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText(uniqueDescription)).toBeVisible({ timeout: 10000 });

  // Apply income filter - find the select by its current value
  const directionSelect = page.locator('[data-testid="direction-filter"]');
  if (await directionSelect.isVisible()) {
    await directionSelect.click();
    await page.getByRole('option', { name: /income/i }).click();

    // Income transaction should still be visible
    await expect(page.getByText(uniqueDescription)).toBeVisible();
  }
});

test('should display categorization status filter', async ({ page }) => {
  await page.waitForTimeout(1000);
  // Look for categorization status filter options
  const catStatusFilter = page
    .getByRole('combobox')
    .filter({ hasText: /all categories|manually set|auto-categorized|uncategorized/i })
    .first();
  await expect(catStatusFilter).toBeVisible();
});
```

- **VALIDATE**: `npm run e2e`

---

### Task 15: Add E2E test for re-categorize

- **IMPLEMENT**: Add to `e2e/categorization.spec.ts`:

```typescript
test('should display re-categorize button on settings page', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForTimeout(1000);

  // Look for the re-categorize section
  await expect(page.getByText(/auto-categorization/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /re-categorize/i })).toBeVisible();
});
```

- **VALIDATE**: `npm run e2e`

---

### Task 16: Rebuild and test Cloud Functions

- **IMPLEMENT**: Rebuild cloud functions:

```bash
cd functions && npm run build
```

- **VALIDATE**: `cd functions && npm run build` (no errors)

---

## TESTING STRATEGY

### Unit Tests

**Location:** `src/hooks/__tests__/useTransactions.test.ts`

Test the extended filter logic:

- Direction filter (income/expense/all)
- Reimbursement status filter
- Categorization status filter
- Combination of multiple filters

### Integration Tests

The existing hooks tests cover TanStack Query integration.

### End-to-End (E2E) Tests

**Location:** `e2e/transactions.spec.ts`, `e2e/categorization.spec.ts`

**Required E2E test scenarios:**

- Filter dropdowns are visible and functional
- Filtering by direction shows correct transactions
- Filtering by categorization status works
- Re-categorize button appears on settings
- Re-categorize shows results

### Edge Cases

1. Empty transactions list with filters applied
2. No balance data returned from API
3. Re-categorize on transactions that are already well-categorized (should skip)
4. Balance with different currencies
5. Accounts without balance info (older connections)

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# Frontend
npm run lint
npm run typecheck
npm run format:check

# Functions
cd functions && npm run build
```

### Level 2: Unit Tests

```bash
# Frontend tests
npm run test

# Functions tests
cd functions && npm test
```

### Level 3: Integration Tests

```bash
npm run test
```

### Level 4: E2E Tests

**REQUIRED: Run E2E tests in a real browser to verify user-facing functionality**

```bash
# Start Firebase emulators (REQUIRED for authenticated tests)
npm run firebase:emulators &
sleep 10  # Wait for emulators to start

# Run E2E tests
npm run e2e

# Or run in headed mode for debugging
npm run e2e:headed
```

### Level 5: Manual Validation

After deploying functions:

1. **Balance Display:**
   - [ ] Connect bank (or use existing connection)
   - [ ] Trigger sync from Settings
   - [ ] Verify balance appears under each account in Settings
   - [ ] Verify balance shows correct currency formatting

2. **Extended History:**
   - [ ] For a new connection, verify transactions go back ~1 year (not just 90 days)
   - [ ] Check the earliest transaction date

3. **Advanced Filters:**
   - [ ] Go to Transactions page
   - [ ] Apply Direction filter → verify only income/expense shows
   - [ ] Apply Categorization Status filter → verify filter works
   - [ ] Apply Reimbursement filter → verify filter works
   - [ ] Combine multiple filters → verify they work together
   - [ ] Clear filters → verify all transactions show

4. **Re-categorize:**
   - [ ] Go to Settings
   - [ ] Find the "Auto-Categorization" section
   - [ ] Click "Re-categorize" button
   - [ ] Verify success message with counts
   - [ ] Go to Transactions and verify some transactions were re-categorized

---

## ACCEPTANCE CRITERIA

- [ ] Account balances fetched from Enable Banking API during sync
- [ ] Account balances displayed per-account in Settings page
- [ ] Initial sync fetches up to 365 days of history (not 90)
- [ ] Direction filter (income/expense) works in Transactions
- [ ] Categorization status filter works in Transactions
- [ ] Reimbursement status filter works in Transactions
- [ ] Multiple filters can be combined
- [ ] Re-categorize button exists in Settings
- [ ] Re-categorize updates non-manual transactions
- [ ] Re-categorize shows success/stats after completion
- [ ] Manual categorizations are preserved during re-categorize
- [ ] All validation commands pass with zero errors
- [ ] No regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + E2E)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms all features work
- [ ] Acceptance criteria all met
- [ ] Functions rebuilt and ready for deployment

---

## NOTES

### Design Decisions

1. **Balance Type Priority**: We prefer CLBD (Closing Booked Balance) over AVBL (Available Balance) because it's the official account balance. AVBL may include credit lines.

2. **365 vs Unlimited History**: We use 365 days as a safe maximum. While some banks offer more, 1 year covers most use cases and avoids potential timeout issues with very large history requests.

3. **Client-side Filtering**: New filters are implemented client-side because Firestore doesn't support inequality filters on multiple fields. This is acceptable for personal finance apps with moderate transaction counts.

4. **Re-categorize Preserves Manual**: We explicitly skip transactions with `categorySource === 'manual'` to respect user corrections.

### API Rate Limits (Research Summary)

Per the Enable Banking research:

- **Background sync**: 4 calls per day per connection is typical ASPSP limit
- **User-initiated sync**: No practical limit when PSU headers indicate active session
- **Personal use**: These limits are per-connection, so individual users won't hit them unless syncing excessively

**Recommendation**: No special rate limiting needed. The current approach of user-triggered syncs + occasional automatic syncs is well within limits.

### Known Limitations

- Balance is fetched once per sync; it's not real-time
- If bank doesn't provide balance type we prefer, we fall back to first available
- Re-categorize is all-or-nothing; no way to re-categorize specific transactions
- Filter combinations are AND logic (no OR support)

### Future Improvements

- Add balance to Dashboard summary cards
- Add "refresh balance" independent of full sync
- Add date picker for custom date range filtering
- Add amount range inputs for min/max filtering
- Consider server-side filtering if transaction counts grow large
