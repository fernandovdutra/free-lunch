import { useLocation, useNavigate } from 'react-router-dom';
import { useMonth } from '@/contexts/MonthContext';
import { useBankConnections } from '@/hooks/useBankConnection';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const DRILL_PREFIXES = ['/expenses', '/income', '/counterparty', '/ics'];

const MONTH_LABELS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

function pathIsDrill(pathname: string): boolean {
  return DRILL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildBreadcrumb(pathname: string): string {
  const [, root, ...rest] = pathname.split('/');
  const head = (root || '').toUpperCase();
  if (rest.length === 0) return head;
  return `${head} › …`;
}

function formatRelativeMinutes(when: Date | string | null | undefined): string | null {
  if (!when) return null;
  const t = when instanceof Date ? when.getTime() : Date.parse(when);
  if (Number.isNaN(t)) return null;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return null;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'JUST NOW';
  if (min < 60) return `${min} MIN AGO`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} HR AGO`;
  const day = Math.floor(hr / 24);
  return `${day}D AGO`;
}

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedMonth, goToPreviousMonth, goToNextMonth, isCurrentMonth } = useMonth();
  const { data: connections } = useBankConnections();
  const { toast } = useToast();

  const drill = pathIsDrill(location.pathname);
  const monthLabel = MONTH_LABELS[selectedMonth.getMonth()] ?? '';
  const yearLabel = selectedMonth.getFullYear();

  // Most-recent sync across active bank connections. The Cloud Function
  // wire format returns ISO strings even though the type says Date — accept either.
  const latestSync = (connections ?? [])
    .map((c) => c.lastSync as Date | string | null)
    .filter((d): d is NonNullable<typeof d> => d != null)
    .map((d) => new Date(d as Date | string).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];
  const syncLabel =
    latestSync !== undefined ? formatRelativeMinutes(new Date(latestSync)) : 'NOT YET';

  const stub = (label: string) => () => {
    toast({ title: `${label} — coming soon` });
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b border-rule bg-bg',
        'pt-[env(safe-area-inset-top)]'
      )}
    >
      <div className="flex h-[44px] items-center justify-between px-3">
        {drill ? (
          <>
            <button
              type="button"
              onClick={() => {
                void navigate(-1);
              }}
              className="font-mono text-[12px] uppercase tracking-[0.08em] text-textMid active:opacity-60 px-1"
            >
              ‹ BACK
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
              {buildBreadcrumb(location.pathname)}
            </span>
            <span aria-hidden className="w-8" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToPreviousMonth}
                aria-label="Previous month"
                className="font-mono text-[14px] leading-none text-textLo active:opacity-60 px-1"
              >
                ‹
              </button>
              <span className="nums font-mono text-[11px] uppercase tracking-[0.12em] text-textHi">
                {monthLabel} {yearLabel}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                aria-label="Next month"
                className="font-mono text-[14px] leading-none text-textLo active:opacity-60 px-1 disabled:opacity-30"
              >
                ›
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-textLo">
                <span
                  aria-hidden
                  className="block bg-accent"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    boxShadow: '0 0 5px var(--accent)',
                  }}
                />
                <span className="hidden xs:inline">SYNC </span>
                {syncLabel}
              </span>
              <button
                type="button"
                onClick={stub('Search')}
                aria-label="Search"
                className="font-mono text-[14px] leading-none text-textLo active:opacity-60 px-1"
              >
                ⌕
              </button>
              <button
                type="button"
                onClick={stub('Add transaction')}
                aria-label="Add transaction"
                className="font-mono text-[14px] leading-none text-textLo active:opacity-60 px-1"
              >
                ⊕
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
