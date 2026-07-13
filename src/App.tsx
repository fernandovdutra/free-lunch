import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { InstallBanner } from '@/components/layout/InstallBanner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { PerfOverlay } from '@/components/dev/PerfOverlay';
import { AuthProvider } from '@/contexts/AuthContext';
import { MonthProvider } from '@/contexts/MonthContext';

// Layout (kept eager — shared shell must never wait on a route chunk)
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { PageLoader } from '@/components/layout/PageLoader';

// Pages — lazy-loaded so each route ships as its own chunk. A chunk-load
// failure (e.g. stale deploy) throws during render and is caught by the
// nearest ErrorBoundary, which offers "Reload app".
const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const Transactions = lazy(() =>
  import('@/pages/Transactions').then((m) => ({ default: m.Transactions }))
);
const Budgets = lazy(() => import('@/pages/Budgets').then((m) => ({ default: m.Budgets })));
const Reimbursements = lazy(() =>
  import('@/pages/Reimbursements').then((m) => ({ default: m.Reimbursements }))
);
const SettingsHub = lazy(() =>
  import('@/pages/settings/SettingsHub').then((m) => ({ default: m.SettingsHub }))
);
const SettingsAccountsSync = lazy(() =>
  import('@/pages/settings/SettingsAccountsSync').then((m) => ({
    default: m.SettingsAccountsSync,
  }))
);
const SettingsCategorization = lazy(() =>
  import('@/pages/settings/SettingsCategorization').then((m) => ({
    default: m.SettingsCategorization,
  }))
);
const SettingsPreferences = lazy(() =>
  import('@/pages/settings/SettingsPreferences').then((m) => ({
    default: m.SettingsPreferences,
  }))
);
const SettingsExport = lazy(() =>
  import('@/pages/settings/SettingsExport').then((m) => ({ default: m.SettingsExport }))
);
const SettingsAccount = lazy(() =>
  import('@/pages/settings/SettingsAccount').then((m) => ({ default: m.SettingsAccount }))
);
const SettingsDanger = lazy(() =>
  import('@/pages/settings/SettingsDanger').then((m) => ({ default: m.SettingsDanger }))
);
const SettingsAdvisorMemory = lazy(() =>
  import('@/pages/settings/SettingsAdvisorMemory').then((m) => ({
    default: m.SettingsAdvisorMemory,
  }))
);
const SettingsSharing = lazy(() =>
  import('@/pages/settings/SettingsSharing').then((m) => ({ default: m.SettingsSharing }))
);
const CounterpartyDetail = lazy(() =>
  import('@/pages/CounterpartyDetail').then((m) => ({ default: m.CounterpartyDetail }))
);
const SpendingExplorer = lazy(() =>
  import('@/pages/SpendingExplorer').then((m) => ({ default: m.SpendingExplorer }))
);
const SpendingCategory = lazy(() =>
  import('@/pages/SpendingCategory').then((m) => ({ default: m.SpendingCategory }))
);
const SpendingSubcategory = lazy(() =>
  import('@/pages/SpendingSubcategory').then((m) => ({ default: m.SpendingSubcategory }))
);
const IcsOverview = lazy(() =>
  import('@/pages/IcsOverview').then((m) => ({ default: m.IcsOverview }))
);
const IcsBreakdown = lazy(() =>
  import('@/pages/IcsBreakdown').then((m) => ({ default: m.IcsBreakdown }))
);
const IcsBreakdownCategory = lazy(() =>
  import('@/pages/IcsBreakdownCategory').then((m) => ({ default: m.IcsBreakdownCategory }))
);
const Goals = lazy(() => import('@/pages/Goals').then((m) => ({ default: m.Goals })));
const FixedCosts = lazy(() =>
  import('@/pages/FixedCosts').then((m) => ({ default: m.FixedCosts }))
);
const Wealth = lazy(() => import('@/pages/Wealth').then((m) => ({ default: m.Wealth })));
const Insights = lazy(() => import('@/pages/Insights').then((m) => ({ default: m.Insights })));
const InsightDetail = lazy(() =>
  import('@/pages/InsightDetail').then((m) => ({ default: m.InsightDetail }))
);
const Login = lazy(() => import('@/pages/auth/Login').then((m) => ({ default: m.Login })));
const PrimitivesPlayground = lazy(() =>
  import('@/pages/dev/PrimitivesPlayground').then((m) => ({ default: m.PrimitivesPlayground }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// One-time cleanup: a previous build persisted the React Query cache to
// localStorage, which JSON-serialized Date fields into strings. On rehydration
// those strings reached `date-fns` formatters and threw during render, blanking
// the whole app after a reload. The persistence is gone; instant repeat loads
// now come from the Firestore IndexedDB cache (which preserves native types).
// Remove the stale key so already-affected devices recover on next load.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('free-lunch-query-cache');
  } catch {
    // ignore — storage may be unavailable (private mode)
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <MonthProvider>
              <Suspense fallback={<PageLoader fullScreen />}>
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
                    <Route
                      path="expenses/:categoryId/:subcategoryId"
                      element={<SpendingSubcategory />}
                    />
                    <Route path="income" element={<SpendingExplorer />} />
                    <Route path="income/:categoryId" element={<SpendingCategory />} />
                    <Route
                      path="income/:categoryId/:subcategoryId"
                      element={<SpendingSubcategory />}
                    />
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
              </Suspense>
              <Toaster />
              <InstallBanner />
              <OfflineBanner />
              <PerfOverlay />
            </MonthProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
