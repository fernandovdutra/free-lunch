# Feature: UX Polish - Bulk Category Apply + Fix Sync Button

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

This feature bundle implements two UX improvements:

1. **Bulk Category Apply with Rule Creation**: When a user manually changes a transaction's category, immediately show a dialog that:
   - Counts how many other transactions share the same counterparty
   - Offers to apply the same category to all matching transactions
   - Creates a categorization rule for future transactions (with option to skip)

2. **Fix Header Sync Button**: The sync button in the header currently has no onClick handler. Connect it to trigger a sync for all bank connections.

## User Story

As a Free Lunch user
I want to quickly categorize multiple similar transactions at once
So that I don't have to manually categorize each transaction from the same merchant individually

As a Free Lunch user
I want to sync my transactions from the header bar
So that I can quickly refresh my data without navigating to settings

## Problem Statement

1. **Categorization Friction**: Currently, when users change a category, they're offered to create a rule for *future* transactions. But they still have to manually fix all *existing* transactions with the same counterparty. This is tedious for users who just connected their bank and have months of history.

2. **Sync Button Broken**: The sync button in the header is purely decorative - it has no onClick handler and does nothing when clicked. Users expect it to trigger a sync.

## Solution Statement

1. **Combined Bulk Apply + Rule Dialog**: Replace the current `CreateRuleDialog` with a new `ApplyToCimilarDialog` that:
   - Queries transactions with the same counterparty
   - Shows "Apply to X other transactions" with count
   - Checkbox for "Also create rule for future transactions" (default: checked)
   - On confirm: batch-updates matching transactions AND creates rule

2. **Functional Sync Button**: Add onClick handler to Header that:
   - Gets all bank connections
   - Triggers sync for each connection
   - Shows loading state and success/error feedback

## Feature Metadata

**Feature Type**: Enhancement / Bug Fix
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- `src/components/layout/Header.tsx` - Add sync functionality
- `src/pages/Transactions.tsx` - Update category change flow
- `src/components/transactions/CreateRuleDialog.tsx` - Replace with new dialog
- `src/hooks/useTransactions.ts` - Add bulk update mutation
- `src/hooks/useBankConnection.ts` - Add sync all connections hook
**Dependencies**: None (all internal)

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/components/layout/Header.tsx` (lines 26-29) - **CRITICAL**: Sync button has no onClick handler - this is the bug
- `src/pages/Transactions.tsx` (lines 79-94) - Current handleCategoryChange flow that opens CreateRuleDialog
- `src/components/transactions/CreateRuleDialog.tsx` - Current dialog to be replaced/enhanced
- `src/hooks/useTransactions.ts` (lines 264-306) - useUpdateTransactionCategory mutation pattern
- `src/hooks/useBankConnection.ts` (lines 61-75) - useSyncTransactions mutation
- `src/hooks/useRules.ts` - useCreateRule pattern for rule creation
- `src/types/index.ts` (lines 60-89) - Transaction type with counterparty field
- `src/lib/bankingFunctions.ts` - syncTransactions function wrapper

### New Files to Create

- None - modifying existing files only

### Files to Modify

- `src/components/layout/Header.tsx` - Add sync functionality with loading state
- `src/components/transactions/CreateRuleDialog.tsx` - Rename to ApplyToSimilarDialog.tsx, add bulk apply
- `src/pages/Transactions.tsx` - Update to pass matching transaction count
- `src/hooks/useTransactions.ts` - Add useBulkUpdateCategory mutation
- `src/hooks/useBankConnection.ts` - Add useSyncAllConnections hook

### Relevant Documentation

- [TanStack Query Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
  - Batch mutation patterns
  - Why: Need for bulk category update

- [Firestore Batch Writes](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes)
  - 500 document limit per batch
  - Why: Bulk update may exceed single batch limit

### Patterns to Follow

**Mutation with Optimistic Update (from useTransactions.ts):**
```typescript
return useMutation({
  mutationFn: async (params) => {
    // ... Firestore update
  },
  onMutate: async (params) => {
    await queryClient.cancelQueries({ queryKey: ['transactions'] });
    // Optimistic update
  },
  onError: (_err, _variables, context) => {
    // Rollback
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
  },
});
```

**Dialog Props Pattern (from CreateRuleDialog.tsx):**
```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // ... data props
  onSubmit: (data) => void;
  isSubmitting: boolean;
}
```

**Header Button Pattern (from Header.tsx):**
```typescript
<Button variant="ghost" size="sm" className="gap-2">
  <RefreshCw className="h-4 w-4" />
  <span className="hidden sm:inline">Sync</span>
</Button>
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend - Add Bulk Category Update Hook

Add a mutation hook to update multiple transactions' categories in a single operation.

**Tasks:**
- Add useBulkUpdateCategory hook to useTransactions.ts
- Handle Firestore batch limits (500 docs)
- Invalidate queries on success

### Phase 2: Backend - Add Sync All Connections Hook

Add a hook to sync all bank connections at once for the header button.

**Tasks:**
- Add useSyncAllConnections to useBankConnection.ts
- Iterate over all connections and sync each
- Return aggregated results

### Phase 3: Frontend - Replace CreateRuleDialog with ApplyToSimilarDialog

Enhance the dialog to show matching count and offer bulk apply.

**Tasks:**
- Rename and enhance CreateRuleDialog
- Add count of matching transactions
- Add checkbox for rule creation (default: checked)
- Update submit handler to call both bulk update and rule creation

### Phase 4: Frontend - Update Transactions Page Flow

Update the category change flow to pass matching transactions.

**Tasks:**
- Query for matching transactions by counterparty
- Pass count to the new dialog
- Update handlers to call new mutations

### Phase 5: Frontend - Fix Header Sync Button

Connect the sync button to trigger syncs.

**Tasks:**
- Import sync hook in Header
- Add onClick handler with loading state
- Show toast on success/error

### Phase 6: Testing

Add tests for new functionality.

**Tasks:**
- Unit test for bulk update hook
- E2E test for bulk apply flow
- E2E test for header sync button

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: UPDATE `src/hooks/useTransactions.ts` - Add useBulkUpdateCategory mutation

- **IMPLEMENT**: Add new mutation hook after `useUpdateTransactionCategory` (around line 306):

```typescript
/**
 * Bulk update category for multiple transactions by counterparty match.
 * Used when user wants to apply a category change to all similar transactions.
 */
export function useBulkUpdateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      counterparty,
      categoryId,
      excludeTransactionId,
    }: {
      counterparty: string;
      categoryId: string;
      excludeTransactionId?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!counterparty) throw new Error('Counterparty is required');

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(transactionsRef, where('counterparty', '==', counterparty));
      const snapshot = await getDocs(q);

      // Filter out the already-updated transaction and manually categorized ones
      const docsToUpdate = snapshot.docs.filter((docSnap) => {
        if (excludeTransactionId && docSnap.id === excludeTransactionId) return false;
        const data = docSnap.data();
        // Don't overwrite manually categorized transactions
        if (data.categorySource === 'manual') return false;
        return true;
      });

      // Update in batches of 500 (Firestore limit)
      let updatedCount = 0;
      for (let i = 0; i < docsToUpdate.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docsToUpdate.slice(i, i + 500);

        chunk.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            categoryId,
            categorySource: 'manual',
            categoryConfidence: 1,
            updatedAt: serverTimestamp(),
          });
        });

        await batch.commit();
        updatedCount += chunk.length;
      }

      return { updatedCount };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

- **IMPORTS**: Add `writeBatch` to Firestore imports if not already present
- **PATTERN**: Follow existing mutation patterns in the file
- **VALIDATE**: `npm run typecheck`

---

### Task 2: UPDATE `src/hooks/useTransactions.ts` - Add useCountMatchingTransactions query

- **IMPLEMENT**: Add query hook to count matching transactions (after useBulkUpdateCategory):

```typescript
/**
 * Count transactions matching a counterparty (excluding already manually categorized).
 */
export function useCountMatchingTransactions(counterparty: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['matchingTransactionsCount', user?.id, counterparty],
    queryFn: async () => {
      if (!user?.id || !counterparty) return 0;

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(transactionsRef, where('counterparty', '==', counterparty));
      const snapshot = await getDocs(q);

      // Count only non-manually categorized transactions
      const count = snapshot.docs.filter((docSnap) => {
        const data = docSnap.data();
        return data.categorySource !== 'manual';
      }).length;

      return count;
    },
    enabled: !!user?.id && !!counterparty,
    staleTime: 0, // Always refetch to get accurate count
  });
}
```

- **EXPORT**: Add `useCountMatchingTransactions` to module exports
- **VALIDATE**: `npm run typecheck`

---

### Task 3: UPDATE `src/hooks/useBankConnection.ts` - Add useSyncAllConnections hook

- **IMPLEMENT**: Add new hook after `useSyncTransactions` (around line 75):

```typescript
/**
 * Sync all bank connections at once.
 * Used by the header sync button.
 */
export function useSyncAllConnections() {
  const queryClient = useQueryClient();
  const { data: connections = [] } = useBankConnections();

  return useMutation({
    mutationFn: async () => {
      const activeConnections = connections.filter((c) => c.status === 'active');

      if (activeConnections.length === 0) {
        return { synced: 0, results: [] };
      }

      const results = await Promise.allSettled(
        activeConnections.map((connection) =>
          syncTransactions({ connectionId: connection.id })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason);

      return {
        synced: successCount,
        total: activeConnections.length,
        errors,
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

- **EXPORT**: Ensure `useSyncAllConnections` is exported
- **VALIDATE**: `npm run typecheck`

---

### Task 4: RENAME & UPDATE `src/components/transactions/CreateRuleDialog.tsx` to `ApplyToSimilarDialog.tsx`

- **IMPLEMENT**: First, rename the file:
  - Rename `CreateRuleDialog.tsx` to `ApplyToSimilarDialog.tsx`

- **IMPLEMENT**: Replace the entire content with the enhanced dialog:

```tsx
import { useState, useEffect } from 'react';
import { Loader2, Users, Wand2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import type { Transaction, Category } from '@/types';

interface ApplyToSimilarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  newCategoryId: string;
  categories: Category[];
  matchingCount: number;
  onApply: (options: {
    applyToSimilar: boolean;
    createRule: boolean;
    pattern: string;
    matchType: 'contains' | 'exact';
  }) => void;
  isApplying: boolean;
}

export function ApplyToSimilarDialog({
  open,
  onOpenChange,
  transaction,
  newCategoryId,
  categories,
  matchingCount,
  onApply,
  isApplying,
}: ApplyToSimilarDialogProps) {
  const [createRule, setCreateRule] = useState(true);
  const [pattern, setPattern] = useState('');

  // Pre-fill pattern from counterparty
  const suggestedPattern = transaction?.counterparty || '';
  const hasMatches = matchingCount > 0;
  const categoryName = categories.find((c) => c.id === newCategoryId)?.name || 'Unknown';

  // Reset state when dialog opens with new transaction
  useEffect(() => {
    if (open && transaction) {
      setCreateRule(true);
      setPattern('');
    }
  }, [open, transaction]);

  const handleApply = () => {
    onApply({
      applyToSimilar: hasMatches,
      createRule,
      pattern: pattern || suggestedPattern,
      matchType: 'contains',
    });
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  // If no matches and no counterparty (can't create rule), just close
  if (!hasMatches && !suggestedPattern) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Apply to Similar Transactions
          </DialogTitle>
          <DialogDescription>
            You&apos;ve categorized this as &ldquo;{categoryName}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Matching transactions count */}
          {hasMatches && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Users className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  Found {matchingCount} other transaction{matchingCount !== 1 ? 's' : ''} from{' '}
                  <span className="text-primary">&ldquo;{transaction?.counterparty}&rdquo;</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  These will also be categorized as &ldquo;{categoryName}&rdquo;.
                </p>
              </div>
            </div>
          )}

          {/* Create rule option */}
          {suggestedPattern && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="createRule"
                  checked={createRule}
                  onCheckedChange={(checked) => setCreateRule(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="createRule" className="font-medium cursor-pointer">
                    Create rule for future transactions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    New transactions from this merchant will be auto-categorized.
                  </p>
                </div>
              </div>

              {createRule && (
                <div className="ml-7 space-y-2">
                  <Label htmlFor="pattern" className="text-sm">
                    Match pattern
                  </Label>
                  <Input
                    id="pattern"
                    placeholder={suggestedPattern}
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Transactions containing &ldquo;{pattern || suggestedPattern}&rdquo; will be categorized as &ldquo;{categoryName}&rdquo;.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip} disabled={isApplying}>
            Skip
          </Button>
          <Button onClick={handleApply} disabled={isApplying}>
            {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isApplying
              ? 'Applying...'
              : hasMatches
                ? `Apply to ${matchingCount + 1} transaction${matchingCount > 0 ? 's' : ''}`
                : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- **IMPORTS**: Make sure `Checkbox` component exists. If not, you'll need to create it or use a different pattern
- **VALIDATE**: `npm run typecheck`

---

### Task 5: CREATE `src/components/ui/checkbox.tsx` if it doesn't exist

- **CHECK FIRST**: Look if `src/components/ui/checkbox.tsx` exists
- **IMPLEMENT**: If it doesn't exist, create it using shadcn/ui pattern:

```tsx
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
```

- **INSTALL**: If @radix-ui/react-checkbox is not installed: `npm install @radix-ui/react-checkbox`
- **VALIDATE**: `npm run typecheck`

---

### Task 6: UPDATE `src/pages/Transactions.tsx` - Update category change flow

- **IMPLEMENT**: Update imports at the top of the file:

```typescript
// Replace CreateRuleDialog import with:
import { ApplyToSimilarDialog } from '@/components/transactions/ApplyToSimilarDialog';

// Add new hook imports:
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useUpdateTransactionCategory,
  useDeleteTransaction,
  useBulkUpdateCategory,
  useCountMatchingTransactions,
  type TransactionFilters as Filters,
} from '@/hooks/useTransactions';
```

- **IMPLEMENT**: Update the component state and hooks section (around lines 50-68):

```typescript
// Rule creation state - update type
const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
const [pendingCategoryChange, setPendingCategoryChange] = useState<{
  transactionId: string;
  newCategoryId: string;
  transaction: Transaction;
} | null>(null);

// Add new hooks
const bulkUpdateMutation = useBulkUpdateCategory();
const { data: matchingCount = 0 } = useCountMatchingTransactions(
  pendingCategoryChange?.transaction.counterparty ?? null
);
```

- **IMPLEMENT**: Update `handleCategoryChange` function (around line 79):

```typescript
const handleCategoryChange = async (transactionId: string, categoryId: string | null) => {
  const transaction = transactions.find((t) => t.id === transactionId);
  await updateCategoryMutation.mutateAsync({ id: transactionId, categoryId });

  // Only offer to apply to similar if:
  // 1. A category was selected (not uncategorized)
  // 2. The transaction has a counterparty (so we can match)
  // 3. The transaction was auto-categorized or uncategorized before
  if (
    categoryId &&
    transaction &&
    transaction.counterparty &&
    (transaction.categorySource !== 'manual' || !transaction.categoryId)
  ) {
    setPendingCategoryChange({ transactionId, newCategoryId: categoryId, transaction });
    setRuleDialogOpen(true);
  }
};
```

- **IMPLEMENT**: Replace `handleCreateRule` with new `handleApplyToSimilar` function:

```typescript
const handleApplyToSimilar = async (options: {
  applyToSimilar: boolean;
  createRule: boolean;
  pattern: string;
  matchType: 'contains' | 'exact';
}) => {
  if (!pendingCategoryChange) return;

  try {
    // Apply to similar transactions if requested
    if (options.applyToSimilar && pendingCategoryChange.transaction.counterparty) {
      await bulkUpdateMutation.mutateAsync({
        counterparty: pendingCategoryChange.transaction.counterparty,
        categoryId: pendingCategoryChange.newCategoryId,
        excludeTransactionId: pendingCategoryChange.transactionId,
      });
    }

    // Create rule if requested
    if (options.createRule && options.pattern) {
      await createRuleMutation.mutateAsync({
        pattern: options.pattern,
        matchType: options.matchType,
        categoryId: pendingCategoryChange.newCategoryId,
        isLearned: true,
      });
    }
  } finally {
    setRuleDialogOpen(false);
    setPendingCategoryChange(null);
  }
};
```

- **IMPLEMENT**: Update the dialog component in JSX (around line 242):

```tsx
{/* Apply to Similar Dialog */}
<ApplyToSimilarDialog
  open={ruleDialogOpen}
  onOpenChange={(open) => {
    setRuleDialogOpen(open);
    if (!open) setPendingCategoryChange(null);
  }}
  transaction={pendingCategoryChange?.transaction ?? null}
  newCategoryId={pendingCategoryChange?.newCategoryId ?? ''}
  categories={categories}
  matchingCount={matchingCount - 1} // Subtract 1 because we already updated the original
  onApply={(options) => void handleApplyToSimilar(options)}
  isApplying={bulkUpdateMutation.isPending || createRuleMutation.isPending}
/>
```

- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 7: UPDATE `src/components/layout/Header.tsx` - Fix sync button

- **IMPLEMENT**: Update imports at the top:

```typescript
import { Menu, RefreshCw, LogOut, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useSyncAllConnections, useBankConnections } from '@/hooks/useBankConnection';
import { useToast } from '@/components/ui/toaster';
```

- **IMPLEMENT**: Replace the entire component:

```tsx
export function Header() {
  const { user, logout } = useAuth();
  const { data: connections = [] } = useBankConnections();
  const syncAll = useSyncAllConnections();
  const { toast } = useToast();

  const hasActiveConnections = connections.some((c) => c.status === 'active');

  const handleSync = async () => {
    if (!hasActiveConnections) {
      toast({
        title: 'No bank connections',
        description: 'Connect a bank account in Settings to sync transactions.',
        variant: 'default',
      });
      return;
    }

    try {
      const result = await syncAll.mutateAsync();

      if (result.errors && result.errors.length > 0) {
        toast({
          title: 'Sync completed with errors',
          description: `Synced ${result.synced}/${result.total} accounts. Some accounts failed to sync.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sync complete',
          description: `Successfully synced ${result.synced} account${result.synced !== 1 ? 's' : ''}.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync transactions. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Logo (mobile only) */}
        <span className="text-lg font-bold text-primary lg:hidden">Free Lunch</span>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Sync button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => void handleSync()}
            disabled={syncAll.isPending}
          >
            <RefreshCw className={cn('h-4 w-4', syncAll.isPending && 'animate-spin')} />
            <span className="hidden sm:inline">
              {syncAll.isPending ? 'Syncing...' : 'Sync'}
            </span>
          </Button>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- **IMPORTS**: Add `cn` import from `@/lib/utils`
- **GOTCHA**: Make sure `useToast` hook is properly exported from toaster component
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 8: CHECK and UPDATE toast hook if needed

- **CHECK**: Read `src/components/ui/toaster.tsx` to verify `useToast` is exported
- **IMPLEMENT**: If `useToast` is not exported, you may need to use a different notification pattern or add the export

- **VALIDATE**: `npm run typecheck`

---

### Task 9: Delete old CreateRuleDialog references

- **IMPLEMENT**: Search codebase for any remaining imports of `CreateRuleDialog` and update them to `ApplyToSimilarDialog`

- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 10: UPDATE E2E tests - Add bulk apply test

- **IMPLEMENT**: Add to `e2e/categorization.spec.ts`:

```typescript
test.describe('Bulk Category Apply', () => {
  test('should show apply to similar dialog when changing category', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForTimeout(1000);

    // Find a transaction with a counterparty and click to change category
    const transactionRow = page.locator('.group').first();
    const categoryButton = transactionRow.locator('button:has-text("Uncategorized")');

    if (await categoryButton.isVisible()) {
      await categoryButton.click();

      // Select a category
      await page.getByRole('option').first().click();

      // Dialog should appear asking to apply to similar
      await expect(
        page.getByText(/apply to similar/i).or(page.getByText(/create rule/i))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
```

- **VALIDATE**: `npm run e2e`

---

### Task 11: UPDATE E2E tests - Add header sync button test

- **IMPLEMENT**: Add to `e2e/smoke.spec.ts` or create new `e2e/sync.spec.ts`:

```typescript
test.describe('Header Sync Button', () => {
  test('should show sync button in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Find sync button
    const syncButton = page.getByRole('button', { name: /sync/i });
    await expect(syncButton).toBeVisible();
  });

  test('should handle sync button click', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Click sync button
    const syncButton = page.getByRole('button', { name: /sync/i });
    await syncButton.click();

    // Should either show loading state or toast notification
    await expect(
      page.getByText(/syncing/i).or(page.getByText(/no bank connections/i)).or(page.getByText(/sync complete/i))
    ).toBeVisible({ timeout: 5000 });
  });
});
```

- **VALIDATE**: `npm run e2e`

---

### Task 12: Run full validation suite

- **IMPLEMENT**: Run all validation commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run e2e
```

- **VALIDATE**: All commands pass with zero errors

---

## TESTING STRATEGY

### Unit Tests

**Location:** `src/hooks/__tests__/useTransactions.test.ts`

Test the new hooks:
- `useBulkUpdateCategory` - batch update logic
- `useCountMatchingTransactions` - count query

### Integration Tests

The existing hooks tests cover TanStack Query integration.

### End-to-End (E2E) Tests

**Location:** `e2e/categorization.spec.ts`, `e2e/smoke.spec.ts`

**Required E2E test scenarios:**

1. **Bulk Apply Flow:**
   - Change category on transaction with matching counterparty
   - Dialog appears showing count of matching transactions
   - Click apply → all matching transactions updated
   - Rule created for future transactions

2. **Header Sync Button:**
   - Sync button visible in header
   - Click triggers sync (or shows "no connections" message)
   - Loading state shows during sync
   - Success/error toast appears

### Edge Cases

1. No matching transactions (only rule creation offered)
2. No counterparty on transaction (dialog doesn't appear)
3. No bank connections (sync button shows helpful message)
4. Sync fails for some connections (partial success message)
5. User skips both apply and rule creation

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run lint
npm run typecheck
npm run format:check
```

### Level 2: Unit Tests

```bash
npm run test
```

### Level 3: E2E Tests

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

### Level 4: Manual Validation

1. **Bulk Category Apply:**
   - [ ] Go to Transactions page
   - [ ] Find a transaction with a counterparty
   - [ ] Change its category
   - [ ] Dialog should appear showing matching count
   - [ ] Click Apply → verify all matching transactions updated
   - [ ] Check Categories page → verify rule was created

2. **Skip Rule Creation:**
   - [ ] Change a category
   - [ ] Uncheck "Create rule for future transactions"
   - [ ] Click Apply
   - [ ] Verify transactions updated but no rule created

3. **Header Sync:**
   - [ ] Click Sync button in header
   - [ ] If no connections: see "no bank connections" message
   - [ ] If connections exist: see loading spinner, then success toast
   - [ ] Transactions should refresh after sync

---

## ACCEPTANCE CRITERIA

- [ ] Changing category shows "Apply to similar" dialog when counterparty exists
- [ ] Dialog shows accurate count of matching transactions
- [ ] Clicking Apply updates all matching transactions
- [ ] Rule creation checkbox is checked by default
- [ ] Unchecking rule creation skips rule but still applies category
- [ ] Header sync button triggers sync for all active connections
- [ ] Sync button shows loading state during sync
- [ ] Sync shows appropriate toast messages (success/error/no connections)
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

---

## NOTES

### Design Decisions

1. **Matching by Counterparty Only**: We match transactions by exact counterparty rather than description patterns. This is more reliable because counterparty is a cleaned/normalized field from the bank, while descriptions can vary.

2. **Exclude Already Manual**: We don't overwrite transactions that were already manually categorized. This respects user corrections.

3. **Default Rule Creation On**: The checkbox for creating rules is checked by default because users who are categorizing likely want consistency. Power users can uncheck if they want one-time changes.

4. **Subtract 1 from Count**: The matchingCount shown to user subtracts 1 because the original transaction was already updated before the dialog opened.

5. **Sync All vs Individual**: The header sync button syncs all active connections rather than requiring users to choose. This is simpler for the common case.

### Known Limitations

- Bulk update is limited by Firestore batch size (500 docs). For users with very large transaction histories, this is handled with multiple batches.
- The sync button doesn't show per-connection progress, just overall success/failure.
- Rule pattern is pre-filled from counterparty; users can modify but the default is usually correct.

### Future Improvements

- Add undo for bulk category changes
- Show which specific connections failed during sync
- Add "last synced" timestamp in header
- Allow bulk apply by description pattern (not just counterparty)
