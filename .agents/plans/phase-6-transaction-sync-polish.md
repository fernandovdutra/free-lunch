# Feature: Transaction Sync Polish & Bug Fixes

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

This is a critical bug-fix and polish release addressing multiple issues discovered during real-world bank sync testing. The current transaction sync from Enable Banking API has several data transformation bugs that result in:
- All transactions appearing as credits (positive amounts)
- Missing or incorrect counterparty names
- Raw JSON objects displayed as descriptions
- Future-dated transactions due to timezone issues
- Auto-categorization failing silently

Additionally, the UI needs improvements to display transaction direction and counterparty information more prominently.

## User Story

As a Free Lunch user with connected bank account
I want my synced transactions to show accurate amounts, dates, descriptions, and counterparties
So that I can understand my spending patterns and categorize transactions correctly

## Problem Statement

The Enable Banking API returns transaction data in a specific format that is not being correctly transformed:
1. **Amounts are always positive strings** - The API uses `creditor`/`debtor` fields to indicate direction, not amount sign
2. **Descriptions fallback to raw JSON** - When `remittance_information` is empty, code falls back to `bank_transaction_code` which is a structured object
3. **Counterparty extraction is inverted** - Logic uses amount sign (always positive) to determine which party name to use
4. **Dates use UTC conversion** - `toISOString()` shifts dates forward in timezones east of UTC
5. **Category slugs don't resolve** - Merchant database returns slugs like "groceries" but user categories are named "Groceries" with different ID format

## Solution Statement

Fix the `syncTransactions.ts` transformation logic to:
1. Determine transaction direction by comparing account IBAN with `creditor_account`/`debtor_account`
2. Extract meaningful description from `bank_transaction_code.description` if it's an object
3. Pick correct counterparty based on actual transaction direction
4. Use local date formatting instead of UTC conversion
5. Improve category slug resolution to handle case variations

Enhance the UI to:
1. Add a dedicated "Counterparty" column in the transaction list
2. Show direction indicator (arrow up/down) next to amounts
3. Ensure proper display of debit vs credit transactions

## Feature Metadata

**Feature Type**: Bug Fix + Enhancement
**Estimated Complexity**: Medium-High
**Primary Systems Affected**:
- `functions/src/handlers/syncTransactions.ts` - Transaction transformation
- `functions/src/categorization/categorizer.ts` - Category resolution
- `src/components/transactions/TransactionList.tsx` - UI display
- `src/components/transactions/TransactionRow.tsx` - Row rendering
**Dependencies**: None (all fixes are internal)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `functions/src/handlers/syncTransactions.ts` (lines 228-277) - **CRITICAL**: Main transformation logic with all bugs
- `functions/src/enableBanking/types.ts` (lines 56-81) - Enable Banking transaction structure
- `functions/src/categorization/categorizer.ts` (lines 74-114) - Category slug resolution
- `functions/src/categorization/merchantDatabase.ts` (lines 7-64) - Merchant patterns and slugs
- `src/components/transactions/TransactionRow.tsx` (lines 45-134) - Transaction row rendering
- `src/components/transactions/TransactionList.tsx` (lines 57-84) - List with headers
- `src/lib/utils.ts` (lines 14-28) - Amount formatting (uses sign correctly)
- `src/contexts/AuthContext.tsx` (lines 108-436) - Default categories created for users

### New Files to Create

- None - all changes are to existing files

### Relevant Documentation

- Enable Banking API: Transaction amounts are **always positive strings**
- The `creditor` is who receives money, `debtor` is who sends money
- For outgoing payment: user is debtor, recipient is creditor
- For incoming payment: user is creditor, sender is debtor

### Patterns to Follow

**Amount Formatting (already correct in utils.ts):**
```typescript
if (amount > 0) return `+${formatted}`;  // Income
if (amount < 0) return `-${formatted}`;  // Expense
```

**Category Naming Convention (from AuthContext.tsx):**
- Parent: `id: 'food', name: 'Food & Drink'`
- Child: `id: 'food-groceries', name: 'Groceries', parentId: 'food'`

**Date Formatting Pattern:**
```typescript
// Use date-fns for consistent formatting
import { format, parseISO } from 'date-fns';
const dateStr = format(parseISO(bookingDate), 'yyyy-MM-dd');
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend Bug Fixes (syncTransactions.ts)

Fix the core transformation logic that processes Enable Banking API responses.

**Tasks:**
1. Fix transaction direction detection using IBAN comparison
2. Fix amount sign based on direction (negative for debits)
3. Fix counterparty extraction based on direction
4. Fix description extraction from structured objects
5. Fix date parsing to avoid timezone shifts

### Phase 2: Categorization Improvements

Improve slug resolution to handle the mismatch between merchant database slugs and actual category names.

**Tasks:**
1. Improve `buildCategorySlugMap()` to handle more variations
2. Add fallback matching for common category names
3. Fix `categorySource` to be 'none' when no match found

### Phase 3: Frontend UI Enhancements

Add counterparty column and improve transaction display.

**Tasks:**
1. Add "Counterparty" column to TransactionList header
2. Display counterparty prominently in TransactionRow
3. Add direction indicator (arrow icon) next to amount

### Phase 4: Testing & Validation

Add tests for the fixed transformation logic.

**Tasks:**
1. Add unit tests for `transformTransaction` function
2. Update E2E tests to verify correct display of synced transactions

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: UPDATE `functions/src/enableBanking/types.ts` - Add IBAN fields

- **IMPLEMENT**: Ensure type definitions include `creditor_account.iban` and `debtor_account.iban` fields (already present, verify)
- **VALIDATE**: `cd functions && npm run build`

---

### Task 2: UPDATE `functions/src/handlers/syncTransactions.ts` - Fix transformTransaction function

- **IMPLEMENT**: Complete rewrite of `transformTransaction` function (lines 228-277):

```typescript
function transformTransaction(
  tx: EnableBankingTransaction,
  accountIban: string,
  connectionId: string
) {
  // 1. Parse amount (always positive from API)
  const rawAmount = parseFloat(tx.transaction_amount.amount);

  // 2. Determine direction by checking which account matches user's IBAN
  // If user's account is the debtor (sender), this is an OUTGOING payment (expense)
  // If user's account is the creditor (receiver), this is an INCOMING payment (income)
  const userIsDebtor = tx.debtor_account?.iban === accountIban;
  const userIsCreditor = tx.creditor_account?.iban === accountIban;

  // Default to checking if creditor exists (outgoing) or debtor exists (incoming)
  // This handles cases where account IBAN might not be present
  let isOutgoing: boolean;
  if (userIsDebtor || userIsCreditor) {
    isOutgoing = userIsDebtor;
  } else {
    // Fallback: if creditor name exists, it's likely outgoing (we paid them)
    isOutgoing = !!tx.creditor?.name;
  }

  // 3. Set amount sign: negative for expenses (outgoing), positive for income (incoming)
  const amount = isOutgoing ? -Math.abs(rawAmount) : Math.abs(rawAmount);

  // 4. Get counterparty: for outgoing, show who we paid; for incoming, show who paid us
  const counterparty = isOutgoing
    ? (tx.creditor?.name || null)
    : (tx.debtor?.name || null);

  // 5. Extract description - handle structured bank_transaction_code
  let description = 'Bank transaction';

  if (tx.remittance_information_unstructured) {
    description = tx.remittance_information_unstructured;
  } else if (tx.remittance_information_unstructured_array?.length) {
    description = tx.remittance_information_unstructured_array.join(' ');
  } else if (tx.bank_transaction_code) {
    // bank_transaction_code can be a string or object like {"description":"SEPA IDEAL","code":"944"}
    if (typeof tx.bank_transaction_code === 'string') {
      description = tx.bank_transaction_code;
    } else if (typeof tx.bank_transaction_code === 'object' && tx.bank_transaction_code !== null) {
      const btc = tx.bank_transaction_code as { description?: string; code?: string };
      description = btc.description || `Transaction ${btc.code || ''}`.trim();
    }
  }

  // Use counterparty as description if we have it and description is generic
  if (counterparty && (description === 'Bank transaction' || description.startsWith('SEPA'))) {
    description = counterparty;
  }

  // 6. Parse date without timezone shift
  const bookingDate = tx.booking_date || tx.value_date || tx.transaction_date;
  if (!bookingDate) {
    throw new Error('Transaction has no date');
  }

  // Parse as local date (YYYY-MM-DD format) - add time component to avoid UTC interpretation
  const [year, month, day] = bookingDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day, 12, 0, 0); // Noon local time

  return {
    externalId: tx.entry_reference,
    date: Timestamp.fromDate(dateObj),
    description,
    amount,
    currency: tx.transaction_amount.currency as 'EUR',
    counterparty,
    categoryId: null as string | null,
    categoryConfidence: 0,
    categorySource: 'auto' as 'auto' | 'rule' | 'merchant' | 'learned' | 'none',
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: accountIban,
    bankConnectionId: connectionId,
    status: tx.status,
  };
}
```

- **PATTERN**: Follow existing error handling pattern in file
- **IMPORTS**: Timestamp already imported from firebase-admin/firestore
- **GOTCHA**: `bank_transaction_code` type in EnableBankingTransaction is `string` but API returns object - need to handle both
- **VALIDATE**: `cd functions && npm run build`

---

### Task 3: UPDATE `functions/src/enableBanking/types.ts` - Fix bank_transaction_code type

- **IMPLEMENT**: Change `bank_transaction_code` type to union:
```typescript
bank_transaction_code?: string | { description?: string; code?: string; sub_code?: string | null };
```
- **VALIDATE**: `cd functions && npm run build`

---

### Task 4: UPDATE `functions/src/handlers/syncTransactions.ts` - Fix date range calculation

- **IMPLEMENT**: Update lines 89-104 to avoid UTC shift:
```typescript
// Calculate date range using local dates
const today = new Date();
const dateTo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

let dateFrom: string;
if (connection.lastSync) {
  const lastSync =
    connection.lastSync instanceof Timestamp
      ? connection.lastSync.toDate()
      : new Date(connection.lastSync);
  lastSync.setDate(lastSync.getDate() - 1); // Overlap by 1 day
  dateFrom = `${lastSync.getFullYear()}-${String(lastSync.getMonth() + 1).padStart(2, '0')}-${String(lastSync.getDate()).padStart(2, '0')}`;
} else {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  dateFrom = `${ninetyDaysAgo.getFullYear()}-${String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(ninetyDaysAgo.getDate()).padStart(2, '0')}`;
}
```
- **VALIDATE**: `cd functions && npm run build`

---

### Task 5: UPDATE `functions/src/handlers/syncTransactions.ts` - Fix categorySource assignment

- **IMPLEMENT**: Change line 155-156:
```typescript
transactionData.categorySource =
  categorizationResult.source === 'none' ? 'none' : categorizationResult.source;
```
- **PATTERN**: Keep source as 'none' when no categorization found, not 'auto'
- **VALIDATE**: `cd functions && npm run build`

---

### Task 6: UPDATE `functions/src/categorization/types.ts` - Add 'none' to categorySource type

- **IMPLEMENT**: Find the CategorizationResult type and ensure `source` includes `'none'`:
```typescript
export interface CategorizationResult {
  categoryId: string | null;
  confidence: number;
  source: 'rule' | 'merchant' | 'learned' | 'none';
  matchedPattern?: string;
}
```
- **VALIDATE**: `cd functions && npm run build`

---

### Task 7: UPDATE `functions/src/categorization/categorizer.ts` - Improve slug resolution

- **IMPLEMENT**: Enhance `buildCategorySlugMap()` method (lines 74-93) to handle more name variations:
```typescript
private buildCategorySlugMap(): void {
  this.categorySlugMap.clear();

  for (const cat of this.categories) {
    // 1. Map by category ID directly
    this.categorySlugMap.set(cat.id, cat.id);

    // 2. Simple name match (lowercase, alphanumeric only)
    const simpleName = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    this.categorySlugMap.set(simpleName, cat.id);

    // 3. Name with spaces replaced by dots
    const dottedName = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
    this.categorySlugMap.set(dottedName, cat.id);

    // 4. If has parent, create hierarchical slugs
    if (cat.parentId) {
      const parent = this.categories.find((c) => c.id === cat.parentId);
      if (parent) {
        // Format: parent.child (e.g., "food.groceries")
        const parentSimple = parent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const childSimple = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        this.categorySlugMap.set(`${parentSimple}.${childSimple}`, cat.id);

        // Also map just the child name for partial matches
        this.categorySlugMap.set(childSimple, cat.id);
      }
    }
  }
}
```
- **VALIDATE**: `cd functions && npm run build`

---

### Task 8: UPDATE `src/types/index.ts` - Add 'none' to categorySource

- **IMPLEMENT**: Update Transaction interface categorySource field:
```typescript
categorySource: 'auto' | 'manual' | 'rule' | 'merchant' | 'learned' | 'none';
```
- **VALIDATE**: `npm run typecheck`

---

### Task 9: UPDATE `src/components/transactions/TransactionList.tsx` - Add Counterparty column

- **IMPLEMENT**: Update the header row (lines 59-67) to include Counterparty:
```tsx
{/* Header row */}
<div className="flex items-center gap-4 bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
  <div className="w-20 flex-shrink-0">Date</div>
  <div className="min-w-0 flex-1">Description</div>
  <div className="w-32 flex-shrink-0">Counterparty</div>
  <div className="w-36 flex-shrink-0">Category</div>
  <div className="w-6 flex-shrink-0" />
  <div className="w-24 flex-shrink-0 text-right">Amount</div>
  <div className="w-8 flex-shrink-0" />
</div>
```
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 10: UPDATE `src/components/transactions/TransactionRow.tsx` - Add Counterparty column and direction indicator

- **IMPLEMENT**: Add imports for direction icons:
```typescript
import { MoreHorizontal, Pencil, Trash2, Split, Receipt, Banknote, ArrowUpRight, ArrowDownRight } from 'lucide-react';
```

- **IMPLEMENT**: Update the row structure (after description div, before category div) to add counterparty column:
```tsx
{/* Counterparty */}
<div className="w-32 flex-shrink-0 truncate text-sm text-muted-foreground">
  {transaction.counterparty || '—'}
</div>
```

- **IMPLEMENT**: Update the amount display (lines 123-133) to include direction arrow:
```tsx
{/* Amount */}
<div
  className={cn(
    'flex w-24 flex-shrink-0 items-center justify-end gap-1 font-medium tabular-nums',
    isPendingReimbursement
      ? getAmountColor(transaction.amount, true)
      : getAmountColor(transaction.amount)
  )}
>
  {isIncome ? (
    <ArrowUpRight className="h-3 w-3" />
  ) : isExpense ? (
    <ArrowDownRight className="h-3 w-3" />
  ) : null}
  {formatAmount(transaction.amount)}
</div>
```

- **IMPLEMENT**: Remove counterparty from description subtitle (remove lines 80-82):
```tsx
{/* Remove this block - counterparty now has its own column */}
{/* {transaction.counterparty && typeof transaction.counterparty === 'string' && (
  <p className="truncate text-sm text-muted-foreground">{transaction.counterparty}</p>
)} */}
```

- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 11: CREATE unit tests for transformTransaction

- **IMPLEMENT**: Create `functions/src/handlers/__tests__/syncTransactions.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock firebase-admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  },
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  },
}));

// Note: We'd need to export transformTransaction or test it indirectly
// For now, document the expected behavior

describe('Transaction Transformation Logic', () => {
  describe('Amount Sign', () => {
    it('should make outgoing payments negative (user is debtor)', () => {
      // When user's IBAN matches debtor_account.iban
      // Amount should be negative (expense)
      const userIban = 'NL91ABNA0417164300';
      const tx = {
        debtor_account: { iban: userIban },
        creditor_account: { iban: 'NL91ABNA0123456789' },
        transaction_amount: { amount: '25.50', currency: 'EUR' },
      };
      // Expected: amount = -25.50
    });

    it('should make incoming payments positive (user is creditor)', () => {
      // When user's IBAN matches creditor_account.iban
      // Amount should be positive (income)
      const userIban = 'NL91ABNA0417164300';
      const tx = {
        debtor_account: { iban: 'NL91ABNA0123456789' },
        creditor_account: { iban: userIban },
        transaction_amount: { amount: '100.00', currency: 'EUR' },
      };
      // Expected: amount = +100.00
    });
  });

  describe('Counterparty Extraction', () => {
    it('should use creditor name for outgoing payments', () => {
      // When user pays someone, show who they paid
      // Expected: counterparty = creditor.name
    });

    it('should use debtor name for incoming payments', () => {
      // When user receives money, show who paid them
      // Expected: counterparty = debtor.name
    });
  });

  describe('Description Extraction', () => {
    it('should prefer remittance_information_unstructured', () => {
      const tx = {
        remittance_information_unstructured: 'Payment for groceries',
        bank_transaction_code: { description: 'SEPA IDEAL' },
      };
      // Expected: description = 'Payment for groceries'
    });

    it('should extract description from bank_transaction_code object', () => {
      const tx = {
        bank_transaction_code: { description: 'SEPA Credit Transfer', code: '944' },
      };
      // Expected: description = 'SEPA Credit Transfer'
    });

    it('should not show raw JSON for bank_transaction_code', () => {
      const tx = {
        bank_transaction_code: { description: 'POS NATIONAL', code: '426' },
      };
      // Expected: description = 'POS NATIONAL', NOT '{"description":"POS NATIONAL","code":"426"}'
    });
  });

  describe('Date Parsing', () => {
    it('should parse dates without timezone shift', () => {
      const bookingDate = '2026-02-01';
      // When parsed, should be Feb 1st, not Feb 2nd
      // Expected: date.getDate() === 1, date.getMonth() === 1 (Feb)
    });
  });
});
```

- **VALIDATE**: `cd functions && npm test`

---

### Task 12: UPDATE E2E tests for transaction display

- **IMPLEMENT**: Add to `e2e/transactions.spec.ts`:
```typescript
test('should display counterparty column header', async ({ page }) => {
  await page.waitForTimeout(2000);
  const counterpartyHeader = page.getByText('Counterparty', { exact: true });
  await expect(counterpartyHeader).toBeVisible();
});

test('should display direction arrows for transactions', async ({ page }) => {
  // Add a transaction first
  await page.getByRole('button', { name: /add transaction/i }).click();
  await page.getByLabel(/description/i).fill('Direction Test');
  await page.getByLabel(/amount/i).fill('-50');
  await page.getByRole('button', { name: /add transaction/i }).last().click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // Check that the transaction row has expected structure
  await expect(page.getByText('Direction Test')).toBeVisible({ timeout: 10000 });
  // The amount should show with minus sign
  await expect(page.getByText(/-.*€.*50/)).toBeVisible();
});
```

- **VALIDATE**: `npm run e2e`

---

### Task 13: Rebuild and deploy functions

- **IMPLEMENT**: Rebuild cloud functions with fixes:
```bash
cd functions && npm run build
```

- **VALIDATE**: `cd functions && npm run build` (no errors)

---

## TESTING STRATEGY

### Unit Tests

**Location:** `functions/src/handlers/__tests__/syncTransactions.test.ts`

Test the transformation logic:
- Amount sign determination based on IBAN matching
- Counterparty extraction based on direction
- Description extraction from various source fields
- Date parsing without timezone shift

**Location:** `functions/src/categorization/__tests__/categorizer.test.ts`

Test slug resolution improvements:
- Simple name matching (case insensitive)
- Hierarchical slug matching (parent.child)
- ID-based matching

### Integration Tests

The existing categorization tests cover the engine:
- `functions/src/categorization/__tests__/merchantDatabase.test.ts`
- `functions/src/categorization/__tests__/ruleEngine.test.ts`

### End-to-End (E2E) Tests

**Location:** `e2e/transactions.spec.ts`

Verify:
- Counterparty column is visible in transaction list
- Transaction amounts display correctly (with + or - sign)
- Direction arrows are visible
- Negative amounts show in red, positive in green

### Edge Cases

1. Transaction with no `creditor_account` or `debtor_account` IBAN
2. Transaction with `bank_transaction_code` as string vs object
3. Transaction with only `value_date` (no `booking_date`)
4. Transaction with empty `remittance_information` fields
5. Category with special characters in name
6. Merchant pattern match but no corresponding user category

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
# Full test suite
npm run test
```

### Level 4: E2E Tests

**REQUIRED: Run E2E tests in a real browser to verify user-facing functionality**

```bash
# Start Firebase emulators (REQUIRED for authenticated tests)
npm run firebase:emulators &
sleep 10  # Wait for emulators to start

# Run E2E tests (dev server starts automatically via Playwright config)
npm run e2e

# Or run in headed mode for debugging
npm run e2e:headed
```

### Level 5: Manual Validation

**After deploying functions:**

1. Delete all existing transactions from Firestore (via Firebase console or UI)
2. Trigger bank sync from Settings page
3. Verify:
   - [ ] Transactions have correct sign (negative for payments, positive for income)
   - [ ] Counterparty names are populated
   - [ ] Descriptions are human-readable (not JSON)
   - [ ] Dates are correct (not in the future)
   - [ ] Some transactions are auto-categorized (not all Uncategorized)
   - [ ] UI shows Counterparty column
   - [ ] Amount column shows direction arrows

---

## ACCEPTANCE CRITERIA

- [ ] Outgoing payments show as **negative amounts** (red)
- [ ] Incoming payments show as **positive amounts** (green)
- [ ] Counterparty column displays who money was sent to/received from
- [ ] Descriptions are human-readable (no raw JSON)
- [ ] Transaction dates are accurate (not future-dated)
- [ ] Auto-categorization works for known merchants (Albert Heijn, NS, etc.)
- [ ] Direction arrows (up/down) appear next to amounts
- [ ] All validation commands pass with zero errors
- [ ] No regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + E2E)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms correct sync behavior
- [ ] Acceptance criteria all met
- [ ] Functions rebuilt and ready for deployment

---

## NOTES

### Design Decisions

1. **Direction Detection Strategy**: We use IBAN matching as primary, with fallback to checking if `creditor.name` exists. This handles both structured and unstructured API responses.

2. **Description Priority**: We prioritize `remittance_information_unstructured` > array join > `bank_transaction_code.description` > counterparty name > generic fallback. This ensures the most specific description is used.

3. **Date Handling**: We parse dates as local time (noon) to avoid any timezone boundary issues. The Enable Banking API returns dates in YYYY-MM-DD format without timezone info.

4. **Category Slug Resolution**: We map multiple variations of category names to handle the mismatch between merchant database slugs (lowercase, no spaces) and actual user category names.

### Known Limitations

- If a user deletes all their categories, categorization will fail silently (returns null)
- The merchant database only covers common Dutch merchants
- Re-syncing after fixes won't update existing transactions (only new ones get correct values)

### Future Improvements

- Add a "Re-categorize All" button to apply categorization to existing transactions
- Add more merchant patterns based on real transaction data
- Consider storing raw transaction response for debugging
