import { Menu, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useSyncAllConnections, useBankConnections } from '@/hooks/useBankConnection';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuth();
  const { data: connections = [] } = useBankConnections();
  const syncAll = useSyncAllConnections();
  const { toast } = useToast();

  const hasActiveConnections = connections.some((c) => c.status === 'active');

  const handleSync = async () => {
    if (!hasActiveConnections) {
      toast({
        title: 'No bank connections',
        description: 'Connect a bank account in Settings to sync transactions.',
        variant: 'default',
      });
      return;
    }

    try {
      const result = await syncAll.mutateAsync();

      if (result.errors.length > 0) {
        toast({
          title: 'Sync completed with errors',
          description: `Synced ${result.synced}/${result.total} accounts. Some accounts failed to sync.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sync complete',
          description: `Successfully synced ${result.synced} account${result.synced !== 1 ? 's' : ''}.`,
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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Logo (mobile only) */}
        <img
          src="/free-lunch-icon.jpg"
          alt="Free Lunch"
          className="h-9 lg:hidden"
        />

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Sync button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={() => void handleSync()}
            disabled={syncAll.isPending}
          >
            <RefreshCw className={cn('h-4 w-4', syncAll.isPending && 'animate-spin')} />
            <span className="hidden sm:inline">{syncAll.isPending ? 'Syncing...' : 'Sync'}</span>
          </Button>

          {/* User menu */}
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
