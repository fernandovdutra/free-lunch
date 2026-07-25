import { Suspense, useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { SideRail } from './SideRail';
import { MoreSheet } from './MoreSheet';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { RouteErrorBoundary } from './ErrorBoundary';
import { PageLoader } from './PageLoader';

export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const openMore = useCallback(() => {
    setMoreOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-textHi">
      <ReadOnlyBanner />
      <SideRail onMoreClick={openMore} moreOpen={moreOpen} />
      <TopBar />

      <main
        className="pt-[calc(env(safe-area-inset-top)+44px)] pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pl-[60px] lg:pb-6"
      >
        <div className="mx-auto w-full max-w-[420px] px-4 lg:max-w-[480px]">
          {/* A page crash keeps the shell (nav, tab bar) alive; the boundary
              resets on navigation. Suspense covers lazy route chunk loads. */}
          <RouteErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </div>
      </main>

      <TabBar onMoreClick={openMore} moreOpen={moreOpen} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
}
