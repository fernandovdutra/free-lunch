import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { SpendingCounterparty } from '@/pages/SpendingCounterparty';
import { IcsOverview } from '@/pages/IcsOverview';
import { IcsBreakdown } from '@/pages/IcsBreakdown';
import { IcsBreakdownCategory } from '@/pages/IcsBreakdownCategory';
import { Goals } from '@/pages/Goals';
import { FixedCosts } from '@/pages/FixedCosts';
import { Investments } from '@/pages/Investments';
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
                <Route path="expenses/:categoryId/:subcategoryId/counterparty/:counterparty" element={<SpendingCounterparty />} />
                <Route path="income" element={<SpendingExplorer />} />
                <Route path="income/:categoryId" element={<SpendingCategory />} />
                <Route path="income/:categoryId/:subcategoryId" element={<SpendingSubcategory />} />
                <Route path="income/:categoryId/:subcategoryId/counterparty/:counterparty" element={<SpendingCounterparty />} />
                <Route path="counterparty/:counterparty" element={<CounterpartyDetail />} />
                <Route path="ics" element={<IcsOverview />} />
                <Route path="ics/:statementId" element={<IcsBreakdown />} />
                <Route path="ics/:statementId/:categoryId" element={<IcsBreakdownCategory />} />
                <Route path="goals" element={<Goals />} />
                <Route path="fixed-costs" element={<FixedCosts />} />
                <Route path="investments" element={<Investments />} />
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
    </QueryClientProvider>
  );
}
