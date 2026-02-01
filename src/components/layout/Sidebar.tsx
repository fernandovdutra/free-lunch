import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tags, PiggyBank, Receipt, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/budgets', label: 'Budgets', icon: PiggyBank },
  { href: '/reimbursements', label: 'Reimbursements', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-60 flex-col bg-[#1D4739]',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <img
          src="/free-lunch-icon.png"
          alt=""
          className="h-9 w-9"
        />
        <span className="text-lg font-bold text-white">Free Lunch</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
