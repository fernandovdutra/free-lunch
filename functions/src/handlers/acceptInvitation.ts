import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface AcceptResult {
  acceptedFor: string | null;
  role: 'editor' | 'viewer' | null;
}

/**
 * Idempotent. Called by the client immediately after every sign-in. Looks up
 * any pending invitation matching the auth user's email and atomically
 * promotes it to a real membership.
 */
export const acceptInvitation = onCall(
  { region: 'europe-west1', cors: true },
  async (request): Promise<AcceptResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const memberUid = request.auth.uid;
    const rawEmail = request.auth.token.email;
    if (!rawEmail) {
      // No email on the token — nothing to look up.
      return { acceptedFor: null, role: null };
    }
    const email = rawEmail.toLowerCase();
    const displayName = (request.auth.token.name as string | undefined) ?? null;

    const db = getFirestore();
    const lookupRef = db.collection('pendingInviteLookup').doc(email);
    const membershipRef = db.collection('memberships').doc(memberUid);

    const result = await db.runTransaction(async (tx) => {
      const lookupSnap = await tx.get(lookupRef);
      if (!lookupSnap.exists) return null;

      const { ownerId, role } = lookupSnap.data() as {
        ownerId: string;
        role: 'editor' | 'viewer';
      };

      const ownerRef = db.collection('users').doc(ownerId);
      const ownerSnap = await tx.get(ownerRef);
      if (!ownerSnap.exists) {
        // Owner doc gone — clean up the orphaned lookup.
        tx.delete(lookupRef);
        return null;
      }

      const ownerData = ownerSnap.data() ?? {};
      const pending = (ownerData.pendingMembers ?? {}) as Record<string, unknown>;
      if (!pending[email]) {
        // Race: invitation was cancelled between lookup write and acceptance.
        tx.delete(lookupRef);
        return null;
      }

      const membershipSnap = await tx.get(membershipRef);

      tx.set(
        ownerRef,
        {
          [`members.${memberUid}`]: role,
          [`memberProfiles.${memberUid}`]: { email, displayName },
          [`pendingMembers.${email}`]: FieldValue.delete(),
        },
        { merge: true }
      );

      const existing = membershipSnap.exists
        ? (membershipSnap.data() as { ownerIds?: string[]; primaryOwnerId?: string })
        : {};
      const nextOwnerIds = Array.from(
        new Set([...(existing.ownerIds ?? []), ownerId])
      );
      tx.set(membershipRef, {
        ownerIds: nextOwnerIds,
        primaryOwnerId: existing.primaryOwnerId ?? ownerId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.delete(lookupRef);

      return { ownerId, role };
    });

    if (!result) return { acceptedFor: null, role: null };
    return { acceptedFor: result.ownerId, role: result.role };
  }
);
