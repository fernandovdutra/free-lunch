import { useMonth } from '@/contexts/MonthContext';
import { useBankConnections, useSyncAllConnections } from '@/hooks/useBankConnection';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

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

/**
 * Single-mode TopBar: month nav (`‹ APRIL 2026 ›`) on the left, sync indicator
 * + search + add on the right. The sync indicator doubles as a button — tapping
 * it triggers `useSyncAllConnections` so the user can refresh from anywhere
 * without going into Settings.
 */
export function TopBar() {
  const { selectedMonth, goToPreviousMonth, goToNextMonth, isCurrentMonth } = useMonth();
  const { data: connections } = useBankConnections();
  const syncAll = useSyncAllConnections();
  const { toast } = useToast();

  const monthLabel = MONTH_LABELS[selectedMonth.getMonth()] ?? '';
  const yearLabel = selectedMonth.getFullYear();

  const latestSync = (connections ?? [])
    .map((c) => c.lastSync as Date | string | null)
    .filter((d): d is NonNullable<typeof d> => d != null)
    .map((d) => new Date(d as Date | string).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];
  const syncLabel =
    latestSync !== undefined ? formatRelativeMinutes(new Date(latestSync)) : 'NOT YET';

  const hasActiveConnections = (connections ?? []).some((c) => c.status === 'active');

  const handleSync = async () => {
    if (!hasActiveConnections) {
      toast({
        title: 'No bank connections',
        description: 'Connect a bank account in Settings to sync.',
        variant: 'default',
      });
      return;
    }
    try {
      const result = await syncAll.mutateAsync();
      if (result.errors.length > 0) {
        toast({
          title: 'Sync completed with errors',
          description: `Synced ${result.synced}/${result.total} accounts.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sync complete',
          description: `Synced ${result.synced} account${result.synced !== 1 ? 's' : ''}.`,
        });
      }
    } catch {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync transactions. Please try again.',
        variant: 'destructive',
      });
    }
  };

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
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncAll.isPending}
            aria-label={syncAll.isPending ? 'Syncing' : 'Sync now'}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-textLo active:opacity-60 disabled:opacity-60"
          >
            <span
              aria-hidden
              className={cn('block bg-accent', syncAll.isPending && 'animate-pulse')}
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                boxShadow: '0 0 5px var(--accent)',
              }}
            />
            <span className="hidden xs:inline">SYNC </span>
            {syncAll.isPending ? 'SYNCING…' : syncLabel}
          </button>
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
      </div>
    </header>
  );
}
