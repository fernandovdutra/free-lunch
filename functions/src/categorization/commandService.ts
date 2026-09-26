import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { isAssignableCategory } from './categoryRegistry.js';

/** The app and MCP use these commands after resolving the authenticated owner. */
export interface CorrectionRequest {
  transactionId: string;
  categoryId: string | null;
  past: boolean;
  future: boolean;
  from?: Date;
  to?: Date;
}

type Candidate = { id: string; version: number; updateMillis: number; categoryId: string | null;
  description: string; amount: number; date: string | null };
const CHUNK_SIZE = 60;
const EXPIRY_MS = 15 * 60_000;

function root(db: Firestore, ownerId: string) { return db.collection('users').doc(ownerId); }
function normalized(value: unknown): string { return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase() : ''; }
function protectedDecision(data: FirebaseFirestore.DocumentData): boolean {
  return data.isSplit === true || (data.splits?.length ?? 0) > 0 ||
    data.categorization?.override === true || data.categorySource === 'manual' ||
    data.categorization?.state === 'intentionally_uncategorized' ||
    data.isTransfer === true || data.isExcluded === true || data.excludeFromTotals === true ||
    (typeof data.categoryId === 'string' && data.categoryId.startsWith('transfer'));
}
function validCurrent(data: FirebaseFirestore.DocumentData): boolean {
  return !data.isSplit && !(data.splits?.length > 0) && !data.isTransfer &&
    !(typeof data.categoryId === 'string' && data.categoryId.startsWith('transfer'));
}
function categorization(categoryId: string | null, origin: string, version: number, operationId: string, ruleId?: string, ruleVersion?: number) {
  return {
    categoryId, categorySource: origin === 'user_override' ? 'manual' : 'rule',
    categoryConfidence: categoryId ? 1 : 0,
    categorization: {
      schemaVersion: 2, decisionVersion: version,
      state: categoryId ? 'assigned' : 'intentionally_uncategorized',
      origin, override: origin === 'user_override', operationId,
      ...(ruleId ? { ruleId, ruleVersion } : {}),
      decidedAt: Timestamp.now(),
    },
    categorizationStatus: FieldValue.delete(), categorizationError: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function assertCategory(db: Firestore, ownerId: string, categoryId: string | null) {
  if (categoryId === null) return;
  const snap = await root(db, ownerId).collection('categories').get();
  if (!isAssignableCategory(categoryId, snap.docs.map((d) => ({ id: d.id, parentId: d.data().parentId ?? null, archived: d.data().archived, status: d.data().status })))) {
    throw new Error('Category is missing, archived, or not a leaf');
  }
}

export async function previewCorrection(db: Firestore, ownerId: string, actorId: string, input: CorrectionRequest) {
  if (!input.transactionId || input.transactionId.includes('/')) throw new Error('Invalid transaction ID');
  if (input.future && input.categoryId === null) throw new Error('An uncategorized future rule is not supported');
  await assertCategory(db, ownerId, input.categoryId);
  const owner = root(db, ownerId);
  const current = await owner.collection('transactions').doc(input.transactionId).get();
  if (!current.exists || !validCurrent(current.data()!)) throw new Error('Transaction missing or split/structural');
  const merchant = normalized(current.data()!.counterparty);
  if ((input.past || input.future) && !merchant) throw new Error('Merchant counterparty required');

  const candidates: Candidate[] = [];
  const counts = { eligible: 0, alreadyCorrect: 0, protected: 0, splits: 0, ambiguous: 0 };
  if (input.past) {
    let query = owner.collection('transactions').where('counterparty', '==', current.data()!.counterparty).orderBy('__name__');
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
      const page = await (cursor ? query.startAfter(cursor) : query).limit(200).get();
      for (const doc of page.docs) {
        if (doc.id === input.transactionId) continue;
        const data = doc.data();
        if (input.from && data.date?.toDate?.() < input.from) continue;
        if (input.to && data.date?.toDate?.() > input.to) continue;
        if (normalized(data.counterparty) !== merchant) { counts.ambiguous++; continue; }
        if (data.isSplit || data.splits?.length) { counts.splits++; continue; }
        if (protectedDecision(data)) { counts.protected++; continue; }
        if ((data.categoryId ?? null) === input.categoryId) { counts.alreadyCorrect++; continue; }
        counts.eligible++;
        candidates.push({ id: doc.id, version: data.categorization?.decisionVersion ?? 0,
          updateMillis: doc.updateTime.toMillis(), categoryId: data.categoryId ?? null,
          description: data.description ?? '', amount: data.amount ?? 0,
          date: data.date?.toDate?.()?.toISOString?.() ?? null });
      }
      if (page.size < 200) break;
      cursor = page.docs[page.docs.length - 1];
    }
  }
  const proposal = owner.collection('categorizationProposals').doc();
  const ruleRef = owner.collection('rules').doc(`merchant-${encodeURIComponent(merchant).replace(/%/g, '_')}`);
  const rule = input.future ? await ruleRef.get() : null;
  let batch = db.batch();
  batch.create(proposal, {
    actorId, transactionId: input.transactionId, categoryId: input.categoryId, past: input.past,
    future: input.future, merchant, rawCounterparty: current.data()!.counterparty ?? null,
    currentVersion: current.data()!.categorization?.decisionVersion ?? 0,
    currentUpdateMillis: current.updateTime!.toMillis(),
    ruleId: input.future ? ruleRef.id : null, ruleVersion: rule?.data()?.version ?? 0,
    counts, chunkCount: Math.ceil(candidates.length / CHUNK_SIZE), state: 'preparing',
    createdAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + EXPIRY_MS),
  });
  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    batch.create(proposal.collection('chunks').doc(String(i / CHUNK_SIZE).padStart(6, '0')), { entries: candidates.slice(i, i + CHUNK_SIZE) });
    // Firestore batches cap at 500; flush long histories without publishing a
    // ready proposal until all chunks have landed.
    if ((i / CHUNK_SIZE + 1) % 300 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (candidates.length === 0 || Math.ceil(candidates.length / CHUNK_SIZE) % 300 !== 0) await batch.commit();
  await proposal.update({ state: 'ready' });
  return { proposalId: proposal.id, counts, chunkCount: Math.ceil(candidates.length / CHUNK_SIZE), currentCategoryId: current.data()!.categoryId ?? null,
    merchant: current.data()!.counterparty ?? null, expiresAt: Date.now() + EXPIRY_MS };
}

export async function getCorrectionProposalMatches(db: Firestore, ownerId: string, actorId: string, proposalId: string, page: number) {
  if (!/^[\w-]{8,128}$/.test(proposalId) || !Number.isSafeInteger(page) || page < 0) throw new Error('Invalid proposal/page');
  const ref = root(db, ownerId).collection('categorizationProposals').doc(proposalId);
  const proposal = await ref.get();
  if (!proposal.exists || proposal.data()!.actorId !== actorId || proposal.data()!.state !== 'ready') throw new Error('Proposal unavailable');
  const chunk = await ref.collection('chunks').doc(String(page).padStart(6, '0')).get();
  return { page, chunkCount: proposal.data()!.chunkCount, entries: (chunk.data()?.entries ?? []).map((entry: Candidate) => ({
    id: entry.id, date: entry.date, description: entry.description, amount: entry.amount, categoryId: entry.categoryId,
  })) };
}

export async function applyCorrection(db: Firestore, ownerId: string, actorId: string, proposalId: string, operationId: string) {
  if (!/^[\w-]{8,128}$/.test(operationId) || !/^[\w-]{8,128}$/.test(proposalId)) throw new Error('Invalid operation or proposal ID');
  const owner = root(db, ownerId);
  const proposalRef = owner.collection('categorizationProposals').doc(proposalId);
  const operationRef = owner.collection('categorizationOperations').doc(operationId);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(operationRef);
    if (existing.exists) {
      if (existing.data()!.proposalId !== proposalId || existing.data()!.actorId !== actorId) throw new Error('Operation ID reused with different request');
      return;
    }
    const p = await tx.get(proposalRef);
    if (!p.exists || p.data()!.state !== 'ready' || p.data()!.actorId !== actorId || p.data()!.expiresAt.toMillis() < Date.now()) throw new Error('Proposal missing, expired or unauthorized');
    const input = p.data()!;
    const currentRef = owner.collection('transactions').doc(input.transactionId);
    const ruleRef = input.future ? owner.collection('rules').doc(input.ruleId) : null;
    const [current, rule, category, children] = await Promise.all([
      tx.get(currentRef), ruleRef ? tx.get(ruleRef) : Promise.resolve(null),
      input.categoryId ? tx.get(owner.collection('categories').doc(input.categoryId)) : Promise.resolve(null),
      input.categoryId ? tx.get(owner.collection('categories').where('parentId', '==', input.categoryId)) : Promise.resolve(null),
    ]);
    if (!current.exists || !validCurrent(current.data()!) || current.updateTime!.toMillis() !== input.currentUpdateMillis ||
        (current.data()!.categorization?.decisionVersion ?? 0) !== input.currentVersion ||
        (rule?.data()?.version ?? 0) !== input.ruleVersion) throw new Error('Preview is stale; review the changed transaction or rule');
    if (input.categoryId && (!category?.exists || category.data()?.archived || ['retiring', 'archived'].includes(category.data()?.status) ||
      children?.docs.some((child) => !child.data().archived && child.data().status !== 'archived'))) throw new Error('Category changed since preview');
    tx.create(operationRef, { proposalId, actorId, status: input.past && input.chunkCount ? 'pending' : 'complete',
      generation: 1, cursor: 0, processed: 0, updated: 0, skipped: 0, conflicts: 0,
      total: input.counts.eligible, ruleId: input.future ? input.ruleId : null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.create(operationRef.collection('audit').doc(input.transactionId), {
      transactionId: input.transactionId, before: { categoryId: current.data()!.categoryId ?? null,
        categorySource: current.data()!.categorySource ?? null, categorization: current.data()!.categorization ?? null },
      expectedVersion: input.currentVersion + 1, createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(currentRef, categorization(input.categoryId, 'user_override', input.currentVersion + 1, operationId));
    if (ruleRef) tx.set(ruleRef, { pattern: input.rawCounterparty, matchType: 'exact', targetField: 'counterparty',
      categoryId: input.categoryId, priority: Date.now(), isLearned: true, confirmed: true,
      enabled: true, isSystem: false, version: input.ruleVersion + 1,
      origin: 'user_confirmation', operationId, updatedAt: FieldValue.serverTimestamp(),
      ...(rule?.exists ? {} : { createdAt: FieldValue.serverTimestamp() }) }, { merge: true });
    if (input.past && input.chunkCount) tx.create(owner.collection('categorizationOutbox').doc(operationId), {
      operationId, generation: 1, status: 'pending', createdAt: FieldValue.serverTimestamp() });
  });
  return getCorrectionOperation(db, ownerId, operationId);
}

export async function getCorrectionOperation(db: Firestore, ownerId: string, operationId: string) {
  const snap = await root(db, ownerId).collection('categorizationOperations').doc(operationId).get();
  if (!snap.exists) throw new Error('Operation not found');
  return { id: snap.id, ...snap.data() };
}

export async function listCategorizationReview(db: Firestore, ownerId: string, cursor?: string, requestedPageSize = 200) {
  const pageSize = Math.min(500, Math.max(1, Math.floor(requestedPageSize)));
  if (cursor && !/^[\w-]{1,200}$/.test(cursor)) throw new Error('Invalid cursor');
  const ref = root(db, ownerId).collection('transactions');
  const page = await (cursor ? ref.orderBy('__name__').startAfter(cursor) : ref.orderBy('__name__')).limit(pageSize).get();
  const unresolved = page.docs.filter((d) => {
    const data = d.data();
    return (!data.categoryId || data.categoryId === 'uncategorized' || data.categoryId === 'none') &&
      data.categorization?.state !== 'intentionally_uncategorized' && data.categorySource !== 'manual' &&
      !protectedDecision(data);
  }).map((d) => ({ id: d.id, merchant: d.data().counterparty ?? null,
    description: d.data().description, amount: d.data().amount,
    date: d.data().date?.toDate?.()?.toISOString?.() ?? null }));
  return { unresolved, scanned: page.size,
    nextCursor: page.size === pageSize ? page.docs[page.docs.length - 1].id : null,
    complete: page.size < pageSize };
}

export async function upsertConfirmedRule(db: Firestore, ownerId: string, actorId: string, input: {
  id?: string; expectedVersion?: number; pattern: string; matchType: 'exact' | 'contains';
  targetField: 'counterparty' | 'description' | 'combined'; categoryId: string; enabled: boolean;
}) {
  const pattern = input.pattern.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!pattern || pattern.length > 160 || (input.id && !/^[\w-]{1,200}$/.test(input.id))) throw new Error('Invalid rule');
  await assertCategory(db, ownerId, input.categoryId);
  const ref = input.id ? root(db, ownerId).collection('rules').doc(input.id) : root(db, ownerId).collection('rules').doc();
  await db.runTransaction(async (tx) => {
    const old = await tx.get(ref);
    if ((old.data()?.version ?? 0) !== (input.expectedVersion ?? 0)) throw new Error('Rule changed; refresh before saving');
    const fields = { pattern, matchType: input.matchType, targetField: input.targetField,
      categoryId: input.categoryId, enabled: input.enabled, confirmed: true,
      version: (input.expectedVersion ?? 0) + 1, isLearned: false, isSystem: false,
      origin: 'user_confirmation', actorId, priority: Date.now(), updatedAt: FieldValue.serverTimestamp() };
    if (old.exists) tx.update(ref, fields);
    else tx.create(ref, { ...fields, createdAt: FieldValue.serverTimestamp() });
  });
  return { id: ref.id, version: (input.expectedVersion ?? 0) + 1 };
}

/** Idempotent, restartable chunk; each row is checked and audited in one transaction. */
export async function processCorrectionChunk(db: Firestore, ownerId: string, operationId: string): Promise<boolean> {
  const owner = root(db, ownerId);
  const opRef = owner.collection('categorizationOperations').doc(operationId);
  const op = await opRef.get();
  if (!op.exists || op.data()!.status === 'cancelled' || op.data()!.status === 'complete' || op.data()!.status === 'undone') return false;
  const proposal = await owner.collection('categorizationProposals').doc(op.data()!.proposalId).get();
  const chunk = await proposal.ref.collection('chunks').doc(String(op.data()!.cursor).padStart(6, '0')).get();
  if (!chunk.exists) return false;
  for (const candidate of chunk.data()!.entries as Candidate[]) {
    const ref = owner.collection('transactions').doc(candidate.id);
    await db.runTransaction(async (tx) => {
      const ruleRef = proposal.data()!.ruleId ? owner.collection('rules').doc(proposal.data()!.ruleId) : null;
      const catRef = proposal.data()!.categoryId ? owner.collection('categories').doc(proposal.data()!.categoryId) : null;
      const [freshOp, snap, audit, rule, category] = await Promise.all([tx.get(opRef), tx.get(ref), tx.get(opRef.collection('audit').doc(candidate.id)),
        ruleRef ? tx.get(ruleRef) : Promise.resolve(null), catRef ? tx.get(catRef) : Promise.resolve(null)]);
      if (freshOp.data()?.status === 'cancelled' || freshOp.data()?.status === 'undone' || audit.exists) return;
      const data = snap.data();
      const unchanged = !!data && snap.updateTime!.toMillis() === candidate.updateMillis &&
        (data.categorization?.decisionVersion ?? 0) === candidate.version &&
        !protectedDecision(data) && normalized(data.counterparty) === proposal.data()!.merchant &&
        (!ruleRef || (rule?.data()?.version === proposal.data()!.ruleVersion + 1 && rule?.data()?.enabled === true)) &&
        (!catRef || (!!category?.exists && !category.data()?.archived && !['retiring', 'archived'].includes(category.data()?.status)));
      if (!unchanged) { tx.update(opRef, { skipped: FieldValue.increment(1), processed: FieldValue.increment(1) }); return; }
      tx.create(opRef.collection('audit').doc(candidate.id), { transactionId: candidate.id,
        before: { categoryId: candidate.categoryId, categorySource: data!.categorySource ?? null,
          categorization: data!.categorization ?? null }, expectedVersion: candidate.version + 1,
        createdAt: FieldValue.serverTimestamp() });
      tx.update(ref, categorization(proposal.data()!.categoryId,
        proposal.data()!.ruleId ? 'confirmed_rule' : 'user_bulk', candidate.version + 1,
        operationId, proposal.data()!.ruleId ?? undefined,
        proposal.data()!.ruleId ? proposal.data()!.ruleVersion + 1 : undefined));
      tx.update(opRef, { updated: FieldValue.increment(1), processed: FieldValue.increment(1) });
    });
  }
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(opRef);
    if (fresh.data()?.cursor !== op.data()!.cursor || fresh.data()?.status === 'cancelled') return;
    const next = op.data()!.cursor + 1;
    tx.update(opRef, { cursor: next, status: next >= proposal.data()!.chunkCount ? 'complete' : 'pending', updatedAt: FieldValue.serverTimestamp() });
  });
  return op.data()!.cursor + 1 < proposal.data()!.chunkCount;
}

export async function undoCorrection(db: Firestore, ownerId: string, operationId: string) {
  const owner = root(db, ownerId); const opRef = owner.collection('categorizationOperations').doc(operationId);
  await db.runTransaction(async (tx) => {
    const op = await tx.get(opRef);
    if (!op.exists) throw new Error('Operation not found');
    if (op.data()!.createdAt.toMillis() < Date.now() - 90 * 86400_000) throw new Error('Undo window expired');
    tx.update(opRef, { status: 'cancelled', generation: FieldValue.increment(1) });
  });
  let restored = 0, conflicts = 0, cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  while (true) {
    const page = await (cursor ? opRef.collection('audit').orderBy('__name__').startAfter(cursor) : opRef.collection('audit').orderBy('__name__')).limit(100).get();
    for (const audit of page.docs) {
      const ref = owner.collection('transactions').doc(audit.id);
      const wasRestored = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref); const data = snap.data();
        if (!data || data.categorization?.operationId !== operationId || data.categorization?.decisionVersion !== audit.data().expectedVersion) return false;
        const before = audit.data().before;
        tx.update(ref, { categoryId: before.categoryId, categorySource: before.categorySource,
          categoryConfidence: before.categoryId ? 1 : 0,
          categorization: before.categorization ?? FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
        return true;
      });
      if (wasRestored) restored++; else conflicts++;
    }
    if (page.size < 100) break;
    cursor = page.docs[page.docs.length - 1];
  }
  const op = await opRef.get();
  if (op.data()?.ruleId) {
    const proposal = await owner.collection('categorizationProposals').doc(op.data()!.proposalId).get();
    const ruleRef = owner.collection('rules').doc(op.data()!.ruleId);
    await db.runTransaction(async (tx) => {
      const rule = await tx.get(ruleRef);
      if (rule.data()?.operationId === operationId && rule.data()?.version === proposal.data()?.ruleVersion + 1) tx.update(ruleRef, { enabled: false, version: FieldValue.increment(1) });
      else conflicts++;
    });
  }
  await opRef.update({ status: 'undone', restored, undoConflicts: conflicts, updatedAt: FieldValue.serverTimestamp() });
  return { restored, conflicts };
}
