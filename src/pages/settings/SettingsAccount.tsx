import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { SectionHeader } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';
import { IdentityHero } from './_shared/IdentityHero';

function deriveInitials(name: string | null | undefined, email: string): string {
  const source = (name && name.trim().length > 0 ? name : email.split('@')[0]) ?? '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const second = parts[parts.length - 1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

function providerLabel(providerId: string | undefined): string {
  if (!providerId) return 'PASSWORD';
  if (providerId === 'google.com') return 'GOOGLE';
  if (providerId === 'password') return 'EMAIL · PASSWORD';
  return providerId.replace(/\.com$/, '').toUpperCase();
}

interface DetailRowProps {
  label: string;
  value: string;
  meta?: string;
}

function DetailRow({ label, value, meta }: DetailRowProps) {
  return (
    <div className="flex items-center gap-[14px] border-t border-rule px-4 py-[14px]">
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium leading-tight tracking-[-0.1px] text-textHi">
          {label}
        </div>
        {meta ? (
          <div className="text-[12.5px] text-textMid mt-[2px] leading-[1.35]">{meta}</div>
        ) : null}
      </div>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo truncate">
        {value}
      </span>
    </div>
  );
}

/**
 * Settings · Account — minimal per the resolved spec: identity hero,
 * email, sign-in provider, member-since timestamp. Logout intentionally
 * does NOT appear here; it lives only in the hub's sticky footer per
 * resolved Q4. v8 has no dedicated Account frame, so this layout follows
 * the handoff README §15 styled with the same primitives as the other
 * settings rooms.
 */
export function SettingsAccount() {
  const { user, firebaseUser } = useAuth();
  const email = user?.email ?? firebaseUser?.email ?? '';
  const displayName =
    user?.displayName ?? firebaseUser?.displayName ?? email.split('@')[0] ?? 'You';
  const initials = deriveInitials(displayName, email);

  const providerData = firebaseUser?.providerData ?? [];
  const primaryProvider = providerData[0]?.providerId;
  const provider = providerLabel(primaryProvider);

  const memberSince = firebaseUser?.metadata.creationTime
    ? format(new Date(firebaseUser.metadata.creationTime), 'MMM d, yyyy').toUpperCase()
    : '—';

  const lastSignIn = firebaseUser?.metadata.lastSignInTime
    ? format(new Date(firebaseUser.metadata.lastSignInTime), 'MMM d, yyyy').toUpperCase()
    : '—';

  return (
    <SettingsScreen title="ACCOUNT">
      <IdentityHero initials={initials} name={displayName} email={email} />

      <SectionHeader>SIGN-IN</SectionHeader>
      <DetailRow label="Email" value={email || '—'} meta="Read-only" />
      <DetailRow
        label="Provider"
        value={provider}
        meta={primaryProvider === 'google.com' ? 'Connected Google account' : 'Sign-in method'}
      />

      <SectionHeader>HISTORY</SectionHeader>
      <DetailRow label="Member since" value={memberSince} />
      <DetailRow label="Last sign-in" value={lastSignIn} />

      <div className="px-4 pt-6 pb-4 font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
        LOG OUT lives at the bottom of <span className="text-textMid">SETTINGS</span>
      </div>
    </SettingsScreen>
  );
}
