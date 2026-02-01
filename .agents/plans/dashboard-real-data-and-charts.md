# Feature: Dashboard Real Data Integration and Recharts Implementation

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Connect the Dashboard page to real Firestore data and implement interactive charts using Recharts. This transforms the static placeholder dashboard into a fully functional financial overview showing:

1. **Summary Cards** - Real totals for income, expenses, net balance, and pending reimbursements
2. **Spending by Category Chart** - Donut chart showing expense breakdown by category
3. **Spending Over Time Chart** - Bar chart showing daily/weekly expense trends
4. **Recent Transactions** - Live list of the 5 most recent transactions

## User Story

As a Free Lunch user
I want to see my real spending data visualized on the dashboard
So that I can quickly understand my financial situation at a glance

## Problem Statement

The current Dashboard page displays hardcoded placeholder data and chart placeholders. Users cannot see their actual financial data, making the dashboard non-functional. The Recharts library is installed but unused.

Current state:

- Static summaryData object with hardcoded values (Dashboard.tsx lines 6-11)
- Chart sections show "placeholder" text (lines 84-86, 95-96)
- Recent transactions section shows placeholder (lines 108-109)
- No data fetching hooks used

## Solution Statement

1. Create a new `useDashboardData` hook that aggregates transaction data for:
   - Summary metrics (totals, counts)
   - Category breakdown for donut chart
   - Timeline data for bar chart

2. Create dashboard-specific chart components:
   - `SpendingByCategoryChart` - Donut chart with category colors
   - `SpendingOverTimeChart` - Bar chart with daily aggregation
   - `SummaryCards` - Extract existing cards into reusable component

3. Update Dashboard page to:
   - Use real data from hooks
   - Display actual charts with Recharts
   - Show loading and empty states
   - Include recent transactions list

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium
**Primary Systems Affected**:

- `src/pages/Dashboard.tsx` - Main dashboard page
- `src/hooks/` - New useDashboardData hook
- `src/components/dashboard/` - New chart components

**Dependencies**:

- Recharts 2.15.0 (already installed)
- TanStack Query (already configured)
- date-fns (already installed)
- Existing useTransactions and useCategories hooks

---

## CONTEXT REFERENCES

### Relevant Codebase Files - MUST READ BEFORE IMPLEMENTING!

- `src/pages/Dashboard.tsx` (full file) - Current dashboard with placeholders to replace
- `src/pages/Transactions.tsx` (lines 28-44) - Pattern for using hooks and state management
- `src/hooks/useTransactions.ts` (full file) - Transaction fetching pattern with filters
- `src/hooks/useCategories.ts` (full file) - Category fetching pattern and tree building
- `src/lib/colors.ts` (full file) - CHART_COLORS array and getCategoryColor utility
- `src/lib/utils.ts` (lines 14-28, 54-59) - formatAmount and getAmountColor utilities
- `src/types/index.ts` (lines 119-140) - SpendingSummary, CategorySpending, TimelineData types
- `src/components/ui/card.tsx` - Card, CardContent, CardHeader, CardTitle components
- `src/components/ui/skeleton.tsx` - Loading skeleton component
- `src/components/transactions/TransactionRow.tsx` - Pattern for transaction display
- `.claude/reference/free-lunch-design-system.md` (lines 1113-1240) - Chart design specs

### New Files to Create

- `src/hooks/useDashboardData.ts` - Aggregation hook for dashboard metrics
- `src/components/dashboard/SummaryCards.tsx` - Summary metric cards component
- `src/components/dashboard/SpendingByCategoryChart.tsx` - Donut chart component
- `src/components/dashboard/SpendingOverTimeChart.tsx` - Bar chart component
- `src/components/dashboard/RecentTransactions.tsx` - Recent transactions list
- `src/components/dashboard/index.ts` - Barrel export file

### Relevant Documentation - READ BEFORE IMPLEMENTING!

- [Recharts PieChart API](https://recharts.org/en-US/api/PieChart)
  - ResponsiveContainer, Pie, Cell, Tooltip components
  - Why: Core API for donut chart implementation
- [Recharts BarChart API](https://recharts.org/en-US/api/BarChart)
  - CartesianGrid, XAxis, YAxis, Bar components
  - Why: Core API for timeline chart implementation
- [TanStack Query useQuery](https://tanstack.com/query/latest/docs/react/reference/useQuery)
  - queryKey, queryFn, enabled, select options
  - Why: Data fetching and caching pattern

### Patterns to Follow

**Naming Conventions:**

- Hooks: `useDashboardData`, `useSpendingByCategory`
- Components: PascalCase, descriptive (`SpendingByCategoryChart`)
- Files: Match component/hook name exactly

**TanStack Query Pattern (from useTransactions.ts):**

```typescript
export function useDashboardData(dateRange: { startDate: Date; endDate: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard', user?.id ?? '', dateRange],
    queryFn: async () => {
      // Fetch and aggregate data
    },
    enabled: !!user?.id,
  });
}
```

**Chart Styling (from design system lines 1232-1240):**

```typescript
// Grid lines: dashed "3 3", color #E5E7EB (Gray 200)
// Axis text: #6B7280 (Gray 500), 12px font
// Tooltips: White bg, rounded-lg, shadow-lg
// Bar radius: [4, 4, 0, 0] (top corners only)
```

**Component Pattern (from existing components):**

```typescript
import { cn } from '@/lib/utils';

interface SpendingByCategoryChartProps {
  data: CategorySpending[];
  isLoading?: boolean;
  className?: string;
}

export function SpendingByCategoryChart({
  data,
  isLoading,
  className,
}: SpendingByCategoryChartProps) {
  // Component implementation
}
```

**Loading State Pattern (from TransactionList.tsx):**

```typescript
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}
```

**Empty State Pattern:**

```typescript
if (data.length === 0) {
  return (
    <div className="flex h-[300px] items-center justify-center text-center">
      <div>
        <p className="text-muted-foreground">No spending data for this period</p>
      </div>
    </div>
  );
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Data Layer

Create the dashboard data hook that aggregates transactions into summary metrics, category breakdown, and timeline data.

**Tasks:**

- Create useDashboardData hook
- Implement aggregation logic for summaries
- Calculate category spending percentages
- Generate timeline data with date grouping

### Phase 2: Chart Components

Create reusable chart components following the design system specifications.

**Tasks:**

- Create SpendingByCategoryChart (donut)
- Create SpendingOverTimeChart (bar)
- Create custom tooltips matching design system
- Add loading and empty states

### Phase 3: Dashboard Composition

Extract existing cards into a component and compose the full dashboard with real data.

**Tasks:**

- Create SummaryCards component
- Create RecentTransactions component
- Update Dashboard page to use new components and hooks
- Add date range selector for filtering

### Phase 4: Testing & Polish

Ensure the dashboard works correctly with E2E tests and visual polish.

**Tasks:**

- Add E2E tests for dashboard functionality
- Test loading states and empty states
- Verify responsive behavior
- Check chart animations and interactions

---

## STEP-BY-STEP TASKS

### PHASE 1: DATA LAYER

#### Task 1.1: CREATE `src/hooks/useDashboardData.ts`

- **IMPLEMENT**: TanStack Query hook that fetches and aggregates dashboard data
- **PATTERN**: Follow `src/hooks/useTransactions.ts` query structure
- **IMPORTS**:
  ```typescript
  import { useQuery } from '@tanstack/react-query';
  import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
  import { db } from '@/lib/firebase';
  import { useAuth } from '@/contexts/AuthContext';
  import { useCategories } from '@/hooks/useCategories';
  import type {
    Transaction,
    Category,
    SpendingSummary,
    CategorySpending,
    TimelineData,
  } from '@/types';
  import { startOfDay, format, eachDayOfInterval, eachWeekOfInterval, startOfWeek } from 'date-fns';
  ```
- **EXPORTS**:
  - `useDashboardData(dateRange)` - Main hook returning summary, categorySpending, timeline
  - `calculateSummary(transactions)` - Pure function for summary calculation
  - `calculateCategorySpending(transactions, categories)` - Category aggregation
  - `calculateTimelineData(transactions, granularity)` - Timeline aggregation
- **GOTCHA**: Handle transactions with null categoryId (group as "Uncategorized")
- **GOTCHA**: Filter out pending reimbursements from expense totals but track them separately
- **GOTCHA**: Use absolute values for expenses in charts (amounts are negative in DB)
- **VALIDATE**: `npm run typecheck`

**Implementation Details:**

```typescript
interface DashboardDateRange {
  startDate: Date;
  endDate: Date;
}

interface DashboardData {
  summary: SpendingSummary;
  categorySpending: CategorySpending[];
  timeline: TimelineData[];
  recentTransactions: Transaction[];
}

export function useDashboardData(dateRange: DashboardDateRange) {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();

  return useQuery({
    queryKey: [
      'dashboard',
      user?.id ?? '',
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
    ],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error('Not authenticated');

      // Fetch transactions for date range
      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsRef,
        where('date', '>=', Timestamp.fromDate(dateRange.startDate)),
        where('date', '<=', Timestamp.fromDate(dateRange.endDate)),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map((doc) => transformTransaction(doc));

      return {
        summary: calculateSummary(transactions),
        categorySpending: calculateCategorySpending(transactions, categories),
        timeline: calculateTimelineData(transactions, dateRange),
        recentTransactions: transactions.slice(0, 5),
      };
    },
    enabled: !!user?.id && categories.length > 0,
  });
}

// Helper: Calculate summary metrics
export function calculateSummary(transactions: Transaction[]): SpendingSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  let pendingReimbursements = 0;

  transactions.forEach((t) => {
    if (t.reimbursement?.status === 'pending') {
      pendingReimbursements += Math.abs(t.amount);
    } else if (t.amount > 0) {
      totalIncome += t.amount;
    } else {
      totalExpenses += Math.abs(t.amount);
    }
  });

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    pendingReimbursements,
    transactionCount: transactions.length,
  };
}

// Helper: Calculate spending by category
export function calculateCategorySpending(
  transactions: Transaction[],
  categories: Category[]
): CategorySpending[] {
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Only count expenses (negative amounts), exclude pending reimbursements
  const expenses = transactions.filter(
    (t) => t.amount < 0 && t.reimbursement?.status !== 'pending'
  );

  // Group by category
  const spending = new Map<string, { amount: number; count: number }>();
  expenses.forEach((t) => {
    const key = t.categoryId ?? 'uncategorized';
    const current = spending.get(key) ?? { amount: 0, count: 0 };
    spending.set(key, {
      amount: current.amount + Math.abs(t.amount),
      count: current.count + 1,
    });
  });

  // Calculate total for percentages
  const total = Array.from(spending.values()).reduce((sum, s) => sum + s.amount, 0);

  // Convert to CategorySpending array
  const result: CategorySpending[] = [];
  spending.forEach((value, categoryId) => {
    const category = categoryMap.get(categoryId);
    result.push({
      categoryId,
      categoryName: category?.name ?? 'Uncategorized',
      categoryColor: category?.color ?? '#9CA3AF',
      amount: value.amount,
      percentage: total > 0 ? (value.amount / total) * 100 : 0,
      transactionCount: value.count,
    });
  });

  // Sort by amount descending
  return result.sort((a, b) => b.amount - a.amount);
}

// Helper: Calculate timeline data (daily aggregation)
export function calculateTimelineData(
  transactions: Transaction[],
  dateRange: DashboardDateRange
): TimelineData[] {
  // Create a map of date -> amounts
  const dailyData = new Map<string, { income: number; expenses: number }>();

  // Initialize all days in range
  const days = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
  days.forEach((day) => {
    dailyData.set(format(day, 'yyyy-MM-dd'), { income: 0, expenses: 0 });
  });

  // Aggregate transactions by day
  transactions.forEach((t) => {
    if (t.reimbursement?.status === 'pending') return; // Skip pending reimbursements

    const dateKey = format(t.date, 'yyyy-MM-dd');
    const current = dailyData.get(dateKey) ?? { income: 0, expenses: 0 };

    if (t.amount > 0) {
      current.income += t.amount;
    } else {
      current.expenses += Math.abs(t.amount);
    }

    dailyData.set(dateKey, current);
  });

  // Convert to array with formatted dates
  return Array.from(dailyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: format(new Date(date), 'MMM d'),
      income: data.income,
      expenses: data.expenses,
    }));
}
```

---

### PHASE 2: CHART COMPONENTS

#### Task 2.1: CREATE `src/components/dashboard/SpendingByCategoryChart.tsx`

- **IMPLEMENT**: Donut chart showing spending breakdown by category
- **PATTERN**: Follow design system (lines 1138-1173)
- **IMPORTS**:
  ```typescript
  import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
  import { formatAmount } from '@/lib/utils';
  import { Skeleton } from '@/components/ui/skeleton';
  import type { CategorySpending } from '@/types';
  ```
- **PROPS**: `data: CategorySpending[]`, `isLoading?: boolean`, `className?: string`
- **FEATURES**:
  - Donut chart with innerRadius=60, outerRadius=100
  - Custom tooltip showing category name and formatted amount
  - Legend below chart showing top 5 categories
  - Loading skeleton state
  - Empty state message
- **STYLING**:
  - `paddingAngle={2}` for segment spacing
  - `stroke="white"` `strokeWidth={2}` for segment borders
  - Use category's stored color for each cell
- **GOTCHA**: Recharts requires numeric data, ensure amounts are positive numbers
- **VALIDATE**: `npm run typecheck`

**Implementation:**

```typescript
interface SpendingByCategoryChartProps {
  data: CategorySpending[];
  isLoading?: boolean;
  className?: string;
}

export function SpendingByCategoryChart({
  data,
  isLoading,
  className
}: SpendingByCategoryChartProps) {
  if (isLoading) {
    return <Skeleton className={cn('h-[300px] w-full', className)} />;
  }

  if (data.length === 0) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-muted-foreground">No spending data for this period</p>
      </div>
    );
  }

  // Prepare data for Recharts (top 8 categories, rest grouped as "Other")
  const chartData = prepareChartData(data);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.color}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {chartData.slice(0, 5).map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="font-medium text-gray-900">{data.name}</p>
      <p className="text-lg font-bold tabular-nums text-gray-900">
        {formatAmount(data.value, { showSign: false })}
      </p>
      <p className="text-sm text-gray-500">{data.percentage.toFixed(1)}%</p>
    </div>
  );
}

function prepareChartData(data: CategorySpending[]) {
  const top = data.slice(0, 7);
  const rest = data.slice(7);

  const chartData = top.map(d => ({
    name: d.categoryName,
    value: d.amount,
    color: d.categoryColor,
    percentage: d.percentage,
  }));

  if (rest.length > 0) {
    const otherAmount = rest.reduce((sum, d) => sum + d.amount, 0);
    const otherPercentage = rest.reduce((sum, d) => sum + d.percentage, 0);
    chartData.push({
      name: 'Other',
      value: otherAmount,
      color: '#9CA3AF',
      percentage: otherPercentage,
    });
  }

  return chartData;
}
```

#### Task 2.2: CREATE `src/components/dashboard/SpendingOverTimeChart.tsx`

- **IMPLEMENT**: Bar chart showing daily spending trends
- **PATTERN**: Follow design system (lines 1175-1210)
- **IMPORTS**:
  ```typescript
  import {
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
  } from 'recharts';
  import { formatAmount } from '@/lib/utils';
  import { colors } from '@/lib/colors';
  import { Skeleton } from '@/components/ui/skeleton';
  import type { TimelineData } from '@/types';
  ```
- **PROPS**: `data: TimelineData[]`, `isLoading?: boolean`, `className?: string`
- **FEATURES**:
  - Vertical bar chart with expenses
  - Styled grid lines (dashed, gray)
  - Formatted Y-axis with Euro values
  - Custom tooltip with formatted amount
  - Loading and empty states
- **STYLING**:
  - Grid: `strokeDasharray="3 3"` `stroke="#E5E7EB"`
  - Axis text: `fontSize: 12, fill: '#6B7280'`
  - Bar: `fill="#EF4444"` (red for expenses) `radius={[4, 4, 0, 0]}`
- **GOTCHA**: Handle many days by limiting X-axis tick count or using weekly aggregation
- **VALIDATE**: `npm run typecheck`

**Implementation:**

```typescript
interface SpendingOverTimeChartProps {
  data: TimelineData[];
  isLoading?: boolean;
  className?: string;
}

export function SpendingOverTimeChart({
  data,
  isLoading,
  className
}: SpendingOverTimeChartProps) {
  if (isLoading) {
    return <Skeleton className={cn('h-[300px] w-full', className)} />;
  }

  if (data.length === 0 || data.every(d => d.expenses === 0 && d.income === 0)) {
    return (
      <div className={cn('flex h-[300px] items-center justify-center', className)}>
        <p className="text-muted-foreground">No transaction data for this period</p>
      </div>
    );
  }

  // Limit number of bars for readability (show every nth day if too many)
  const chartData = data.length > 15
    ? data.filter((_, i) => i % Math.ceil(data.length / 15) === 0)
    : data;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value >= 1000 ? `€${(value / 1000).toFixed(1)}k` : `€${value}`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
          <Bar
            dataKey="expenses"
            fill="#EF4444"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold tabular-nums text-red-500">
        {formatAmount(-payload[0].value, { showSign: false })}
      </p>
    </div>
  );
}
```

#### Task 2.3: CREATE `src/components/dashboard/SummaryCards.tsx`

- **IMPLEMENT**: Extract summary cards from Dashboard.tsx into reusable component
- **PATTERN**: Follow existing Card usage in Dashboard.tsx (lines 23-75)
- **IMPORTS**:
  ```typescript
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Skeleton } from '@/components/ui/skeleton';
  import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
  import { formatAmount } from '@/lib/utils';
  import type { SpendingSummary } from '@/types';
  ```
- **PROPS**: `summary: SpendingSummary`, `isLoading?: boolean`
- **FEATURES**:
  - 4 cards: Income (green), Expenses (red), Net Balance, Pending Reimbursements (amber)
  - Loading skeletons for each card
  - Responsive grid layout
- **VALIDATE**: `npm run typecheck`

**Implementation:**

```typescript
interface SummaryCardsProps {
  summary: SpendingSummary;
  isLoading?: boolean;
  pendingCount?: number;
}

export function SummaryCards({ summary, isLoading, pendingCount = 0 }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-emerald-500">
            {formatAmount(summary.totalIncome, { showSign: false })}
          </div>
          <p className="text-xs text-muted-foreground">This period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-red-500">
            {formatAmount(-summary.totalExpenses, { showSign: false })}
          </div>
          <p className="text-xs text-muted-foreground">This period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatAmount(summary.netBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.transactionCount} transactions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Reimbursements</CardTitle>
          <Receipt className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums text-amber-500">
            {formatAmount(summary.pendingReimbursements, { showSign: false })}
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingCount} expense{pendingCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Task 2.4: CREATE `src/components/dashboard/RecentTransactions.tsx`

- **IMPLEMENT**: List of 5 most recent transactions
- **PATTERN**: Simplified version of TransactionRow
- **IMPORTS**:
  ```typescript
  import { formatAmount, formatDate, cn } from '@/lib/utils';
  import { Skeleton } from '@/components/ui/skeleton';
  import { CategoryBadge } from '@/components/categories/CategoryBadge';
  import type { Transaction, Category } from '@/types';
  ```
- **PROPS**: `transactions: Transaction[]`, `categories: Category[]`, `isLoading?: boolean`
- **FEATURES**:
  - Compact transaction rows
  - Category badge display
  - Color-coded amounts
  - Empty state for no transactions
  - Link to full transactions page
- **VALIDATE**: `npm run typecheck`

**Implementation:**

```typescript
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  isLoading?: boolean;
}

export function RecentTransactions({
  transactions,
  categories,
  isLoading
}: RecentTransactionsProps) {
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-center">
        <p className="text-muted-foreground">No recent transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((transaction) => {
        const category = transaction.categoryId
          ? categoryMap.get(transaction.categoryId)
          : null;

        return (
          <div
            key={transaction.id}
            className="flex items-center gap-4 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors"
          >
            <div className="w-14 flex-shrink-0 text-sm text-muted-foreground">
              {formatDate(transaction.date, 'short')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{transaction.description}</p>
            </div>
            {category && (
              <CategoryBadge category={category} size="sm" />
            )}
            <div
              className={cn(
                'w-20 flex-shrink-0 text-right text-sm font-medium tabular-nums',
                transaction.amount > 0 ? 'text-emerald-500' : 'text-red-500'
              )}
            >
              {formatAmount(transaction.amount)}
            </div>
          </div>
        );
      })}

      <Link
        to="/transactions"
        className="flex items-center justify-center gap-2 pt-3 text-sm text-primary hover:underline"
      >
        View all transactions
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
```

#### Task 2.5: CREATE `src/components/dashboard/index.ts`

- **IMPLEMENT**: Barrel export file for dashboard components
- **VALIDATE**: `npm run typecheck`

```typescript
export { SummaryCards } from './SummaryCards';
export { SpendingByCategoryChart } from './SpendingByCategoryChart';
export { SpendingOverTimeChart } from './SpendingOverTimeChart';
export { RecentTransactions } from './RecentTransactions';
```

---

### PHASE 3: DASHBOARD COMPOSITION

#### Task 3.1: UPDATE `src/pages/Dashboard.tsx`

- **IMPLEMENT**: Replace placeholders with real data and charts
- **PATTERN**: Follow Transactions.tsx for hook usage and state management
- **IMPORTS**:
  ```typescript
  import { useState } from 'react';
  import { startOfMonth, endOfMonth, format } from 'date-fns';
  import { AlertTriangle } from 'lucide-react';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
  import { useDashboardData } from '@/hooks/useDashboardData';
  import { useCategories } from '@/hooks/useCategories';
  import {
    SummaryCards,
    SpendingByCategoryChart,
    SpendingOverTimeChart,
    RecentTransactions,
  } from '@/components/dashboard';
  ```
- **FEATURES**:
  - Date range state with month selector
  - Real data from useDashboardData hook
  - Loading states for all sections
  - Error state handling
  - Responsive chart layout
- **REMOVE**: Static placeholder summaryData object
- **GOTCHA**: Check for both loading and categories being available before rendering charts
- **VALIDATE**: `npm run typecheck && npm run dev`

**Full Implementation:**

```typescript
import { useState } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCategories } from '@/hooks/useCategories';
import {
  SummaryCards,
  SpendingByCategoryChart,
  SpendingOverTimeChart,
  RecentTransactions,
} from '@/components/dashboard';

type DatePreset = 'thisMonth' | 'lastMonth' | 'thisYear';

export function Dashboard() {
  const now = new Date();
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');

  // Calculate date range based on preset
  const dateRange = getDateRange(datePreset, now);

  const { data: categories = [] } = useCategories();
  const { data: dashboardData, isLoading, error } = useDashboardData(dateRange);

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load dashboard</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const periodLabel = getPeriodLabel(datePreset, dateRange);

  return (
    <div className="space-y-6">
      {/* Page header with date selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview for {periodLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={datePreset === 'thisMonth' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setDatePreset('thisMonth')}
          >
            This Month
          </Button>
          <Button
            variant={datePreset === 'lastMonth' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setDatePreset('lastMonth')}
          >
            Last Month
          </Button>
          <Button
            variant={datePreset === 'thisYear' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setDatePreset('thisYear')}
          >
            This Year
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards
        summary={dashboardData?.summary ?? {
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0,
          pendingReimbursements: 0,
          transactionCount: 0,
        }}
        isLoading={isLoading}
        pendingCount={dashboardData?.recentTransactions.filter(
          t => t.reimbursement?.status === 'pending'
        ).length ?? 0}
      />

      {/* Charts section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingByCategoryChart
              data={dashboardData?.categorySpending ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingOverTimeChart
              data={dashboardData?.timeline ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactions
            transactions={dashboardData?.recentTransactions ?? []}
            categories={categories}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function getDateRange(preset: DatePreset, now: Date) {
  switch (preset) {
    case 'thisMonth':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    case 'thisYear':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31)
      };
  }
}

function getPeriodLabel(preset: DatePreset, dateRange: { startDate: Date; endDate: Date }) {
  switch (preset) {
    case 'thisMonth':
      return format(dateRange.startDate, 'MMMM yyyy');
    case 'lastMonth':
      return format(dateRange.startDate, 'MMMM yyyy');
    case 'thisYear':
      return format(dateRange.startDate, 'yyyy');
  }
}
```

---

### PHASE 4: TESTING & VALIDATION

#### Task 4.1: CREATE `src/hooks/__tests__/useDashboardData.test.ts`

- **IMPLEMENT**: Unit tests for dashboard aggregation functions
- **PATTERN**: Follow existing test patterns in `src/hooks/__tests__/`
- **TESTS**:
  - `calculateSummary` correctly sums income/expenses
  - `calculateSummary` tracks pending reimbursements separately
  - `calculateCategorySpending` groups by category
  - `calculateCategorySpending` handles null categoryId as "Uncategorized"
  - `calculateTimelineData` aggregates by day
- **VALIDATE**: `npm run test`

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateSummary,
  calculateCategorySpending,
  calculateTimelineData,
} from '../useDashboardData';
import type { Transaction, Category } from '@/types';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2026-01-15'),
    description: 'Salary',
    amount: 3000,
    categoryId: 'income-salary',
    reimbursement: null,
    // ... other fields
  },
  {
    id: '2',
    date: new Date('2026-01-16'),
    description: 'Groceries',
    amount: -100,
    categoryId: 'food',
    reimbursement: null,
  },
  {
    id: '3',
    date: new Date('2026-01-17'),
    description: 'Work lunch',
    amount: -25,
    categoryId: 'food',
    reimbursement: {
      status: 'pending',
      type: 'work',
      note: null,
      linkedTransactionId: null,
      clearedAt: null,
    },
  },
];

const mockCategories: Category[] = [
  {
    id: 'income-salary',
    name: 'Salary',
    color: '#10B981',
    icon: '💰',
    parentId: null,
    order: 0,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'food',
    name: 'Food & Drink',
    color: '#F59E0B',
    icon: '🍽️',
    parentId: null,
    order: 1,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('calculateSummary', () => {
  it('calculates income, expenses, and net balance correctly', () => {
    const summary = calculateSummary(mockTransactions);
    expect(summary.totalIncome).toBe(3000);
    expect(summary.totalExpenses).toBe(100); // Excludes pending reimbursement
    expect(summary.netBalance).toBe(2900);
  });

  it('tracks pending reimbursements separately', () => {
    const summary = calculateSummary(mockTransactions);
    expect(summary.pendingReimbursements).toBe(25);
  });
});

describe('calculateCategorySpending', () => {
  it('groups expenses by category', () => {
    const spending = calculateCategorySpending(mockTransactions, mockCategories);
    const foodSpending = spending.find((s) => s.categoryId === 'food');
    expect(foodSpending?.amount).toBe(100); // Excludes pending reimbursement
  });

  it('handles uncategorized transactions', () => {
    const transactions = [{ ...mockTransactions[1], categoryId: null }];
    const spending = calculateCategorySpending(transactions as Transaction[], mockCategories);
    const uncategorized = spending.find((s) => s.categoryId === 'uncategorized');
    expect(uncategorized?.categoryName).toBe('Uncategorized');
  });
});
```

#### Task 4.2: CREATE `e2e/dashboard.spec.ts`

- **IMPLEMENT**: E2E tests for dashboard functionality
- **PATTERN**: Follow `e2e/transactions.spec.ts` structure
- **TESTS**:
  - Dashboard renders with summary cards
  - Charts render (verify SVG elements exist)
  - Date range buttons toggle correctly
  - Recent transactions section appears
  - Loading states show before data loads
- **GOTCHA**: Charts may not render in test environment without data - focus on structure tests
- **VALIDATE**: `npm run e2e`

```typescript
import { test as base, expect } from '@playwright/test';
import { login, register, TEST_USER } from './fixtures/auth';

const test = base.extend({});

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

test.describe('Dashboard Page', () => {
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
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display the dashboard page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/your financial overview/i)).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    await expect(page.getByText(/total income/i)).toBeVisible();
    await expect(page.getByText(/total expenses/i)).toBeVisible();
    await expect(page.getByText(/net balance/i)).toBeVisible();
    await expect(page.getByText(/pending reimbursements/i)).toBeVisible();
  });

  test('should display date range buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /this month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /last month/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /this year/i })).toBeVisible();
  });

  test('should toggle date range on button click', async ({ page }) => {
    const lastMonthBtn = page.getByRole('button', { name: /last month/i });
    await lastMonthBtn.click();
    await expect(lastMonthBtn).toHaveClass(/secondary/);
  });

  test('should display spending by category section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spending by category/i })).toBeVisible();
  });

  test('should display spending over time section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spending over time/i })).toBeVisible();
  });

  test('should display recent transactions section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /recent transactions/i })).toBeVisible();
  });

  test('should have link to view all transactions', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    const link = page.getByRole('link', { name: /view all transactions/i });
    await expect(link).toBeVisible();
  });

  test('should navigate to transactions page from recent transactions', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.getByRole('link', { name: /view all transactions/i }).click();
    await expect(page).toHaveURL('/transactions');
  });
});
```

#### Task 4.3: VERIFY all validation commands pass

- **EXECUTE**: All validation commands in sequence
- **FIX**: Any issues found during validation

---

## TESTING STRATEGY

### Unit Tests

Focus on pure aggregation functions in useDashboardData:

- `calculateSummary` - Test various transaction combinations
- `calculateCategorySpending` - Test grouping and percentage calculations
- `calculateTimelineData` - Test date aggregation

**Location**: `src/hooks/__tests__/useDashboardData.test.ts`

### Integration Tests

Test chart components render correctly with mock data:

- SpendingByCategoryChart renders SVG with correct data
- SpendingOverTimeChart renders bar elements
- SummaryCards shows correct formatted values

### End-to-End (E2E) Tests

**CRITICAL: E2E tests are REQUIRED for this user-facing feature.**

**E2E Test Requirements:**

- Test dashboard loads with all sections visible
- Test date range buttons toggle correctly
- Test navigation to transactions from dashboard
- Verify summary cards display (structure, not exact values)
- Verify chart sections render without errors

**E2E Test Structure:**

```typescript
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto('/');
  });

  test('should display all dashboard sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/total income/i)).toBeVisible();
    await expect(page.getByText(/spending by category/i)).toBeVisible();
  });
});
```

### Edge Cases

- Empty transactions (new user) - Show empty states
- All income, no expenses - Donut chart shows nothing, summary shows all income
- All pending reimbursements - Expenses excluded from totals
- Single day with data - Timeline shows single bar
- Categories with no transactions - Not shown in chart

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
npm run typecheck    # TypeScript compilation - MUST pass
npm run lint         # ESLint checks
npm run format:check # Prettier formatting
```

### Level 2: Unit Tests

```bash
npm run test         # Run Vitest unit tests
```

### Level 3: Build

```bash
npm run build        # Production build must succeed
```

### Level 4: E2E Tests

**REQUIRED: Run E2E tests to verify user-facing functionality**

```bash
# Terminal 1: Start Firebase emulators
npm run firebase:emulators

# Terminal 2: Run E2E tests (dev server starts automatically)
npm run e2e

# Or run in headed mode for debugging
npm run e2e:headed
```

**E2E Test Coverage Requirements:**

- Dashboard page loads correctly
- All sections render (summary, charts, recent transactions)
- Date range buttons work
- Navigation to transactions works
- No console errors or unhandled exceptions

### Level 5: Manual Validation

1. Start dev server: `npm run dev`
2. Start Firebase emulators: `npm run firebase:emulators`
3. Open http://localhost:5173
4. Log in with test account
5. Navigate to Dashboard (home page)
6. **Verify Summary Cards:**
   - All 4 cards display with correct icons and colors
   - Values show Euro format (€X,XXX.XX)
   - Loading skeletons appear briefly
7. **Verify Spending by Category Chart:**
   - Donut chart renders with colored segments
   - Hover tooltip shows category name and amount
   - Legend shows top categories
   - Empty state shows if no expenses
8. **Verify Spending Over Time Chart:**
   - Bar chart renders with red bars
   - X-axis shows dates
   - Y-axis shows Euro amounts
   - Hover tooltip shows date and amount
9. **Verify Recent Transactions:**
   - Shows up to 5 transactions
   - Each row shows date, description, category badge, amount
   - "View all transactions" link works
10. **Test Date Range:**
    - Click "Last Month" - data updates
    - Click "This Year" - data updates
    - Buttons show active state correctly
11. **Test Responsive:**
    - Resize browser to mobile width
    - Charts stack vertically
    - Summary cards stack in 2x2 grid

---

## ACCEPTANCE CRITERIA

- [ ] Dashboard displays real data from Firestore (not placeholder values)
- [ ] Summary cards show correct totals for income, expenses, net balance, pending reimbursements
- [ ] Spending by category donut chart renders with correct category colors
- [ ] Spending over time bar chart shows daily expense aggregation
- [ ] Recent transactions list shows 5 most recent transactions
- [ ] Date range selector (This Month, Last Month, This Year) filters all data
- [ ] Loading states show skeletons during data fetch
- [ ] Empty states show appropriate messages when no data
- [ ] Error state shows when data fetch fails
- [ ] All validation commands pass with zero errors
- [ ] E2E tests verify dashboard functionality
- [ ] Code follows project conventions and patterns
- [ ] TypeScript strict mode passes with no errors
- [ ] Responsive layout works on mobile and desktop

---

## COMPLETION CHECKLIST

- [ ] `src/hooks/useDashboardData.ts` created with aggregation logic
- [ ] `src/components/dashboard/SummaryCards.tsx` created
- [ ] `src/components/dashboard/SpendingByCategoryChart.tsx` created
- [ ] `src/components/dashboard/SpendingOverTimeChart.tsx` created
- [ ] `src/components/dashboard/RecentTransactions.tsx` created
- [ ] `src/components/dashboard/index.ts` barrel export created
- [ ] `src/pages/Dashboard.tsx` updated to use real data and charts
- [ ] `src/hooks/__tests__/useDashboardData.test.ts` unit tests created
- [ ] `e2e/dashboard.spec.ts` E2E tests created
- [ ] All typecheck passes
- [ ] All lint passes
- [ ] Build succeeds
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met

---

## NOTES

### Design Decisions

1. **Single hook vs multiple hooks**: Using one `useDashboardData` hook that returns all dashboard data in a single query. This reduces Firestore reads and ensures data consistency. The hook depends on categories being loaded first.

2. **Client-side aggregation**: Aggregation is done client-side after fetching transactions. For MVP scale (hundreds of transactions), this is acceptable. For scale, consider Cloud Functions for pre-aggregation.

3. **Date granularity**: Timeline chart shows daily data for "This Month" and "Last Month", but could be enhanced to show weekly for "This Year" to reduce bar count.

4. **Top N categories**: Donut chart shows top 7 categories with remaining grouped as "Other" to prevent visual clutter.

5. **Pending reimbursements handling**: Excluded from expense totals but tracked separately. This matches the PRD requirement for accurate personal spending view.

### Known Limitations

- No real-time updates (uses TanStack Query cache with 5-min stale time)
- Timeline granularity is fixed (daily)
- No drill-down from charts to filtered transactions (future enhancement)
- No comparison to previous period (future enhancement)

### Future Enhancements

- Add period-over-period comparison ("+12% from last month")
- Click chart segment to filter transactions
- Add weekly/monthly timeline granularity options
- Add transaction count badges on chart segments
- Implement real-time updates with Firestore listeners
