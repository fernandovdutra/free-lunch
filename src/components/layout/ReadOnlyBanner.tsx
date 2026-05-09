import { useAuth } from '@/contexts/AuthContext';

export function ReadOnlyBanner() {
  const { currentRole, ownerProfile } = useAuth();
  if (!currentRole || currentRole === 'owner') return null;

  const ownerLabel =
    ownerProfile?.displayName?.trim() ||
    ownerProfile?.email ||
    "shared account";
  const roleLabel = currentRole === 'viewer' ? 'Read-only' : 'Editor';

  return (
    <div
      role="status"
      className="fixed left-0 right-0 top-[env(safe-area-inset-top)] z-40 border-b border-border bg-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:text-amber-200"
    >
      Viewing {ownerLabel}'s account · {roleLabel}
    </div>
  );
}
