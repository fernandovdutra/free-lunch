# Feature: Global Month Navigation & Counterparty Analytics

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

A comprehensive analytics enhancement that adds:

1. **Global Month Selector**: A unified month navigation control in the app header that syncs the selected month across Dashboard, Transactions, and other views. Users can browse months using prev/next arrows and a month/year dropdown.

2. **Counterparty Analytics Dialog**: Click on any counterparty in the transaction list to see a quick summary dialog showing this month's spending, a mini 3-month bar chart, transaction count, and a link to the detailed view.

3. **Counterparty Detail Page**: A dedicated analytics page showing full spending history for a counterparty with bar charts, line charts, and summary statistics (total spent, average per month, transaction count, first/last transaction dates).

4. **Month Context Provider**: A React context that manages the global month state, enabling all views to sync their date ranges.

## User Story

As a Free Lunch user
I want to click on counterparties to see spending trends and easily navigate between months
So that I can understand my spending patterns with specific merchants over time

## Problem Statement

Currently, each page (Dashboard, Transactions) manages its own date range independently. Users cannot:
- Easily browse between months with simple prev/next navigation
- See how much they spend with specific merchants over time
- Quickly get spending insights for a counterparty without manual filtering

## Solution Statement

Implement:
1. A global MonthContext provider that stores the selected year/month
2. A MonthSelector component in the Header for navigation
3. A CounterpartyDialog component showing quick spending summary
4. A CounterpartyDetail page with comprehensive spending charts
5. A useCounterpartyAnalytics hook for data fetching and calculations

## Feature Metadata

**Feature Type**: New Capability + Enhancement
**Estimated Complexity**: Medium-High
**Primary Systems Affected**:
- `src/contexts/` - New MonthContext
- `src/components/layout/Header.tsx` - Add MonthSelector
- `src/components/transactions/TransactionRow.tsx` - Make counterparty clickable
- `src/pages/Dashboard.tsx` - Use MonthContext instead of local state
- `src/pages/Transactions.tsx` - Use MonthContext for default filters
- `src/hooks/` - New useCounterpartyAnalytics hook
- New components and page

**Dependencies**:
- `date-fns` (already installed) - for date manipulation
- `recharts` (already installed) - for charts

---

## CONTEXT REFERENCES

### Relevant Codebase Files - IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

**Layout & Navigation:**
- `src/components/layout/Header.tsx` (lines 50-91) - Current header structure, where MonthSelector will be added
- `src/components/layout/Sidebar.tsx` (lines 5-12) - navItems array pattern for adding new nav items
- `src/components/layout/BottomNav.tsx` (lines 5-12) - navItems array pattern (must stay in sync)
- `src/components/layout/AppLayout.tsx` - Layout structure with Outlet

**Context Pattern:**
- `src/contexts/AuthContext.tsx` (lines 1-50, 430-470) - Context pattern to mirror for MonthContext

**Dashboard & Date Handling:**
- `src/pages/Dashboard.tsx` (lines 16-23, 145-170) - Current date preset handling to refactor
- `src/hooks/useDashboardData.ts` (lines 51-125) - DashboardDateRange interface and query pattern

**Transaction Components:**
- `src/components/transactions/TransactionRow.tsx` (lines 106-109) - Counterparty column to make clickable
- `src/pages/Transactions.tsx` (lines 40-43) - Current filter state to integrate with MonthContext

**Dialog Pattern:**
- `src/components/transactions/ApplyToSimilarDialog.tsx` (lines 33-168) - Dialog structure pattern to follow

**Chart Components:**
- `src/components/dashboard/SpendingOverTimeChart.tsx` (lines 1-79) - Recharts BarChart pattern
- `src/components/dashboard/SpendingByCategoryChart.tsx` - PieChart pattern with legends

**Hooks:**
- `src/hooks/useTransactions.ts` (lines 107-195) - Transaction query pattern with filters
- `src/hooks/useDashboardData.ts` (lines 92-125, 204-241) - Timeline calculation pattern

**Types:**
- `src/types/index.ts` (lines 60-104) - Transaction type with counterparty field
- `src/types/index.ts` (lines 159-181) - SpendingSummary, TimelineData types

**E2E Tests:**
- `e2e/dashboard.spec.ts` (lines 1-125) - E2E test pattern with auth fixture

**App Routing:**
- `src/App.tsx` (lines 34-55) - Route structure for adding new page

### New Files to Create

- `src/contexts/MonthContext.tsx` - Global month state management
- `src/components/layout/MonthSelector.tsx` - Header month navigation component
- `src/components/transactions/CounterpartyDialog.tsx` - Quick summary dialog
- `src/components/analytics/CounterpartySpendingChart.tsx` - Bar chart for monthly spending
- `src/components/analytics/CounterpartyTrendChart.tsx` - Line chart for trend
- `src/components/analytics/CounterpartySummaryCard.tsx` - Stats card
- `src/components/analytics/index.ts` - Export barrel
- `src/pages/CounterpartyDetail.tsx` - Full analytics page
- `src/hooks/useCounterpartyAnalytics.ts` - Data fetching hook
- `e2e/counterparty-analytics.spec.ts` - E2E tests

### Relevant Documentation

- [date-fns Documentation](https://date-fns.org/docs/Getting-Started)
  - Specific functions: `format`, `startOfMonth`, `endOfMonth`, `addMonths`, `subMonths`, `eachMonthOfInterval`
  - Why: All date manipulation for month navigation

- [Recharts BarChart](https://recharts.org/en-US/api/BarChart)
  - Why: Monthly spending visualization

- [Recharts LineChart](https://recharts.org/en-US/api/LineChart)
  - Why: Trend visualization

- [React Router useSearchParams](https://reactrouter.com/en/main/hooks/use-search-params)
  - Why: Pass counterparty to detail page

### Patterns to Follow

**Context Pattern (from AuthContext):**
```typescript
interface MonthContextType {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  goToCurrentMonth: () => void;
  dateRange: { startDate: Date; endDate: Date };
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function useMonth() {
  const context = useContext(MonthContext);
  if (!context) throw new Error('useMonth must be used within MonthProvider');
  return context;
}
```

**Dialog Pattern (from ApplyToSimilarDialog):**
```typescript
interface CounterpartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterparty: string | null;
}
```

**Chart Pattern (from SpendingOverTimeChart):**
```typescript
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E3" vertical={false} />
    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#5C6661' }} />
    <YAxis tickFormatter={(v) => `€${v}`} />
    <Tooltip content={<CustomTooltip />} />
    <Bar dataKey="amount" fill="#C45C4A" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

**Hook Query Key Pattern (from useTransactions):**
```typescript
export const counterpartyKeys = {
  all: (userId: string) => ['counterparty', userId] as const,
  detail: (userId: string, counterparty: string) => ['counterparty', userId, counterparty] as const,
  analytics: (userId: string, counterparty: string, months: number) =>
    ['counterparty', userId, counterparty, 'analytics', months] as const,
};
```

**NavItem Pattern (from Sidebar):**
```typescript
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  // ... (keep existing order, don't add analytics as nav item since it's accessed via dialog)
];
```

---

## IMPLEMENTATION PLAN

### Phase 1: Month Context Foundation

Create the global month state management system.

**Tasks:**
- Create MonthContext with selected month state
- Add helper functions for month navigation
- Provide dateRange computed from selected month
- Wrap app with MonthProvider

### Phase 2: Month Selector UI

Add the month navigation control to the header.

**Tasks:**
- Create MonthSelector component with prev/next arrows
- Add month/year dropdown picker
- Integrate into Header component
- Handle mobile responsiveness

### Phase 3: Counterparty Data Hook

Create the analytics data fetching layer.

**Tasks:**
- Create useCounterpartyAnalytics hook
- Query all transactions for a counterparty
- Calculate monthly aggregates
- Compute summary statistics

### Phase 4: Counterparty Dialog

Create the quick summary popup.

**Tasks:**
- Create CounterpartyDialog component
- Show current month total, 3-month mini chart, transaction count
- Add "View Full History" link
- Make TransactionRow counterparty clickable

### Phase 5: Counterparty Detail Page

Create the full analytics page.

**Tasks:**
- Create CounterpartyDetail page
- Add route to App.tsx
- Create bar chart component for monthly spending
- Create line chart for trend
- Create summary stats card
- Add breadcrumb navigation back to transactions

### Phase 6: Integration & Migration

Connect existing pages to MonthContext.

**Tasks:**
- Refactor Dashboard to use MonthContext
- Update Transactions filters to sync with MonthContext
- Ensure all date ranges stay in sync

### Phase 7: Testing

Add comprehensive tests.

**Tasks:**
- Add unit tests for useCounterpartyAnalytics
- Add E2E tests for month navigation
- Add E2E tests for counterparty dialog and detail page

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

---

### Task 1: CREATE `src/contexts/MonthContext.tsx` - Month Context Provider

- **IMPLEMENT**: Create the context with month state and navigation helpers:

```typescript
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';

interface MonthContextType {
  /** The first day of the selected month */
  selectedMonth: Date;
  /** Set to a specific month (will be normalized to start of month) */
  setSelectedMonth: (date: Date) => void;
  /** Navigate to next month */
  goToNextMonth: () => void;
  /** Navigate to previous month */
  goToPreviousMonth: () => void;
  /** Jump to current month */
  goToCurrentMonth: () => void;
  /** Check if selected month is current month */
  isCurrentMonth: boolean;
  /** Date range for the selected month (for use with data hooks) */
  dateRange: { startDate: Date; endDate: Date };
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

interface MonthProviderProps {
  children: ReactNode;
}

export function MonthProvider({ children }: MonthProviderProps) {
  const [selectedMonth, setSelectedMonthInternal] = useState(() => startOfMonth(new Date()));

  const setSelectedMonth = useCallback((date: Date) => {
    setSelectedMonthInternal(startOfMonth(date));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonthInternal((prev) => addMonths(prev, 1));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonthInternal((prev) => subMonths(prev, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setSelectedMonthInternal(startOfMonth(new Date()));
  }, []);

  const isCurrentMonth = useMemo(
    () => isSameMonth(selectedMonth, new Date()),
    [selectedMonth]
  );

  const dateRange = useMemo(
    () => ({
      startDate: selectedMonth,
      endDate: endOfMonth(selectedMonth),
    }),
    [selectedMonth]
  );

  const value = useMemo(
    () => ({
      selectedMonth,
      setSelectedMonth,
      goToNextMonth,
      goToPreviousMonth,
      goToCurrentMonth,
      isCurrentMonth,
      dateRange,
    }),
    [selectedMonth, setSelectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth, isCurrentMonth, dateRange]
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}
```

- **PATTERN**: Follow AuthContext pattern from `src/contexts/AuthContext.tsx`
- **VALIDATE**: `npm run typecheck`

---

### Task 2: UPDATE `src/App.tsx` - Wrap with MonthProvider

- **IMPLEMENT**: Import and wrap the app with MonthProvider, inside AuthProvider:

```typescript
// Add import at top
import { MonthProvider } from '@/contexts/MonthContext';

// Update the App component to wrap routes with MonthProvider
// Place MonthProvider inside AuthProvider but outside Routes
```

The updated structure should be:
```tsx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <AuthProvider>
      <MonthProvider>
        <Routes>
          {/* ... routes ... */}
        </Routes>
        <Toaster />
      </MonthProvider>
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>
```

- **PATTERN**: Follow existing provider nesting pattern
- **GOTCHA**: MonthProvider must be inside AuthProvider (doesn't need auth) but wrapping all routes
- **VALIDATE**: `npm run typecheck && npm run dev` - app should still load

---

### Task 3: CREATE `src/components/layout/MonthSelector.tsx` - Month Navigation Component

- **IMPLEMENT**: Create the month selector with arrows and dropdown:

```typescript
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, getYear, setMonth, setYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMonth } from '@/contexts/MonthContext';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthSelectorProps {
  className?: string;
}

export function MonthSelector({ className }: MonthSelectorProps) {
  const { selectedMonth, setSelectedMonth, goToNextMonth, goToPreviousMonth, goToCurrentMonth, isCurrentMonth } = useMonth();

  const currentYear = getYear(selectedMonth);
  const currentMonthIndex = selectedMonth.getMonth();

  // Generate year options (5 years back, 1 year forward)
  const currentActualYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentActualYear - 5 + i);

  const handleMonthChange = (monthIndex: string) => {
    setSelectedMonth(setMonth(selectedMonth, parseInt(monthIndex, 10)));
  };

  const handleYearChange = (year: string) => {
    setSelectedMonth(setYear(selectedMonth, parseInt(year, 10)));
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Previous month */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToPreviousMonth}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Month selector */}
      <Select value={String(currentMonthIndex)} onValueChange={handleMonthChange}>
        <SelectTrigger className="h-8 w-[110px] border-none bg-transparent px-2 font-medium shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((month, index) => (
            <SelectItem key={month} value={String(index)}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year selector */}
      <Select value={String(currentYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="h-8 w-[80px] border-none bg-transparent px-2 font-medium shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Next month */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextMonth}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Today button (shown when not on current month) */}
      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-8 gap-1 text-xs text-muted-foreground"
          onClick={goToCurrentMonth}
        >
          <Calendar className="h-3 w-3" />
          Today
        </Button>
      )}
    </div>
  );
}
```

- **PATTERN**: Use existing Select component from shadcn/ui, follow Button styling
- **IMPORTS**: Icons from lucide-react, UI from @/components/ui/
- **VALIDATE**: `npm run typecheck`

---

### Task 4: UPDATE `src/components/layout/Header.tsx` - Add MonthSelector

- **IMPLEMENT**: Add MonthSelector to the header, positioned between the spacer and right-side actions:

1. Add import at top:
```typescript
import { MonthSelector } from './MonthSelector';
```

2. Update the JSX (around line 62-65) - replace the spacer div with MonthSelector:
```tsx
{/* Month selector (desktop) */}
<div className="hidden lg:flex lg:flex-1 lg:justify-center">
  <MonthSelector />
</div>
```

3. For mobile, add a compact version in the mobile section (between menu button and logo):
```tsx
{/* Month selector (mobile - compact) */}
<div className="flex items-center lg:hidden">
  <MonthSelector className="scale-90" />
</div>
```

- **PATTERN**: Follow existing responsive patterns with `lg:hidden` and `hidden lg:flex`
- **GOTCHA**: Remove or replace the empty `<div className="hidden lg:block" />` spacer
- **VALIDATE**: `npm run typecheck && npm run dev` - should see month selector in header

---

### Task 5: CREATE `src/hooks/useCounterpartyAnalytics.ts` - Analytics Data Hook

- **IMPLEMENT**: Create the hook for fetching and calculating counterparty analytics:

```typescript
import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useMonth } from '@/contexts/MonthContext';
import type { Transaction } from '@/types';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns';

// Query keys
export const counterpartyKeys = {
  all: (userId: string) => ['counterparty', userId] as const,
  analytics: (userId: string, counterparty: string) =>
    ['counterparty', userId, counterparty, 'analytics'] as const,
};

export interface MonthlySpending {
  month: string; // 'Jan 2024' format
  monthKey: string; // '2024-01' format for sorting
  amount: number;
  transactionCount: number;
}

export interface CounterpartyAnalytics {
  counterparty: string;
  currentMonthSpending: number;
  currentMonthTransactions: number;
  last3Months: MonthlySpending[];
  last12Months: MonthlySpending[];
  totalSpent: number;
  totalTransactions: number;
  averagePerMonth: number;
  firstTransactionDate: Date | null;
  lastTransactionDate: Date | null;
}

// Transform Firestore document
interface TransactionDoc {
  date: Timestamp | string;
  amount: number;
  counterparty?: string | null;
  reimbursement?: { status: string } | null;
}

function transformDoc(doc: QueryDocumentSnapshot): { date: Date; amount: number } {
  const data = doc.data() as TransactionDoc;
  return {
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    amount: data.amount,
  };
}

export function useCounterpartyAnalytics(counterparty: string | null) {
  const { user } = useAuth();
  const { selectedMonth } = useMonth();

  return useQuery({
    queryKey: counterpartyKeys.analytics(user?.id ?? '', counterparty ?? ''),
    queryFn: async (): Promise<CounterpartyAnalytics | null> => {
      if (!user?.id || !counterparty) return null;

      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsRef,
        where('counterparty', '==', counterparty),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const transactions = snapshot.docs.map(transformDoc);

      // Filter to only expenses (negative amounts)
      const expenses = transactions.filter((t) => t.amount < 0);

      if (expenses.length === 0) return null;

      // Calculate monthly aggregates
      const monthlyMap = new Map<string, { amount: number; count: number }>();

      expenses.forEach((t) => {
        const monthKey = format(t.date, 'yyyy-MM');
        const current = monthlyMap.get(monthKey) ?? { amount: 0, count: 0 };
        monthlyMap.set(monthKey, {
          amount: current.amount + Math.abs(t.amount),
          count: current.count + 1,
        });
      });

      // Current month calculations
      const currentMonthKey = format(selectedMonth, 'yyyy-MM');
      const currentMonthData = monthlyMap.get(currentMonthKey) ?? { amount: 0, count: 0 };

      // Get last 12 months (including months with no data)
      const last12MonthsStart = subMonths(startOfMonth(selectedMonth), 11);
      const monthsInterval = eachMonthOfInterval({
        start: last12MonthsStart,
        end: selectedMonth,
      });

      const last12Months: MonthlySpending[] = monthsInterval.map((monthDate) => {
        const key = format(monthDate, 'yyyy-MM');
        const data = monthlyMap.get(key) ?? { amount: 0, count: 0 };
        return {
          month: format(monthDate, 'MMM yyyy'),
          monthKey: key,
          amount: data.amount,
          transactionCount: data.count,
        };
      });

      // Last 3 months (most recent 3 from the 12)
      const last3Months = last12Months.slice(-3);

      // Summary stats
      const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalTransactions = expenses.length;

      // Calculate average per month (only months with transactions)
      const monthsWithData = Array.from(monthlyMap.values()).filter((m) => m.count > 0);
      const averagePerMonth =
        monthsWithData.length > 0 ? totalSpent / monthsWithData.length : 0;

      // First and last dates
      const sortedByDate = [...expenses].sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstTransactionDate = sortedByDate[0]?.date ?? null;
      const lastTransactionDate = sortedByDate[sortedByDate.length - 1]?.date ?? null;

      return {
        counterparty,
        currentMonthSpending: currentMonthData.amount,
        currentMonthTransactions: currentMonthData.count,
        last3Months,
        last12Months,
        totalSpent,
        totalTransactions,
        averagePerMonth,
        firstTransactionDate,
        lastTransactionDate,
      };
    },
    enabled: !!user?.id && !!counterparty,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

- **PATTERN**: Follow useTransactions and useDashboardData patterns
- **IMPORTS**: Use existing Firestore imports pattern
- **GOTCHA**: Only count expenses (negative amounts), exclude pending reimbursements
- **VALIDATE**: `npm run typecheck`

---

### Task 6: CREATE `src/components/transactions/CounterpartyDialog.tsx` - Quick Summary Dialog

- **IMPLEMENT**: Create the dialog showing counterparty spending summary:

```typescript
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCounterpartyAnalytics } from '@/hooks/useCounterpartyAnalytics';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CounterpartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterparty: string | null;
}

export function CounterpartyDialog({
  open,
  onOpenChange,
  counterparty,
}: CounterpartyDialogProps) {
  const navigate = useNavigate();
  const { selectedMonth } = useMonth();
  const { data: analytics, isLoading } = useCounterpartyAnalytics(counterparty);

  const handleViewDetails = () => {
    onOpenChange(false);
    navigate(`/counterparty/${encodeURIComponent(counterparty ?? '')}`);
  };

  const currentMonthLabel = format(selectedMonth, 'MMMM yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {counterparty}
          </DialogTitle>
          <DialogDescription>Spending summary for this merchant</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        ) : !analytics ? (
          <div className="py-8 text-center text-muted-foreground">
            No spending data for this counterparty
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Current month summary */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">{currentMonthLabel}</p>
              <p className="text-2xl font-bold tabular-nums text-destructive">
                {formatAmount(-analytics.currentMonthSpending, { showSign: false })}
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.currentMonthTransactions} transaction
                {analytics.currentMonthTransactions !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Mini 3-month chart */}
            {analytics.last3Months.some((m) => m.amount > 0) && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Last 3 months
                </p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart
                    data={analytics.last3Months}
                    margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  >
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#5C6661' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {analytics.last3Months.map((entry, index) => (
                        <Cell
                          key={entry.monthKey}
                          fill={index === 2 ? '#1D4739' : '#A3C4B5'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">All-time total</p>
                <p className="font-medium tabular-nums">
                  {formatAmount(-analytics.totalSpent, { showSign: false })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg per month</p>
                <p className="font-medium tabular-nums">
                  {formatAmount(-analytics.averagePerMonth, { showSign: false })}
                </p>
              </div>
            </div>

            {/* View details button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleViewDetails}
            >
              View Full History
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- **PATTERN**: Follow ApplyToSimilarDialog structure
- **IMPORTS**: Use existing component imports
- **GOTCHA**: Use encodeURIComponent for URL-safe counterparty names
- **VALIDATE**: `npm run typecheck`

---

### Task 7: UPDATE `src/components/transactions/TransactionRow.tsx` - Make Counterparty Clickable

- **IMPLEMENT**: Modify the counterparty column (around lines 106-109) to be clickable:

1. Add a new prop to the interface (around line 26):
```typescript
onCounterpartyClick?: (counterparty: string) => void;
```

2. Add to destructured props (around line 35):
```typescript
onCounterpartyClick,
```

3. Replace the counterparty div (lines 106-109) with a clickable button:
```tsx
{/* Counterparty */}
<div className="w-32 flex-shrink-0">
  {transaction.counterparty ? (
    <button
      type="button"
      className="max-w-full truncate text-left text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
      onClick={() => onCounterpartyClick?.(transaction.counterparty!)}
      title={transaction.counterparty}
    >
      {transaction.counterparty}
    </button>
  ) : (
    <span className="text-sm text-muted-foreground">—</span>
  )}
</div>
```

- **PATTERN**: Follow existing button click patterns in the row
- **GOTCHA**: Keep the truncation, add title for full name on hover
- **VALIDATE**: `npm run typecheck`

---

### Task 8: UPDATE `src/pages/Transactions.tsx` - Add Counterparty Dialog State

- **IMPLEMENT**: Add state and handlers for the counterparty dialog:

1. Add imports at top:
```typescript
import { CounterpartyDialog } from '@/components/transactions/CounterpartyDialog';
```

2. Add state (after existing dialog states, around line 50):
```typescript
const [selectedCounterparty, setSelectedCounterparty] = useState<string | null>(null);
const [isCounterpartyDialogOpen, setIsCounterpartyDialogOpen] = useState(false);
```

3. Add handler function:
```typescript
const handleCounterpartyClick = (counterparty: string) => {
  setSelectedCounterparty(counterparty);
  setIsCounterpartyDialogOpen(true);
};
```

4. Pass the handler to TransactionList/TransactionRow (find where transactions are mapped):
```typescript
onCounterpartyClick={handleCounterpartyClick}
```

5. Add the dialog at the end of the component (before the closing fragment):
```tsx
<CounterpartyDialog
  open={isCounterpartyDialogOpen}
  onOpenChange={setIsCounterpartyDialogOpen}
  counterparty={selectedCounterparty}
/>
```

- **PATTERN**: Follow existing dialog state patterns in the file
- **GOTCHA**: May need to pass onCounterpartyClick through TransactionList component
- **VALIDATE**: `npm run typecheck && npm run dev` - clicking counterparty should open dialog

---

### Task 9: UPDATE `src/components/transactions/TransactionList.tsx` - Pass Counterparty Click Handler

- **IMPLEMENT**: Add onCounterpartyClick prop to TransactionList and pass to TransactionRow:

1. Add to interface:
```typescript
onCounterpartyClick?: (counterparty: string) => void;
```

2. Add to destructured props

3. Pass to TransactionRow in the map function:
```typescript
onCounterpartyClick={onCounterpartyClick}
```

- **VALIDATE**: `npm run typecheck`

---

### Task 10: CREATE `src/components/analytics/CounterpartySpendingChart.tsx` - Monthly Bar Chart

- **IMPLEMENT**: Create the full-size monthly spending bar chart:

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
import { Skeleton } from '@/components/ui/skeleton';
import type { MonthlySpending } from '@/hooks/useCounterpartyAnalytics';

interface CounterpartySpendingChartProps {
  data: MonthlySpending[];
  isLoading?: boolean;
}

export function CounterpartySpendingChart({
  data,
  isLoading,
}: CounterpartySpendingChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (data.length === 0 || data.every((d) => d.amount === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">No spending data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#5C6661' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E5E3' }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#5C6661' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            value >= 1000 ? `€${(value / 1000).toFixed(1)}k` : `€${value}`
          }
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
        <Bar dataKey="amount" fill="#C45C4A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlySpending }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="font-medium">{data.month}</p>
      <p className="text-lg font-bold tabular-nums text-destructive">
        {formatAmount(-data.amount, { showSign: false })}
      </p>
      <p className="text-sm text-muted-foreground">
        {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
```

- **PATTERN**: Follow SpendingOverTimeChart pattern
- **VALIDATE**: `npm run typecheck`

---

### Task 11: CREATE `src/components/analytics/CounterpartyTrendChart.tsx` - Line Chart

- **IMPLEMENT**: Create the trend line chart:

```typescript
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonthlySpending } from '@/hooks/useCounterpartyAnalytics';

interface CounterpartyTrendChartProps {
  data: MonthlySpending[];
  isLoading?: boolean;
}

export function CounterpartyTrendChart({
  data,
  isLoading,
}: CounterpartyTrendChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  if (data.length === 0 || data.every((d) => d.amount === 0)) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">No spending data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5E3" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#5C6661' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E5E3' }}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#5C6661' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            value >= 1000 ? `€${(value / 1000).toFixed(1)}k` : `€${value}`
          }
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#1D4739"
          strokeWidth={2}
          dot={{ fill: '#1D4739', strokeWidth: 0, r: 4 }}
          activeDot={{ fill: '#1D4739', strokeWidth: 0, r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlySpending }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="font-medium">{data.month}</p>
      <p className="text-lg font-bold tabular-nums text-primary">
        {formatAmount(-data.amount, { showSign: false })}
      </p>
      <p className="text-sm text-muted-foreground">
        {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
```

- **PATTERN**: Similar to bar chart but with LineChart
- **VALIDATE**: `npm run typecheck`

---

### Task 12: CREATE `src/components/analytics/CounterpartySummaryCard.tsx` - Stats Card

- **IMPLEMENT**: Create the summary statistics card:

```typescript
import { format } from 'date-fns';
import { Calendar, Hash, TrendingDown, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount } from '@/lib/utils';
import type { CounterpartyAnalytics } from '@/hooks/useCounterpartyAnalytics';

interface CounterpartySummaryCardProps {
  analytics: CounterpartyAnalytics | null | undefined;
  isLoading?: boolean;
}

export function CounterpartySummaryCard({
  analytics,
  isLoading,
}: CounterpartySummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      label: 'Total Spent',
      value: formatAmount(-analytics.totalSpent, { showSign: false }),
      icon: TrendingDown,
      color: 'text-destructive',
    },
    {
      label: 'Total Transactions',
      value: analytics.totalTransactions.toString(),
      icon: Hash,
      color: 'text-primary',
    },
    {
      label: 'Avg per Month',
      value: formatAmount(-analytics.averagePerMonth, { showSign: false }),
      icon: Calculator,
      color: 'text-muted-foreground',
    },
    {
      label: 'First Transaction',
      value: analytics.firstTransactionDate
        ? format(analytics.firstTransactionDate, 'MMM d, yyyy')
        : '—',
      icon: Calendar,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- **PATTERN**: Follow SummaryCards component structure
- **VALIDATE**: `npm run typecheck`

---

### Task 13: CREATE `src/components/analytics/index.ts` - Export Barrel

- **IMPLEMENT**: Create the export file:

```typescript
export { CounterpartySpendingChart } from './CounterpartySpendingChart';
export { CounterpartyTrendChart } from './CounterpartyTrendChart';
export { CounterpartySummaryCard } from './CounterpartySummaryCard';
```

- **VALIDATE**: `npm run typecheck`

---

### Task 14: CREATE `src/pages/CounterpartyDetail.tsx` - Full Analytics Page

- **IMPLEMENT**: Create the counterparty detail page:

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CounterpartySpendingChart,
  CounterpartyTrendChart,
  CounterpartySummaryCard,
} from '@/components/analytics';
import { useCounterpartyAnalytics } from '@/hooks/useCounterpartyAnalytics';
import { useMonth } from '@/contexts/MonthContext';
import { formatAmount } from '@/lib/utils';

export function CounterpartyDetail() {
  const { counterparty } = useParams<{ counterparty: string }>();
  const navigate = useNavigate();
  const { selectedMonth } = useMonth();
  const decodedCounterparty = counterparty ? decodeURIComponent(counterparty) : null;

  const { data: analytics, isLoading, error } = useCounterpartyAnalytics(decodedCounterparty);

  const currentMonthLabel = format(selectedMonth, 'MMMM yyyy');

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Failed to load data</p>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TrendingUp className="h-6 w-6 text-primary" />
            {decodedCounterparty}
          </h1>
          <p className="text-muted-foreground">Spending analytics and history</p>
        </div>
      </div>

      {/* Current month highlight */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{currentMonthLabel}</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold tabular-nums text-destructive">
                  {formatAmount(-(analytics?.currentMonthSpending ?? 0), { showSign: false })}
                </p>
              )}
            </div>
            {!isLoading && analytics && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-semibold">{analytics.currentMonthTransactions}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <CounterpartySummaryCard analytics={analytics} isLoading={isLoading} />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterpartySpendingChart
              data={analytics?.last12Months ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterpartyTrendChart
              data={analytics?.last12Months ?? []}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- **PATTERN**: Follow Dashboard page structure
- **GOTCHA**: Use decodeURIComponent for URL params
- **VALIDATE**: `npm run typecheck`

---

### Task 15: UPDATE `src/App.tsx` - Add Counterparty Detail Route

- **IMPLEMENT**: Add the new route inside the protected routes section:

1. Add import:
```typescript
import { CounterpartyDetail } from '@/pages/CounterpartyDetail';
```

2. Add route inside the protected routes (after `/settings`):
```tsx
<Route path="counterparty/:counterparty" element={<CounterpartyDetail />} />
```

- **PATTERN**: Follow existing route structure
- **GOTCHA**: No leading slash for nested routes
- **VALIDATE**: `npm run typecheck && npm run dev` - navigate to /counterparty/test should render page

---

### Task 16: UPDATE `src/pages/Dashboard.tsx` - Use MonthContext

- **IMPLEMENT**: Refactor Dashboard to use the global MonthContext instead of local state:

1. Add import:
```typescript
import { useMonth } from '@/contexts/MonthContext';
```

2. Replace the local datePreset state and getDateRange logic with MonthContext:

Remove:
```typescript
const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
const dateRange = getDateRange(datePreset, now);
```

Replace with:
```typescript
const { dateRange, selectedMonth } = useMonth();
```

3. Update the period label to use selectedMonth:
```typescript
const periodLabel = format(selectedMonth, 'MMMM yyyy');
```

4. Remove the date range buttons section (lines 55-83) since month selection is now in the header.

5. Update the description text:
```typescript
<p className="text-muted-foreground">Your financial overview for {periodLabel}</p>
```

6. Remove the helper functions at the bottom (`getDateRange` and `getPeriodLabel`) as they're no longer needed.

- **PATTERN**: Use context hook instead of local state
- **GOTCHA**: Remove unused imports (useState for DatePreset, subMonths)
- **VALIDATE**: `npm run typecheck && npm run dev` - Dashboard should sync with header month selector

---

### Task 17: UPDATE `src/pages/Transactions.tsx` - Sync Filters with MonthContext

- **IMPLEMENT**: Make Transactions page default to the global month selection:

1. Add import:
```typescript
import { useMonth } from '@/contexts/MonthContext';
```

2. Get the dateRange from context:
```typescript
const { dateRange: monthDateRange } = useMonth();
```

3. Update the initial filters state to use the month context:
```typescript
const [filters, setFilters] = useState<Filters>(() => ({
  startDate: monthDateRange.startDate,
  endDate: monthDateRange.endDate,
}));
```

4. Add an effect to sync when month changes (optional - depends on desired UX):
```typescript
// Sync filters when global month changes
useEffect(() => {
  setFilters((prev) => ({
    ...prev,
    startDate: monthDateRange.startDate,
    endDate: monthDateRange.endDate,
  }));
}, [monthDateRange.startDate, monthDateRange.endDate]);
```

- **GOTCHA**: The TransactionFilters component still allows custom date ranges - this just sets the default
- **VALIDATE**: `npm run typecheck && npm run dev` - Transactions page should reflect header month

---

### Task 18: CREATE `e2e/counterparty-analytics.spec.ts` - E2E Tests

- **IMPLEMENT**: Create comprehensive E2E tests:

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

test.describe('Month Navigation', () => {
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

  test('should display month selector in header', async ({ page }) => {
    // Month and year selectors should be visible
    await expect(page.locator('button[aria-label="Previous month"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Next month"]')).toBeVisible();
  });

  test('should navigate to previous month', async ({ page }) => {
    const prevButton = page.locator('button[aria-label="Previous month"]');
    await prevButton.click();

    // Today button should appear when not on current month
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();
  });

  test('should return to current month with Today button', async ({ page }) => {
    // Go to previous month first
    await page.locator('button[aria-label="Previous month"]').click();
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();

    // Click Today
    await page.getByRole('button', { name: /today/i }).click();

    // Today button should disappear
    await expect(page.getByRole('button', { name: /today/i })).not.toBeVisible();
  });
});

test.describe('Counterparty Analytics', () => {
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
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show counterparty dialog when clicking counterparty', async ({ page }) => {
    // Wait for transactions to load
    await page.waitForTimeout(2000);

    // Find a clickable counterparty (might be empty if no transactions)
    const counterpartyButton = page.locator('button').filter({ hasText: /albert|jumbo|ns/i }).first();

    // Skip if no counterparties found
    if (!(await counterpartyButton.isVisible())) {
      test.skip();
      return;
    }

    await counterpartyButton.click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/spending summary/i)).toBeVisible();
  });

  test('should navigate to counterparty detail page from dialog', async ({ page }) => {
    await page.waitForTimeout(2000);

    const counterpartyButton = page.locator('button').filter({ hasText: /albert|jumbo|ns/i }).first();

    if (!(await counterpartyButton.isVisible())) {
      test.skip();
      return;
    }

    await counterpartyButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click view full history
    await page.getByRole('button', { name: /view full history/i }).click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/counterparty\//);
    await expect(page.getByText(/spending analytics/i)).toBeVisible();
  });
});

test.describe('Counterparty Detail Page', () => {
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
  });

  test('should display counterparty detail page structure', async ({ page }) => {
    // Navigate directly to a test counterparty
    await page.goto('/counterparty/Test%20Merchant');

    // Should show the page structure even if no data
    await expect(page.getByText(/spending analytics/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /go back/i })).toBeVisible();
  });

  test('should navigate back from detail page', async ({ page }) => {
    // Go to transactions first
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({ timeout: 10000 });

    // Navigate to counterparty detail
    await page.goto('/counterparty/Test');
    await expect(page.getByText(/spending analytics/i)).toBeVisible();

    // Click back button
    await page.getByRole('button', { name: /go back/i }).click();

    // Should go back
    await expect(page).not.toHaveURL(/\/counterparty\//);
  });
});
```

- **PATTERN**: Follow dashboard.spec.ts pattern with auth handling
- **GOTCHA**: Tests may skip if no transactions exist - that's expected
- **VALIDATE**: `npm run e2e` (requires emulators)

---

### Task 19: ADD Unit Test for useCounterpartyAnalytics Hook

- **CREATE**: `src/hooks/__tests__/useCounterpartyAnalytics.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

// Mock modules
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('@/contexts/MonthContext', () => ({
  useMonth: () => ({
    selectedMonth: new Date('2024-01-15'),
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    },
  }),
}));

import { getDocs } from 'firebase/firestore';
import { useCounterpartyAnalytics } from '../useCounterpartyAnalytics';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCounterpartyAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when counterparty is null', async () => {
    const { result } = renderHook(() => useCounterpartyAnalytics(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
  });

  it('should fetch and calculate analytics for a counterparty', async () => {
    const mockDocs = [
      {
        id: '1',
        data: () => ({
          date: { toDate: () => new Date('2024-01-15') },
          amount: -50,
          counterparty: 'Test Store',
        }),
      },
      {
        id: '2',
        data: () => ({
          date: { toDate: () => new Date('2024-01-10') },
          amount: -30,
          counterparty: 'Test Store',
        }),
      },
      {
        id: '3',
        data: () => ({
          date: { toDate: () => new Date('2023-12-15') },
          amount: -45,
          counterparty: 'Test Store',
        }),
      },
    ];

    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: mockDocs,
    } as any);

    const { result } = renderHook(() => useCounterpartyAnalytics('Test Store'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.counterparty).toBe('Test Store');
    expect(result.current.data?.totalSpent).toBe(125); // 50 + 30 + 45
    expect(result.current.data?.totalTransactions).toBe(3);
    expect(result.current.data?.currentMonthSpending).toBe(80); // 50 + 30 in Jan 2024
  });

  it('should return null when no transactions found', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      empty: true,
      docs: [],
    } as any);

    const { result } = renderHook(() => useCounterpartyAnalytics('Unknown Store'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });
});
```

- **PATTERN**: Follow existing test patterns in `src/hooks/__tests__/`
- **VALIDATE**: `npm run test`

---

### Task 20: RUN Full Validation Suite

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
sleep 15
npm run e2e

# Level 5: Manual Visual Check
npm run dev
# Verify:
# - Month selector appears in header
# - Clicking prev/next changes month
# - Dashboard updates when month changes
# - Transactions page syncs with month
# - Clicking counterparty opens dialog
# - Dialog shows mini chart and stats
# - "View Full History" navigates to detail page
# - Detail page shows charts and summary
# - Back button works from detail page
```

- **VALIDATE**: All commands pass with zero errors

---

## TESTING STRATEGY

### Unit Tests

- `src/hooks/__tests__/useCounterpartyAnalytics.test.ts`: Test data transformation and calculations
- Test edge cases: no data, single transaction, multiple months

### Integration Tests

Test component rendering with mocked hooks:
- MonthSelector renders and responds to clicks
- CounterpartyDialog shows data correctly
- Charts render with sample data

### End-to-End Tests

**CRITICAL: E2E tests are REQUIRED for this feature.**

`e2e/counterparty-analytics.spec.ts`:
- Month navigation from header
- Counterparty dialog opens on click
- Navigation to detail page
- Back navigation from detail
- Month selector syncs across pages

### Edge Cases

- Counterparty with special characters in name (URL encoding)
- Counterparty with no transactions in current month
- Counterparty with only one transaction ever
- Very long counterparty names (truncation)
- Switching months rapidly
- Mobile viewport month selector

---

## VALIDATION COMMANDS

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

```bash
# Start Firebase emulators (REQUIRED)
npm run firebase:emulators &
sleep 15

# Run E2E tests
npm run e2e

# Or headed for debugging
npm run e2e:headed
```

### Level 5: Manual Validation

1. Start dev server: `npm run dev`
2. Navigate to Dashboard
3. Test month selector:
   - Click prev/next arrows
   - Change month from dropdown
   - Change year from dropdown
   - Click "Today" to return to current month
4. Verify Dashboard updates when month changes
5. Navigate to Transactions
6. Click a counterparty name
7. Verify dialog shows:
   - Current month spending
   - 3-month mini chart
   - Quick stats
   - "View Full History" button
8. Click "View Full History"
9. Verify detail page shows:
   - Back button
   - Current month highlight
   - Summary card
   - 12-month bar chart
   - Trend line chart
10. Click back button
11. Test on mobile viewport

---

## ACCEPTANCE CRITERIA

- [ ] Month selector visible in header on all pages
- [ ] Clicking prev/next navigates months correctly
- [ ] Month/year dropdowns work correctly
- [ ] "Today" button appears when not on current month
- [ ] Dashboard syncs with header month selector
- [ ] Transactions page syncs with header month selector
- [ ] Clicking counterparty in transaction row opens dialog
- [ ] Dialog shows current month spending, 3-month chart, stats
- [ ] "View Full History" navigates to detail page
- [ ] Detail page shows 12-month bar chart
- [ ] Detail page shows trend line chart
- [ ] Detail page shows summary statistics
- [ ] Back navigation works from detail page
- [ ] URL contains encoded counterparty name
- [ ] All charts render correctly with data
- [ ] Empty states shown when no data
- [ ] Mobile responsive design works
- [ ] All validation commands pass
- [ ] E2E tests pass

---

## COMPLETION CHECKLIST

- [ ] All 20 tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + E2E)
- [ ] No linting or type checking errors
- [ ] Build succeeds
- [ ] Manual testing confirms all features work
- [ ] Mobile testing completed
- [ ] Acceptance criteria all met

---

## NOTES

### Design Decisions

1. **Global Month Context**: Rather than pass month state through props, a context provides cleaner access from any component. This mirrors how auth state is managed.

2. **Dialog + Page Pattern**: The quick dialog provides immediate value (80% use case), while the detailed page serves users who want to dive deeper. This follows the progressive disclosure principle.

3. **No New Nav Item**: The counterparty detail is accessed via dialog link, not as a main nav item. This keeps navigation simple and focused on primary features.

4. **Sync Transactions with Month**: The Transactions page now defaults to the global month but still allows custom date ranges via filters. This provides consistency with Dashboard while preserving flexibility.

5. **URL-Encoded Counterparty**: Using the counterparty name in the URL (encoded) allows bookmarking and sharing, though it does create potentially long URLs for some merchants.

### Known Limitations

- The analytics only show the last 12 months in charts (reasonable scope)
- Counterparty matching is exact - "Albert Heijn" and "ALBERT HEIJN" are different
- Very long counterparty names may truncate awkwardly in the URL
- Analytics recalculate on every render (could optimize with more aggressive caching)

### Future Improvements

- Add category filter to counterparty analytics
- Compare counterparty spending to previous year
- Add export for counterparty-specific data
- Normalize counterparty names (case-insensitive matching)
- Add "Top Counterparties" widget to Dashboard
