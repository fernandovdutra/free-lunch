import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { Toaster } from '@/components/ui/toaster';
import { InstallBanner } from '@/components/layout/InstallBanner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { AuthProvider } from '@/contexts/AuthContext';
import { MonthProvider } from '@/contexts/MonthContext';

// Pages
import { Home } from '@/pages/Home';
import { Transactions } from '@/pages/Transactions';
import { Budgets } from '@/pages/Budgets';
import { Reimbursements } from '@/pages/Reimbursements';
import { SettingsHub } from '@/pages/settings/SettingsHub';
import { SettingsAccountsSync } from '@/pages/settings/SettingsAccountsSync';
import { SettingsCategorization } from '@/pages/settings/SettingsCategorization';
import { SettingsPreferences } from '@/pages/settings/SettingsPreferences';
import { SettingsExport } from '@/pages/settings/SettingsExport';
import { SettingsAccount } from '@/pages/settings/SettingsAccount';
import { SettingsDanger } from '@/pages/settings/SettingsDanger';
import { SettingsAdvisorMemory } from '@/pages/settings/SettingsAdvisorMemory';
import { SettingsSharing } from '@/pages/settings/SettingsSharing';
import { CounterpartyDetail } from '@/pages/CounterpartyDetail';
import { SpendingExplorer } from '@/pages/SpendingExplorer';
import { SpendingCategory } from '@/pages/SpendingCategory';
import { SpendingSubcategory } from '@/pages/SpendingSubcategory';
import { IcsOverview } from '@/pages/IcsOverview';
import { IcsBreakdown } from '@/pages/IcsBreakdown';
import { IcsBreakdownCategory } from '@/pages/IcsBreakdownCategory';
import { Goals } from '@/pages/Goals';
import { FixedCosts } from '@/pages/FixedCosts';
import { Wealth } from '@/pages/Wealth';
import { Insights } from '@/pages/Insights';
import { InsightDetail } from '@/pages/InsightDetail';
import { Login } from '@/pages/auth/Login';
import { PrimitivesPlayground } from '@/pages/dev/PrimitivesPlayground';

// Layout
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Keep cached entries around long enough to be persisted and rehydrated
      // across reloads (default 5 min would evict them too eagerly).
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
    },
  },
});

// Persist the query cache to localStorage so the last-seen data paints
// immediately after a hard reload, then revalidates in the background.
const persister = createAsyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'free-lunch-query-cache',
});

export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <BrowserRouter>
        <AuthProvider>
          <MonthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              {import.meta.env.DEV && (
                <Route path="/__dev/primitives" element={<PrimitivesPlayground />} />
              )}

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="budgets" element={<Budgets />} />
                <Route path="reimbursements" element={<Reimbursements />} />
                <Route path="settings" element={<SettingsHub />} />
                <Route path="settings/accounts" element={<SettingsAccountsSync />} />
                <Route path="settings/categorization" element={<SettingsCategorization />} />
                <Route path="settings/preferences" element={<SettingsPreferences />} />
                <Route path="settings/export" element={<SettingsExport />} />
                <Route path="settings/account" element={<SettingsAccount />} />
                <Route path="settings/danger" element={<SettingsDanger />} />
                <Route path="settings/advisor-memory" element={<SettingsAdvisorMemory />} />
                <Route path="settings/sharing" element={<SettingsSharing />} />
                <Route path="expenses" element={<SpendingExplorer />} />
                <Route path="expenses/:categoryId" element={<SpendingCategory />} />
                <Route path="expenses/:categoryId/:subcategoryId" element={<SpendingSubcategory />} />
                <Route path="income" element={<SpendingExplorer />} />
                <Route path="income/:categoryId" element={<SpendingCategory />} />
                <Route path="income/:categoryId/:subcategoryId" element={<SpendingSubcategory />} />
                <Route path="counterparty/:counterparty" element={<CounterpartyDetail />} />
                <Route path="ics" element={<IcsOverview />} />
                <Route path="ics/:statementId" element={<IcsBreakdown />} />
                <Route path="ics/:statementId/:categoryId" element={<IcsBreakdownCategory />} />
                <Route path="goals" element={<Goals />} />
                <Route path="fixed-costs" element={<FixedCosts />} />
                <Route path="wealth" element={<Wealth />} />
                <Route path="insights" element={<Insights />} />
                <Route path="insights/:insightId" element={<InsightDetail />} />
              </Route>
            </Routes>
            <Toaster />
            <InstallBanner />
            <OfflineBanner />
          </MonthProvider>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
