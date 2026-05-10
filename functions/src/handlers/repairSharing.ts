import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { requireRole } from '../shared/dataOwner.js';

type Role = 'editor' | 'viewer';

interface RepairDetail {
  memberUid: string;
  email: string | null;
  role: Role;
  action: 'kept' | 'migrated-literal' | 'inserted-from-membership';
}

export interface RepairSharingResult {
  ownerId: string;
  membersTotal: number;
  literalFieldsRemoved: number;
  details: RepairDetail[];
}

/**
 * One-shot repair for accounts whose user doc has malformed sharing fields.
 *
 * The earlier acceptInvitation/removeMember/cancelInvitation handlers wrote
 * dotted keys via `tx.set({merge:true})`. The admin SDK does NOT interpret
 * dotted keys as field paths in `set()` — only `update()` does — so those
 * writes produced literal top-level fields named like `members.UID` rather
 * than nested entries inside the `members` map. Security rules check the
 * nested map (`users/{owner}.members[uid]`), so members couldn't actually
 * read shared data even though their `memberships/{uid}` doc was correct.
 *
 * This function:
 *  - Consolidates any literal `members.UID` / `memberProfiles.UID` /
 *    `pendingMembers.EMAIL` fields into their proper nested maps.
 *  - Cross-references `memberships` (admin-written, always correct) to
 *    backfill any member who is missing from the nested map. Defaults role
 *    to `viewer` — the owner can promote afterwards from the sharing UI.
 *  - Backfills `memberProfiles[uid]` from Firebase Auth when missing.
 *  - Deletes the literal-named fields once their data is migrated.
 *
 * Idempotent: a clean account produces no writes and returns an empty
 * details list.
 */
export const repairSharing = onCall(
  { region: 'europe-west1', cors: true },
  async (request): Promise<RepairSharingResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const ownerId = request.auth.uid;

    // Owner-only — repair only your own account.
    await requireRole(ownerId, ownerId, ['owner']);

    const db = getFirestore();
    const ownerRef = db.collection('users').doc(ownerId);
    const ownerSnap = await ownerRef.get();
    if (!ownerSnap.exists) {
      throw new HttpsError('not-found', 'Owner doc missing');
    }
    const ownerData = ownerSnap.data() ?? {};

    // Existing nested maps (may be empty if every prior write went to literal keys).
    const nestedMembers: Record<string, Role> =
      ownerData.members && typeof ownerData.members === 'object'
        ? { ...(ownerData.members as Record<string, Role>) }
        : {};
    const nestedProfiles: Record<string, { email: string; displayName: string | null }> =
      ownerData.memberProfiles && typeof ownerData.memberProfiles === 'object'
        ? { ...(ownerData.memberProfiles as Record<string, { email: string; displayName: string | null }>) }
        : {};
    const nestedPending: Record<string, unknown> =
      ownerData.pendingMembers && typeof ownerData.pendingMembers === 'object'
        ? { ...(ownerData.pendingMembers as Record<string, unknown>) }
        : {};

    // Scan top-level keys for literal `members.UID`, `memberProfiles.UID`,
    // `pendingMembers.EMAIL` fields produced by the buggy set+merge writes.
    const literalKeysToDelete: string[] = [];
    const migratedFromLiteral = new Set<string>();
    for (const key of Object.keys(ownerData)) {
      if (key.startsWith('members.')) {
        const uid = key.slice('members.'.length);
        const value = ownerData[key];
        if (uid && (value === 'editor' || value === 'viewer')) {
          // Proper-nested entry wins if present (most recent good write).
          if (!(uid in nestedMembers)) {
            nestedMembers[uid] = value;
            migratedFromLiteral.add(uid);
          }
        }
        literalKeysToDelete.push(key);
      } else if (key.startsWith('memberProfiles.')) {
        const uid = key.slice('memberProfiles.'.length);
        const value = ownerData[key];
        if (
          uid &&
          value &&
          typeof value === 'object' &&
          !(uid in nestedProfiles)
        ) {
          nestedProfiles[uid] = value as {
            email: string;
            displayName: string | null;
          };
        }
        literalKeysToDelete.push(key);
      } else if (key.startsWith('pendingMembers.')) {
        const email = key.slice('pendingMembers.'.length);
        const value = ownerData[key];
        if (email && value && typeof value === 'object' && !(email in nestedPending)) {
          nestedPending[email] = value;
        }
        literalKeysToDelete.push(key);
      }
    }

    // Cross-reference memberships — for any uid that lists this owner, make
    // sure they're present in the nested members map.
    const membershipQuery = await db
      .collection('memberships')
      .where('ownerIds', 'array-contains', ownerId)
      .get();

    const insertedFromMembership = new Set<string>();
    for (const m of membershipQuery.docs) {
      const memberUid = m.id;
      if (memberUid === ownerId) continue;
      if (!(memberUid in nestedMembers)) {
        // No record on the owner side — default to the safest role. Owner
        // can promote in the sharing UI afterwards.
        nestedMembers[memberUid] = 'viewer';
        insertedFromMembership.add(memberUid);
      }
    }

    // Backfill memberProfiles from Firebase Auth where missing.
    for (const memberUid of Object.keys(nestedMembers)) {
      if (nestedProfiles[memberUid]) continue;
      try {
        const userRecord = await getAuth().getUser(memberUid);
        nestedProfiles[memberUid] = {
          email: userRecord.email ?? '(unknown)',
          displayName: userRecord.displayName ?? null,
        };
      } catch {
        // Auth lookup failed (deleted user, etc.) — leave profile blank;
        // the sharing UI surfaces "(unknown)" rather than crashing.
      }
    }

    // Build details for the response.
    const details: RepairDetail[] = Object.keys(nestedMembers)
      .sort()
      .map((memberUid) => {
        const action: RepairDetail['action'] = insertedFromMembership.has(memberUid)
          ? 'inserted-from-membership'
          : migratedFromLiteral.has(memberUid)
            ? 'migrated-literal'
            : 'kept';
        return {
          memberUid,
          email: nestedProfiles[memberUid]?.email ?? null,
          role: nestedMembers[memberUid],
          action,
        };
      });

    // Decide whether anything actually changed. If not, skip the writes so
    // the call is genuinely idempotent / cheap on a clean account.
    const wroteSomething =
      literalKeysToDelete.length > 0 ||
      insertedFromMembership.size > 0 ||
      migratedFromLiteral.size > 0 ||
      Object.keys(nestedProfiles).some((uid) => !ownerData.memberProfiles?.[uid]);

    if (wroteSomething) {
      const writePayload: Record<string, unknown> = {
        members: nestedMembers,
        memberProfiles: nestedProfiles,
        pendingMembers: nestedPending,
      };

      if (literalKeysToDelete.length === 0) {
        await ownerRef.update(writePayload);
      } else {
        // Literal-named fields contain dots, so passing them as object keys
        // to update() would split on the dot. Use FieldPath() with the full
        // key string as a single segment to delete the literal field.
        const batch = db.batch();
        batch.update(ownerRef, writePayload);
        for (const key of literalKeysToDelete) {
          batch.update(ownerRef, new FieldPath(key), FieldValue.delete());
        }
        await batch.commit();
      }
    }

    return {
      ownerId,
      membersTotal: details.length,
      literalFieldsRemoved: literalKeysToDelete.length,
      details,
    };
  }
);
