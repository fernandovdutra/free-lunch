import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { z } from 'zod';
import { resolveDataOwner, requireRole } from '../shared/dataOwner.js';
import { previewCorrection, applyCorrection, getCorrectionOperation, undoCorrection, processCorrectionChunk, listCategorizationReview, upsertConfirmedRule, getCorrectionProposalMatches } from '../categorization/commandService.js';

const correction = z.object({ transactionId: z.string().min(1), categoryId: z.string().nullable(),
  past: z.boolean(), future: z.boolean(), from: z.string().datetime().optional(), to: z.string().datetime().optional() });
const identifier = z.object({ operationId: z.string().min(8) });

function invalid(err: unknown): never {
  throw new HttpsError('failed-precondition', err instanceof Error ? err.message : 'Categorization failed');
}
async function owner(request: { auth?: { uid: string } }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in');
  const ownerId = await resolveDataOwner(request.auth.uid);
  await requireRole(request.auth.uid, ownerId, ['owner', 'editor']);
  return ownerId;
}

export const previewCategorizationChange = onCall({ region: 'europe-west1', cors: true, timeoutSeconds: 300 }, async (request) => {
  const ownerId = await owner(request);
  const parsed = correction.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);
  try {
    const { from, to, ...input } = parsed.data;
    return await previewCorrection(getFirestore(), ownerId, request.auth!.uid,
      { ...input, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined });
  } catch (err) { invalid(err); }
});

export const applyCategorizationChange = onCall({ region: 'europe-west1', cors: true }, async (request) => {
  const ownerId = await owner(request);
  const parsed = z.object({ proposalId: z.string().min(8), operationId: z.string().min(8) }).safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);
  try { return await applyCorrection(getFirestore(), ownerId, request.auth!.uid, parsed.data.proposalId, parsed.data.operationId); }
  catch (err) { invalid(err); }
});

export const getCategorizationProposalMatches = onCall({ region: 'europe-west1', cors: true }, async (request) => {
  const ownerId = await owner(request);
  const parsed = z.object({ proposalId: z.string(), page: z.number().int().nonnegative() }).safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);
  try { return await getCorrectionProposalMatches(getFirestore(), ownerId, request.auth!.uid, parsed.data.proposalId, parsed.data.page); }
  catch (err) { invalid(err); }
});

export const getCategorizationOperation = onCall({ region: 'europe-west1', cors: true }, async (request) => {
  const ownerId = await owner(request); const parsed = identifier.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);
  try { return await getCorrectionOperation(getFirestore(), ownerId, parsed.data.operationId); }
  catch (err) { invalid(err); }
});

export const listCategorizationReviewQueue = onCall({ region: 'europe-west1', cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in');
  const ownerId = await resolveDataOwner(request.auth.uid);
  await requireRole(request.auth.uid, ownerId, ['owner', 'editor', 'viewer']);
  const parsed = z.object({ cursor: z.string().optional(), pageSize: z.number().int().positive().optional() }).safeParse(request.data ?? {});
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);
  try { return await listCategorizationReview(getFirestore(), ownerId, parsed.data.cursor, parsed.data.pageSize); }
  catch (err) { invalid(err); }
});

export const upsertCategorizationRule = onCall({ region: 'europe-west1', cors: true }, async (request) => {
  const ownerId = await owner(request);
  const parsed = z.object({ id: z.string().optional(), expectedVersion: z.number().int().nonnegative().optional(),
    pattern: z.string(), matchType: z.enum(['exact', 'contains']), targetField: z.enum(['counterparty', 'description', 'combined']),
    categoryId: z.string(), enabled: z.boolean() }).safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);
  try { return await upsertConfirmedRule(getFirestore(), ownerId, request.auth!.uid, parsed.data); }
  catch (err) { invalid(err); }
});

export const undoCategorizationOperation = onCall({ region: 'europe-west1', cors: true, timeoutSeconds: 300 }, async (request) => {
  const ownerId = await owner(request); const parsed = identifier.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);
  try { return await undoCorrection(getFirestore(), ownerId, parsed.data.operationId); }
  catch (err) { invalid(err); }
});

async function enqueue(ownerId: string, operationId: string) {
  await getFunctions().taskQueue('processCategorizationHistory').enqueue({ ownerId, operationId },
    { scheduleDelaySeconds: 1, dispatchDeadlineSeconds: 300 });
}

export const dispatchCategorizationOutbox = onDocumentCreated({
  document: 'users/{ownerId}/categorizationOutbox/{operationId}', region: 'europe-west1',
}, async (event) => {
  await enqueue(event.params.ownerId, event.params.operationId);
  await event.data?.ref.update({ status: 'dispatched' });
});

export const repairCategorizationOutbox = onSchedule({ schedule: 'every 30 minutes', region: 'europe-west1' }, async () => {
  const db = getFirestore();
  const pending = await db.collectionGroup('categorizationOutbox').where('status', 'in', ['pending', 'dispatched']).limit(50).get();
  for (const doc of pending.docs) {
    const operationId = doc.id; const ownerId = doc.ref.parent.parent?.id;
    if (!ownerId) continue;
    const operation = await db.collection('users').doc(ownerId).collection('categorizationOperations').doc(operationId).get();
    if (!operation.exists || ['complete', 'cancelled', 'undone'].includes(operation.data()?.status)) {
      await doc.ref.update({ status: 'settled' });
      continue;
    }
    await enqueue(ownerId, operationId);
    await doc.ref.update({ status: 'dispatched' });
  }
});

export const processCategorizationHistory = onTaskDispatched({ region: 'europe-west1',
  retryConfig: { maxAttempts: 5, minBackoffSeconds: 10 }, rateLimits: { maxConcurrentDispatches: 3 },
}, async (request) => {
  const parsed = z.object({ ownerId: z.string().min(1), operationId: z.string().min(8) }).safeParse(request.data);
  if (!parsed.success) throw new Error('Invalid internal task');
  const more = await processCorrectionChunk(getFirestore(), parsed.data.ownerId, parsed.data.operationId);
  if (more) await enqueue(parsed.data.ownerId, parsed.data.operationId);
});
