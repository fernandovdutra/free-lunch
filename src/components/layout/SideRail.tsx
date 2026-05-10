import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SideRailProps {
  onMoreClick: () => void;
  moreOpen: boolean;
}

const TABS = [
  { href: '/', label: 'HOME', glyph: '▤', exact: true },
  { href: '/transactions', label: 'TXNS', glyph: '▣', exact: false },
  { href: '/budgets', label: 'BUDGET', glyph: '◐', exact: false },
] as const;

export function SideRail({ onMoreClick, moreOpen }: SideRailProps) {
  const location = useLocation();

  const moreRoutePrefixes = ['/reimbursements', '/fixed-costs', '/settings', '/insights', '/goals', '/investments'];
  const moreRouteActive = moreRoutePrefixes.some((p) => location.pathname.startsWith(p));
  const moreActive = moreOpen || moreRouteActive;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[60px] flex-col border-r border-rule bg-surface lg:flex">
      <div className="flex h-[44px] items-center justify-center border-b border-rule">
        <span aria-hidden className="font-mono text-[10px] uppercase tracking-[0.12em] text-textHi">
          F·L
        </span>
      </div>

      <ul className="flex flex-1 flex-col items-stretch py-2">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <NavLink
              to={tab.href}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  'relative flex h-[64px] flex-col items-center justify-center gap-1 active:opacity-60',
                  isActive ? 'text-accent' : 'text-textLo'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-accent" />
                  )}
                  <span className="font-mono text-[16px] leading-none">{tab.glyph}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] leading-none">
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onMoreClick}
            className={cn(
              'relative flex h-[64px] w-full flex-col items-center justify-center gap-1 active:opacity-60',
              moreActive ? 'text-accent' : 'text-textLo'
            )}
          >
            {moreActive && (
              <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-accent" />
            )}
            <span className="font-mono text-[16px] leading-none">…</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] leading-none">
              MORE
            </span>
          </button>
        </li>
      </ul>
    </aside>
  );
}
