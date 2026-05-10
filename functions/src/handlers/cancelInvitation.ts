import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireRole } from '../shared/dataOwner.js';

const schema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

interface CancelResult {
  cancelled: string;
}

export const cancelInvitation = onCall(
  { region: 'europe-west1', cors: true },
  async (request): Promise<CancelResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const ownerId = request.auth.uid;
    await requireRole(ownerId, ownerId, ['owner']);

    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { email } = parsed.data;

    const db = getFirestore();
    const ownerRef = db.collection('users').doc(ownerId);
    const lookupRef = db.collection('pendingInviteLookup').doc(email);

    await db.runTransaction(async (tx) => {
      const ownerSnap = await tx.get(ownerRef);
      if (!ownerSnap.exists) throw new HttpsError('failed-precondition', 'Owner doc missing');

      const lookupSnap = await tx.get(lookupRef);

      // Nested-object syntax — see comment in `acceptInvitation.ts`. Admin
      // SDK `set({merge:true})` does not treat dotted keys as field paths.
      tx.set(
        ownerRef,
        { pendingMembers: { [email]: FieldValue.delete() } },
        { merge: true }
      );

      // Only delete the lookup if it points to this owner — defends against
      // a freshly issued invite from a different owner stealing the slot.
      if (lookupSnap.exists) {
        const data = lookupSnap.data() as { ownerId?: string };
        if (data.ownerId === ownerId) {
          tx.delete(lookupRef);
        }
      }
    });

    return { cancelled: email };
  }
);
