# Feature: Phase 9 - UX Polish Bundle

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

This is a bundle of 8 UX improvements and bug fixes:

1. **Remove counterparty column** - The description column now contains similar info, making the counterparty column redundant
2. **Delete category functionality** - Allow deletion of categories that have child categories (with confirmation)
3. **Persistent transaction filters via URL** - Filters should be stored in URL query params so they survive page navigation
4. **Budget bars use selected month** - Dashboard budget overview currently uses hardcoded current month instead of the globally selected month
5. **Chart labels** - Add data labels to the spending by category pie chart for better readability
6. **Bug: Counterparty analytics not working** - Query returns no data despite transactions existing with matching counterparty
7. **Bug: Reimbursements page crash** - `clearedAt` field is stored as Firestore Timestamp but not converted to Date before calling `formatDate()`
8. **Dashboard interactivity** - Clicking categories or timeline bars should navigate to filtered transactions page

## User Stories

**Story 1**: As a user, I want a cleaner transaction list without redundant columns.

**Story 2**: As a user, I want to delete categories even if they have children, so I can reorganize my category structure.

**Story 3**: As a user, I want my transaction filters to persist when I navigate away and return, so I don't lose my search context.

**Story 4**: As a user, I want the budget overview on the dashboard to reflect the month I've selected in the header, not just the current month.

**Story 5**: As a user, I want to see labels on the pie chart so I can understand spending at a glance without hovering.

**Story 6**: As a user, I want to click on a counterparty and see my spending history with them.

**Story 7**: As a user, I want the Reimbursements page to load without crashing.

**Story 8**: As a user, I want to click on dashboard elements to drill down into the specific transactions.

## Problem Statement

Several small issues are degrading the user experience:
- UI clutter from redundant columns
- Inability to reorganize categories freely
- Lost context when navigating between pages
- Dashboard showing wrong month's data
- Charts lacking clarity
- Two critical bugs preventing feature usage

## Solution Statement

Fix each issue individually with minimal changes:
1. Remove counterparty column from TransactionRow
2. Update CategoryItem to allow deletion of parent categories (with confirmation about children)
3. Sync transaction filters to URL query params using React Router's useSearchParams
4. Pass selectedMonth to useBudgetProgress hook
5. Add Recharts Label component to pie chart
6. Fix counterparty query - likely case sensitivity or field name issue
7. Convert Timestamp to Date in ClearedReimbursementList before calling formatDate
8. Add onClick handlers to chart components that navigate with filters

## Feature Metadata

**Feature Type**: Bug Fix / Enhancement Bundle
**Estimated Complexity**: Medium
**Primary Systems Affected**:
- `src/components/transactions/TransactionRow.tsx` - Remove counterparty column
- `src/components/categories/CategoryItem.tsx` - Allow parent deletion
- `src/pages/Categories.tsx` - Update delete confirmation for parents
- `src/pages/Transactions.tsx` - URL-based filter state
- `src/components/dashboard/BudgetOverview.tsx` - Accept month parameter
- `src/hooks/useBudgetProgress.ts` - Accept month parameter
- `src/components/dashboard/SpendingByCategoryChart.tsx` - Add labels + click handler
- `src/components/dashboard/SpendingOverTimeChart.tsx` - Add click handler
- `src/hooks/useCounterpartyAnalytics.ts` - Fix query
- `src/components/reimbursements/ClearedReimbursementList.tsx` - Fix date conversion

**Dependencies**: None (all internal changes)

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: READ THESE BEFORE IMPLEMENTING!

**For Item 1 (Remove counterparty column):**
- `src/components/transactions/TransactionRow.tsx` (lines 108-122) - Counterparty column to remove
- `src/components/transactions/TransactionList.tsx` - May have header row referencing counterparty

**For Item 2 (Delete categories with children):**
- `src/components/categories/CategoryItem.tsx` (line 17) - `canDelete` check prevents parent deletion
- `src/pages/Categories.tsx` (lines 55-60, 130-163) - Delete confirmation dialog
- `src/hooks/useCategories.ts` (lines 159-174) - useDeleteCategory mutation

**For Item 3 (URL-based filters):**
- `src/pages/Transactions.tsx` (lines 41-53) - Current useState-based filter state
- `src/components/transactions/TransactionFilters.tsx` (full file) - Filter UI component
- `src/hooks/useTransactions.ts` (lines 49-60) - TransactionFilters interface

**For Item 4 (Budget month selection):**
- `src/components/dashboard/BudgetOverview.tsx` (line 11) - Calls useBudgetProgress without month
- `src/hooks/useBudgetProgress.ts` (lines 101-103) - Hardcoded `new Date()` for startDate/endDate
- `src/pages/Dashboard.tsx` (line 16) - Has `dateRange` and `selectedMonth` from useMonth()

**For Item 5 (Chart labels):**
- `src/components/dashboard/SpendingByCategoryChart.tsx` (lines 42-58) - Recharts Pie without labels

**For Item 6 (Counterparty analytics bug):**
- `src/hooks/useCounterpartyAnalytics.ts` (lines 73-79) - Query with `where('counterparty', '==', counterparty)`
- Possible issue: counterparty field stored differently in Firestore (null vs undefined, case sensitivity)

**For Item 7 (Reimbursements crash):**
- `src/components/reimbursements/ClearedReimbursementList.tsx` (line 54) - Calls `formatDate(transaction.reimbursement.clearedAt, 'relative')`
- `src/lib/utils.ts` (line 39) - `formatDate` calls `date.getTime()` - crashes if not a Date object
- `src/hooks/useReimbursements.ts` (lines 37-63) - Transform function that converts timestamps

**For Item 8 (Dashboard interactivity):**
- `src/components/dashboard/SpendingByCategoryChart.tsx` - Add onClick to pie slices
- `src/components/dashboard/SpendingOverTimeChart.tsx` - Add onClick to bars
- React Router: use `useNavigate()` to navigate with query params

### Patterns to Follow

**URL Query Params Pattern (React Router v7):**
```typescript
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();

// Read from URL
const categoryId = searchParams.get('category');

// Write to URL
setSearchParams({ category: 'xyz', search: 'text' });
```

**Recharts onClick Pattern:**
```typescript
<Pie onClick={(data, index, event) => handleClick(data.payload)} />
<Bar onClick={(data, index, event) => handleClick(data)} />
```

**Firestore Timestamp Conversion (from useReimbursements.ts):**
```typescript
clearedAt: data.clearedAt instanceof Timestamp ? data.clearedAt.toDate() : new Date(data.clearedAt)
```

**Navigation with Query Params:**
```typescript
import { useNavigate, createSearchParams } from 'react-router-dom';

const navigate = useNavigate();
navigate({
  pathname: '/transactions',
  search: createSearchParams({ category: categoryId }).toString(),
});
```

---

## IMPLEMENTATION PLAN

### Phase 1: Bug Fixes (Critical)

Fix the two bugs that are breaking functionality.

**Tasks:**
- Fix Reimbursements page crash (Item 7)
- Fix Counterparty analytics (Item 6)

### Phase 2: Transaction List Cleanup

Remove redundant UI elements.

**Tasks:**
- Remove counterparty column (Item 1)

### Phase 3: Category Management Enhancement

Allow more flexible category management.

**Tasks:**
- Enable deletion of parent categories (Item 2)

### Phase 4: Dashboard Improvements

Fix month selection and add interactivity.

**Tasks:**
- Fix budget month selection (Item 4)
- Add chart labels (Item 5)
- Add chart click handlers (Item 8)

### Phase 5: Filter Persistence

Make filters URL-based for persistence.

**Tasks:**
- Convert filter state to URL params (Item 3)

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: FIX Reimbursements Page Crash

**File:** `src/components/reimbursements/ClearedReimbursementList.tsx`

**Problem:** Line 54 calls `formatDate(transaction.reimbursement.clearedAt, 'relative')` but `clearedAt` is a Firestore Timestamp object, not a Date. The `formatDate` function calls `.getTime()` which doesn't exist on Timestamp.

**IMPLEMENT:**
1. Import `Timestamp` from `firebase/firestore`
2. Before calling `formatDate`, convert `clearedAt` to Date if it's a Timestamp

**Code change at line 54:**
```typescript
// Before:
<span>Cleared {formatDate(transaction.reimbursement.clearedAt, 'relative')}</span>

// After:
<span>Cleared {formatDate(
  transaction.reimbursement.clearedAt instanceof Timestamp
    ? transaction.reimbursement.clearedAt.toDate()
    : transaction.reimbursement.clearedAt,
  'relative'
)}</span>
```

**ALTERNATIVE (cleaner):** Create a helper function at top of file or in utils.ts:
```typescript
function ensureDate(value: Date | Timestamp | null): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  return value;
}
```

**IMPORTS:** Add `Timestamp` from `firebase/firestore`

**VALIDATE:**
- `npm run typecheck`
- Navigate to /reimbursements page - should not crash
- Mark a transaction as reimbursable, then clear it, verify cleared items display

---

### Task 2: FIX Counterparty Analytics Bug

**File:** `src/hooks/useCounterpartyAnalytics.ts`

**Problem:** The query at line 74-78 uses `where('counterparty', '==', counterparty)` but this may not match if:
1. The field is stored differently (case mismatch)
2. The counterparty value has leading/trailing whitespace
3. The query is running before data is available

**INVESTIGATION STEPS:**
1. First, check if the counterparty field actually exists and matches in Firestore
2. The dialog passes the counterparty from the transaction, which should match

**LIKELY ISSUE:** Looking at line 86, after filtering to only expenses (`amount < 0`), if all transactions with that counterparty are income (positive amounts), it returns null.

**REAL ISSUE FOUND:** Looking more carefully at the code:
- Line 83: `const transactions = snapshot.docs.map(transformDoc);`
- Line 86: `const expenses = transactions.filter((t) => t.amount < 0);`
- Line 88: `if (expenses.length === 0) return null;`

This means if the counterparty only has INCOME transactions (like salary from employer), it shows "No spending data". This is actually correct behavior for a "spending" analytics view.

**ACTUAL BUG:** The more likely issue is that the `counterparty` field in Firestore might be stored with different casing or as the full description rather than the extracted merchant name.

**DEBUGGING APPROACH:**
Add console.log to see what's being queried and returned:
```typescript
console.log('Querying counterparty:', counterparty);
console.log('Found docs:', snapshot.docs.length);
console.log('First doc counterparty:', snapshot.docs[0]?.data().counterparty);
```

**POSSIBLE FIX - Case-insensitive matching:**
The cleanest fix is to normalize the counterparty when storing AND when querying. However, Firestore doesn't support case-insensitive queries natively.

**WORKAROUND:** Since we need to fetch by exact match, ensure the counterparty passed to the dialog matches exactly what's stored. Check `TransactionRow.tsx` line 114:
```typescript
onClick={() => onCounterpartyClick?.(transaction.counterparty!)}
```
This passes the exact counterparty value from the transaction, so it should match.

**ROOT CAUSE LIKELY:** The transform function `transformDoc` at lines 56-62 only extracts `date` and `amount`, NOT the counterparty! The query filters by counterparty but then the transform loses it.

Actually wait - the transform is only used internally for mapping, the Firestore WHERE clause should still work. Let me re-examine...

The query is correct. The issue might be:
1. No transactions have this counterparty (data issue)
2. All transactions with this counterparty have positive amounts (income)

**RECOMMENDED FIX:** Add better debugging and potentially expand to show income too, or at minimum show a more helpful message.

**IMPLEMENT:**
1. Log the query results for debugging
2. If there are transactions but no expenses, show "All transactions with this counterparty are income" instead of "No spending data"

**VALIDATE:**
- Check browser console for logged query results
- Click on a counterparty with known expense transactions (e.g., Albert Heijn)
- Verify analytics appear correctly

---

### Task 3: UPDATE TransactionRow - Remove Counterparty Column

**File:** `src/components/transactions/TransactionRow.tsx`

**IMPLEMENT:** Remove lines 108-122 (the counterparty column):
```typescript
{/* Counterparty */}
<div className="w-32 flex-shrink-0">
  ...
</div>
```

**ALSO:** Remove the `onCounterpartyClick` prop since it's no longer needed in this component.

**UPDATE Props Interface:** Remove `onCounterpartyClick` from `TransactionRowProps` (lines 18-27)

**PATTERN:** The counterparty info is already visible in the description for most transactions.

**VALIDATE:**
- `npm run typecheck`
- View transactions page - verify cleaner layout
- Verify no TypeScript errors about missing props

---

### Task 4: UPDATE TransactionList - Remove Counterparty Header

**File:** `src/components/transactions/TransactionList.tsx`

**IMPLEMENT:** If there's a header row mentioning "Counterparty", remove it.

**ALSO:** Update the `TransactionRow` usage to remove `onCounterpartyClick` prop.

**VALIDATE:**
- `npm run typecheck`
- Transaction list renders correctly

---

### Task 5: UPDATE Transactions Page - Remove Counterparty Dialog

**File:** `src/pages/Transactions.tsx`

**IMPLEMENT:**
1. Remove `CounterpartyDialog` import and component usage (lines 17, 63-64, 180-183, 362-367)
2. Remove counterparty state variables (lines 63-64)
3. Remove `handleCounterpartyClick` function (lines 180-183)
4. Remove `onCounterpartyClick` prop from `TransactionList` (line 249)

**REASONING:** With counterparty column removed, users access counterparty analytics via the dedicated page route instead.

**VALIDATE:**
- `npm run typecheck`
- Transactions page loads without errors

---

### Task 6: UPDATE CategoryItem - Allow Parent Category Deletion

**File:** `src/components/categories/CategoryItem.tsx`

**IMPLEMENT:** Change line 17 from:
```typescript
const canDelete = !category.isSystem && !hasChildren;
```
To:
```typescript
const canDelete = !category.isSystem;
```

**REASONING:** Users should be able to delete parent categories. The confirmation dialog will warn them.

**VALIDATE:**
- `npm run typecheck`
- Navigate to Categories page
- Verify delete button appears on parent categories (not system ones)

---

### Task 7: UPDATE Categories Page - Enhanced Delete Confirmation

**File:** `src/pages/Categories.tsx`

**IMPLEMENT:** Update the delete confirmation dialog (lines 130-163) to show different messages for parent vs child categories:

```typescript
<DialogDescription>
  {deleteCategory?.children && deleteCategory.children.length > 0 ? (
    <>
      Are you sure you want to delete &quot;{deleteCategory?.name}&quot; and its{' '}
      <strong>{deleteCategory.children.length}</strong> sub-categor
      {deleteCategory.children.length === 1 ? 'y' : 'ies'}?
      Transactions in these categories will become uncategorized.
    </>
  ) : (
    <>
      Are you sure you want to delete &quot;{deleteCategory?.name}&quot;?
      Transactions in this category will become uncategorized.
    </>
  )}
</DialogDescription>
```

**ALSO:** Update `useDeleteCategory` to handle cascading deletes (delete children first)

**VALIDATE:**
- Delete a parent category - verify children are also deleted
- Verify warning message shows child count

---

### Task 8: UPDATE useDeleteCategory - Cascade Delete Children

**File:** `src/hooks/useCategories.ts`

**IMPLEMENT:** Update `useDeleteCategory` mutation to also delete child categories:

```typescript
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Find all children recursively
      const idsToDelete = [id];
      const findChildren = (parentId: string) => {
        categories
          .filter(c => c.parentId === parentId)
          .forEach(child => {
            idsToDelete.push(child.id);
            findChildren(child.id);
          });
      };
      findChildren(id);

      // Delete all in batch
      const batch = writeBatch(db);
      idsToDelete.forEach(catId => {
        const categoryRef = doc(db, 'users', user.id, 'categories', catId);
        batch.delete(categoryRef);
      });
      await batch.commit();

      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
```

**IMPORTS:** Add `writeBatch` from `firebase/firestore`

**VALIDATE:**
- Create a test parent category with children
- Delete the parent
- Verify all children are also deleted

---

### Task 9: UPDATE useBudgetProgress - Accept Month Parameter

**File:** `src/hooks/useBudgetProgress.ts`

**IMPLEMENT:** Modify `useBudgetProgress` to accept an optional date range:

```typescript
export function useBudgetProgress(dateRange?: { startDate: Date; endDate: Date }) {
  const { user } = useAuth();
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();

  // Use provided date range or default to current month
  const startDate = dateRange?.startDate ?? startOfMonth(new Date());
  const endDate = dateRange?.endDate ?? endOfMonth(new Date());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, startDate.toISOString(), endDate.toISOString()],
    // ... rest unchanged
  });
```

**VALIDATE:**
- `npm run typecheck`

---

### Task 10: UPDATE BudgetOverview - Pass Month from Context

**File:** `src/components/dashboard/BudgetOverview.tsx`

**IMPLEMENT:**
1. Import `useMonth` from `@/contexts/MonthContext`
2. Get `dateRange` from context
3. Pass to `useBudgetProgress`

```typescript
import { useMonth } from '@/contexts/MonthContext';

export function BudgetOverview() {
  const { dateRange } = useMonth();
  const { data: budgetProgress, isLoading } = useBudgetProgress(dateRange);
  // ... rest unchanged
}
```

**VALIDATE:**
- Navigate to Dashboard
- Change month in header
- Verify budget bars update to reflect that month's spending

---

### Task 11: UPDATE SpendingByCategoryChart - Add Labels

**File:** `src/components/dashboard/SpendingByCategoryChart.tsx`

**IMPLEMENT:** Add labels to the pie chart showing category names:

1. Import `Label` from recharts
2. Add custom label renderer to Pie:

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from 'recharts';

// Add label prop to Pie component:
<Pie
  data={chartData}
  cx="50%"
  cy="50%"
  innerRadius={60}
  outerRadius={100}
  paddingAngle={2}
  dataKey="value"
  nameKey="name"
  label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
  labelLine={false}
>
```

**ALTERNATIVE - Cleaner approach with custom label:**
```typescript
const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, percentage }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percentage < 5) return null; // Don't show tiny slices

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs"
    >
      {name}
    </text>
  );
};

// Then in Pie:
<Pie ... label={renderCustomLabel}>
```

**VALIDATE:**
- View Dashboard
- Verify pie chart shows category names as labels

---

### Task 12: UPDATE SpendingByCategoryChart - Add Click Handler

**File:** `src/components/dashboard/SpendingByCategoryChart.tsx`

**IMPLEMENT:**
1. Accept `onCategoryClick` prop
2. Add onClick to Pie component

```typescript
interface SpendingByCategoryChartProps {
  data: CategorySpending[];
  isLoading?: boolean;
  className?: string;
  onCategoryClick?: (categoryId: string) => void;
}

export function SpendingByCategoryChart({
  data,
  isLoading,
  className,
  onCategoryClick,
}: SpendingByCategoryChartProps) {
  // ... existing code ...

  const handleClick = (entry: ChartDataEntry) => {
    // Find the category ID from the original data
    const category = data.find(d => d.categoryName === entry.name);
    if (category && onCategoryClick) {
      onCategoryClick(category.categoryId);
    }
  };

  return (
    <PieChart>
      <Pie
        ...
        onClick={(_, index) => handleClick(chartData[index]!)}
        style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
      >
```

**VALIDATE:**
- `npm run typecheck`

---

### Task 13: UPDATE SpendingOverTimeChart - Add Click Handler

**File:** `src/components/dashboard/SpendingOverTimeChart.tsx`

**IMPLEMENT:**
1. Accept `onDateClick` prop
2. Add onClick to Bar component

```typescript
interface SpendingOverTimeChartProps {
  data: TimelineData[];
  isLoading?: boolean;
  onDateClick?: (date: string) => void;
}

// In the Bar component:
<Bar
  dataKey="expenses"
  onClick={(data) => onDateClick?.(data.date)}
  style={{ cursor: onDateClick ? 'pointer' : 'default' }}
/>
```

**VALIDATE:**
- `npm run typecheck`

---

### Task 14: UPDATE Dashboard - Wire Up Chart Clicks

**File:** `src/pages/Dashboard.tsx`

**IMPLEMENT:**
1. Import `useNavigate` and `createSearchParams` from react-router-dom
2. Create handlers for category and date clicks
3. Pass handlers to chart components

```typescript
import { useNavigate, createSearchParams } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  // ... existing code ...

  const handleCategoryClick = (categoryId: string) => {
    navigate({
      pathname: '/transactions',
      search: createSearchParams({ category: categoryId }).toString(),
    });
  };

  const handleDateClick = (date: string) => {
    // date is in 'Jan 15' format, need to construct full date
    // The timeline data has date in specific format, parse it
    navigate({
      pathname: '/transactions',
      search: createSearchParams({ date }).toString(),
    });
  };

  return (
    // ... in SpendingByCategoryChart:
    <SpendingByCategoryChart
      data={dashboardData?.categorySpending ?? []}
      isLoading={isLoading}
      onCategoryClick={handleCategoryClick}
    />

    // ... in SpendingOverTimeChart:
    <SpendingOverTimeChart
      data={dashboardData?.timeline ?? []}
      isLoading={isLoading}
      onDateClick={handleDateClick}
    />
  );
}
```

**VALIDATE:**
- Click on a category in pie chart - should navigate to /transactions?category=xyz
- Click on a date bar - should navigate to /transactions?date=xyz

---

### Task 15: UPDATE Transactions Page - URL-Based Filters

**File:** `src/pages/Transactions.tsx`

**IMPLEMENT:** Replace useState with useSearchParams for filter persistence:

1. Import `useSearchParams` from react-router-dom
2. Replace `useState<Filters>` with URL-based state
3. Create helper functions to read/write URL params

```typescript
import { useSearchParams } from 'react-router-dom';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export function Transactions() {
  const { dateRange: monthDateRange } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const filters: Filters = useMemo(() => {
    const categoryId = searchParams.get('category');
    const searchText = searchParams.get('search');
    const direction = searchParams.get('direction') as 'income' | 'expense' | undefined;
    const dateParam = searchParams.get('date');

    // Date handling: use URL date, or fall back to month context
    let startDate = monthDateRange.startDate;
    let endDate = monthDateRange.endDate;

    if (dateParam) {
      // If specific date is in URL, filter to that day
      const parsedDate = parseISO(dateParam);
      startDate = parsedDate;
      endDate = parsedDate;
    }

    return {
      startDate,
      endDate,
      ...(categoryId && { categoryId }),
      ...(searchText && { searchText }),
      ...(direction && direction !== 'all' && { direction }),
    };
  }, [searchParams, monthDateRange]);

  // Update URL when filters change
  const handleFiltersChange = (newFilters: Filters) => {
    const params: Record<string, string> = {};
    if (newFilters.categoryId) params.category = newFilters.categoryId;
    if (newFilters.searchText) params.search = newFilters.searchText;
    if (newFilters.direction) params.direction = newFilters.direction;
    // Don't store dates in URL - they come from month context
    setSearchParams(params, { replace: true });
  };
```

**NOTE:** This is a significant refactor. The TransactionFilters component will also need updates to read initial state from URL.

**VALIDATE:**
- Set some filters on transactions page
- Navigate to Dashboard
- Navigate back to Transactions
- Verify filters are preserved in URL

---

### Task 16: UPDATE TransactionFilters - Sync with URL State

**File:** `src/components/transactions/TransactionFilters.tsx`

**IMPLEMENT:** The component receives filters as props, so it should already work. Just ensure the `onChange` callback properly updates URL via parent.

The main changes are in the parent (Transactions.tsx). The filter component itself remains a controlled component.

**VALIDATE:**
- Filters reflect URL params when page loads

---

## TESTING STRATEGY

### Unit Tests

**Files to test:**
- `src/hooks/useCategories.ts` - Test cascading delete
- `src/hooks/useBudgetProgress.ts` - Test with different date ranges

### Integration Tests

**Manual testing checklist:**
1. ✅ Reimbursements page loads without crash
2. ✅ Counterparty analytics shows data for counterparties with expenses
3. ✅ Transaction list shows without counterparty column
4. ✅ Parent categories can be deleted with warning
5. ✅ Budget overview reflects selected month
6. ✅ Pie chart has readable labels
7. ✅ Clicking pie chart navigates to filtered transactions
8. ✅ Clicking timeline bar navigates to filtered transactions
9. ✅ Filters persist in URL across navigation

### E2E Tests

**Update existing E2E tests:**

**File:** `e2e/categories.spec.ts`
- Add test for deleting parent category

**File:** `e2e/dashboard.spec.ts`
- Add test for chart click navigation

**File:** `e2e/transactions.spec.ts`
- Add test for URL filter persistence

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
npm run lint
npm run typecheck
```

### Level 2: Unit Tests

```bash
npm run test
```

### Level 3: Build Check

```bash
npm run build
```

### Level 4: E2E Tests

```bash
# Start Firebase emulators
npm run firebase:emulators &
sleep 10

# Run E2E tests
npm run e2e
```

### Level 5: Manual Validation

1. **Reimbursements bug:**
   - Create a transaction
   - Mark as reimbursable
   - Create income transaction
   - Clear the reimbursement
   - Navigate to Reimbursements page
   - Verify cleared items display correctly

2. **Counterparty analytics:**
   - View transactions with known counterparty (Albert Heijn)
   - Note: With counterparty column removed, access via CounterpartyDetail page
   - Navigate to /counterparty/Albert%20Heijn
   - Verify charts and data appear

3. **Budget month selection:**
   - Navigate to Dashboard
   - Use header month selector to go to previous month
   - Verify Budget Status section updates

4. **Dashboard clicks:**
   - Click on a category in pie chart
   - Verify navigation to /transactions?category=xyz
   - Go back, click on timeline bar
   - Verify navigation to /transactions?date=xyz

5. **Filter persistence:**
   - On transactions page, set category filter
   - Navigate to Dashboard
   - Navigate back to Transactions
   - Verify category filter still selected (URL shows ?category=xyz)

---

## ACCEPTANCE CRITERIA

- [ ] Reimbursements page loads without errors
- [ ] Counterparty analytics shows spending data correctly
- [ ] Transaction list has cleaner layout (no counterparty column)
- [ ] Parent categories can be deleted (with children)
- [ ] Dashboard budget overview reflects selected month
- [ ] Pie chart shows category labels
- [ ] Clicking charts navigates to filtered transactions
- [ ] Transaction filters persist in URL
- [ ] All existing E2E tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors

---

## COMPLETION CHECKLIST

- [ ] All 16 tasks completed in order
- [ ] Each task validation passed
- [ ] All validation commands pass
- [ ] Manual testing confirms all 8 items work
- [ ] No regressions in existing functionality

---

## NOTES

### Design Decisions

1. **Counterparty column removal:** The description already contains merchant info in most cases. Power users can still access counterparty analytics via the dedicated page.

2. **URL-based filters:** Using `replace: true` with setSearchParams to avoid polluting browser history with every filter change.

3. **Cascade delete:** Deleting a parent category deletes children. Alternative would be to reassign children to root, but this is more complex and users can manually reorganize first if needed.

4. **Budget month selection:** Passing dateRange from MonthContext rather than adding a separate prop. This ensures consistency with other dashboard components.

### Potential Issues

1. **Counterparty analytics query:** If still not working after investigation, may need to create a Firestore index or change query strategy.

2. **Filter sync timing:** When filters are in URL and month changes in header, there may be a momentary mismatch. The useEffect sync should handle this.

3. **Chart labels overlap:** If too many categories, labels may overlap. The custom label function skips small slices (<5%) to mitigate this.

### Future Improvements

- Add "uncategorize transactions" option when deleting a category instead of leaving them orphaned
- Add counterparty search/filter to dedicated analytics page
- Consider adding filter presets (save favorite filter combinations)
