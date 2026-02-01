# Feature: Phase 2 - Core Features (Category Management & Transaction List)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Implement the core transaction management and category features that form the foundation of the Free Lunch personal finance app. This phase focuses on:

1. **Category Management** - Display hierarchical categories, allow CRUD operations
2. **Transaction List** - Display, search, filter transactions with category assignment
3. **Manual Transaction Entry** - Add transactions manually (for testing without bank connection)
4. **Data Layer** - TanStack Query hooks for Firestore data fetching

This is Phase 2 of the implementation roadmap, following the completed Phase 1 (Foundation).

## User Story

As a Free Lunch user
I want to view and manage my transactions with custom categories
So that I can track and understand my spending patterns

## Problem Statement

The app currently has:

- Authentication working (Firebase Auth)
- Default categories created on user signup
- Placeholder pages for Dashboard, Transactions, Categories
- No data fetching from Firestore
- No way to add or view transactions
- No way to manage categories

Users cannot interact with any financial data.

## Solution Statement

Build the data layer with TanStack Query hooks for categories and transactions, create reusable components for displaying and managing this data, and connect everything to provide a functional MVP experience.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**:

- `src/hooks/` - New data fetching hooks
- `src/components/categories/` - Category tree & forms
- `src/components/transactions/` - Transaction list, row, form
- `src/components/ui/` - New shadcn components (Input, Dialog, Select, Label, Badge)
- `src/pages/` - Categories.tsx, Transactions.tsx updates

**Dependencies**:

- TanStack Query (already installed)
- Firebase Firestore (already configured)
- React Hook Form + Zod (already installed)
- Radix UI primitives (already installed)

---

## CONTEXT REFERENCES

### Relevant Codebase Files - MUST READ BEFORE IMPLEMENTING

- `src/contexts/AuthContext.tsx` (lines 56-90) - Firestore pattern for fetching/creating documents
- `src/contexts/AuthContext.tsx` (lines 93-157) - Category creation pattern with serverTimestamp
- `src/types/index.ts` (full file) - All TypeScript interfaces for Category, Transaction, etc.
- `src/lib/firebase.ts` - Firebase initialization, exports `db` for Firestore
- `src/lib/utils.ts` - Utility functions including `formatAmount`, `formatDate`, `getAmountColor`, `cn`
- `src/lib/colors.ts` - Category colors and chart colors
- `src/components/ui/button.tsx` - Button component pattern using cva
- `src/components/ui/card.tsx` - Card component pattern
- `src/pages/auth/Login.tsx` - Form handling pattern with loading states and error handling
- `src/components/layout/Header.tsx` - Pattern for using `useAuth()` hook
- `src/App.tsx` (lines 19-26) - TanStack Query configuration (5-min stale time, 1 retry)

### New Files to Create

**Hooks (src/hooks/):**

- `src/hooks/useCategories.ts` - Fetch and mutate categories
- `src/hooks/useTransactions.ts` - Fetch, filter, mutate transactions

**UI Components (src/components/ui/):**

- `src/components/ui/input.tsx` - shadcn Input component
- `src/components/ui/label.tsx` - shadcn Label component
- `src/components/ui/dialog.tsx` - shadcn Dialog component
- `src/components/ui/select.tsx` - shadcn Select component
- `src/components/ui/badge.tsx` - shadcn Badge component
- `src/components/ui/skeleton.tsx` - Loading skeleton component

**Category Components (src/components/categories/):**

- `src/components/categories/CategoryTree.tsx` - Hierarchical category display
- `src/components/categories/CategoryItem.tsx` - Single category row
- `src/components/categories/CategoryForm.tsx` - Add/Edit category dialog
- `src/components/categories/CategoryBadge.tsx` - Category pill with icon & color

**Transaction Components (src/components/transactions/):**

- `src/components/transactions/TransactionList.tsx` - Main list container
- `src/components/transactions/TransactionRow.tsx` - Single transaction row
- `src/components/transactions/TransactionForm.tsx` - Add/Edit transaction dialog
- `src/components/transactions/TransactionFilters.tsx` - Search and filter controls
- `src/components/transactions/CategoryPicker.tsx` - Category selection dropdown

### Relevant Documentation - READ BEFORE IMPLEMENTING

- TanStack Query v5 Docs: https://tanstack.com/query/latest/docs/react/overview
  - useQuery: https://tanstack.com/query/latest/docs/react/reference/useQuery
  - useMutation: https://tanstack.com/query/latest/docs/react/reference/useMutation
  - Query Invalidation: https://tanstack.com/query/latest/docs/react/guides/query-invalidation
- Firebase Firestore: https://firebase.google.com/docs/firestore/query-data/get-data
  - Collection queries: https://firebase.google.com/docs/firestore/query-data/queries
  - Real-time updates: https://firebase.google.com/docs/firestore/query-data/listen
- shadcn/ui Components: https://ui.shadcn.com/docs/components
  - Dialog: https://ui.shadcn.com/docs/components/dialog
  - Select: https://ui.shadcn.com/docs/components/select
  - Input: https://ui.shadcn.com/docs/components/input
- React Hook Form + Zod: https://react-hook-form.com/get-started#SchemaValidation

### Patterns to Follow

**Naming Conventions:**

- Hooks: `use{Resource}` (e.g., `useCategories`, `useTransactions`)
- Components: PascalCase, descriptive (e.g., `TransactionRow`, `CategoryBadge`)
- Files: Match component/hook name exactly
- Types: Already defined in `src/types/index.ts`

**TanStack Query Pattern:**

```typescript
// Query key structure
const queryKeys = {
  categories: (userId: string) => ['categories', userId] as const,
  transactions: (userId: string, filters?: TransactionFilters) =>
    ['transactions', userId, filters] as const,
};

// useQuery pattern
export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.categories(user?.id ?? ''),
    queryFn: async () => {
      // Firestore query here
    },
    enabled: !!user?.id,
  });
}

// useMutation pattern with optimistic updates
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      // Firestore write here
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
```

**Firestore Query Pattern (from AuthContext.tsx):**

```typescript
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Fetch collection
const categoriesRef = collection(db, 'users', userId, 'categories');
const q = query(categoriesRef, orderBy('order'));
const snapshot = await getDocs(q);
const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

// Write document
const categoryRef = doc(db, 'users', userId, 'categories', categoryId);
await setDoc(categoryRef, {
  ...data,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
```

**Component Pattern (from button.tsx):**

```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva('base-classes', {
  variants: {
    variant: { default: '...', secondary: '...' },
    size: { default: '...', sm: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

interface ComponentProps extends VariantProps<typeof componentVariants> {
  // props
}
```

**Form Pattern (from Login.tsx):**

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);
  try {
    await doSomething();
  } catch {
    setError('Error message');
  } finally {
    setIsLoading(false);
  }
};
```

**Error Handling Pattern:**

```tsx
{
  error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
}
```

**Loading Pattern:**

```tsx
{
  isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: UI Component Foundation

Create the base shadcn/ui components needed for forms and data display. These are reusable primitives that will be used throughout the app.

**Tasks:**

- Create Input, Label, Dialog, Select, Badge, Skeleton components
- Follow shadcn/ui patterns with Radix UI primitives
- Ensure dark mode support via CSS variables

### Phase 2: Data Layer (Hooks)

Create TanStack Query hooks for fetching and mutating Firestore data. This establishes the data fetching patterns for the entire app.

**Tasks:**

- Create `useCategories` hook with query and mutations
- Create `useTransactions` hook with query, mutations, and filtering
- Implement query key structure for cache management
- Add optimistic updates for better UX

### Phase 3: Category Management

Build the category management interface with hierarchical display and CRUD operations.

**Tasks:**

- Create CategoryTree component for hierarchical display
- Create CategoryItem for individual category rows
- Create CategoryForm dialog for add/edit
- Create CategoryBadge for inline category display
- Update Categories page to use real data

### Phase 4: Transaction Management

Build the transaction list with filtering, search, and manual entry.

**Tasks:**

- Create TransactionList container component
- Create TransactionRow for individual transactions
- Create TransactionFilters for search/filter controls
- Create CategoryPicker for category selection
- Create TransactionForm for manual entry
- Update Transactions page to use real data

---

## STEP-BY-STEP TASKS

### PHASE 1: UI COMPONENTS

#### Task 1.1: CREATE `src/components/ui/input.tsx`

- **IMPLEMENT**: shadcn Input component with proper styling
- **PATTERN**: Follow `button.tsx` structure with forwardRef
- **IMPORTS**: `React`, `cn` from `@/lib/utils`
- **STYLING**: Match existing input styling from Login.tsx (lines 69-76)
- **VALIDATE**: `npm run typecheck`

```typescript
// Expected implementation structure
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

#### Task 1.2: CREATE `src/components/ui/label.tsx`

- **IMPLEMENT**: shadcn Label component using @radix-ui/react-label
- **PATTERN**: Follow button.tsx with cva for variants
- **IMPORTS**: `@radix-ui/react-label`, `cva`, `cn`
- **VALIDATE**: `npm run typecheck`

```typescript
// Expected implementation structure
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

#### Task 1.3: CREATE `src/components/ui/dialog.tsx`

- **IMPLEMENT**: shadcn Dialog using @radix-ui/react-dialog
- **PATTERN**: Export Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
- **IMPORTS**: `@radix-ui/react-dialog`, `X` from lucide-react, `cn`
- **STYLING**: Overlay with backdrop-blur, centered content, close button
- **VALIDATE**: `npm run typecheck`

#### Task 1.4: CREATE `src/components/ui/select.tsx`

- **IMPLEMENT**: shadcn Select using @radix-ui/react-select
- **PATTERN**: Export Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator
- **IMPORTS**: `@radix-ui/react-select`, `Check`, `ChevronDown`, `ChevronUp` from lucide-react
- **STYLING**: Match input styling, proper dropdown positioning
- **VALIDATE**: `npm run typecheck`

#### Task 1.5: CREATE `src/components/ui/badge.tsx`

- **IMPLEMENT**: Badge component with variants
- **PATTERN**: Use cva for variant styling
- **VARIANTS**: default (primary), secondary, destructive, outline, success, warning
- **STYLING**: `rounded-full px-2.5 py-0.5 text-xs font-medium`
- **VALIDATE**: `npm run typecheck`

```typescript
// Expected variants
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background text-foreground',
        success: 'bg-emerald-100 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);
```

#### Task 1.6: CREATE `src/components/ui/skeleton.tsx`

- **IMPLEMENT**: Loading skeleton component
- **PATTERN**: Simple div with animate-pulse
- **STYLING**: `bg-muted rounded-md animate-pulse`
- **VALIDATE**: `npm run typecheck`

```typescript
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
```

---

### PHASE 2: DATA LAYER

#### Task 2.1: CREATE `src/hooks/useCategories.ts`

- **IMPLEMENT**: TanStack Query hooks for category CRUD
- **PATTERN**: Query + mutations with optimistic updates
- **IMPORTS**: `useQuery`, `useMutation`, `useQueryClient` from @tanstack/react-query, Firestore functions, `useAuth`
- **EXPORTS**: `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`
- **GOTCHA**: Must check `user?.id` before querying, use `enabled: !!user?.id`
- **GOTCHA**: Transform Firestore Timestamps to Date objects
- **VALIDATE**: `npm run typecheck`

```typescript
// Key implementation details
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, CategoryFormData, CategoryWithChildren } from '@/types';
import { generateId } from '@/lib/utils';

// Query keys
export const categoryKeys = {
  all: (userId: string) => ['categories', userId] as const,
};

// Transform Firestore data to Category type
function transformCategory(doc: DocumentData): Category {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    icon: data.icon,
    color: data.color,
    parentId: data.parentId ?? null,
    order: data.order ?? 0,
    isSystem: data.isSystem ?? false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

// Build tree structure from flat categories
export function buildCategoryTree(categories: Category[]): CategoryWithChildren[] {
  const map = new Map<string, CategoryWithChildren>();
  const roots: CategoryWithChildren[] = [];

  // First pass: create all nodes
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort by order
  const sortByOrder = (a: CategoryWithChildren, b: CategoryWithChildren) => a.order - b.order;
  roots.sort(sortByOrder);
  map.forEach((node) => node.children.sort(sortByOrder));

  return roots;
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: categoryKeys.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];
      const categoriesRef = collection(db, 'users', user.id, 'categories');
      const q = query(categoriesRef, orderBy('order'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(transformCategory);
    },
    enabled: !!user?.id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!user?.id) throw new Error('Not authenticated');
      const id = generateId();
      const categoryRef = doc(db, 'users', user.id, 'categories', id);
      await setDoc(categoryRef, {
        ...data,
        order: Date.now(), // Use timestamp for ordering
        isSystem: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// Similar patterns for useUpdateCategory, useDeleteCategory
```

#### Task 2.2: CREATE `src/hooks/useTransactions.ts`

- **IMPLEMENT**: TanStack Query hooks for transaction CRUD with filtering
- **PATTERN**: Query with filter parameters, mutations with optimistic updates
- **IMPORTS**: TanStack Query, Firestore functions, `useAuth`
- **EXPORTS**: `useTransactions`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`, `useUpdateTransactionCategory`
- **FILTERS**: Support date range, category, search text, amount range
- **GOTCHA**: Firestore doesn't support full-text search, filter client-side for search
- **GOTCHA**: Transform amounts to numbers, dates to Date objects
- **VALIDATE**: `npm run typecheck`

```typescript
// Filter interface
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string | null;
  searchText?: string;
  minAmount?: number;
  maxAmount?: number;
}

// Query keys with filters
export const transactionKeys = {
  all: (userId: string) => ['transactions', userId] as const,
  filtered: (userId: string, filters: TransactionFilters) =>
    ['transactions', userId, filters] as const,
};

export function useTransactions(filters: TransactionFilters = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: transactionKeys.filtered(user?.id ?? '', filters),
    queryFn: async () => {
      if (!user?.id) return [];

      let q = query(collection(db, 'users', user.id, 'transactions'), orderBy('date', 'desc'));

      // Add Firestore filters for date range
      if (filters.startDate) {
        q = query(q, where('date', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters.endDate) {
        q = query(q, where('date', '<=', Timestamp.fromDate(filters.endDate)));
      }
      if (filters.categoryId) {
        q = query(q, where('categoryId', '==', filters.categoryId));
      }

      const snapshot = await getDocs(q);
      let transactions = snapshot.docs.map(transformTransaction);

      // Client-side filtering for search (Firestore doesn't support full-text)
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        transactions = transactions.filter(
          (t) =>
            t.description.toLowerCase().includes(search) ||
            t.counterparty?.toLowerCase().includes(search)
        );
      }

      return transactions;
    },
    enabled: !!user?.id,
  });
}
```

---

### PHASE 3: CATEGORY MANAGEMENT

#### Task 3.1: CREATE `src/components/categories/CategoryBadge.tsx`

- **IMPLEMENT**: Inline category display with icon and color
- **PATTERN**: Use Badge component with custom styling
- **PROPS**: `category: Category`, `size?: 'sm' | 'default'`
- **STYLING**: Background color at 15% opacity, text in category color
- **VALIDATE**: `npm run typecheck`

```typescript
interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'default';
  className?: string;
}

export function CategoryBadge({ category, size = 'default', className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm',
        className
      )}
      style={{
        backgroundColor: `${category.color}15`,
        color: category.color,
      }}
    >
      <span>{category.icon}</span>
      {category.name}
    </span>
  );
}
```

#### Task 3.2: CREATE `src/components/categories/CategoryItem.tsx`

- **IMPLEMENT**: Single category row for tree display
- **PATTERN**: Indented based on nesting level
- **PROPS**: `category: CategoryWithChildren`, `level: number`, `onEdit`, `onDelete`
- **FEATURES**: Show icon, name, color indicator, action buttons (edit/delete)
- **GOTCHA**: Don't allow delete if category has children or is system category
- **VALIDATE**: `npm run typecheck`

#### Task 3.3: CREATE `src/components/categories/CategoryTree.tsx`

- **IMPLEMENT**: Hierarchical category display
- **PATTERN**: Recursive rendering of CategoryItem
- **PROPS**: `categories: CategoryWithChildren[]`, `onEdit`, `onDelete`
- **FEATURES**: Collapsible parent categories, visual hierarchy with indentation
- **VALIDATE**: `npm run typecheck`

#### Task 3.4: CREATE `src/components/categories/CategoryForm.tsx`

- **IMPLEMENT**: Dialog form for creating/editing categories
- **PATTERN**: React Hook Form + Zod validation
- **PROPS**: `open`, `onOpenChange`, `category?: Category` (for edit mode), `parentCategories: Category[]`
- **FIELDS**: name (required), icon (emoji picker or text), color (color picker), parentId (optional select)
- **VALIDATION**: Name required, min 2 chars
- **VALIDATE**: `npm run typecheck`

```typescript
// Zod schema
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  parentId: z.string().nullable(),
});
```

#### Task 3.5: UPDATE `src/pages/Categories.tsx`

- **IMPLEMENT**: Connect to real data with useCategories hook
- **PATTERN**: Query state handling (loading, error, data)
- **FEATURES**:
  - Display CategoryTree with real categories
  - "New Category" button opens CategoryForm dialog
  - Edit/delete actions on each category
  - Loading skeleton while fetching
  - Empty state when no custom categories
- **IMPORTS**: `useCategories`, `buildCategoryTree`, `CategoryTree`, `CategoryForm`
- **VALIDATE**: `npm run dev` and test in browser

---

### PHASE 4: TRANSACTION MANAGEMENT

#### Task 4.1: CREATE `src/components/transactions/CategoryPicker.tsx`

- **IMPLEMENT**: Dropdown for selecting a category
- **PATTERN**: Use Select component with hierarchical options
- **PROPS**: `value: string | null`, `onChange: (value: string | null) => void`, `categories: Category[]`
- **FEATURES**: Group by parent category, show icons, "Uncategorized" option
- **VALIDATE**: `npm run typecheck`

#### Task 4.2: CREATE `src/components/transactions/TransactionRow.tsx`

- **IMPLEMENT**: Single transaction display row
- **PATTERN**: Responsive layout matching PRD design
- **PROPS**: `transaction: Transaction`, `categories: Category[]`, `onCategoryChange`, `onEdit`, `onDelete`
- **LAYOUT**: Date | Description | Category Badge | Amount | Actions
- **FEATURES**:
  - Click category badge to change category (inline picker)
  - Color-coded amount (positive=green, negative=red)
  - Hover to show action buttons
  - Split indicator if transaction is split
- **VALIDATE**: `npm run typecheck`

```typescript
// Layout structure
<div className="flex items-center gap-4 border-b border-border px-4 py-3 hover:bg-muted/50 transition-colors group">
  {/* Date */}
  <div className="w-16 flex-shrink-0 text-sm text-muted-foreground">
    {formatDate(transaction.date)}
  </div>

  {/* Description */}
  <div className="flex-1 min-w-0">
    <p className="truncate font-medium">{transaction.description}</p>
    {transaction.counterparty && (
      <p className="truncate text-sm text-muted-foreground">{transaction.counterparty}</p>
    )}
  </div>

  {/* Category */}
  <div className="flex-shrink-0">
    <CategoryBadge category={category} />
  </div>

  {/* Amount */}
  <div className={cn('w-24 flex-shrink-0 text-right font-medium tabular-nums', getAmountColor(transaction.amount))}>
    {formatAmount(transaction.amount)}
  </div>

  {/* Actions - visible on hover */}
  <div className="w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
    <DropdownMenu>...</DropdownMenu>
  </div>
</div>
```

#### Task 4.3: CREATE `src/components/transactions/TransactionFilters.tsx`

- **IMPLEMENT**: Search input and filter controls
- **PATTERN**: Controlled inputs with debounced search
- **PROPS**: `filters: TransactionFilters`, `onChange: (filters: TransactionFilters) => void`, `categories: Category[]`
- **FEATURES**:
  - Search input with search icon
  - Category filter dropdown
  - Date range picker (quick buttons: This Month, Last Month)
- **GOTCHA**: Debounce search input (300ms) to avoid excessive re-renders
- **VALIDATE**: `npm run typecheck`

#### Task 4.4: CREATE `src/components/transactions/TransactionForm.tsx`

- **IMPLEMENT**: Dialog form for manual transaction entry
- **PATTERN**: React Hook Form + Zod
- **PROPS**: `open`, `onOpenChange`, `transaction?: Transaction`, `categories: Category[]`
- **FIELDS**: date (required), description (required), amount (required, number), categoryId (optional), counterparty (optional)
- **VALIDATION**: Date required, description min 2 chars, amount must be number
- **GOTCHA**: Amount input - handle negative values for expenses
- **VALIDATE**: `npm run typecheck`

```typescript
// Zod schema
const transactionSchema = z.object({
  date: z.date(),
  description: z.string().min(2, 'Description required'),
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  categoryId: z.string().nullable(),
  counterparty: z.string().optional(),
});
```

#### Task 4.5: CREATE `src/components/transactions/TransactionList.tsx`

- **IMPLEMENT**: Container component for transaction list
- **PATTERN**: Map over transactions, render TransactionRow
- **PROPS**: `transactions: Transaction[]`, `categories: Category[]`, `isLoading: boolean`, `onCategoryChange`, `onEdit`, `onDelete`
- **FEATURES**:
  - Loading state with skeletons
  - Empty state when no transactions
  - Optimistic category updates
- **VALIDATE**: `npm run typecheck`

#### Task 4.6: UPDATE `src/pages/Transactions.tsx`

- **IMPLEMENT**: Connect to real data with hooks
- **PATTERN**: Query state handling with filters
- **FEATURES**:
  - TransactionFilters at top
  - TransactionList with real data
  - "Add Transaction" button opens TransactionForm
  - Category changes update immediately
  - Loading and error states
- **IMPORTS**: `useTransactions`, `useCategories`, components
- **VALIDATE**: `npm run dev` and test in browser

---

## TESTING STRATEGY

### Unit Tests

Create tests in `src/hooks/__tests__/` for hook logic:

- `useCategories.test.ts` - Test buildCategoryTree function
- `useTransactions.test.ts` - Test filter logic

### Integration Tests

Create tests in `src/components/__tests__/` for components:

- `CategoryTree.test.tsx` - Renders hierarchy correctly
- `TransactionRow.test.tsx` - Displays data, handles click
- `TransactionFilters.test.tsx` - Filter changes propagate

### Mock Firebase

Create `src/test/mocks/firebase.ts`:

```typescript
import { vi } from 'vitest';

export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
};

vi.mock('firebase/firestore', () => mockFirestore);
```

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run typecheck    # TypeScript compilation
npm run lint         # ESLint checks
npm run format:check # Prettier formatting
```

### Level 2: Unit Tests

```bash
npm run test         # Run Vitest
```

### Level 3: Build

```bash
npm run build        # Production build succeeds
```

### Level 4: Manual Validation

1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Log in with test account
4. Navigate to Categories page:
   - Verify default categories display in tree
   - Click "New Category" - form opens
   - Create a new category - appears in list
   - Edit a category - changes persist
   - Delete a non-system category - removed from list
5. Navigate to Transactions page:
   - Verify empty state shows (no transactions yet)
   - Click "Add Transaction" - form opens
   - Add a manual transaction - appears in list
   - Change category on transaction - updates immediately
   - Filter by category - list filters correctly
   - Search by description - results filter

---

## ACCEPTANCE CRITERIA

- [ ] Categories page displays hierarchical category tree from Firestore
- [ ] User can create new categories (name, icon, color, optional parent)
- [ ] User can edit existing categories
- [ ] User can delete non-system categories (with confirmation)
- [ ] System categories cannot be deleted
- [ ] Transactions page displays transaction list from Firestore
- [ ] User can add manual transactions with date, description, amount, category
- [ ] User can change transaction category with inline picker
- [ ] User can filter transactions by category
- [ ] User can search transactions by description
- [ ] Date range filter works (This Month, Last Month)
- [ ] Loading states show skeletons during data fetch
- [ ] Empty states show when no data exists
- [ ] All validation commands pass with zero errors
- [ ] Code follows existing patterns (hooks, components, styling)
- [ ] TypeScript strict mode passes with no errors

---

## COMPLETION CHECKLIST

- [ ] All shadcn/ui components created (Input, Label, Dialog, Select, Badge, Skeleton)
- [ ] useCategories hook with CRUD mutations
- [ ] useTransactions hook with filtering and CRUD mutations
- [ ] CategoryBadge, CategoryItem, CategoryTree, CategoryForm components
- [ ] TransactionRow, TransactionList, TransactionFilters, TransactionForm, CategoryPicker components
- [ ] Categories page connected to real data
- [ ] Transactions page connected to real data
- [ ] All typecheck passes
- [ ] All lint passes
- [ ] Build succeeds
- [ ] Manual testing confirms feature works

---

## NOTES

### Design Decisions

1. **TanStack Query over real-time listeners**: Using `useQuery` with refetch instead of Firestore `onSnapshot` for simplicity. Real-time updates can be added later if needed.

2. **Client-side search**: Firestore doesn't support full-text search. For MVP, filtering happens client-side after fetching. For scale, consider Algolia or Typesense.

3. **Optimistic updates**: Category changes on transactions should feel instant. Use mutation `onMutate` to update cache optimistically.

4. **Component composition**: Small, focused components (CategoryBadge, TransactionRow) that compose into larger features.

5. **No drag-and-drop yet**: PRD mentions drag-and-drop for categories. Deferring to later phase to keep scope manageable.

### Known Limitations

- Search is client-side only (limited to fetched transactions)
- No pagination yet (fetch all transactions, may be slow for large datasets)
- No transaction splitting in this phase (Phase 2 scope creep prevention)
- No reimbursement marking in this phase (that's Phase 4)

### Future Improvements

- Add virtualization for large transaction lists (react-window)
- Add pagination or infinite scroll
- Add transaction splitting UI
- Add real-time Firestore listeners for multi-device sync
- Add undo/redo for category changes
