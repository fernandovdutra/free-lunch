import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { InstallBanner } from '@/components/layout/InstallBanner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AuthProvider } from '@/contexts/AuthContext';
import { MonthProvider } from '@/contexts/MonthContext';

// Pages
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Categories } from '@/pages/Categories';
import { Budgets } from '@/pages/Budgets';
import { Reimbursements } from '@/pages/Reimbursements';
import { Settings } from '@/pages/Settings';
import { CounterpartyDetail } from '@/pages/CounterpartyDetail';
import { SpendingExplorer } from '@/pages/SpendingExplorer';
import { SpendingCategory } from '@/pages/SpendingCategory';
import { SpendingSubcategory } from '@/pages/SpendingSubcategory';
import { SpendingCounterparty } from '@/pages/SpendingCounterparty';
import { IcsBreakdown } from '@/pages/IcsBreakdown';
import { IcsBreakdownCategory } from '@/pages/IcsBreakdownCategory';
import { IcsBreakdownCounterparty } from '@/pages/IcsBreakdownCounterparty';
import { Login } from '@/pages/auth/Login';
import { Register } from '@/pages/auth/Register';

// Layout
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <MonthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="categories" element={<Categories />} />
                <Route path="budgets" element={<Budgets />} />
                <Route path="reimbursements" element={<Reimbursements />} />
                <Route path="settings" element={<Settings />} />
                <Route path="expenses" element={<SpendingExplorer />} />
                <Route path="expenses/:categoryId" element={<SpendingCategory />} />
                <Route path="expenses/:categoryId/:subcategoryId" element={<SpendingSubcategory />} />
                <Route path="expenses/:categoryId/:subcategoryId/counterparty/:counterparty" element={<SpendingCounterparty />} />
                <Route path="income" element={<SpendingExplorer />} />
                <Route path="income/:categoryId" element={<SpendingCategory />} />
                <Route path="income/:categoryId/:subcategoryId" element={<SpendingSubcategory />} />
                <Route path="income/:categoryId/:subcategoryId/counterparty/:counterparty" element={<SpendingCounterparty />} />
                <Route path="counterparty/:counterparty" element={<CounterpartyDetail />} />
                <Route path="ics/:statementId" element={<IcsBreakdown />} />
                <Route path="ics/:statementId/:categoryId" element={<IcsBreakdownCategory />} />
                <Route path="ics/:statementId/:categoryId/counterparty/:counterparty" element={<IcsBreakdownCounterparty />} />
              </Route>
            </Routes>
            <Toaster />
            <InstallBanner />
            <OfflineBanner />
          </MonthProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
