# Bug Fix: Month Selection Consistency

## Feature Description

Fix two related bugs causing month state inconsistency across views:

1. **SpendingExplorer shows wrong month data** — When entering from Dashboard (e.g., Feb selected), the bar chart doesn't highlight Feb and categories show Jan data.
2. **Dashboard budget status wrong after returning from SpendingExplorer** — User is forced to change global month to work around Bug 1, which corrupts the Dashboard month context.

## Root Cause Analysis

### Bug 1: SpendingExplorer (`src/pages/SpendingExplorer.tsx`)

```typescript
// Current (WRONG):
const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);
const selectedMonthKey = highlightedMonth ?? globalMonthKey;  // Feb for UI only

const { data } = useSpendingExplorer({
  breakdownMonthKey: highlightedMonth,  // undefined — backend picks its own default (Jan)!
});
```

`breakdownMonthKey` is `undefined` on mount, so the backend defaults to last complete month (January). The bar chart highlights Feb (via `selectedMonthKey`) but the returned data is for January — desync between visual and data.

Additionally, because Feb has no bar in the chart (the backend's monthlyTotals doesn't include it when breakdownMonthKey is undefined), the user must navigate the global MonthContext to March to make Feb selectable. That corrupts the global state.

### Bug 2: `useBudgetProgress` query key (`src/hooks/useBudgetProgress.ts`)

```typescript
queryKey: budgetProgressKeys.current(user?.id ?? ''),
// == ['budgetProgress', userId, 'current']
```

The query key does **not** include `dateRange`, but `dateRange` IS passed to the server. When the global month changes, TanStack Query doesn't invalidate this query — it serves stale cached data for the wrong month.

## Solution

### Fix 1: Initialize and sync `highlightedMonth` from global context

In `SpendingExplorer.tsx`:
- Initialize `highlightedMonth` to `globalMonthKey` (not `undefined`)
- Add `useEffect` to sync when global month changes externally
- Always pass `highlightedMonth` as `breakdownMonthKey` to the hook (never `undefined`)
- Simplify click handler — no more toggle-to-undefined logic

### Fix 2: Include dateRange in budget progress query key

In `useBudgetProgress.ts`:
- Add `dateRange.startDate.toISOString()` to the query key so it refetches when month changes

---

## CONTEXT REFERENCES

### Files to Read Before Implementing

- `src/pages/SpendingExplorer.tsx` — Primary fix location
- `src/hooks/useSpendingExplorer.ts` — Understand hook params
- `src/contexts/MonthContext.tsx` — Understand `selectedMonth` / `dateRange`
- `src/hooks/useBudgetProgress.ts` — Secondary fix location

### Files to Modify

- `src/pages/SpendingExplorer.tsx`
- `src/hooks/useBudgetProgress.ts`

---

## IMPLEMENTATION PLAN

### Task 1: Fix SpendingExplorer month initialization

**File:** `src/pages/SpendingExplorer.tsx`

**CURRENT CODE (lines ~14-25):**
```typescript
const { selectedMonth } = useMonth();
const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
const basePath = `/${direction}`;

// Local state for which bar is highlighted (defaults to global month)
const globalMonthKey = format(selectedMonth, 'yyyy-MM');
const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);
const selectedMonthKey = highlightedMonth ?? globalMonthKey;

const { data, isLoading } = useSpendingExplorer({
  direction,
  breakdownMonthKey: highlightedMonth,
});

const handleMonthClick = (monthKey: string) => {
  setHighlightedMonth(monthKey === globalMonthKey ? undefined : monthKey);
};
```

**REPLACE WITH:**
```typescript
const { selectedMonth } = useMonth();
const direction = location.pathname.startsWith('/income') ? 'income' : 'expenses';
const basePath = `/${direction}`;

// Local state for which bar is highlighted — initialized from global month
const globalMonthKey = format(selectedMonth, 'yyyy-MM');
const [highlightedMonth, setHighlightedMonth] = useState<string>(globalMonthKey);

// Sync local highlight with global month when user navigates via the header month selector
useEffect(() => {
  setHighlightedMonth(globalMonthKey);
}, [globalMonthKey]);

const { data, isLoading } = useSpendingExplorer({
  direction,
  breakdownMonthKey: highlightedMonth,  // Always explicit, never undefined
});

const handleMonthClick = (monthKey: string) => {
  setHighlightedMonth(monthKey);  // Simple assignment, no toggle
};
```

**ADD IMPORT:** `useEffect` must be imported from react (it's likely already imported — check).

**VALIDATE:** `npm run build` must pass (TypeScript: `useState<string>` not `useState<string | undefined>`).

---

### Task 2: Fix useBudgetProgress query key

**File:** `src/hooks/useBudgetProgress.ts`

**CURRENT CODE:**
```typescript
export function useBudgetProgress(dateRange?: { startDate: Date; endDate: Date }) {
  const { user } = useAuth();
  const { data: budgets = [] } = useBudgets();

  const { data: budgetProgress = [], isLoading } = useQuery({
    queryKey: budgetProgressKeys.current(user?.id ?? ''),
    queryFn: async (): Promise<BudgetProgress[]> => {
```

**REPLACE queryKey line:**
```typescript
queryKey: [
  ...budgetProgressKeys.current(user?.id ?? ''),
  dateRange?.startDate.toISOString() ?? 'default',
],
```

This ensures the query refetches when the selected month changes, so budget values are always correct for the current global month.

**VALIDATE:** `npm run build` must pass.

---

## VALIDATION COMMANDS

### Level 1: TypeScript compile
```bash
cd /home/yusuke/.openclaw/workspace/repos/free-lunch
npm run build
```
Expected: zero TypeScript errors, successful Vite build.

### Level 2: Lint
```bash
npm run lint
```
Expected: no new lint errors.

### Level 3: Unit tests
```bash
npm run test
```
Expected: all existing tests pass.

---

## MANUAL VALIDATION STEPS

After deploying to https://free-lunch-85447.web.app:

1. Open Dashboard → note the selected month (e.g., February)
2. Click "Expenses" to enter SpendingExplorer
3. ✅ February should be highlighted in the bar chart
4. ✅ Categories shown should be for February (matching header)
5. ✅ If February has no data, show empty state for Feb (not Jan data)
6. Click a different month bar (e.g., January)
7. ✅ January categories should appear
8. Navigate back to Dashboard
9. ✅ Dashboard should still show February data (global month unchanged)
10. ✅ Budget status should show February values

---

## ACCEPTANCE CRITERIA

- [ ] SpendingExplorer opens showing data for the globally selected month
- [ ] Bar chart highlights the globally selected month on entry
- [ ] Clicking a bar updates the category breakdown to that month
- [ ] Returning to Dashboard preserves the original global month selection
- [ ] Budget status on Dashboard reflects the correct selected month
- [ ] `npm run build` passes with zero errors
- [ ] No regressions in other views

---

## COMPLETION CHECKLIST

- [ ] Task 1 (SpendingExplorer.tsx) implemented
- [ ] Task 2 (useBudgetProgress.ts) implemented
- [ ] `useEffect` import confirmed/added in SpendingExplorer.tsx
- [ ] TypeScript build passes
- [ ] Lint passes
- [ ] Manual validation completed on prod URL
- [ ] Changes committed with `/commit`
- [ ] Built with `npm run build`
- [ ] Deployed with `firebase deploy`

---

## NOTES

- The `useEffect` sync in Task 1 is needed because the global month selector (in AppLayout Header) is accessible from within SpendingExplorer. Without the sync, if a user changes the global month while on SpendingExplorer, the bar chart would not update.
- The `handleMonthClick` simplification (removing the toggle-to-undefined) is intentional: we always want an explicit month selected. The previous "toggle off" behavior would reset to undefined, re-introducing the bug.
- The `useState<string>` type change (removing `| undefined`) is a natural consequence — the value is always set.
