import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Sparkles, Target, MoreHorizontal, TrendingUp, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const primaryNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/insights', label: 'Insights', icon: Sparkles },
  { href: '/goals', label: 'Goals', icon: Target },
];

const overflowNavItems = [
  { href: '/investments', label: 'Net Worth', icon: TrendingUp },
  { href: '/categories', label: 'Categories', icon: Tag },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isOverflowActive = overflowNavItems.some((item) => location.pathname === item.href);

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Overflow panel — slides up above the nav bar */}
      {moreOpen && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-card shadow-lg">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">More</span>
            <button onClick={() => setMoreOpen(false)} className="p-1 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-border">
            {overflowNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors',
                    isActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav
        className={cn(
          'pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card',
          className
        )}
      >
        <div className="flex h-16 items-center justify-around">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors',
              isOverflowActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
