import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TabBarProps {
  onMoreClick: () => void;
  moreOpen: boolean;
}

const TABS = [
  { href: '/', label: 'HOME', glyph: '▤', exact: true },
  { href: '/transactions', label: 'TXNS', glyph: '≡', exact: false },
  { href: '/budgets', label: 'BUDGET', glyph: '◧', exact: false },
] as const;

export function TabBar({ onMoreClick, moreOpen }: TabBarProps) {
  const location = useLocation();

  // MORE is "active" when the sheet is open OR the current route is one of the
  // routes the MORE sheet links to (so users see where they are in archive).
  const moreRoutePrefixes = ['/reimbursements', '/settings', '/categories', '/insights', '/goals', '/investments'];
  const moreRouteActive = moreRoutePrefixes.some((p) => location.pathname.startsWith(p));
  const moreActive = moreOpen || moreRouteActive;

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-bg',
        'pb-[env(safe-area-inset-bottom)] lg:hidden'
      )}
    >
      <ul className="flex h-[68px] items-center px-3">
        {TABS.map((tab) => (
          <li key={tab.href} className="flex flex-1 items-center justify-center">
            <NavLink
              to={tab.href}
              end={tab.exact}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 active:opacity-60',
                  isActive
                    ? 'text-accent border border-ruleHi'
                    : 'text-textLo border border-transparent'
                )
              }
              style={({ isActive }) =>
                isActive
                  ? { boxShadow: '0 0 8px rgba(196, 242, 90, 0.25)' }
                  : undefined
              }
            >
              <span className="font-mono text-[16px] leading-none">{tab.glyph}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] leading-none">
                {tab.label}
              </span>
            </NavLink>
          </li>
        ))}
        <li className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onMoreClick}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 active:opacity-60',
              moreActive
                ? 'text-accent border border-ruleHi'
                : 'text-textLo border border-transparent'
            )}
            style={
              moreActive
                ? { boxShadow: '0 0 8px rgba(196, 242, 90, 0.25)' }
                : undefined
            }
          >
            <span className="font-mono text-[16px] leading-none">⋯</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] leading-none">
              MORE
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
