import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSharing,
  useInviteMember,
  useRemoveMember,
  useCancelInvitation,
  useRepairSharing,
  type SharingMemberRow,
  type SharingPendingRow,
} from '@/hooks/useSharing';
import type { RepairSharingResult, SharedMemberRole } from '@/lib/bankingFunctions';
import { SectionHeader } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';

const ROLE_LABEL: Record<SharedMemberRole | 'owner', string> = {
  owner: 'OWNER',
  editor: 'EDITOR',
  viewer: 'VIEWER',
};

function formatInvitedAt(date: Date | null): string {
  if (!date) return '—';
  return format(date, 'MMM d, yyyy').toUpperCase();
}

function MemberRow({
  row,
  onRemove,
  busy,
}: {
  row: SharingMemberRow;
  onRemove: (uid: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-rule px-4 py-[14px]">
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium leading-tight text-textHi truncate">
          {row.displayName?.trim() || row.email}
        </div>
        {row.displayName ? (
          <div className="text-[12.5px] text-textMid mt-[2px] truncate">{row.email}</div>
        ) : null}
      </div>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
        {ROLE_LABEL[row.role]}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          onRemove(row.uid);
        }}
        className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-warn disabled:opacity-50"
      >
        REMOVE
      </button>
    </div>
  );
}

function PendingRow({
  row,
  onCancel,
  busy,
}: {
  row: SharingPendingRow;
  onCancel: (email: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-rule px-4 py-[14px]">
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium leading-tight text-textHi truncate">
          {row.email}
        </div>
        <div className="text-[12.5px] text-textMid mt-[2px]">
          Invited {formatInvitedAt(row.invitedAt)}
        </div>
      </div>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
        {ROLE_LABEL[row.role]}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          onCancel(row.email);
        }}
        className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-warn disabled:opacity-50"
      >
        CANCEL
      </button>
    </div>
  );
}

export function SettingsSharing() {
  const { currentRole } = useAuth();
  const { data, isLoading } = useSharing();
  const invite = useInviteMember();
  const remove = useRemoveMember();
  const cancel = useCancelInvitation();
  const repair = useRepairSharing();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SharedMemberRole>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [repairResult, setRepairResult] = useState<RepairSharingResult | null>(null);
  const [repairError, setRepairError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [email, role]);

  if (currentRole && currentRole !== 'owner') {
    return <Navigate to="/settings" replace />;
  }

  const submit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    invite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          setEmail('');
          setRole('viewer');
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to send invitation';
          setError(message);
        },
      }
    );
  };

  const members = data?.members ?? [];
  const pending = data?.pending ?? [];

  return (
    <SettingsScreen title="SHARING">
      <p className="px-4 pb-4 text-[13.5px] leading-snug text-textMid">
        Invite a partner so they can sign in with their own account and view (or
        edit) the same data. They'll see your dashboard the next time they sign in.
      </p>

      <SectionHeader>INVITE</SectionHeader>
      <form onSubmit={submit} className="border-t border-rule px-4 py-4 space-y-3">
        <div>
          <label
            htmlFor="invite-email"
            className="block font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo mb-1.5"
          >
            EMAIL
          </label>
          <input
            id="invite-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            placeholder="partner@example.com"
            className="w-full border border-rule bg-bg px-3 py-2 text-[14.5px] text-textHi placeholder:text-textLo focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="invite-role"
            className="block font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo mb-1.5"
          >
            ACCESS
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as SharedMemberRole);
            }}
            className="w-full border border-rule bg-bg px-3 py-2 text-[14.5px] text-textHi focus:border-accent focus:outline-none"
          >
            <option value="viewer">Viewer — read-only</option>
            <option value="editor">Editor — can categorize and edit</option>
          </select>
        </div>
        {error ? (
          <div className="text-[13px] text-warn">{error}</div>
        ) : null}
        <button
          type="submit"
          disabled={invite.isPending || !email.trim()}
          className="w-full border border-accent bg-accent/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-accent disabled:opacity-50"
        >
          {invite.isPending ? 'SENDING…' : 'SEND INVITATION'}
        </button>
      </form>

      <SectionHeader>MEMBERS</SectionHeader>
      {isLoading ? (
        <div className="px-4 py-3 text-[13px] text-textMid">Loading…</div>
      ) : members.length === 0 ? (
        <div className="border-t border-rule px-4 py-[14px] text-[13.5px] text-textMid">
          No one else has access yet.
        </div>
      ) : (
        members.map((m) => (
          <MemberRow
            key={m.uid}
            row={m}
            busy={remove.isPending}
            onRemove={(uid) => {
              remove.mutate(uid);
            }}
          />
        ))
      )}

      {pending.length > 0 && (
        <>
          <SectionHeader>PENDING</SectionHeader>
          {pending.map((p) => (
            <PendingRow
              key={p.email}
              row={p}
              busy={cancel.isPending}
              onCancel={(email) => {
                cancel.mutate(email);
              }}
            />
          ))}
        </>
      )}

      <SectionHeader>TROUBLESHOOTING</SectionHeader>
      <div className="border-t border-rule px-4 py-4 space-y-3">
        <p className="text-[13px] leading-snug text-textMid">
          If a member can sign in but only the Home page loads data, your
          account may be in an inconsistent state from an older invite-acceptance
          bug. Run repair to rewrite the sharing fields and backfill any missing
          membership entries.
        </p>
        <button
          type="button"
          disabled={repair.isPending}
          onClick={() => {
            setRepairError(null);
            setRepairResult(null);
            repair.mutate(undefined, {
              onSuccess: (data) => {
                setRepairResult(data);
              },
              onError: (err: unknown) => {
                const message = err instanceof Error ? err.message : 'Repair failed';
                setRepairError(message);
              },
            });
          }}
          className="w-full border border-rule bg-bg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-textHi disabled:opacity-50"
        >
          {repair.isPending ? 'REPAIRING…' : 'REPAIR SHARING ACCESS'}
        </button>
        {repairError ? (
          <div className="text-[13px] text-warn">{repairError}</div>
        ) : null}
        {repairResult ? (
          <div className="text-[12.5px] leading-snug text-textMid">
            {repairResult.literalFieldsRemoved === 0 &&
            repairResult.membersTotal === members.length ? (
              <>Account looks healthy — nothing to repair.</>
            ) : (
              <>
                Repaired: {repairResult.literalFieldsRemoved} stale field(s)
                removed, {repairResult.membersTotal} member(s) now in the access
                list. Members may need to refresh to see shared data.
              </>
            )}
          </div>
        ) : null}
      </div>
    </SettingsScreen>
  );
}
