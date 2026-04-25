import { useLocation, useNavigate } from 'react-router-dom';
import { useMonth } from '@/contexts/MonthContext';
import { cn } from '@/lib/utils';

const DRILL_PREFIXES = ['/expenses', '/income', '/counterparty', '/ics'];

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface TopBarProps {
  onMoreClick: () => void;
}

function pathIsDrill(pathname: string): boolean {
  return DRILL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildBreadcrumb(pathname: string): string {
  const [, root, ...rest] = pathname.split('/');
  const head = (root || '').toUpperCase();
  if (rest.length === 0) return head;
  // Show only the trailing crumb to keep the bar compact: "EXPENSES › …"
  return `${head} › …`;
}

export function TopBar({ onMoreClick }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedMonth } = useMonth();

  const drill = pathIsDrill(location.pathname);
  const monthLabel = MONTH_LABELS[selectedMonth.getMonth()] ?? '';

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b border-rule bg-bg',
        'pt-[env(safe-area-inset-top)]'
      )}
    >
      <div className="flex h-[44px] items-center justify-between px-4">
        {drill ? (
          <button
            type="button"
            onClick={() => {
              void navigate(-1);
            }}
            className="font-mono text-[12px] uppercase tracking-[0.08em] text-textMid active:opacity-60"
          >
            ‹ BACK
          </button>
        ) : (
          <span className="font-mono text-[14px] uppercase tracking-[0.08em] text-textHi">
            FREE LUNCH
          </span>
        )}

        {drill && (
          <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
            {buildBreadcrumb(location.pathname)}
          </span>
        )}

        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-textMid">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={onMoreClick}
            aria-label="Open menu"
            className="font-mono text-[16px] leading-none text-textLo active:opacity-60"
          >
            …
          </button>
        </div>
      </div>
    </header>
  );
}
