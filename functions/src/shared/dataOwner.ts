import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export type MemberRole = 'owner' | 'editor' | 'viewer';

interface MembershipDoc {
  ownerIds?: string[];
  primaryOwnerId?: string;
}

interface UserDoc {
  members?: Record<string, MemberRole>;
}

/**
 * Resolves the data-owner UID for a signed-in user. Returns the user's own
 * UID when they own their data, or `primaryOwnerId` from `memberships/{uid}`
 * when they are a member of someone else's account.
 */
export async function resolveDataOwner(authUid: string): Promise<string> {
  const db = getFirestore();
  const membershipSnap = await db.collection('memberships').doc(authUid).get();
  if (!membershipSnap.exists) return authUid;

  const data = membershipSnap.data() as MembershipDoc;
  const primary = data.primaryOwnerId;
  if (primary && primary !== authUid) return primary;

  if (data.ownerIds && data.ownerIds.length > 0) {
    const first = data.ownerIds.find((id) => id !== authUid);
    if (first) return first;
  }

  return authUid;
}

/**
 * Looks up the role the auth user has on the data owner's account. Returns
 * `'owner'` when `authUid === ownerId`, otherwise reads `users/{ownerId}.members[authUid]`.
 * Returns `null` if no membership exists.
 */
export async function getRoleFor(
  authUid: string,
  ownerId: string
): Promise<MemberRole | null> {
  if (authUid === ownerId) return 'owner';
  const db = getFirestore();
  const ownerSnap = await db.collection('users').doc(ownerId).get();
  if (!ownerSnap.exists) return null;
  const data = ownerSnap.data() as UserDoc;
  return data.members?.[authUid] ?? null;
}

/**
 * Throws `HttpsError('permission-denied')` if the auth user does not hold
 * one of the allowed roles on `ownerId`'s data.
 */
export async function requireRole(
  authUid: string,
  ownerId: string,
  allowed: readonly MemberRole[]
): Promise<MemberRole> {
  const role = await getRoleFor(authUid, ownerId);
  if (!role || !allowed.includes(role)) {
    throw new HttpsError(
      'permission-denied',
      `Requires one of: ${allowed.join(', ')}`
    );
  }
  return role;
}
