# Feature: Spending Drill-Down Explorer

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A hierarchical drill-down spending explorer inspired by the ABN AMRO app. Users enter via "Expenses" or "Income" cards on the dashboard, then progressively drill down through categories → subcategories → transactions → counterparty detail. Every level shares the same layout: a prominent total, month label, 6-month vertical bar chart for cross-month comparison/navigation, and level-specific content below.

This feature is implemented on both web (React) and iOS (SwiftUI) simultaneously.

## User Story

As a Free Lunch user
I want to drill down into my spending starting from a top-level expenses/income view through categories, subcategories, and individual transactions
So that I can understand exactly where my money goes, compare across months, and identify spending patterns at every level of detail.

## Problem Statement

The current dashboard shows spending by category as a pie chart and recent transactions, but there is no way to progressively drill deeper into the data. Users cannot easily see subcategory breakdowns, compare category spending month-over-month, or navigate naturally from a category to its transactions. The existing counterparty detail page is disconnected from category navigation.

## Solution Statement

Create a URL-routed drill-down explorer with 4 levels (all categories → category → subcategory → counterparty), each sharing a consistent layout with a 6-month bar chart at the top. The dashboard gets "Expenses" and "Income" entry cards, and clicking a category on the pie chart also enters the drill-down. A new Cloud Function provides multi-month aggregation data. The same flow is replicated in the iOS app using NavigationStack.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Web frontend (pages, components, hooks), Cloud Functions (new endpoint), iOS app (views, view models)
**Dependencies**: Recharts (web charts), existing Firebase/Firestore infrastructure, existing category hierarchy

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

**Web — Routing & Layout**
- `src/App.tsx` (lines 37-58) — Route definitions; add new `/expenses/*` and `/income/*` routes here
- `src/components/layout/AppLayout.tsx` — Layout wrapper with `<Outlet />` pattern
- `src/pages/CounterpartyDetail.tsx` — **Reference pattern** for a drill-down page (back button, useParams, useNavigate, MonthContext)
- `src/components/layout/MonthSelector.tsx` — Existing month navigation; study but we'll build a custom bar chart selector instead

**Web — Dashboard (Entry Point)**
- `src/pages/Dashboard.tsx` — Add Expenses/Income cards here, make pie chart categories clickable into drill-down
- `src/components/dashboard/SummaryCards.tsx` — Pattern for summary card styling
- `src/components/dashboard/SpendingByCategoryChart.tsx` — Existing pie chart with `onCategoryClick` handler

**Web — Data Hooks**
- `src/hooks/useDashboardData.ts` — Pattern for Cloud Function hook (query keys, dateRange params)
- `src/hooks/useCounterpartyAnalytics.ts` — **Key reference**: monthly aggregation pattern, MonthlySpending interface, 12-month window calculation
- `src/hooks/useTransactions.ts` — Transaction filtering with TransactionFilters interface
- `src/hooks/useCategories.ts` — Category fetching, tree building, `CategoryWithChildren` type

**Web — UI Components**
- `src/components/analytics/CounterpartySpendingChart.tsx` — Recharts BarChart pattern (axes, tooltip, styling)
- `src/components/categories/CategoryBadge.tsx` — Category display (icon + name + color)
- `src/components/transactions/TransactionRow.tsx` — Transaction display pattern with counterparty link

**Web — Shared Utilities**
- `src/lib/utils.ts` — `formatAmount`, `formatDate`, `getAmountColor`, `cn`
- `src/lib/colors.ts` — `colors`, `CHART_COLORS`, semantic colors
- `src/lib/bankingFunctions.ts` — Cloud Function wrappers, `SerializedTransaction`, `deserializeTransaction`
- `src/types/index.ts` — All type definitions (Transaction, Category, CategorySpending, etc.)

**Cloud Functions**
- `functions/src/shared/aggregations.ts` — All aggregation logic: `calculateSummary`, `calculateCategorySpending`, `calculateSpendingByCategory`, `serializeTransaction`
- `functions/src/handlers/getDashboardData.ts` — Pattern for a Cloud Function handler (auth check, parallel queries, response structure)
- `functions/src/index.ts` — Function export registration

**iOS**
- `ios/FreeLunch/Views/ContentView.swift` — Tab structure, ViewModel injection
- `ios/FreeLunch/Views/Dashboard/DashboardView.swift` — Dashboard view (add entry cards here)
- `ios/FreeLunch/ViewModels/DashboardViewModel.swift` — Dashboard data fetching pattern
- `ios/FreeLunch/ViewModels/TransactionsViewModel.swift` — Transaction filtering pattern
- `ios/FreeLunch/ViewModels/MonthViewModel.swift` — Month navigation (dateRange, goToNextMonth, etc.)
- `ios/FreeLunch/Core/Firebase/FirestoreService.swift` — Firestore data access patterns
- `ios/FreeLunch/Models/Transaction.swift` — Swift Transaction model
- `ios/FreeLunch/Models/Category.swift` — Swift Category model with `buildTree()`

**Design System**
- `.claude/reference/free-lunch-design-system.md` — Colors, typography, spacing, chart guidelines

### New Files to Create

**Web**
- `src/pages/SpendingExplorer.tsx` — Top-level page (all categories with horizontal bars)
- `src/pages/SpendingCategory.tsx` — Category level (subcategory bars or transactions if leaf)
- `src/pages/SpendingSubcategory.tsx` — Subcategory level (transaction list)
- `src/pages/SpendingCounterparty.tsx` — Counterparty level (monthly amounts + transactions)
- `src/components/spending/MonthlyBarChart.tsx` — Shared 6-month vertical bar chart with click-to-navigate
- `src/components/spending/CategoryRow.tsx` — Horizontal bar row for category/subcategory items
- `src/components/spending/SpendingHeader.tsx` — Shared header (back arrow + title + total + month label)
- `src/components/spending/index.ts` — Barrel export
- `src/hooks/useSpendingExplorer.ts` — Hook for multi-month category aggregations (calls Cloud Function)

**Cloud Functions**
- `functions/src/handlers/getSpendingExplorer.ts` — Cloud Function for multi-month aggregated spending data

**iOS**
- `ios/FreeLunch/Views/Spending/SpendingExplorerView.swift` — Top-level (all categories)
- `ios/FreeLunch/Views/Spending/SpendingCategoryView.swift` — Category level (subcategories)
- `ios/FreeLunch/Views/Spending/SpendingSubcategoryView.swift` — Subcategory (transactions)
- `ios/FreeLunch/Views/Spending/SpendingCounterpartyView.swift` — Counterparty monthly detail
- `ios/FreeLunch/Views/Spending/MonthlyBarChartView.swift` — Shared 6-month bar chart component
- `ios/FreeLunch/Views/Spending/CategoryRowView.swift` — Category row with horizontal bar
- `ios/FreeLunch/ViewModels/SpendingExplorerViewModel.swift` — ViewModel for spending data

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- `.claude/reference/free-lunch-design-system.md` — Color system (Forest palette, semantic colors, amount colors), typography scale, chart guidelines
- `CLAUDE.md` — Project commands, architecture overview, code style
- `PRD.md` — Product requirements, data model details

### Patterns to Follow

**Naming Conventions:**
- React components: PascalCase functional components (`export function SpendingExplorer()`)
- Hooks: `use` prefix, TanStack Query pattern (`useSpendingExplorer`)
- Files: PascalCase for components, camelCase for hooks/utils
- Query keys: object with named functions returning tuples (`spendingKeys.explorer(...)`)
- Cloud Functions: camelCase export names (`getSpendingExplorer`)
- iOS: PascalCase for types, camelCase for properties, `@Observable final class` for ViewModels

**Data Flow Pattern (Web):**
```
Page component → useHook(params) → Cloud Function via httpsCallable → TanStack Query cache
```

**Cloud Function Pattern:**
```typescript
export const functionName = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '...');
  // validate params
  // parallel Firestore queries
  // aggregate using shared functions
  // return serialized data
});
```

**iOS MVVM Pattern:**
```swift
@Observable final class ViewModel {
  var data: [Type] = []
  var isLoading = false

  func fetchData(dateRange: ClosedRange<Date>) async {
    isLoading = true
    defer { isLoading = false }
    // fetch from Firestore
  }
}
```

**URL Routing Pattern:**
- `/expenses` → all expense categories
- `/expenses/:categoryId` → subcategories for that category
- `/expenses/:categoryId/:subcategoryId` → transactions in that subcategory
- `/expenses/:categoryId/:subcategoryId/counterparty/:name` → counterparty detail
- Same pattern with `/income/...`

---

## IMPLEMENTATION PLAN

### Phase 1: Cloud Function — Multi-Month Spending Data

Create a new Cloud Function `getSpendingExplorer` that returns aggregated spending data for multiple months at once, supporting different drill-down levels.

**Tasks:**
- Create the Cloud Function handler that accepts: direction (expenses/income), dateRange, optional categoryId, optional subcategoryId
- Return: current month total, 6-month bar chart data (monthly totals), category/subcategory breakdown for current month, transactions list when at leaf level
- Reuse existing aggregation functions from `functions/src/shared/aggregations.ts`
- Export from `functions/src/index.ts`
- Add client-side wrapper in `src/lib/bankingFunctions.ts`

### Phase 2: Shared Web Components

Build the reusable components that appear at every drill-down level.

**Tasks:**
- `MonthlyBarChart` — 6-month vertical bars using Recharts, selected month highlighted, clickable
- `SpendingHeader` — Back button, title, total amount, month label
- `CategoryRow` — Horizontal bar with icon, name, transaction count, amount, percentage
- Barrel export in `index.ts`

### Phase 3: Web Pages & Routing

Create the 4 drill-down pages and wire up routing.

**Tasks:**
- `SpendingExplorer` page — level 1 (all categories)
- `SpendingCategory` page — level 2 (subcategories)
- `SpendingSubcategory` page — level 3 (transactions)
- `SpendingCounterparty` page — level 4 (counterparty monthly detail)
- Add routes to `App.tsx`
- Create `useSpendingExplorer` hook for data fetching

### Phase 4: Dashboard Integration

Add entry points to the dashboard.

**Tasks:**
- Add "Expenses" and "Income" clickable cards to Dashboard
- Make existing pie chart categories clickable into the drill-down flow (update `handleCategoryClick`)

### Phase 5: iOS Implementation

Build the equivalent SwiftUI views and view model.

**Tasks:**
- `SpendingExplorerViewModel` — fetches multi-month data from Firestore
- `MonthlyBarChartView` — 6-month bar chart
- `CategoryRowView` — horizontal bar row
- `SpendingExplorerView` — all categories level
- `SpendingCategoryView` — subcategory level
- `SpendingSubcategoryView` — transaction list level
- `SpendingCounterpartyView` — counterparty detail level
- Add entry cards to `DashboardView`
- Wire up NavigationStack navigation

### Phase 6: Testing & Validation

**Tasks:**
- Unit tests for the Cloud Function aggregation
- E2E tests for the drill-down flow
- iOS preview helpers

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `functions/src/handlers/getSpendingExplorer.ts`

- **IMPLEMENT**: A Cloud Function that provides aggregated spending data for the drill-down explorer. It should:
  1. Accept params: `{ direction: 'expenses' | 'income', startDate: string, endDate: string, categoryId?: string, subcategoryId?: string, counterparty?: string }`
  2. Fetch transactions for a 6-month window (selected month + 5 previous months)
  3. Fetch all categories
  4. For each of the 6 months, calculate the total (expenses or income depending on direction)
  5. For the selected month (startDate-endDate), calculate category breakdown:
     - If no categoryId: group by top-level categories (parentId === null or category IS a parent), return array of `{ categoryId, categoryName, categoryIcon, categoryColor, amount, percentage, transactionCount }`
     - If categoryId but no subcategoryId: group by subcategories of that category, same fields
     - If categoryId and subcategoryId: return serialized transactions for that subcategory
     - If counterparty: return 6-month totals for that specific counterparty + transactions for selected month
  6. Exclude pending reimbursements from calculations
  7. Handle split transactions properly (each split counted toward its own category)
- **PATTERN**: Mirror `functions/src/handlers/getDashboardData.ts` for structure (auth check, param validation, parallel queries)
- **PATTERN**: Use `calculateCategorySpending` and `serializeTransaction` from `functions/src/shared/aggregations.ts`
- **IMPORTS**: `onCall`, `HttpsError` from `firebase-functions/v2/https`, `getFirestore`, `Timestamp` from `firebase-admin/firestore`, aggregation helpers
- **GOTCHA**: Firestore compound queries require matching index configuration. Use simple queries and filter server-side.
- **GOTCHA**: For the 6-month bar data, you need to run separate date-range queries per month OR fetch all 6 months at once with a wider range and group in memory. The wider range approach is more efficient (1 query instead of 6).
- **GOTCHA**: When grouping by top-level categories, subcategory spending must roll up to parent. A transaction in "Groceries" (child of "Food & drinks") should count toward the "Food & drinks" total at level 1.
- **VALIDATE**: `cd functions && npm run build`

### Task 2: UPDATE `functions/src/index.ts`

- **IMPLEMENT**: Add export for the new function: `export { getSpendingExplorer } from './handlers/getSpendingExplorer.js';`
- **PATTERN**: Same as existing exports in the file
- **VALIDATE**: `cd functions && npm run build`

### Task 3: UPDATE `src/lib/bankingFunctions.ts`

- **IMPLEMENT**: Add httpsCallable wrapper for `getSpendingExplorer`. Define request/response types:
  ```typescript
  export interface SpendingExplorerRequest {
    direction: 'expenses' | 'income';
    startDate: string;
    endDate: string;
    categoryId?: string;
    subcategoryId?: string;
    counterparty?: string;
  }

  export interface MonthlyTotal {
    month: string;      // 'MMM yyyy' display format
    monthKey: string;   // 'yyyy-MM' sortable key
    amount: number;
    transactionCount: number;
  }

  export interface CategoryBreakdownItem {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }

  export interface SpendingExplorerResponse {
    currentTotal: number;
    currentMonth: string;
    monthlyTotals: MonthlyTotal[];
    categories?: CategoryBreakdownItem[];
    transactions?: SerializedTransaction[];
  }
  ```
- **PATTERN**: Mirror existing `getDashboardData` wrapper pattern
- **VALIDATE**: `npm run typecheck`

### Task 4: CREATE `src/hooks/useSpendingExplorer.ts`

- **IMPLEMENT**: TanStack Query hook that calls the Cloud Function.
  - Accept params: `{ direction, categoryId?, subcategoryId?, counterparty? }`
  - Use `useMonth()` to get the selected month's dateRange
  - Query key: `['spendingExplorer', userId, direction, selectedMonth ISO, categoryId, subcategoryId, counterparty]`
  - Deserialize transactions in response using `deserializeTransaction`
  - Also export a helper to build 6-month dateRange from selectedMonth (pass wider startDate covering 6 months)
- **PATTERN**: Mirror `src/hooks/useDashboardData.ts` for structure
- **IMPORTS**: `useQuery` from `@tanstack/react-query`, `useAuth`, `useMonth`, bankingFunctions wrapper
- **VALIDATE**: `npm run typecheck`

### Task 5: CREATE `src/components/spending/MonthlyBarChart.tsx`

- **IMPLEMENT**: A 6-month vertical bar chart component:
  - Props: `{ data: MonthlyTotal[], selectedMonthKey: string, onMonthClick: (monthKey: string) => void, isLoading?: boolean, color?: string }`
  - Use Recharts `BarChart` with `Bar` component
  - Bars filled with primary color (`#1D4739` for expenses, `#2D5A4A` for income), selected month bar has a distinct style (lighter/outlined or different opacity)
  - X-axis shows short month labels (e.g., "Sep", "Oct", "Nov", "Dec", "Jan", "Feb")
  - NO Y-axis (clean, minimal like ABN screenshot)
  - NO grid lines (clean look)
  - Clicking a bar calls `onMonthClick(monthKey)`
  - Height: ~150px (compact, leaves room for content below)
  - Loading state: 6 skeleton rectangles
- **PATTERN**: Styling follows `src/components/analytics/CounterpartySpendingChart.tsx` for Recharts patterns
- **GOTCHA**: The selected month bar should be visually distinct. Use a custom `Cell` component in Recharts to apply different fill per bar based on whether it matches `selectedMonthKey`.
- **IMPORTS**: `BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell` from recharts
- **VALIDATE**: `npm run typecheck`

### Task 6: CREATE `src/components/spending/SpendingHeader.tsx`

- **IMPLEMENT**: Shared header for all drill-down levels:
  - Props: `{ title: string, total: number, monthLabel: string, onBack: () => void, isLoading?: boolean, direction: 'expenses' | 'income' }`
  - Back arrow button (ArrowLeft icon, ghost variant) calling `onBack`
  - Title text (h1, text-2xl font-bold)
  - Total amount displayed prominently (text-3xl font-bold tabular-nums), colored by direction (destructive for expenses, primary for income)
  - Month label below total (text-muted-foreground)
  - Loading: Skeleton for amount
- **PATTERN**: Mirror header from `src/pages/CounterpartyDetail.tsx` (lines 40-56)
- **IMPORTS**: `ArrowLeft` from lucide-react, `Button`, `Skeleton`, `formatAmount`, `cn`
- **VALIDATE**: `npm run typecheck`

### Task 7: CREATE `src/components/spending/CategoryRow.tsx`

- **IMPLEMENT**: A clickable row showing a category's spending as a horizontal bar:
  - Props: `{ categoryId: string, name: string, icon: string, color: string, amount: number, percentage: number, transactionCount: number, onClick: () => void }`
  - Layout: Full-width clickable row with:
    - Left: category icon + name + "{N} transactions" subtitle
    - Right: amount (formatted) + percentage
    - Background: horizontal bar fill using the category color at low opacity, width proportional to percentage
  - The horizontal bar effect: use a `div` with `style={{ width: \`${percentage}%\`, backgroundColor: \`${color}20\` }}` as an absolutely positioned background within the row
  - Row has hover state and cursor-pointer
  - Resembles the ABN screenshot: icon on left, name + count, then amount + percentage right-aligned, with colored bar behind
- **PATTERN**: Styling inspired by ABN screenshots — dark background rows with colored left border/fill
- **IMPORTS**: `formatAmount` from utils, `cn`
- **VALIDATE**: `npm run typecheck`

### Task 8: CREATE `src/components/spending/index.ts`

- **IMPLEMENT**: Barrel export for all spending components:
  ```typescript
  export { MonthlyBarChart } from './MonthlyBarChart';
  export { SpendingHeader } from './SpendingHeader';
  export { CategoryRow } from './CategoryRow';
  ```
- **VALIDATE**: `npm run typecheck`

### Task 9: CREATE `src/pages/SpendingExplorer.tsx`

- **IMPLEMENT**: Level 1 page — all categories for expenses or income:
  - Route params: none (direction determined by path `/expenses` vs `/income`)
  - Determine direction from `useLocation().pathname` (starts with `/income` → 'income', else 'expenses')
  - Use `useSpendingExplorer({ direction })` to fetch data
  - Use `useMonth()` to get `selectedMonth` and `setSelectedMonth`
  - Layout:
    1. `SpendingHeader` with title "Expenses" or "Income", total from hook data, month label
    2. `MonthlyBarChart` with 6-month data, onMonthClick updates month via `setSelectedMonth`
    3. List of `CategoryRow` components, each linking to `/expenses/:categoryId` (or `/income/:categoryId`)
  - Navigation: clicking a CategoryRow navigates to the category detail page
  - Handle loading and empty states
- **PATTERN**: Page structure like `src/pages/CounterpartyDetail.tsx` (useParams, useNavigate, error handling)
- **IMPORTS**: spending components, useSpendingExplorer, useMonth, useNavigate
- **VALIDATE**: `npm run typecheck`

### Task 10: CREATE `src/pages/SpendingCategory.tsx`

- **IMPLEMENT**: Level 2 page — subcategories for a given parent category:
  - Route param: `categoryId` from URL
  - Use `useSpendingExplorer({ direction, categoryId })` to fetch subcategory breakdown
  - Use `useCategories()` to get the parent category's name/icon for the header
  - Layout:
    1. `SpendingHeader` with parent category name as title, total for that category, month label, back navigates to `/expenses`
    2. `MonthlyBarChart` showing 6-month totals for THIS category only
    3. List of `CategoryRow` for each subcategory
    4. If the category has NO subcategories (leaf category), show transaction list directly (same as level 3)
  - Navigation: clicking a subcategory row navigates to `/expenses/:categoryId/:subcategoryId`
- **PATTERN**: Same as SpendingExplorer but with categoryId filter
- **IMPORTS**: spending components, useSpendingExplorer, useCategories, useMonth, useNavigate, useParams
- **VALIDATE**: `npm run typecheck`

### Task 11: CREATE `src/pages/SpendingSubcategory.tsx`

- **IMPLEMENT**: Level 3 page — transactions for a specific subcategory:
  - Route params: `categoryId`, `subcategoryId` from URL
  - Use `useSpendingExplorer({ direction, categoryId, subcategoryId })` to get transactions
  - Use `useCategories()` to get subcategory name for the header
  - Layout:
    1. `SpendingHeader` with subcategory name, total, month label, back to category page
    2. `MonthlyBarChart` for this subcategory over 6 months
    3. Transaction list grouped by date (use `formatDate` for group headers)
    4. Each transaction row shows: counterparty name (or description), amount, date
    5. Clicking a counterparty navigates to `...expenses/:categoryId/:subcategoryId/counterparty/:name`
  - Transaction rows should be simpler than the full TransactionRow — just counterparty/description, amount, and date. Don't reuse the full TransactionRow component.
- **PATTERN**: Transaction grouping by date — group transactions by `formatDate(t.date, 'long')` and render date headers
- **IMPORTS**: spending components, useSpendingExplorer, useCategories, Link
- **VALIDATE**: `npm run typecheck`

### Task 12: CREATE `src/pages/SpendingCounterparty.tsx`

- **IMPLEMENT**: Level 4 page — spending with a specific counterparty within category context:
  - Route params: `categoryId`, `subcategoryId`, `counterparty` (URL-encoded)
  - Use `useSpendingExplorer({ direction, categoryId, subcategoryId, counterparty })` to get data
  - Layout:
    1. `SpendingHeader` with decoded counterparty name, total for selected month, back to subcategory page
    2. `MonthlyBarChart` for this counterparty over 6 months
    3. Transaction list for selected month (grouped by date)
- **PATTERN**: Similar to `src/pages/CounterpartyDetail.tsx` but within the drill-down flow
- **IMPORTS**: spending components, useSpendingExplorer
- **VALIDATE**: `npm run typecheck`

### Task 13: UPDATE `src/App.tsx` — Add Routes

- **IMPLEMENT**: Add nested routes for the spending explorer under the protected route:
  ```tsx
  <Route path="expenses" element={<SpendingExplorer />} />
  <Route path="expenses/:categoryId" element={<SpendingCategory />} />
  <Route path="expenses/:categoryId/:subcategoryId" element={<SpendingSubcategory />} />
  <Route path="expenses/:categoryId/:subcategoryId/counterparty/:counterparty" element={<SpendingCounterparty />} />
  <Route path="income" element={<SpendingExplorer />} />
  <Route path="income/:categoryId" element={<SpendingCategory />} />
  <Route path="income/:categoryId/:subcategoryId" element={<SpendingSubcategory />} />
  <Route path="income/:categoryId/:subcategoryId/counterparty/:counterparty" element={<SpendingCounterparty />} />
  ```
- **IMPORTS**: Import the 4 new page components
- **VALIDATE**: `npm run typecheck`

### Task 14: UPDATE `src/pages/Dashboard.tsx` — Add Entry Cards

- **IMPLEMENT**: Add two clickable cards below the existing SummaryCards:
  - "Expenses" card: shows total expenses for the month, links to `/expenses`
  - "Income" card: shows total income for the month, links to `/income`
  - Style: Use Card component with hover effect, show amount prominently, add a right-arrow icon (ChevronRight)
  - Also update `handleCategoryClick` to navigate to `/expenses/:categoryId` instead of `/transactions?category=...` so the pie chart enters the drill-down flow
- **PATTERN**: Card styling matches existing SummaryCards layout
- **IMPORTS**: `Link` from react-router-dom, `ChevronRight` from lucide-react
- **GOTCHA**: Keep the existing handleDateClick behavior unchanged (navigates to transactions page)
- **VALIDATE**: `npm run typecheck`

### Task 15: CREATE iOS `SpendingExplorerViewModel.swift`

- **IMPLEMENT**: ViewModel for the spending explorer on iOS:
  - `@Observable final class SpendingExplorerViewModel`
  - Properties: `currentTotal`, `monthlyTotals: [MonthlyTotal]`, `categories: [CategoryBreakdown]`, `transactions: [Transaction]`, `isLoading`, `direction: SpendingDirection` enum
  - Methods:
    - `fetchData(direction:, dateRange:, categoryId:, subcategoryId:, counterparty:)` — fetches from Firestore directly (no Cloud Function on iOS, query locally like other iOS view models)
    - Calculate 6-month totals by fetching transactions for 6-month window and grouping by month
    - Calculate category breakdown for selected month
  - Use `FirestoreService.shared` for data access
  - Define `SpendingDirection` enum with `.expenses` and `.income` cases
  - Define `MonthlyTotal` struct and `CategoryBreakdown` struct
- **PATTERN**: Mirror `ios/FreeLunch/ViewModels/DashboardViewModel.swift` for async patterns and Firestore access
- **VALIDATE**: Xcode build (manual)

### Task 16: CREATE iOS `MonthlyBarChartView.swift`

- **IMPLEMENT**: A SwiftUI view showing 6 vertical bars for monthly totals:
  - Props: `monthlyTotals: [MonthlyTotal]`, `selectedMonthKey: String`, `onMonthTap: (String) -> Void`
  - Use SwiftUI native drawing (no external chart library):
    - `HStack` with equal-width bars
    - Each bar: `VStack` with `RoundedRectangle` (height proportional to amount/maxAmount) + month label below
    - Selected month has a distinct visual (e.g., lighter fill or border)
    - Tap gesture on each bar calls `onMonthTap`
  - Color: Forest green (#1D4739) for expenses, lighter green (#2D5A4A) for income
  - Height: ~150pt
- **PATTERN**: Native SwiftUI drawing, no external dependencies
- **VALIDATE**: Xcode build (manual)

### Task 17: CREATE iOS `CategoryRowView.swift`

- **IMPLEMENT**: A SwiftUI row showing category spending with horizontal bar:
  - Props: `name`, `icon`, `color`, `amount`, `percentage`, `transactionCount`
  - Layout: `HStack` with icon + name/count on left, amount/percentage on right
  - Background: `GeometryReader` to draw horizontal bar proportional to percentage
  - Tap navigates to next level
- **PATTERN**: Match ABN screenshot styling — minimal, clean rows
- **VALIDATE**: Xcode build (manual)

### Task 18: CREATE iOS `SpendingExplorerView.swift`

- **IMPLEMENT**: Top-level spending explorer view:
  - Receives `direction` parameter
  - Uses `SpendingExplorerViewModel` and `MonthViewModel` from environment
  - Layout: `ScrollView` with `VStack`:
    1. Total amount + month label
    2. `MonthlyBarChartView`
    3. `ForEach` with `CategoryRowView` items
  - `NavigationLink` on each row → `SpendingCategoryView`
  - Fetch data on appear and when month changes
- **PATTERN**: Mirror `ios/FreeLunch/Views/Dashboard/DashboardView.swift` structure
- **VALIDATE**: Xcode build (manual)

### Task 19: CREATE iOS `SpendingCategoryView.swift`

- **IMPLEMENT**: Category detail showing subcategories:
  - Receives `categoryId` and `direction`
  - Shows subcategory breakdown or transactions if leaf
  - `NavigationLink` rows → `SpendingSubcategoryView`
- **VALIDATE**: Xcode build (manual)

### Task 20: CREATE iOS `SpendingSubcategoryView.swift`

- **IMPLEMENT**: Subcategory detail showing transactions:
  - Receives `categoryId`, `subcategoryId`, `direction`
  - Transaction list grouped by date
  - Counterparty names are tappable → `SpendingCounterpartyView`
- **VALIDATE**: Xcode build (manual)

### Task 21: CREATE iOS `SpendingCounterpartyView.swift`

- **IMPLEMENT**: Counterparty detail within spending flow:
  - Receives counterparty name, direction, and category context
  - Shows 6-month bar chart for that counterparty
  - Transaction list for selected month
- **VALIDATE**: Xcode build (manual)

### Task 22: UPDATE iOS `DashboardView.swift` — Add Entry Cards

- **IMPLEMENT**: Add "Expenses" and "Income" cards to the dashboard:
  - Place below existing summary section
  - Each card shows direction label + total amount + chevron right
  - Wrap in `NavigationLink` → `SpendingExplorerView(direction:)`
- **PATTERN**: Match existing card styling in DashboardView
- **VALIDATE**: Xcode build (manual)

### Task 23: UPDATE iOS `ContentView.swift` — Register ViewModel

- **IMPLEMENT**: Create `SpendingExplorerViewModel` as `@State` in `MainTabView` and inject via `.environment()` so it's available to spending views
- **PATTERN**: Mirror how `DashboardViewModel` is created and injected
- **VALIDATE**: Xcode build (manual)

### Task 24: UPDATE iOS Xcode project

- **IMPLEMENT**: Ensure all new Swift files are added to the Xcode project's build sources. If using `project.yml` (XcodeGen), the files may be auto-detected by folder reference. If not, update `ios/FreeLunch.xcodeproj/project.pbxproj` accordingly.
- **GOTCHA**: The project uses folder references in the pbxproj — new files in existing group folders should be detected, but verify.
- **VALIDATE**: Xcode build (manual)

### Task 25: ADD unit tests for Cloud Function

- **IMPLEMENT**: Create `functions/src/handlers/__tests__/getSpendingExplorer.test.ts`:
  - Test category grouping logic (parent rollup)
  - Test 6-month aggregation
  - Test direction filtering (expenses vs income)
  - Test with split transactions
  - Test with pending reimbursements excluded
- **PATTERN**: Mirror `functions/src/shared/__tests__/aggregations.test.ts` test patterns
- **VALIDATE**: `cd functions && npm test` (if test script exists) or `npm run build`

### Task 26: ADD E2E test for spending drill-down

- **IMPLEMENT**: Create `e2e/spending-explorer.spec.ts`:
  - Test navigating from dashboard to expenses page
  - Test seeing category breakdown
  - Test clicking a category to see subcategories
  - Test clicking a subcategory to see transactions
  - Test month navigation via bar chart
  - Test back navigation at each level
  - Test income flow
- **PATTERN**: Mirror `e2e/dashboard.spec.ts` for setup (login, seed data)
- **VALIDATE**: `npm run e2e`

---

## TESTING STRATEGY

### Unit Tests

- Cloud Function `getSpendingExplorer`: test aggregation logic with mock Firestore data
- Test category rollup (subcategory spending aggregated to parent)
- Test 6-month window calculation
- Test expense vs income filtering
- Test split transaction handling
- Test pending reimbursement exclusion

### Integration Tests

- `useSpendingExplorer` hook: mock Cloud Function, verify data transformation
- Test month navigation updates query parameters correctly

### End-to-End (E2E) Tests

**CRITICAL: E2E tests are REQUIRED for this user-facing feature.**

```typescript
test.describe('Spending Explorer', () => {
  test.beforeEach(async ({ page }) => {
    // Login and seed test data with categories/subcategories/transactions
  });

  test('should navigate from dashboard expenses card to spending explorer', async ({ page }) => {
    // Click expenses card on dashboard
    // Verify spending explorer page loads with category breakdown
  });

  test('should show 6-month bar chart', async ({ page }) => {
    // Navigate to /expenses
    // Verify 6 bars are rendered
    // Verify current month is highlighted
  });

  test('should drill down from category to subcategories', async ({ page }) => {
    // Click a category row
    // Verify subcategory breakdown shows
    // Verify URL updates to /expenses/:categoryId
  });

  test('should drill down from subcategory to transactions', async ({ page }) => {
    // Click a subcategory row
    // Verify transaction list shows
    // Verify transactions are grouped by date
  });

  test('should navigate months via bar chart', async ({ page }) => {
    // Click a different month bar
    // Verify data updates to that month
  });

  test('should navigate back at each level', async ({ page }) => {
    // Go to subcategory level
    // Click back → should be at category level
    // Click back → should be at top level
  });
});
```

### Edge Cases

- Category with no subcategories (should show transactions directly at level 2)
- Month with no transactions (empty state with zero-height bar)
- Uncategorized transactions (show as "Uncategorized" category with default color)
- Split transactions (each split counted in its category)
- Very long category names (truncation)
- Only income transactions (expenses page shows empty)
- Counterparty with special characters in name (URL encoding)

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
cd functions && npm run build
```

### Level 2: Unit Tests

```bash
npm run test -- --run
```

### Level 3: Integration Tests

```bash
npm run test -- --run src/hooks/__tests__/
```

### Level 4: E2E Tests

```bash
# Start Firebase emulators (REQUIRED for authenticated tests)
npm run firebase:emulators &
sleep 10

# Run E2E tests
npm run e2e

# Or specific test file
npx playwright test e2e/spending-explorer.spec.ts
```

### Level 5: Manual Validation

- Open app in browser, navigate to Dashboard
- Click "Expenses" card → verify category breakdown loads
- Click a category → verify subcategories show
- Click a subcategory → verify transactions show
- Click counterparty → verify counterparty detail shows
- Click different month bars → verify data updates
- Use back button at each level → verify correct navigation
- Repeat for "Income"
- Test on mobile viewport (responsive)
- Test in iOS simulator

### Level 6: iOS Validation

```bash
# Build iOS project (requires Xcode)
cd ios && xcodebuild -scheme FreeLunch -destination 'platform=iOS Simulator,name=iPhone 16' build
```

---

## ACCEPTANCE CRITERIA

- [ ] Dashboard shows "Expenses" and "Income" entry cards with monthly totals
- [ ] Clicking a card navigates to `/expenses` or `/income` with category breakdown
- [ ] Each category shows icon, name, transaction count, amount, and percentage with horizontal bar
- [ ] 6-month vertical bar chart appears at every drill-down level
- [ ] Clicking a bar navigates to that month (updates data below)
- [ ] Selected month bar is visually distinct from other bars
- [ ] Clicking a category navigates to subcategory breakdown
- [ ] Categories with no subcategories show transactions directly
- [ ] Clicking a subcategory shows transaction list grouped by date
- [ ] Clicking a counterparty shows counterparty spending detail with monthly bars
- [ ] Back navigation works correctly at every level
- [ ] URLs are bookmarkable and shareable (route-based navigation)
- [ ] Pending reimbursements are excluded from spending calculations
- [ ] Split transactions are handled correctly (each split in its category)
- [ ] Loading states show skeletons at every level
- [ ] Empty states handled gracefully (no transactions, no subcategories)
- [ ] iOS app has equivalent functionality with NavigationStack drill-down
- [ ] All validation commands pass with zero errors
- [ ] E2E tests cover the main drill-down flow

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration + E2E)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works on web and iOS
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

### Key Design Decisions

1. **Single Cloud Function vs Multiple**: Using one `getSpendingExplorer` function with parameters for the drill-down level, rather than separate functions per level. This keeps the API surface small and the client logic simple.

2. **6-month window fetching**: Fetch all 6 months of transactions in one Firestore query (wider date range) and aggregate in memory, rather than 6 separate queries. More efficient for Firestore billing and latency.

3. **iOS local aggregation vs Cloud Function**: The iOS app calculates aggregations locally from Firestore data (matching existing patterns in DashboardViewModel/BudgetsViewModel) rather than calling the Cloud Function. This keeps the iOS architecture consistent and avoids adding Cloud Function dependencies to the iOS networking layer.

4. **URL routing over in-page state**: Each drill-down level has its own URL for browser back support, deep linking, and shareability. This matches the existing app pattern (CounterpartyDetail is already URL-routed).

5. **Reuse of MonthContext**: The bar chart month selection integrates with the global `MonthContext` via `setSelectedMonth`, so changing the month in the drill-down also updates the header's month selector and vice versa. This is consistent behavior with the rest of the app.

6. **Horizontal bars vs pie chart**: The category breakdown uses horizontal bars (like ABN) rather than the existing pie chart. This is more scannable, supports more categories without clutter, and naturally conveys rank ordering.

### Performance Considerations

- The 6-month aggregation query fetches more data than a single-month query. For users with many transactions, this could be slow. Consider adding a loading indicator and potentially caching the multi-month data with a longer stale time.
- The Cloud Function performs all aggregation server-side, reducing client-side computation.
- Query keys include all filter parameters, so switching between levels doesn't re-fetch data unnecessarily.

### Risk: Category Hierarchy Edge Cases

- Categories can be 2 levels deep (parent → child). The drill-down assumes max 2 levels. If a category has no parent AND no children, clicking it at level 1 should show transactions directly (skip subcategory level).
- Orphaned categories (parentId references a deleted category) should appear at the top level.
