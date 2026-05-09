import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  inviteMemberFn,
  removeMemberFn,
  cancelInvitationFn,
  repairSharingFn,
  type SharedMemberRole,
  type RepairSharingResult,
} from '@/lib/bankingFunctions';
import { useGuardedMutation } from './useGuardedMutation';

export interface SharingMemberRow {
  uid: string;
  email: string;
  displayName: string | null;
  role: SharedMemberRole | 'owner';
}

export interface SharingPendingRow {
  email: string;
  role: SharedMemberRole;
  invitedAt: Date | null;
}

export interface SharingState {
  members: SharingMemberRow[];
  pending: SharingPendingRow[];
}

const EMPTY: SharingState = { members: [], pending: [] };

/**
 * Reads the owner's user doc and projects `members` + `pendingMembers` into
 * sortable rows. Subscribes via `onSnapshot` so the sharing UI updates
 * immediately when an invitation is accepted server-side.
 */
export function useSharing() {
  const { dataOwnerId, currentRole } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = currentRole === 'owner' && !!dataOwnerId;

  // Live snapshot keeps the list current without manual refetches.
  useEffect(() => {
    if (!isOwner || !dataOwnerId) return;
    const ref = doc(db, 'users', dataOwnerId);
    const unsub = onSnapshot(ref, () => {
      void queryClient.invalidateQueries({ queryKey: ['sharing', dataOwnerId] });
    });
    return () => {
      unsub();
    };
  }, [isOwner, dataOwnerId, queryClient]);

  const query = useQuery<SharingState>({
    queryKey: ['sharing', dataOwnerId],
    enabled: isOwner,
    queryFn: async () => {
      if (!dataOwnerId) return EMPTY;
      const { getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'users', dataOwnerId));
      if (!snap.exists()) return EMPTY;
      const data = snap.data() as {
        members?: Record<string, SharedMemberRole | 'owner'>;
        memberProfiles?: Record<string, { email: string; displayName: string | null }>;
        pendingMembers?: Record<
          string,
          { role: SharedMemberRole; invitedAt?: { toDate?: () => Date } }
        >;
      };

      const memberMap = data.members ?? {};
      const profiles = data.memberProfiles ?? {};
      const members: SharingMemberRow[] = Object.entries(memberMap)
        // Hide the owner row from the list — it's redundant in the sharing UI.
        .filter(([uid]) => uid !== dataOwnerId)
        .map(([uid, role]) => ({
          uid,
          email: profiles[uid]?.email ?? '(unknown)',
          displayName: profiles[uid]?.displayName ?? null,
          role,
        }))
        .sort((a, b) => a.email.localeCompare(b.email));

      const pending: SharingPendingRow[] = Object.entries(data.pendingMembers ?? {})
        .map(([email, p]) => ({
          email,
          role: p.role,
          invitedAt: p.invitedAt?.toDate ? p.invitedAt.toDate() : null,
        }))
        .sort((a, b) => a.email.localeCompare(b.email));

      return { members, pending };
    },
  });

  return query;
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useGuardedMutation(
    {
      mutationFn: async ({ email, role }: { email: string; role: SharedMemberRole }) => {
        const result = await inviteMemberFn({ email, role });
        return result.data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['sharing', dataOwnerId] });
      },
    },
    { ownerOnly: true }
  );
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useGuardedMutation(
    {
      mutationFn: async (memberUid: string) => {
        const result = await removeMemberFn({ memberUid });
        return result.data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['sharing', dataOwnerId] });
      },
    },
    { ownerOnly: true }
  );
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useGuardedMutation(
    {
      mutationFn: async (email: string) => {
        const result = await cancelInvitationFn({ email });
        return result.data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['sharing', dataOwnerId] });
      },
    },
    { ownerOnly: true }
  );
}

/**
 * One-shot repair for accounts whose sharing data was written by the buggy
 * dotted-key set+merge calls. Owner-only. The CF is idempotent: a healthy
 * account returns `{ literalFieldsRemoved: 0 }` and writes nothing.
 */
export function useRepairSharing() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useGuardedMutation(
    {
      mutationFn: async (): Promise<RepairSharingResult> => {
        const result = await repairSharingFn();
        return result.data;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['sharing', dataOwnerId] });
      },
    },
    { ownerOnly: true }
  );
}
