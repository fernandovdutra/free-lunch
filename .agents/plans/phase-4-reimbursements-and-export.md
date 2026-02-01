# Feature: Phase 4 - Reimbursement Workflow & Data Export

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Complete the reimbursement tracking workflow and data export functionality for Free Lunch. This enables users to:

1. Mark expenses as reimbursable (work expenses or personal IOUs)
2. Clear/match reimbursements when money is received back
3. View pending and cleared reimbursements on a dedicated page
4. Export transaction data to CSV and JSON formats

The dashboard already handles pending reimbursement exclusions correctly (verified in `useDashboardData.ts`). This phase focuses on the user-facing workflows.

## User Story

As a Free Lunch user
I want to track expenses that will be reimbursed (work or personal)
So that they don't distort my personal spending view

As a Free Lunch user
I want to export my transaction data
So that I own my data and can use it elsewhere

## Problem Statement

Currently, the Reimbursements page is a placeholder with no functionality. Users cannot:

- Mark transactions as reimbursable
- Clear reimbursements when money comes back
- See a list of pending/cleared reimbursements
- Export their data

The Settings page has placeholder export buttons that don't work.

## Solution Statement

Implement the complete reimbursement workflow:

1. Add "Mark as Reimbursable" action to transactions
2. Add "Contains Reimbursement" action to income transactions
3. Build out the Reimbursements page with pending/cleared lists
4. Implement data export (CSV/JSON) in Settings

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**:

- `src/pages/Reimbursements.tsx` - Complete reimbursement page
- `src/pages/Transactions.tsx` - Add reimbursement actions
- `src/pages/Settings.tsx` - Add working export
- `src/hooks/useTransactions.ts` - Add reimbursement mutations
- `src/components/transactions/TransactionRow.tsx` - Add reimbursement UI
- New components for reimbursement dialogs and lists

**Dependencies**:

- Existing transaction CRUD (already implemented)
- Existing types for `ReimbursementInfo` (already defined in `src/types/index.ts`)
- date-fns for date formatting

---

## CONTEXT REFERENCES

### Relevant Codebase Files - MUST READ BEFORE IMPLEMENTING

**Core Types & Data Model:**

- `src/types/index.ts` (lines 78-99) - `ReimbursementInfo` type definition with `type`, `status`, `note`, `linkedTransactionId`, `clearedAt`
- `src/types/index.ts` (lines 60-85) - Full `Transaction` type with `reimbursement` field

**Existing Transaction Patterns:**

- `src/hooks/useTransactions.ts` (full file) - Transaction CRUD hooks pattern, especially `useUpdateTransaction` (lines 171-203)
- `src/hooks/useDashboardData.ts` (lines 130-152) - `calculateSummary` already handles pending reimbursements correctly
- `src/components/transactions/TransactionRow.tsx` (full file) - Transaction row UI with category picker pattern

**Page Patterns:**

- `src/pages/Transactions.tsx` (full file) - Page structure, dialog patterns, mutation handling
- `src/pages/Settings.tsx` (lines 47-61) - Placeholder export buttons to replace
- `src/pages/Reimbursements.tsx` (full file) - Current placeholder to replace

**Dialog Component Pattern:**

- `src/components/transactions/TransactionForm.tsx` - Dialog with form pattern
- `src/components/ui/dialog.tsx` - shadcn/ui Dialog components

**Utility Functions:**

- `src/lib/utils.ts` (full file) - `formatAmount`, `formatDate`, `getAmountColor` utilities
- `src/lib/firebase.ts` - Firebase/Firestore initialization

**E2E Test Pattern:**

- `e2e/transactions.spec.ts` (full file) - Test structure, auth fixture usage, dialog testing
- `e2e/fixtures/auth.ts` - Auth helper functions

**Design System:**

- `.claude/reference/free-lunch-design-system.md` (lines 103-119) - Semantic colors including amber for pending reimbursements

### New Files to Create

**Reimbursement Components:**

- `src/components/reimbursements/MarkReimbursableDialog.tsx` - Dialog to mark expense as reimbursable
- `src/components/reimbursements/ClearReimbursementDialog.tsx` - Dialog to match incoming transfer with pending expenses
- `src/components/reimbursements/PendingReimbursementList.tsx` - List of pending reimbursements
- `src/components/reimbursements/ClearedReimbursementList.tsx` - List of cleared reimbursements
- `src/components/reimbursements/ReimbursementSummary.tsx` - Summary stats card
- `src/components/reimbursements/index.ts` - Barrel export

**Export Utilities:**

- `src/lib/export.ts` - CSV and JSON export functions

**Hooks:**

- `src/hooks/useReimbursements.ts` - Reimbursement-specific queries and mutations

**Tests:**

- `src/hooks/__tests__/useReimbursements.test.ts` - Unit tests for reimbursement logic
- `src/lib/__tests__/export.test.ts` - Unit tests for export functions
- `e2e/reimbursements.spec.ts` - E2E tests for reimbursement workflow

### Relevant Documentation

- [PRD - Reimbursement Tracking](PRD.md#75-reimbursement-tracking) - Full workflow specification
- [PRD - Data Export](PRD.md#78-data-export) - Export requirements
- [Design System - Semantic Colors](/.claude/reference/free-lunch-design-system.md#semantic-colors) - Amber for pending items

### Patterns to Follow

**Mutation Pattern (from useTransactions.ts):**

```typescript
export function useMarkAsReimbursable() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reimbursement }: { id: string; reimbursement: ReimbursementInfo }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const transactionRef = doc(db, 'users', user.id, 'transactions', id);
      await updateDoc(transactionRef, {
        reimbursement,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

**Dialog Pattern (from TransactionForm.tsx):**

```typescript
interface MarkReimbursableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSubmit: (data: ReimbursementFormData) => Promise<void>;
  isSubmitting: boolean;
}
```

**Amount Color Pattern (from utils.ts):**

```typescript
// Use getAmountColor(amount, isPending) for reimbursement amounts
// isPending=true returns 'text-amber-500'
```

**E2E Test Pattern:**

```typescript
test.describe('Reimbursements Page', () => {
  test.describe.configure({ mode: 'serial' });
  // Use auth fixture pattern from transactions.spec.ts
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Reimbursement Hooks & Mutations

Add reimbursement-specific hooks for marking, clearing, and querying reimbursements.

**Tasks:**

- Create `useReimbursements.ts` hook with mutations
- Add `useMarkAsReimbursable` mutation
- Add `useClearReimbursement` mutation
- Add `usePendingReimbursements` query
- Add `useClearedReimbursements` query

### Phase 2: Reimbursement UI Components

Build the dialog components for marking and clearing reimbursements.

**Tasks:**

- Create `MarkReimbursableDialog` component
- Create `ClearReimbursementDialog` component
- Create `PendingReimbursementList` component
- Create `ClearedReimbursementList` component
- Create `ReimbursementSummary` component

### Phase 3: Transaction Page Integration

Add reimbursement actions to the transaction list.

**Tasks:**

- Update `TransactionRow` with "Mark as Reimbursable" action
- Add visual indicator for reimbursable transactions
- Add "Contains Reimbursement" action for income
- Integrate dialogs into Transactions page

### Phase 4: Reimbursements Page

Build out the complete Reimbursements page.

**Tasks:**

- Replace placeholder with real implementation
- Add pending reimbursements section
- Add summary statistics
- Add cleared reimbursements section
- Add ability to unmark/edit reimbursements

### Phase 5: Data Export

Implement CSV and JSON export functionality.

**Tasks:**

- Create export utility functions
- Implement CSV export with proper formatting
- Implement JSON export with full data
- Wire up export buttons in Settings
- Add date range selector for export

### Phase 6: Testing

Write comprehensive tests for all new functionality.

**Tasks:**

- Unit tests for reimbursement hooks
- Unit tests for export utilities
- E2E tests for reimbursement workflow
- E2E tests for export functionality

---

## STEP-BY-STEP TASKS

### PHASE 1: REIMBURSEMENT HOOKS & MUTATIONS

#### Task 1.1: CREATE `src/hooks/useReimbursements.ts`

- **IMPLEMENT**: Hook for reimbursement queries and mutations
- **PATTERN**: Mirror `src/hooks/useTransactions.ts` structure
- **IMPORTS**:
  - `@tanstack/react-query` - useQuery, useMutation, useQueryClient
  - `firebase/firestore` - collection, query, where, getDocs, updateDoc, etc.
  - `@/lib/firebase` - db
  - `@/contexts/AuthContext` - useAuth
  - `@/types` - Transaction, ReimbursementInfo
- **GOTCHA**: Filter for `reimbursement.status === 'pending'` on Firestore query
- **VALIDATE**: `npm run typecheck && npm run lint`

```typescript
// Key functions to implement:
export function usePendingReimbursements();
export function useClearedReimbursements(options?: { limit?: number });
export function useMarkAsReimbursable();
export function useClearReimbursement();
export function useUnmarkReimbursement();
```

#### Task 1.2: ADD reimbursement filter to useTransactions

- **UPDATE**: `src/hooks/useTransactions.ts`
- **IMPLEMENT**: Add `reimbursementStatus` filter option to `TransactionFilters`
- **PATTERN**: Mirror existing `categoryId` filter
- **VALIDATE**: `npm run typecheck`

---

### PHASE 2: REIMBURSEMENT UI COMPONENTS

#### Task 2.1: CREATE `src/components/reimbursements/MarkReimbursableDialog.tsx`

- **IMPLEMENT**: Dialog for marking an expense as reimbursable
- **PATTERN**: Follow `src/components/transactions/TransactionForm.tsx` dialog pattern
- **IMPORTS**:
  - `@/components/ui/dialog`, `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/label`
  - `@/components/ui/select` for type selection
  - `@/types` - Transaction, ReimbursementInfo
- **UI ELEMENTS**:
  - Transaction display (description, amount, date)
  - Type selector: "Work Expense" or "Paid for Someone"
  - Optional note field
  - Cancel and Submit buttons
- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 2.2: CREATE `src/components/reimbursements/ClearReimbursementDialog.tsx`

- **IMPLEMENT**: Dialog for matching income to pending reimbursements
- **PATTERN**: Follow dialog pattern with multi-select list
- **IMPORTS**:
  - Dialog components
  - `@/hooks/useReimbursements` - usePendingReimbursements
  - `@/lib/utils` - formatAmount, formatDate
- **UI ELEMENTS**:
  - Show incoming transaction details
  - List of pending reimbursements with checkboxes
  - Selected total vs income amount comparison
  - Cancel and Clear buttons
- **GOTCHA**: Allow selecting multiple pending reimbursements to clear against one income
- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 2.3: CREATE `src/components/reimbursements/PendingReimbursementList.tsx`

- **IMPLEMENT**: List component showing pending reimbursable expenses
- **PATTERN**: Follow `src/components/dashboard/RecentTransactions.tsx` list pattern
- **IMPORTS**: `@/types`, `@/lib/utils`, lucide icons
- **UI ELEMENTS**:
  - Transaction row with date, description, amount (amber color)
  - Type badge (work/personal)
  - Note display if present
  - Action menu (edit, unmark)
- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 2.4: CREATE `src/components/reimbursements/ClearedReimbursementList.tsx`

- **IMPLEMENT**: List component showing cleared reimbursements
- **PATTERN**: Similar to PendingReimbursementList but with cleared styling
- **UI ELEMENTS**:
  - Original expense info
  - Linked income info
  - Cleared date
  - Strikethrough or muted styling to indicate cleared
- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 2.5: CREATE `src/components/reimbursements/ReimbursementSummary.tsx`

- **IMPLEMENT**: Summary card with reimbursement statistics
- **PATTERN**: Follow `src/components/dashboard/SummaryCards.tsx` pattern
- **UI ELEMENTS**:
  - Pending count and total amount
  - Pending by type (work vs personal)
  - Recently cleared count
- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 2.6: CREATE `src/components/reimbursements/index.ts`

- **IMPLEMENT**: Barrel export for reimbursement components
- **PATTERN**: Follow `src/components/dashboard/index.ts`
- **VALIDATE**: `npm run typecheck`

---

### PHASE 3: TRANSACTION PAGE INTEGRATION

#### Task 3.1: UPDATE `src/components/transactions/TransactionRow.tsx`

- **UPDATE**: Add reimbursement indicator and actions
- **IMPLEMENT**:
  - Visual indicator (amber badge) when transaction has pending reimbursement
  - "Mark as Reimbursable" in action menu for expenses (amount < 0)
  - "Contains Reimbursement" in action menu for income (amount > 0)
- **PATTERN**: Extend existing action menu pattern (lines 119-140)
- **IMPORTS**: Add `Receipt` icon from lucide-react
- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 3.2: UPDATE `src/pages/Transactions.tsx`

- **UPDATE**: Integrate reimbursement dialogs
- **IMPLEMENT**:
  - Add state for `markReimbursableTransaction` and `clearReimbursementTransaction`
  - Add `MarkReimbursableDialog` and `ClearReimbursementDialog`
  - Add handlers `handleMarkReimbursable` and `handleClearReimbursement`
  - Wire up mutations
- **PATTERN**: Follow existing dialog integration (lines 145-190)
- **IMPORTS**: Add reimbursement hooks and dialog components
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### PHASE 4: REIMBURSEMENTS PAGE

#### Task 4.1: UPDATE `src/pages/Reimbursements.tsx`

- **UPDATE**: Replace placeholder with full implementation
- **IMPLEMENT**: Complete reimbursements page with:
  - Page header with title and description
  - Summary statistics card (using ReimbursementSummary)
  - Pending reimbursements section with PendingReimbursementList
  - Cleared reimbursements section with ClearedReimbursementList
  - Empty states for no pending/cleared
  - Loading states
  - Error handling
- **PATTERN**: Follow `src/pages/Dashboard.tsx` structure
- **IMPORTS**:
  - Reimbursement components
  - `@/hooks/useReimbursements`
  - UI components (Card, etc.)
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### PHASE 5: DATA EXPORT

#### Task 5.1: CREATE `src/lib/export.ts`

- **IMPLEMENT**: Export utility functions
- **FUNCTIONS**:
  ```typescript
  export function transactionsToCSV(transactions: Transaction[], categories: Category[]): string;
  export function transactionsToJSON(transactions: Transaction[], categories: Category[]): string;
  export function downloadFile(content: string, filename: string, mimeType: string): void;
  ```
- **CSV FORMAT**:
  - Headers: Date, Description, Amount, Category, Counterparty, Reimbursement Status, Reimbursement Type, Note
  - Proper escaping for commas and quotes
  - EUR formatting
- **JSON FORMAT**: Full transaction objects with category names resolved
- **VALIDATE**: `npm run typecheck && npm run lint`

#### Task 5.2: CREATE `src/lib/__tests__/export.test.ts`

- **IMPLEMENT**: Unit tests for export functions
- **TEST CASES**:
  - CSV escapes special characters correctly
  - CSV includes all required columns
  - JSON includes all transaction fields
  - Date formatting is correct
  - Amount formatting is correct
  - Reimbursement status is included
- **VALIDATE**: `npm run test src/lib/__tests__/export.test.ts`

#### Task 5.3: UPDATE `src/pages/Settings.tsx`

- **UPDATE**: Wire up export buttons with actual functionality
- **IMPLEMENT**:
  - Add date range selector (optional, defaults to all time)
  - Fetch all transactions for selected range
  - Generate and download CSV/JSON on button click
  - Show loading state during export
  - Show success/error toast
- **IMPORTS**:
  - `@/lib/export` - export functions
  - `@/hooks/useTransactions` - to fetch data
  - `@/hooks/useCategories` - for category names
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### PHASE 6: TESTING

#### Task 6.1: CREATE `src/hooks/__tests__/useReimbursements.test.ts`

- **IMPLEMENT**: Unit tests for reimbursement hook logic
- **PATTERN**: Follow `src/hooks/__tests__/useDashboardData.test.ts`
- **TEST CASES**:
  - Filtering pending reimbursements
  - Filtering cleared reimbursements
  - Summary calculations (pending total by type)
- **VALIDATE**: `npm run test src/hooks/__tests__/useReimbursements.test.ts`

#### Task 6.2: CREATE `e2e/reimbursements.spec.ts`

- **IMPLEMENT**: E2E tests for reimbursement workflow
- **PATTERN**: Follow `e2e/transactions.spec.ts` structure exactly
- **TEST SCENARIOS**:
  1. Navigate to Reimbursements page and verify structure
  2. Mark an expense as reimbursable from Transactions page
  3. Verify transaction appears in Pending Reimbursements
  4. Clear a reimbursement by matching with income
  5. Verify cleared reimbursement moves to cleared list
  6. Verify dashboard excludes pending reimbursements
  7. Unmark a pending reimbursement
- **VALIDATE**: `npm run e2e e2e/reimbursements.spec.ts`

#### Task 6.3: ADD export tests to `e2e/settings.spec.ts` or update existing

- **IMPLEMENT**: E2E tests for data export
- **TEST SCENARIOS**:
  1. Navigate to Settings page
  2. Click "Export as CSV" and verify download
  3. Click "Export as JSON" and verify download
- **GOTCHA**: Playwright can intercept downloads with `page.waitForEvent('download')`
- **VALIDATE**: `npm run e2e`

---

## TESTING STRATEGY

### Unit Tests

**Reimbursement Logic (`src/hooks/__tests__/useReimbursements.test.ts`):**

- Test filtering functions for pending/cleared
- Test summary calculation (totals by type)
- Test edge cases: empty lists, all pending, all cleared

**Export Functions (`src/lib/__tests__/export.test.ts`):**

- Test CSV generation with special characters
- Test JSON structure completeness
- Test date and amount formatting
- Test category name resolution

### Integration Tests

Use Firebase emulators with seeded test data:

- Create transactions with various reimbursement states
- Verify queries return correct data
- Verify mutations update data correctly

### End-to-End (E2E) Tests

**CRITICAL: E2E tests are REQUIRED for this user-facing feature.**

**Reimbursement Workflow (`e2e/reimbursements.spec.ts`):**

```typescript
test.describe('Reimbursement Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and create test transactions
  });

  test('should mark expense as reimbursable', async ({ page }) => {
    // 1. Go to transactions
    // 2. Find an expense transaction
    // 3. Open action menu
    // 4. Click "Mark as Reimbursable"
    // 5. Select type and add note
    // 6. Submit
    // 7. Verify amber badge appears
  });

  test('should show pending reimbursement on dedicated page', async ({ page }) => {
    // Navigate to /reimbursements
    // Verify the marked transaction appears
  });

  test('should clear reimbursement by matching with income', async ({ page }) => {
    // 1. Create an income transaction
    // 2. Open action menu on income
    // 3. Click "Contains Reimbursement"
    // 4. Select pending reimbursement(s)
    // 5. Submit
    // 6. Verify both are marked as cleared
  });

  test('should exclude pending reimbursements from dashboard totals', async ({ page }) => {
    // Navigate to dashboard
    // Verify Pending Reimbursements card shows correct amount
    // Verify Total Expenses excludes pending
  });
});
```

**Export Tests:**

```typescript
test('should download CSV export', async ({ page }) => {
  await page.goto('/settings');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export as csv/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toContain('.csv');
});
```

### Edge Cases

- Transaction with no category (should export as "Uncategorized")
- Multiple reimbursements matched to one income
- Clearing partial amount (income < pending total)
- Unmarking a reimbursement that was cleared (should unlink)
- Export with date range filtering
- Export with zero transactions

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
npm run format:check
```

### Level 2: Unit Tests

```bash
npm run test
# Specific tests:
npm run test src/hooks/__tests__/useReimbursements.test.ts
npm run test src/lib/__tests__/export.test.ts
```

### Level 3: Build

```bash
npm run build
```

### Level 4: E2E Tests

**REQUIRED: Run E2E tests in a real browser to verify user-facing functionality**

```bash
# Terminal 1: Start Firebase emulators
npm run firebase:emulators

# Terminal 2: Run E2E tests (dev server starts automatically)
npm run e2e

# Or run specific test file:
npm run e2e e2e/reimbursements.spec.ts

# Or run in headed mode for debugging:
npm run e2e:headed
```

**E2E Test Coverage Requirements:**

- All new user flows must have E2E tests
- Tests must pass with Firebase emulators running
- Tests must be deterministic (no flaky tests)
- Use `{ exact: true }` for ambiguous text matchers
- Don't rely on `networkidle` with real-time databases

### Level 5: Manual Validation

1. **Mark as Reimbursable Flow:**
   - Create an expense transaction
   - Open action menu, click "Mark as Reimbursable"
   - Select "Work Expense", add note
   - Verify amber badge appears
   - Navigate to /reimbursements, verify it appears

2. **Clear Reimbursement Flow:**
   - Create an income transaction (e.g., "Expense Reimbursement")
   - Open action menu, click "Contains Reimbursement"
   - Select the pending expense
   - Submit and verify both are cleared
   - Navigate to /reimbursements, verify in cleared section

3. **Dashboard Integration:**
   - Mark an expense as reimbursable
   - Check Dashboard - verify Pending Reimbursements card updates
   - Verify Total Expenses excludes the pending amount

4. **Export Flow:**
   - Go to Settings
   - Click "Export as CSV"
   - Open file, verify all columns present
   - Click "Export as JSON"
   - Open file, verify valid JSON

---

## ACCEPTANCE CRITERIA

- [ ] User can mark any expense as reimbursable (work or personal)
- [ ] User can add optional note when marking as reimbursable
- [ ] Transaction shows amber badge when marked as reimbursable
- [ ] User can clear reimbursement by matching income to pending expenses
- [ ] User can match multiple expenses to one income
- [ ] Reimbursements page shows pending and cleared lists
- [ ] Reimbursements page shows summary statistics
- [ ] Dashboard excludes pending reimbursements from personal expense totals
- [ ] Dashboard shows pending reimbursements in separate card
- [ ] User can unmark a pending reimbursement
- [ ] User can export transactions as CSV
- [ ] User can export transactions as JSON
- [ ] Export includes date, description, amount, category, reimbursement status
- [ ] All validation commands pass with zero errors
- [ ] E2E tests cover critical flows
- [ ] No regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] `src/hooks/useReimbursements.ts` created with all mutations
- [ ] `src/components/reimbursements/MarkReimbursableDialog.tsx` created
- [ ] `src/components/reimbursements/ClearReimbursementDialog.tsx` created
- [ ] `src/components/reimbursements/PendingReimbursementList.tsx` created
- [ ] `src/components/reimbursements/ClearedReimbursementList.tsx` created
- [ ] `src/components/reimbursements/ReimbursementSummary.tsx` created
- [ ] `src/components/transactions/TransactionRow.tsx` updated with reimbursement actions
- [ ] `src/pages/Transactions.tsx` updated with reimbursement dialogs
- [ ] `src/pages/Reimbursements.tsx` fully implemented
- [ ] `src/lib/export.ts` created with CSV/JSON export
- [ ] `src/pages/Settings.tsx` updated with working export
- [ ] Unit tests for reimbursement logic pass
- [ ] Unit tests for export functions pass
- [ ] E2E tests for reimbursement workflow pass
- [ ] TypeScript strict mode passes
- [ ] Lint passes with no errors
- [ ] Manual testing completed

---

## NOTES

### Design Decisions

1. **Multi-select for clearing**: Allow matching multiple pending reimbursements to one income transaction (e.g., monthly expense reimbursement in salary).

2. **Amber color for pending**: Use amber/warning color (`text-amber-500`, `bg-amber-50`) for pending reimbursements to distinguish from regular expenses.

3. **Soft linking**: Store `linkedTransactionId` on both the expense and income to maintain bidirectional relationship.

4. **Export without date range by default**: Export all transactions by default, with optional date range filter for convenience.

5. **CSV format**: Use semicolon separator for Dutch locale compatibility, or comma with proper escaping.

### Data Flow

```
Transaction marked as reimbursable:
  → transaction.reimbursement = { type, status: 'pending', note, ... }
  → Transaction shows amber badge
  → Appears in Reimbursements page pending list
  → Dashboard excludes from expenses, shows in pending card

Reimbursement cleared:
  → Original expense: reimbursement.status = 'cleared', linkedTransactionId = incomeId
  → Income transaction: can optionally track matched expenses
  → Both move to cleared section
  → Dashboard no longer shows in pending
```

### Known Limitations

- No partial reimbursement matching (full amount only)
- No automatic detection of reimbursement income (manual matching)
- Export is client-side (may be slow for very large datasets)

### Security Considerations

- All mutations verify user authentication
- Export only includes user's own data (Firestore rules enforce)
- No sensitive data in export beyond what user already sees
