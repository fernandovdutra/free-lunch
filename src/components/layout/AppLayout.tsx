import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { SideRail } from './SideRail';
import { MoreSheet } from './MoreSheet';

export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const openMore = useCallback(() => {
    setMoreOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-textHi">
      <SideRail onMoreClick={openMore} moreOpen={moreOpen} />
      <TopBar />

      <main
        className="pt-[calc(env(safe-area-inset-top)+44px)] pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pl-[60px] lg:pb-6"
      >
        <div className="mx-auto w-full max-w-[420px] px-4 lg:max-w-[480px]">
          <Outlet />
        </div>
      </main>

      <TabBar onMoreClick={openMore} moreOpen={moreOpen} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
}
