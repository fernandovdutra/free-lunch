import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireRole } from '../shared/dataOwner.js';

const schema = z.object({
  memberUid: z.string().min(1),
});

interface RemoveResult {
  removed: string;
}

export const removeMember = onCall(
  { region: 'europe-west1', cors: true },
  async (request): Promise<RemoveResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const ownerId = request.auth.uid;
    await requireRole(ownerId, ownerId, ['owner']);

    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { memberUid } = parsed.data;

    if (memberUid === ownerId) {
      throw new HttpsError('invalid-argument', 'Cannot remove yourself');
    }

    const db = getFirestore();
    const ownerRef = db.collection('users').doc(ownerId);
    const membershipRef = db.collection('memberships').doc(memberUid);

    await db.runTransaction(async (tx) => {
      const ownerSnap = await tx.get(ownerRef);
      if (!ownerSnap.exists) throw new HttpsError('failed-precondition', 'Owner doc missing');

      const ownerData = ownerSnap.data() ?? {};
      const members = (ownerData.members ?? {}) as Record<string, string>;
      if (!members[memberUid]) {
        throw new HttpsError('not-found', 'That user is not a member of your account');
      }

      // Nested-object syntax — see comment in `acceptInvitation.ts`. Admin
      // SDK `set({merge:true})` does not treat dotted keys as field paths.
      tx.set(
        ownerRef,
        {
          members: { [memberUid]: FieldValue.delete() },
          memberProfiles: { [memberUid]: FieldValue.delete() },
        },
        { merge: true }
      );

      const membershipSnap = await tx.get(membershipRef);
      if (membershipSnap.exists) {
        const data = membershipSnap.data() as {
          ownerIds?: string[];
          primaryOwnerId?: string;
        };
        const nextOwnerIds = (data.ownerIds ?? []).filter((id) => id !== ownerId);

        if (nextOwnerIds.length === 0) {
          tx.delete(membershipRef);
        } else {
          const primary = data.primaryOwnerId === ownerId ? nextOwnerIds[0] : data.primaryOwnerId;
          tx.set(membershipRef, {
            ownerIds: nextOwnerIds,
            primaryOwnerId: primary,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    return { removed: memberUid };
  }
);
