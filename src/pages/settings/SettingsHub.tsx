import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useBankConnections } from '@/hooks/useBankConnection';
import { useTransactions } from '@/hooks/useTransactions';
import { useRules } from '@/hooks/useRules';
import { SectionHeader } from '@/components/redesign';
import { IdentityHero } from './_shared/IdentityHero';
import { SettingsRoomRow } from './_shared/SettingsRoomRow';

const APP_VERSION = '0.1.0';

function relativeMinutes(when: Date | string | null | undefined): string {
  if (!when) return 'NEVER';
  const t = when instanceof Date ? when.getTime() : Date.parse(when);
  if (Number.isNaN(t)) return 'NEVER';
  const diffMs = Date.now() - t;
  if (diffMs < 0) return 'JUST NOW';
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'JUST NOW';
  if (min < 60) return `${min} MIN AGO`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} HR AGO`;
  const day = Math.floor(hr / 24);
  return `${day}D AGO`;
}

function deriveInitials(name: string | null | undefined, email: string): string {
  const source = (name && name.trim().length > 0 ? name : email.split('@')[0]) ?? '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? '';
  const second = parts[parts.length - 1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

export function SettingsHub() {
  const { user, firebaseUser, logout } = useAuth();
  const { data: connections = [] } = useBankConnections();
  const { data: transactions = [] } = useTransactions({});
  const { data: rules = [] } = useRules();

  const email = user?.email ?? firebaseUser?.email ?? '';
  const displayName =
    user?.displayName ?? firebaseUser?.displayName ?? email.split('@')[0] ?? 'You';
  const initials = deriveInitials(displayName, email);

  const activeConnections = connections.filter((c) => c.status === 'active');
  const primary = [...connections].sort((a, b) => {
    const at = a.lastSync ? Date.parse(a.lastSync) : 0;
    const bt = b.lastSync ? Date.parse(b.lastSync) : 0;
    return bt - at;
  })[0];
  const syncLabel = relativeMinutes(primary?.lastSync ?? null);
  const bankLabel = primary
    ? `CONNECTED · ${primary.bankName.toUpperCase()}`
    : 'NOT CONNECTED';
  const accountTotal = activeConnections.reduce((sum, c) => sum + c.accountCount, 0);

  const memberSince = firebaseUser?.metadata.creationTime
    ? format(new Date(firebaseUser.metadata.creationTime), 'MMM yyyy').toUpperCase()
    : null;

  const handleLogout = () => {
    void logout();
  };

  return (
    <div className="-mx-4 flex flex-col pb-[80px] lg:pb-[60px]">
      <IdentityHero initials={initials} name={displayName} email={email} />

      <div className="mx-4 mb-[6px] border border-rule bg-surface px-[14px] py-3">
        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.04em]">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="block bg-accent"
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                boxShadow: '0 0 6px var(--accent)',
              }}
            />
            <span className="text-textMid">{bankLabel}</span>
          </div>
          <span className="text-textLo">SYNC {syncLabel}</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5 nums font-mono">
          <Stat label="ACCOUNTS" value={accountTotal.toString()} />
          <Stat label="TXNS" value={transactions.length.toLocaleString('en-US')} />
          <Stat label="RULES" value={rules.length.toString()} />
        </div>
      </div>

      <SectionHeader>MANAGE</SectionHeader>
      <SettingsRoomRow
        glyph="⎌"
        label="Accounts & Sync"
        meta={
          activeConnections.length > 0
            ? `${activeConnections.length} bank · ${accountTotal} account${accountTotal === 1 ? '' : 's'}`
            : 'No banks connected'
        }
        to="/settings/accounts"
      />
      <SettingsRoomRow
        glyph="◱"
        label="Categorization"
        meta={`${rules.length} rule${rules.length === 1 ? '' : 's'}`}
        to="/settings/categorization"
      />
      <SettingsRoomRow
        glyph="⚙"
        label="Preferences"
        meta="Locale · fiscal month · notifications"
        to="/settings/preferences"
      />

      <SectionHeader>DATA</SectionHeader>
      <SettingsRoomRow
        glyph="↓"
        label="Export"
        meta={`${transactions.length.toLocaleString('en-US')} transactions · CSV / JSON / ICS`}
        to="/settings/export"
      />

      <SectionHeader>DANGER</SectionHeader>
      <SettingsRoomRow
        glyph="◷"
        label="Account"
        meta="Email · provider · sign out"
        to="/settings/account"
      />
      <SettingsRoomRow
        glyph="△"
        label="Reset data"
        meta="Reset categories · delete all data"
        to="/settings/danger"
        accent="warn"
      />

      <div className="px-4 pt-7 pb-2 text-center font-mono text-[10px] tracking-[0.04em] text-textLo">
        FREE LUNCH · v{APP_VERSION}
        {memberSince ? (
          <>
            <br />
            MEMBER SINCE {memberSince}
          </>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-rule bg-bg pb-[env(safe-area-inset-bottom)] lg:bottom-0 lg:left-[60px]">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center px-4 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-warn active:opacity-60"
        >
          ⇥ &nbsp;LOG OUT
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] tracking-[0.04em] text-textLo">{label}</div>
      <div className="font-mono text-[18px] leading-tight tracking-[-0.5px] text-textHi mt-0.5">
        {value}
      </div>
    </div>
  );
}
