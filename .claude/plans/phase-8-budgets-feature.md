# Feature: Budgets - Spending Limits by Category

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

The Budgets feature enables users to set and track monthly spending limits for their categories. Users can create budgets for both parent categories (e.g., "Food & Drink") and child categories (e.g., "Groceries"), with visual progress indicators showing how much of each budget has been consumed. The feature integrates with the Dashboard for at-a-glance budget status and provides a dedicated Budgets page for full management.

Key capabilities:
- Set monthly spending limits per category (parent or child)
- Visual progress bars with color-coded status (green → yellow at 80% → red at 100%)
- Smart suggestions based on historical spending averages
- Proper handling of split transactions (each split counts toward its category)
- Exclusion of pending reimbursements from budget calculations
- Dashboard integration showing budget overview
- Dedicated Budgets page for CRUD operations

## User Story

As a Free Lunch user
I want to set monthly spending limits for my categories
So that I can monitor my spending and stay within my planned budget

## Problem Statement

Users currently have visibility into their spending patterns through the Dashboard's charts and summaries, but lack the ability to set targets or limits. Without budgets, users cannot:
- Proactively control spending before it exceeds their comfort level
- Get visual feedback on how close they are to overspending
- Plan their monthly finances with clear guardrails

## Solution Statement

Implement a complete Budgets feature that:
1. Adds a new `budgets` Firestore collection for storing user budget definitions
2. Creates a `useBudgets` hook following existing patterns for CRUD operations
3. Calculates budget progress by aggregating expenses from transactions
4. Displays budget status on Dashboard with progress bars
5. Provides a dedicated Budgets page for managing all budgets
6. Shows smart suggestions based on 3-month spending averages

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- `src/types/index.ts` - New Budget types
- `src/hooks/useBudgets.ts` - New hook for budget CRUD
- `src/hooks/useDashboardData.ts` - Budget progress calculations
- `src/pages/Budgets.tsx` - New page
- `src/pages/Dashboard.tsx` - Budget summary integration
- `src/components/budgets/*` - New components
- `src/components/dashboard/BudgetProgress.tsx` - Dashboard widget
- `firestore.rules` - Add budgets collection rules

**Dependencies**: None (uses existing Firebase, React Query, shadcn/ui)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/types/index.ts` (lines 40-147) - Existing type patterns for Category, Transaction, SpendingSummary
- `src/hooks/useCategories.ts` (full file) - Hook pattern with CRUD mutations to follow exactly
- `src/hooks/useDashboardData.ts` (lines 130-199) - Spending calculation patterns, especially `calculateCategorySpending`
- `src/hooks/useTransactions.ts` - Alternative hook pattern with filters
- `src/pages/Categories.tsx` - Page structure pattern with dialogs for CRUD
- `src/pages/Dashboard.tsx` (lines 46-139) - Dashboard layout and component integration
- `src/components/categories/CategoryForm.tsx` - Form pattern with Zod + React Hook Form
- `src/components/dashboard/SummaryCards.tsx` - Dashboard card component pattern
- `src/components/layout/Sidebar.tsx` (lines 5-11) - Navigation items array
- `src/components/layout/BottomNav.tsx` (lines 5-11) - Mobile navigation array
- `src/lib/utils.ts` (lines 14-28, 65-70) - formatAmount, getAmountColor utilities
- `firestore.rules` (lines 17-38) - Security rules pattern for subcollections

### New Files to Create

- `src/types/index.ts` - ADD Budget and BudgetFormData types (modify existing)
- `src/hooks/useBudgets.ts` - Budget CRUD hook
- `src/hooks/useBudgetProgress.ts` - Budget progress calculation hook
- `src/pages/Budgets.tsx` - Budgets management page
- `src/components/budgets/BudgetForm.tsx` - Create/edit budget dialog
- `src/components/budgets/BudgetList.tsx` - List of budgets with progress
- `src/components/budgets/BudgetCard.tsx` - Individual budget card with progress bar
- `src/components/dashboard/BudgetOverview.tsx` - Dashboard budget summary widget
- `src/components/ui/progress.tsx` - Progress bar component (if not exists)
- `src/hooks/__tests__/useBudgets.test.ts` - Unit tests
- `e2e/budgets.spec.ts` - E2E tests

### Relevant Documentation

- [TanStack Query Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
  - Why: Pattern for optimistic updates and cache invalidation
- [React Hook Form with Zod](https://react-hook-form.com/get-started#SchemaValidation)
  - Why: Form validation pattern used throughout the app
- [shadcn/ui Progress](https://ui.shadcn.com/docs/components/progress)
  - Why: May need to add Progress component for budget bars
- [Recharts Bar Chart](https://recharts.org/en-US/api/Bar)
  - Why: Alternative visualization for budget vs actual

### Patterns to Follow

**Hook CRUD Pattern (from useCategories.ts):**
```typescript
export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BudgetFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const budgetRef = doc(db, 'users', user.id, 'budgets', id);
      await setDoc(budgetRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
```

**Form Pattern (from CategoryForm.tsx):**
```typescript
const budgetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  monthlyLimit: z.coerce.number().positive('Limit must be greater than 0'),
});

const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(budgetSchema),
  defaultValues: { ... },
});
```

**Page Layout Pattern (from Categories.tsx):**
```typescript
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
      <p className="text-muted-foreground">Set and monitor spending limits</p>
    </div>
    <Button onClick={handleNewBudget}>
      <Plus className="mr-2 h-4 w-4" />
      New Budget
    </Button>
  </div>
  {/* Content */}
</div>
```

**Dashboard Card Pattern (from SummaryCards.tsx):**
```typescript
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Title</CardTitle>
    <Icon className="h-4 w-4 text-color" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold tabular-nums">Value</div>
    <p className="text-xs text-muted-foreground">Subtitle</p>
  </CardContent>
</Card>
```

**Navigation Item Pattern (from Sidebar.tsx):**
```typescript
{ href: '/budgets', label: 'Budgets', icon: PiggyBank },
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - Types and Data Layer

Set up the data model and Firestore configuration.

**Tasks:**
- Add Budget types to src/types/index.ts
- Update Firestore security rules for budgets collection
- Create useBudgets hook with CRUD operations
- Create useBudgetProgress hook for calculations

### Phase 2: Core Components

Build the reusable UI components for budgets.

**Tasks:**
- Add Progress component if not present
- Create BudgetCard component with progress bar
- Create BudgetList component
- Create BudgetForm dialog component

### Phase 3: Budgets Page

Create the dedicated Budgets management page.

**Tasks:**
- Create Budgets page with list view
- Add create/edit/delete functionality
- Add smart suggestions based on historical spending
- Add navigation items to Sidebar and BottomNav

### Phase 4: Dashboard Integration

Add budget overview to the Dashboard.

**Tasks:**
- Create BudgetOverview component
- Integrate into Dashboard page
- Show top budgets with progress

### Phase 5: Testing & Validation

Comprehensive testing of the feature.

**Tasks:**
- Add unit tests for useBudgets hook
- Add unit tests for budget progress calculations
- Add E2E tests for Budgets page
- Add E2E tests for Dashboard budget widget

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: UPDATE `src/types/index.ts` - Add Budget types

- **IMPLEMENT**: Add the following types after the CategorizationRule interface (around line 120):

```typescript
// ============================================================================
// Budget Types
// ============================================================================

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  /** Monthly spending limit in EUR */
  monthlyLimit: number;
  /** Percentage threshold for warning (default 80) */
  alertThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetFormData {
  name: string;
  categoryId: string;
  monthlyLimit: number;
  alertThreshold: number;
}

export interface BudgetProgress {
  budget: Budget;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}
```

- **PATTERN**: Follow existing interface naming (Budget, BudgetFormData like Category, CategoryFormData)
- **VALIDATE**: `npm run typecheck`

---

### Task 2: UPDATE `firestore.rules` - Add budgets subcollection

- **IMPLEMENT**: Add the budgets rules after the bankConnections match block (line 39):

```javascript
      // Budgets subcollection
      match /budgets/{budgetId} {
        allow read, write: if isOwner(userId);
      }
```

- **PATTERN**: Same pattern as categories, transactions, rules subcollections
- **VALIDATE**: `firebase deploy --only firestore:rules --project free-lunch-dev` (or skip for local dev)

---

### Task 3: CREATE `src/hooks/useBudgets.ts` - Budget CRUD hook

- **IMPLEMENT**: Create new file with full CRUD operations:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Budget, BudgetFormData } from '@/types';
import { generateId } from '@/lib/utils';

// Firestore document shape
interface BudgetDocument {
  name: string;
  categoryId: string;
  monthlyLimit: number;
  alertThreshold?: number;
  isActive?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Query keys
export const budgetKeys = {
  all: (userId: string) => ['budgets', userId] as const,
};

// Transform Firestore data to Budget type
function transformBudget(docSnap: QueryDocumentSnapshot): Budget {
  const data = docSnap.data() as BudgetDocument;
  return {
    id: docSnap.id,
    name: data.name,
    categoryId: data.categoryId,
    monthlyLimit: data.monthlyLimit,
    alertThreshold: data.alertThreshold ?? 80,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export function useBudgets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: budgetKeys.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const budgetsRef = collection(db, 'users', user.id, 'budgets');
      const q = query(budgetsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformBudget);
    },
    enabled: !!user?.id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BudgetFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const budgetRef = doc(db, 'users', user.id, 'budgets', id);
      await setDoc(budgetRef, {
        ...data,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetFormData> }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const budgetRef = doc(db, 'users', user.id, 'budgets', id);
      await updateDoc(budgetRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const budgetRef = doc(db, 'users', user.id, 'budgets', id);
      await deleteDoc(budgetRef);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
```

- **PATTERN**: Mirror `useCategories.ts` exactly
- **IMPORTS**: All Firebase imports from firebase/firestore
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 4: CREATE `src/hooks/useBudgetProgress.ts` - Budget progress calculations

- **IMPLEMENT**: Create new file for calculating budget progress:

```typescript
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories, buildCategoryTree, getFlatCategoriesWithLevel } from '@/hooks/useCategories';
import type { Budget, BudgetProgress, Transaction, Category } from '@/types';

// Query keys
export const budgetProgressKeys = {
  current: (userId: string) => ['budgetProgress', userId, 'current'] as const,
  suggestions: (userId: string) => ['budgetProgress', userId, 'suggestions'] as const,
};

interface SpendingByCategory {
  categoryId: string;
  amount: number;
}

/**
 * Calculate spending by category for a date range, handling splits and excluding pending reimbursements
 */
function calculateSpendingByCategory(
  transactions: Transaction[],
  categories: Category[]
): SpendingByCategory[] {
  const spending = new Map<string, number>();

  // Build a map of child -> parent for rollup
  const categoryMap = new Map<string, Category>();
  categories.forEach(c => categoryMap.set(c.id, c));

  transactions.forEach((t) => {
    // Skip income and pending reimbursements
    if (t.amount >= 0) return;
    if (t.reimbursement?.status === 'pending') return;

    const absAmount = Math.abs(t.amount);

    if (t.isSplit && t.splits) {
      // Handle split transactions - each split counts toward its category
      t.splits.forEach((split) => {
        if (split.amount < 0) return; // splits are positive amounts
        const current = spending.get(split.categoryId) ?? 0;
        spending.set(split.categoryId, current + split.amount);

        // Also add to parent category if exists
        const category = categoryMap.get(split.categoryId);
        if (category?.parentId) {
          const parentCurrent = spending.get(category.parentId) ?? 0;
          spending.set(category.parentId, parentCurrent + split.amount);
        }
      });
    } else if (t.categoryId) {
      // Regular transaction
      const current = spending.get(t.categoryId) ?? 0;
      spending.set(t.categoryId, current + absAmount);

      // Also add to parent category if exists
      const category = categoryMap.get(t.categoryId);
      if (category?.parentId) {
        const parentCurrent = spending.get(category.parentId) ?? 0;
        spending.set(category.parentId, parentCurrent + absAmount);
      }
    }
  });

  return Array.from(spending.entries()).map(([categoryId, amount]) => ({
    categoryId,
    amount,
  }));
}

/**
 * Hook to get current month's budget progress
 */
export function useBudgetProgress() {
  const { user } = useAuth();
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();

  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];
      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsRef,
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          amount: data.amount,
          categoryId: data.categoryId ?? null,
          isSplit: data.isSplit ?? false,
          splits: data.splits ?? null,
          reimbursement: data.reimbursement ?? null,
        } as Transaction;
      });
    },
    enabled: !!user?.id,
  });

  const budgetProgress = useMemo((): BudgetProgress[] => {
    if (!budgets.length || !categories.length) return [];

    const spending = calculateSpendingByCategory(transactions, categories);
    const spendingMap = new Map(spending.map((s) => [s.categoryId, s.amount]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return budgets
      .filter((b) => b.isActive)
      .map((budget): BudgetProgress => {
        const category = categoryMap.get(budget.categoryId);
        const spent = spendingMap.get(budget.categoryId) ?? 0;
        const remaining = Math.max(0, budget.monthlyLimit - spent);
        const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

        let status: 'safe' | 'warning' | 'exceeded' = 'safe';
        if (percentage >= 100) {
          status = 'exceeded';
        } else if (percentage >= budget.alertThreshold) {
          status = 'warning';
        }

        return {
          budget,
          categoryName: category?.name ?? 'Unknown',
          categoryIcon: category?.icon ?? '📁',
          categoryColor: category?.color ?? '#9CA3AF',
          spent,
          remaining,
          percentage,
          status,
        };
      })
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
  }, [budgets, categories, transactions]);

  return {
    data: budgetProgress,
    isLoading,
  };
}

/**
 * Hook to get spending suggestions based on 3-month average
 */
export function useBudgetSuggestions() {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();

  const now = new Date();
  const threeMonthsAgo = subMonths(startOfMonth(now), 3);
  const endDate = endOfMonth(subMonths(now, 1)); // End of last month

  return useQuery({
    queryKey: budgetProgressKeys.suggestions(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return new Map<string, number>();

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsRef,
        where('date', '>=', Timestamp.fromDate(threeMonthsAgo)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);

      const transactions = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          amount: data.amount,
          categoryId: data.categoryId ?? null,
          isSplit: data.isSplit ?? false,
          splits: data.splits ?? null,
          reimbursement: data.reimbursement ?? null,
        } as Transaction;
      });

      const spending = calculateSpendingByCategory(transactions, categories);

      // Calculate 3-month average (divide by 3)
      const suggestions = new Map<string, number>();
      spending.forEach(({ categoryId, amount }) => {
        suggestions.set(categoryId, Math.round((amount / 3) * 100) / 100);
      });

      return suggestions;
    },
    enabled: !!user?.id && categories.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes - suggestions don't need frequent updates
  });
}
```

- **PATTERN**: Follows useDashboardData.ts calculation patterns
- **IMPORTS**: date-fns for date handling (already in project)
- **GOTCHA**: Handle split transactions - each split counts toward its category
- **GOTCHA**: Exclude pending reimbursements from calculations
- **GOTCHA**: Roll up child category spending to parent if budget is on parent
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 5: CREATE `src/components/ui/progress.tsx` - Progress bar component

- **IMPLEMENT**: Add shadcn/ui Progress component:

```typescript
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
  }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        'h-full w-full flex-1 bg-primary transition-all',
        indicatorClassName
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
```

- **PATTERN**: Standard shadcn/ui component pattern
- **IMPORTS**: Need to add @radix-ui/react-progress
- **VALIDATE**: `npm install @radix-ui/react-progress && npm run typecheck`

---

### Task 6: CREATE `src/components/budgets/BudgetCard.tsx` - Budget card with progress

- **IMPLEMENT**: Create new file:

```typescript
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn, formatAmount } from '@/lib/utils';
import type { BudgetProgress } from '@/types';

interface BudgetCardProps {
  progress: BudgetProgress;
  onClick?: () => void;
}

export function BudgetCard({ progress, onClick }: BudgetCardProps) {
  const { budget, categoryName, categoryIcon, spent, remaining, percentage, status } = progress;

  const statusColors = {
    safe: 'bg-emerald-500',
    warning: 'bg-amber-500',
    exceeded: 'bg-red-500',
  };

  const statusTextColors = {
    safe: 'text-emerald-500',
    warning: 'text-amber-500',
    exceeded: 'text-red-500',
  };

  return (
    <Card
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span>{categoryIcon}</span>
          <span>{budget.name}</span>
        </CardTitle>
        {status === 'exceeded' && (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
        {status === 'warning' && (
          <TrendingUp className="h-4 w-4 text-amber-500" />
        )}
        {status === 'safe' && percentage > 0 && (
          <TrendingDown className="h-4 w-4 text-emerald-500" />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress
          value={Math.min(percentage, 100)}
          className="h-2"
          indicatorClassName={statusColors[status]}
        />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {formatAmount(spent, { showSign: false })} of{' '}
            {formatAmount(budget.monthlyLimit, { showSign: false })}
          </span>
          <span className={cn('font-medium tabular-nums', statusTextColors[status])}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{categoryName}</span>
          <span>
            {status === 'exceeded'
              ? `${formatAmount(spent - budget.monthlyLimit, { showSign: false })} over`
              : `${formatAmount(remaining, { showSign: false })} left`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- **PATTERN**: Follow SummaryCards.tsx card structure
- **IMPORTS**: Use existing Card components and utils
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 7: CREATE `src/components/budgets/BudgetForm.tsx` - Create/edit budget dialog

- **IMPLEMENT**: Create new file:

```typescript
import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
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
import { useCategories, buildCategoryTree, getFlatCategoriesWithLevel } from '@/hooks/useCategories';
import { useBudgetSuggestions } from '@/hooks/useBudgetProgress';
import { formatAmount } from '@/lib/utils';
import type { Budget, BudgetFormData } from '@/types';

const budgetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  monthlyLimit: z.coerce.number().positive('Limit must be greater than 0'),
  alertThreshold: z.coerce.number().min(1, 'Must be 1-100').max(100, 'Must be 1-100'),
});

type FormValues = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
  onSubmit: (data: BudgetFormData) => Promise<void>;
  isSubmitting?: boolean;
  existingBudgetCategoryIds?: string[];
}

export function BudgetForm({
  open,
  onOpenChange,
  budget,
  onSubmit,
  isSubmitting = false,
  existingBudgetCategoryIds = [],
}: BudgetFormProps) {
  const isEditing = !!budget;
  const { data: categories = [] } = useCategories();
  const { data: suggestions } = useBudgetSuggestions();

  // Build flat category list with hierarchy indication
  const flatCategories = useMemo(() => {
    const tree = buildCategoryTree(categories);
    return getFlatCategoriesWithLevel(tree);
  }, [categories]);

  // Filter out categories that already have budgets (except current one when editing)
  const availableCategories = useMemo(() => {
    return flatCategories.filter(
      (c) => !existingBudgetCategoryIds.includes(c.id) || c.id === budget?.categoryId
    );
  }, [flatCategories, existingBudgetCategoryIds, budget?.categoryId]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      monthlyLimit: 0,
      alertThreshold: 80,
    },
  });

  const selectedCategoryId = watch('categoryId');
  const suggestedAmount = suggestions?.get(selectedCategoryId);

  useEffect(() => {
    if (open) {
      if (budget) {
        reset({
          name: budget.name,
          categoryId: budget.categoryId,
          monthlyLimit: budget.monthlyLimit,
          alertThreshold: budget.alertThreshold,
        });
      } else {
        reset({
          name: '',
          categoryId: '',
          monthlyLimit: 0,
          alertThreshold: 80,
        });
      }
    }
  }, [open, budget, reset]);

  // Auto-fill name when category changes (only for new budgets)
  useEffect(() => {
    if (!isEditing && selectedCategoryId) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      if (category) {
        setValue('name', `${category.name} Budget`);
      }
    }
  }, [selectedCategoryId, categories, isEditing, setValue]);

  const handleFormSubmit = async (data: FormValues) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const handleUseSuggestion = () => {
    if (suggestedAmount) {
      setValue('monthlyLimit', Math.ceil(suggestedAmount));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Budget' : 'New Budget'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the budget settings below.'
              : 'Create a new budget to track spending by category.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span style={{ paddingLeft: `${cat.level * 12}px` }}>
                          {cat.icon} {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Budget Name</Label>
            <Input
              id="name"
              placeholder="e.g., Monthly Groceries"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Monthly Limit */}
          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">Monthly Limit (EUR)</Label>
            <div className="flex gap-2">
              <Input
                id="monthlyLimit"
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                className="flex-1"
                {...register('monthlyLimit')}
              />
              {suggestedAmount && suggestedAmount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseSuggestion}
                  title={`Based on your 3-month average: ${formatAmount(suggestedAmount, { showSign: false })}`}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {formatAmount(Math.ceil(suggestedAmount), { showSign: false })}
                </Button>
              )}
            </div>
            {suggestedAmount && suggestedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Your 3-month average:{' '}
                {formatAmount(suggestedAmount, { showSign: false })}/month
              </p>
            )}
            {errors.monthlyLimit && (
              <p className="text-sm text-destructive">{errors.monthlyLimit.message}</p>
            )}
          </div>

          {/* Alert Threshold */}
          <div className="space-y-2">
            <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
            <Input
              id="alertThreshold"
              type="number"
              min="1"
              max="100"
              placeholder="80"
              {...register('alertThreshold')}
            />
            <p className="text-xs text-muted-foreground">
              Progress bar turns yellow when spending reaches this percentage
            </p>
            {errors.alertThreshold && (
              <p className="text-sm text-destructive">{errors.alertThreshold.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- **PATTERN**: Mirror CategoryForm.tsx exactly
- **IMPORTS**: Use existing form components and hooks
- **FEATURE**: Smart suggestions button shows 3-month average
- **GOTCHA**: Category dropdown shows hierarchy with indentation
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 8: CREATE `src/components/budgets/BudgetList.tsx` - Budget list component

- **IMPLEMENT**: Create new file:

```typescript
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BudgetCard } from './BudgetCard';
import type { BudgetProgress, Budget } from '@/types';

interface BudgetListProps {
  budgetProgress: BudgetProgress[];
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}

export function BudgetList({ budgetProgress, onEdit, onDelete }: BudgetListProps) {
  if (budgetProgress.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">
          No budgets yet. Create one to start tracking your spending.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {budgetProgress.map((progress) => (
        <div key={progress.budget.id} className="group relative">
          <BudgetCard progress={progress} />
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(progress.budget)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(progress.budget)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- **PATTERN**: Similar to category list with hover actions
- **IMPORTS**: DropdownMenu from existing UI components
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 9: CREATE `src/components/budgets/index.ts` - Export barrel file

- **IMPLEMENT**: Create new file:

```typescript
export { BudgetCard } from './BudgetCard';
export { BudgetForm } from './BudgetForm';
export { BudgetList } from './BudgetList';
```

- **VALIDATE**: `npm run typecheck`

---

### Task 10: CREATE `src/pages/Budgets.tsx` - Budgets management page

- **IMPLEMENT**: Create new file:

```typescript
import { useState } from 'react';
import { Plus, AlertTriangle, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetList, BudgetForm } from '@/components/budgets';
import {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '@/hooks/useBudgets';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { formatAmount } from '@/lib/utils';
import type { Budget, BudgetFormData } from '@/types';

export function Budgets() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);

  const { data: budgets = [], isLoading: budgetsLoading, error } = useBudgets();
  const { data: budgetProgress = [], isLoading: progressLoading } = useBudgetProgress();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const isLoading = budgetsLoading || progressLoading;

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormOpen(true);
  };

  const handleDelete = (budget: Budget) => {
    setDeleteBudget(budget);
  };

  const handleFormSubmit = async (data: BudgetFormData) => {
    if (editingBudget) {
      await updateMutation.mutateAsync({ id: editingBudget.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditingBudget(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteBudget) {
      await deleteMutation.mutateAsync(deleteBudget.id);
      setDeleteBudget(null);
    }
  };

  const handleNewBudget = () => {
    setEditingBudget(null);
    setFormOpen(true);
  };

  // Calculate summary stats
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = budgetProgress.reduce((sum, p) => sum + p.spent, 0);
  const exceededCount = budgetProgress.filter((p) => p.status === 'exceeded').length;
  const warningCount = budgetProgress.filter((p) => p.status === 'warning').length;

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load budgets</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set and monitor spending limits by category</p>
        </div>
        <Button onClick={handleNewBudget}>
          <Plus className="mr-2 h-4 w-4" />
          New Budget
        </Button>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(totalBudgeted, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">{budgets.length} budget(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(totalSpent, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalBudgeted > 0
                  ? `${((totalSpent / totalBudgeted) * 100).toFixed(0)}% of budget`
                  : 'No budgets set'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Track</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-emerald-500">
                {budgetProgress.filter((p) => p.status === 'safe').length}
              </div>
              <p className="text-xs text-muted-foreground">budgets within limit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              {(exceededCount > 0 || warningCount > 0) && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                <span className="text-red-500">{exceededCount}</span>
                {warningCount > 0 && (
                  <>
                    {' / '}
                    <span className="text-amber-500">{warningCount}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">exceeded / warning</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget list */}
      <Card>
        <CardHeader>
          <CardTitle>Your Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <BudgetList
              budgetProgress={budgetProgress}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Budget Form Dialog */}
      <BudgetForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingBudget(null);
        }}
        budget={editingBudget}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        existingBudgetCategoryIds={budgets.map((b) => b.categoryId)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteBudget}
        onOpenChange={(open) => {
          if (!open) setDeleteBudget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteBudget?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBudget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- **PATTERN**: Mirror Categories.tsx page structure exactly
- **IMPORTS**: Use existing UI components and hooks
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 11: UPDATE `src/App.tsx` - Add Budgets route

- **IMPLEMENT**: Add import and route:

```typescript
// Add import at top with other page imports
import { Budgets } from '@/pages/Budgets';

// Add route inside the protected routes section (after categories, before reimbursements)
<Route path="budgets" element={<Budgets />} />
```

- **PATTERN**: Same pattern as other routes
- **VALIDATE**: `npm run typecheck`

---

### Task 12: UPDATE `src/components/layout/Sidebar.tsx` - Add Budgets navigation

- **IMPLEMENT**: Update imports and navItems array:

```typescript
// Update import to include PiggyBank
import { LayoutDashboard, ArrowLeftRight, Tags, Receipt, Settings, PiggyBank } from 'lucide-react';

// Update navItems array (add after Categories, before Reimbursements)
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/reimbursements', label: 'Reimbursements', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
];
```

- **PATTERN**: Same pattern as existing nav items
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 13: UPDATE `src/components/layout/BottomNav.tsx` - Add Budgets mobile navigation

- **IMPLEMENT**: Update imports and navItems array (same as Sidebar):

```typescript
// Update import to include PiggyBank
import { LayoutDashboard, ArrowLeftRight, Tags, Receipt, Settings, PiggyBank } from 'lucide-react';

// Update navItems array (add after Categories, before Reimbursements)
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/reimbursements', label: 'Reimburse', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
];
```

- **GOTCHA**: Mobile nav might be crowded with 6 items - consider if this needs design adjustment
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 14: CREATE `src/components/dashboard/BudgetOverview.tsx` - Dashboard widget

- **IMPLEMENT**: Create new file:

```typescript
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetProgress } from '@/hooks/useBudgetProgress';
import { formatAmount, cn } from '@/lib/utils';

export function BudgetOverview() {
  const { data: budgetProgress = [], isLoading } = useBudgetProgress();

  // Show top 4 budgets, prioritizing exceeded/warning
  const displayBudgets = [...budgetProgress]
    .sort((a, b) => {
      // Sort by status priority (exceeded > warning > safe), then by percentage
      const statusOrder = { exceeded: 0, warning: 1, safe: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.percentage - a.percentage;
    })
    .slice(0, 4);

  const statusColors = {
    safe: 'bg-emerald-500',
    warning: 'bg-amber-500',
    exceeded: 'bg-red-500',
  };

  const statusTextColors = {
    safe: 'text-emerald-500',
    warning: 'text-amber-500',
    exceeded: 'text-red-500',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (budgetProgress.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-sm text-muted-foreground">No budgets set up yet</p>
            <Button asChild variant="link" className="mt-2">
              <Link to="/budgets">Create your first budget</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const exceededCount = budgetProgress.filter((p) => p.status === 'exceeded').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Budget Status</CardTitle>
          {exceededCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {exceededCount} exceeded
            </span>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/budgets">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayBudgets.map((progress) => (
          <div key={progress.budget.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span>{progress.categoryIcon}</span>
                {progress.budget.name}
              </span>
              <span className={cn('tabular-nums', statusTextColors[progress.status])}>
                {progress.percentage.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={Math.min(progress.percentage, 100)}
              className="h-2"
              indicatorClassName={statusColors[progress.status]}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatAmount(progress.spent, { showSign: false })} /{' '}
                {formatAmount(progress.budget.monthlyLimit, { showSign: false })}
              </span>
              <span>
                {progress.status === 'exceeded'
                  ? `${formatAmount(progress.spent - progress.budget.monthlyLimit, { showSign: false })} over`
                  : `${formatAmount(progress.remaining, { showSign: false })} left`}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- **PATTERN**: Similar to RecentTransactions component
- **FEATURE**: Shows top 4 budgets prioritizing exceeded/warning status
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 15: UPDATE `src/components/dashboard/index.ts` - Export BudgetOverview

- **IMPLEMENT**: Add export:

```typescript
export { BudgetOverview } from './BudgetOverview';
```

- **VALIDATE**: `npm run typecheck`

---

### Task 16: UPDATE `src/pages/Dashboard.tsx` - Add BudgetOverview widget

- **IMPLEMENT**: Import and add BudgetOverview component:

```typescript
// Update import
import {
  SummaryCards,
  SpendingByCategoryChart,
  SpendingOverTimeChart,
  RecentTransactions,
  BudgetOverview,
} from '@/components/dashboard';

// Add BudgetOverview in the charts section (after the existing 2-column grid, before Recent Transactions)
// Around line 122, add:

      {/* Budget overview */}
      <BudgetOverview />

      {/* Recent transactions */}
```

- **PATTERN**: Same Card-based layout as other dashboard sections
- **VALIDATE**: `npm run typecheck && npm run lint`

---

### Task 17: CREATE `src/hooks/__tests__/useBudgets.test.ts` - Unit tests

- **IMPLEMENT**: Create new file:

```typescript
import { describe, it, expect } from 'vitest';
import type { Budget, BudgetProgress, Transaction, Category } from '@/types';

// Mock data helpers
function createMockBudget(overrides?: Partial<Budget>): Budget {
  return {
    id: 'budget-1',
    name: 'Groceries Budget',
    categoryId: 'food-groceries',
    monthlyLimit: 500,
    alertThreshold: 80,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    externalId: null,
    date: new Date(),
    description: 'Test Transaction',
    amount: -50,
    currency: 'EUR',
    counterparty: null,
    categoryId: 'food-groceries',
    categoryConfidence: 0,
    categorySource: 'manual',
    isSplit: false,
    splits: null,
    reimbursement: null,
    bankAccountId: null,
    importedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Budget calculations', () => {
  describe('Progress calculation', () => {
    it('calculates correct percentage for partial spending', () => {
      const budget = createMockBudget({ monthlyLimit: 500 });
      const spent = 250;
      const percentage = (spent / budget.monthlyLimit) * 100;

      expect(percentage).toBe(50);
    });

    it('calculates percentage over 100 when exceeded', () => {
      const budget = createMockBudget({ monthlyLimit: 500 });
      const spent = 600;
      const percentage = (spent / budget.monthlyLimit) * 100;

      expect(percentage).toBe(120);
    });

    it('handles zero limit gracefully', () => {
      const budget = createMockBudget({ monthlyLimit: 0 });
      const spent = 100;
      const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

      expect(percentage).toBe(0);
    });
  });

  describe('Status determination', () => {
    it('returns "safe" when under alert threshold', () => {
      const budget = createMockBudget({ monthlyLimit: 500, alertThreshold: 80 });
      const spent = 300; // 60%
      const percentage = (spent / budget.monthlyLimit) * 100;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= budget.alertThreshold) status = 'warning';

      expect(status).toBe('safe');
    });

    it('returns "warning" when at alert threshold', () => {
      const budget = createMockBudget({ monthlyLimit: 500, alertThreshold: 80 });
      const spent = 400; // 80%
      const percentage = (spent / budget.monthlyLimit) * 100;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= budget.alertThreshold) status = 'warning';

      expect(status).toBe('warning');
    });

    it('returns "exceeded" when over 100%', () => {
      const budget = createMockBudget({ monthlyLimit: 500, alertThreshold: 80 });
      const spent = 550; // 110%
      const percentage = (spent / budget.monthlyLimit) * 100;

      let status: 'safe' | 'warning' | 'exceeded' = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= budget.alertThreshold) status = 'warning';

      expect(status).toBe('exceeded');
    });
  });

  describe('Transaction filtering', () => {
    it('excludes income (positive amounts) from budget calculations', () => {
      const incomeTransaction = createMockTransaction({ amount: 100 }); // positive = income
      const shouldInclude = incomeTransaction.amount < 0;

      expect(shouldInclude).toBe(false);
    });

    it('includes expenses (negative amounts) in budget calculations', () => {
      const expenseTransaction = createMockTransaction({ amount: -50 }); // negative = expense
      const shouldInclude = expenseTransaction.amount < 0;

      expect(shouldInclude).toBe(true);
    });

    it('excludes pending reimbursements from budget calculations', () => {
      const reimbursableTransaction = createMockTransaction({
        amount: -50,
        reimbursement: { type: 'work', note: null, status: 'pending', linkedTransactionId: null, clearedAt: null },
      });
      const shouldInclude =
        reimbursableTransaction.amount < 0 &&
        reimbursableTransaction.reimbursement?.status !== 'pending';

      expect(shouldInclude).toBe(false);
    });

    it('includes cleared reimbursements in budget calculations', () => {
      const clearedTransaction = createMockTransaction({
        amount: -50,
        reimbursement: { type: 'work', note: null, status: 'cleared', linkedTransactionId: 'tx-2', clearedAt: new Date() },
      });
      const shouldInclude =
        clearedTransaction.amount < 0 &&
        clearedTransaction.reimbursement?.status !== 'pending';

      expect(shouldInclude).toBe(true);
    });
  });

  describe('Split transaction handling', () => {
    it('counts each split toward its respective category', () => {
      const splitTransaction = createMockTransaction({
        amount: -100,
        isSplit: true,
        splits: [
          { amount: 60, categoryId: 'food-groceries', note: null },
          { amount: 40, categoryId: 'food-restaurants', note: null },
        ],
      });

      const spendingByCategory = new Map<string, number>();

      if (splitTransaction.isSplit && splitTransaction.splits) {
        splitTransaction.splits.forEach((split) => {
          const current = spendingByCategory.get(split.categoryId) ?? 0;
          spendingByCategory.set(split.categoryId, current + split.amount);
        });
      }

      expect(spendingByCategory.get('food-groceries')).toBe(60);
      expect(spendingByCategory.get('food-restaurants')).toBe(40);
    });
  });
});
```

- **PATTERN**: Follow existing test patterns in hooks/__tests__/
- **VALIDATE**: `npm run test`

---

### Task 18: CREATE `e2e/budgets.spec.ts` - E2E tests

- **IMPLEMENT**: Create new file:

```typescript
import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

const test = base.extend<{ loggedInPage: ReturnType<typeof base.extend> }>({});

async function canAuthenticate(page: ReturnType<typeof base.extend>['page']) {
  try {
    const registered = await register(page as any);
    if (registered) return true;
    const loggedIn = await login(page as any);
    return loggedIn;
  } catch {
    return false;
  }
}

test.describe('Budgets Page', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();

    if (!authAvailable) {
      console.warn(
        '\n⚠️  Skipping authenticated tests - Firebase emulators not running.\n' +
          '   To run: npm run firebase:emulators && npm run e2e\n'
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/budgets');
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display the budgets page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible();
    await expect(page.getByText(/set and monitor spending limits/i)).toBeVisible();
  });

  test('should have a "New Budget" button', async ({ page }) => {
    const newBudgetButton = page.getByRole('button', { name: /new budget/i });
    await expect(newBudgetButton).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    await expect(page.getByText('Total Budgeted', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Spent', { exact: true })).toBeVisible();
    await expect(page.getByText('On Track', { exact: true })).toBeVisible();
    await expect(page.getByText('Needs Attention', { exact: true })).toBeVisible();
  });

  test('should open new budget dialog when clicking "New Budget"', async ({ page }) => {
    await page.getByRole('button', { name: /new budget/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /new budget/i })).toBeVisible();
    await expect(page.getByLabel(/category/i)).toBeVisible();
    await expect(page.getByLabel(/monthly limit/i)).toBeVisible();
  });

  test('should validate required fields in budget form', async ({ page }) => {
    await page.getByRole('button', { name: /new budget/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /create budget/i }).click();

    // Should show validation errors
    await expect(page.getByText(/category is required/i)).toBeVisible();
  });

  test('should close dialog when clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /new budget/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should create a new budget', async ({ page }) => {
    await page.getByRole('button', { name: /new budget/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select a category
    await page.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();

    // Fill in the limit
    await page.getByLabel(/monthly limit/i).fill('500');

    // Submit
    await page.getByRole('button', { name: /create budget/i }).click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Budget should appear in the list (look for progress bar or budget name)
    await expect(page.locator('[class*="progress"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show budget in navigation', async ({ page }) => {
    // Check sidebar navigation
    await expect(page.getByRole('link', { name: /budgets/i })).toBeVisible();
  });
});

test.describe('Dashboard Budget Widget', () => {
  test.describe.configure({ mode: 'serial' });

  let authAvailable = false;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    authAvailable = await canAuthenticate(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!authAvailable, 'Authentication not available - run Firebase emulators');
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display budget status card on dashboard', async ({ page }) => {
    await expect(page.getByText('Budget Status', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should have link to budgets page from dashboard', async ({ page }) => {
    await expect(page.getByText('Budget Status', { exact: true })).toBeVisible({ timeout: 10000 });
    const viewAllLink = page.getByRole('link', { name: /view all/i });
    await expect(viewAllLink).toBeVisible();
  });
});
```

- **PATTERN**: Mirror e2e/categories.spec.ts exactly
- **IMPORTS**: Use same auth fixtures
- **VALIDATE**: `npm run e2e`

---

### Task 19: RUN full validation suite

- **IMPLEMENT**: Execute all validation commands:

```bash
# Level 1: Syntax & Style
npm run lint
npm run typecheck
npm run format:check

# Level 2: Unit Tests
npm run test

# Level 3: Build
npm run build

# Level 4: E2E Tests (requires emulators)
npm run firebase:emulators &
sleep 10
npm run e2e
```

- **VALIDATE**: All commands pass with zero errors

---

## TESTING STRATEGY

### Unit Tests

**Location:** `src/hooks/__tests__/useBudgets.test.ts`

Test budget calculation logic:
- Percentage calculation (partial, over 100%)
- Status determination (safe, warning, exceeded)
- Transaction filtering (exclude income, pending reimbursements)
- Split transaction handling

### Integration Tests

The existing React Query mocking patterns apply - hooks are tested through component integration.

### End-to-End (E2E) Tests

**Location:** `e2e/budgets.spec.ts`

**CRITICAL: E2E tests are REQUIRED for this user-facing feature.**

Test scenarios:
- Page header and navigation visibility
- New Budget button and dialog opening
- Form validation (required fields)
- Budget creation flow
- Dashboard widget display
- Link navigation between Dashboard and Budgets page

**E2E Testing Requirements:**
- All tests require Firebase emulators running
- Use `{ exact: true }` for text matchers to avoid ambiguity
- Don't rely on `networkidle` - Firestore listeners keep network active
- Use realistic timeouts (10000ms) for data loading

### Edge Cases

1. User with no budgets - show empty state with CTA
2. User with no transactions - budgets show 0% progress
3. Budget for category with no spending - show 0%
4. Budget exceeded by more than 100% - show actual percentage
5. Category deleted that has budget - handle gracefully
6. Split transaction with category matching budget - count split portion
7. Pending reimbursement - should not count toward budget

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

### Level 3: Build

```bash
npm run build
```

### Level 4: E2E Tests

**REQUIRED: Run E2E tests in a real browser to verify user-facing functionality**

```bash
# Start Firebase emulators (REQUIRED for authenticated tests)
npm run firebase:emulators &
sleep 10

# Run E2E tests
npm run e2e

# Or run in headed mode for debugging
npm run e2e:headed
```

### Level 5: Manual Validation

1. Navigate to Budgets page from sidebar
2. Create a new budget for Groceries category
3. Verify smart suggestion appears based on historical spending
4. Verify budget appears in list with progress bar
5. Make a transaction in that category
6. Verify budget progress updates
7. Check Dashboard shows Budget Status widget
8. Edit an existing budget
9. Delete a budget
10. Verify mobile navigation works (BottomNav)

---

## ACCEPTANCE CRITERIA

- [ ] Users can create budgets for any category (parent or child)
- [ ] Budgets display progress bars with color coding (green/yellow/red)
- [ ] Alert threshold is configurable per budget (default 80%)
- [ ] Smart suggestions show 3-month spending average
- [ ] Split transactions count each split toward its category's budget
- [ ] Pending reimbursements are excluded from budget calculations
- [ ] Dashboard shows Budget Status widget with top budgets
- [ ] Budgets page shows summary cards (total budgeted, spent, on track, needs attention)
- [ ] Navigation includes Budgets in both Sidebar and BottomNav
- [ ] All validation commands pass with zero errors
- [ ] Unit tests cover calculation logic
- [ ] E2E tests verify full user flows
- [ ] No regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] All 19 tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + E2E)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

### Design Decisions

1. **Monthly periods only**: Based on user interview, keeping it simple with monthly budgets that reset on the 1st. No rollover complexity.

2. **Visual indicators only**: No push notifications or emails in MVP - just visual progress bars with color coding.

3. **Parent + child budgets**: Users can budget at any level. Spending rolls up to parent categories automatically.

4. **Exclude pending reimbursements**: Matches existing dashboard behavior where pending reimbursements don't count as personal expenses.

5. **Smart suggestions**: 3-month average provides reasonable starting point without being prescriptive.

### Known Limitations

- No budget history/tracking month-over-month (future enhancement)
- No budget templates or quick-copy functionality
- No budget sharing between accounts
- Mobile bottom nav may be crowded with 6 items - monitor for UX issues

### Future Improvements

- Add budget history chart showing spending vs limit over months
- Add notification preferences (email/push when threshold reached)
- Add budget templates for quick setup
- Add comparison to previous month's budget performance
- Consider removing one nav item or using a "More" menu on mobile

### Dependencies

- Requires `@radix-ui/react-progress` package (Task 5)
- Uses existing date-fns, TanStack Query, shadcn/ui components
