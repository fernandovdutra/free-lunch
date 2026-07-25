import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireRole } from '../shared/dataOwner.js';
import { sendInsightEmail } from '../shared/emailSender.js';
import { buildInvitationEmailHtml } from '../shared/emailTemplates.js';
import { config } from '../config.js';

const schema = z.object({
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(['editor', 'viewer']),
});

interface InviteResult {
  email: string;
  role: 'editor' | 'viewer';
  status: 'invited';
}

export const inviteMember = onCall(
  { region: 'europe-west1', cors: true },
  async (request): Promise<InviteResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const ownerId = request.auth.uid;

    // Owner-only — confirms the caller owns their account (not a member of someone else's).
    await requireRole(ownerId, ownerId, ['owner']);

    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { email, role } = parsed.data;

    if (request.auth.token.email?.toLowerCase() === email) {
      throw new HttpsError('invalid-argument', 'Cannot invite yourself');
    }

    const db = getFirestore();
    const ownerRef = db.collection('users').doc(ownerId);
    const lookupRef = db.collection('pendingInviteLookup').doc(email);

    await db.runTransaction(async (tx) => {
      const ownerSnap = await tx.get(ownerRef);
      if (!ownerSnap.exists) throw new HttpsError('failed-precondition', 'Owner doc missing');

      const ownerData = ownerSnap.data() ?? {};
      const pending = (ownerData.pendingMembers ?? {}) as Record<string, unknown>;
      if (pending[email]) {
        throw new HttpsError('already-exists', 'An invitation for that email is already pending');
      }

      const memberProfiles = (ownerData.memberProfiles ?? {}) as Record<
        string,
        { email?: string }
      >;
      const alreadyMember = Object.values(memberProfiles).some(
        (p) => p.email?.toLowerCase() === email
      );
      if (alreadyMember) {
        throw new HttpsError('already-exists', 'That user already has access');
      }

      const lookupSnap = await tx.get(lookupRef);
      if (lookupSnap.exists) {
        throw new HttpsError(
          'already-exists',
          'That email already has a pending invitation on another account'
        );
      }

      tx.set(
        ownerRef,
        {
          pendingMembers: {
            [email]: {
              role,
              invitedAt: FieldValue.serverTimestamp(),
              invitedBy: ownerId,
            },
          },
        },
        { merge: true }
      );

      tx.set(lookupRef, {
        ownerId,
        role,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // Best-effort notification: the invitation exists regardless — the invitee
    // is matched by email when they sign in (`acceptInvitation`). A send
    // failure must never fail the invite, and when email is unconfigured
    // (e.g. emulator without RESEND_API_KEY) the sender skips with a log.
    try {
      const token = request.auth.token;
      const inviterName = typeof token.name === 'string' ? token.name : undefined;
      const inviterEmail = token.email ?? undefined;
      const html = buildInvitationEmailHtml({
        inviterName,
        inviterEmail,
        inviteeEmail: email,
        role,
        appUrl: config.appUrl,
      });
      await sendInsightEmail(
        email,
        `${inviterName ?? inviterEmail ?? 'Someone'} invited you to Free Lunch`,
        html
      );
    } catch (err) {
      console.error(`Invitation email to ${email} failed (invitation was still created):`, err);
    }

    return { email, role, status: 'invited' };
  }
);
