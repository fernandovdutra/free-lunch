import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { applyCorrection, previewCorrection, processCorrectionChunk, undoCorrection } from '../commandService.js';
import { migrateCategorizationV2 } from '../../scripts/migrateCategorizationV2.js';

const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const ownerId = `categorization-test-${process.pid}-${Date.now()}`;
const actorId = ownerId;
const app = emulator ? (getApps()[0] ?? initializeApp({ projectId: 'demo-free-lunch-test' })) : null;
const db = app ? getFirestore(app) : null;

async function seed(id: string, data: Record<string, unknown> = {}) {
  await db!.collection('users').doc(ownerId).collection('transactions').doc(id).set({
    description: 'Shop purchase', counterparty: 'Synthetic Shop', categoryId: null,
    categorySource: 'none', date: Timestamp.fromDate(new Date('2026-09-01')),
    amount: -10, isSplit: false, ...data,
  });
}

describe.skipIf(!emulator)('categorization commands against Firestore emulator', () => {
  beforeAll(async () => {
    const categories = db!.collection('users').doc(ownerId).collection('categories');
    await Promise.all(['groceries', 'other'].map((id) => categories.doc(id).set({ name: id, parentId: null })));
  });

  afterAll(async () => {
    if (db) await db.recursiveDelete(db.collection('users').doc(ownerId));
    if (app) await deleteApp(app);
  });

  it('rejects a stale preview and does not create a partial operation', async () => {
    await seed('current-stale');
    const preview = await previewCorrection(db!, ownerId, actorId, {
      transactionId: 'current-stale', categoryId: 'groceries', past: false, future: false,
    });
    await db!.collection('users').doc(ownerId).collection('transactions').doc('current-stale').update({ categoryId: 'other', categorySource: 'manual', counterparty: 'Different Shop' });
    await expect(applyCorrection(db!, ownerId, actorId, preview.proposalId, 'stale-operation-123')).rejects.toThrow('stale');
    expect((await db!.collection('users').doc(ownerId).collection('categorizationOperations').doc('stale-operation-123').get()).exists).toBe(false);
  });

  it('migration dry run changes nothing and applying twice preserves legacy manual choices', async () => {
    const migrationOwner = `${ownerId}-migration`;
    const root = db!.collection('users').doc(migrationOwner);
    await root.collection('categories').doc('other').set({ parentId: null });
    await root.collection('transactions').doc('manual').set({ categoryId: 'other', categorySource: 'manual', amount: -12 });
    await root.collection('transactions').doc('unknown').set({ categoryId: null, categorySource: 'none', amount: -7 });
    const opts = { ownerId: migrationOwner, apply: false, limit: 100 };
    expect((await migrateCategorizationV2(db!, opts)).candidates).toBe(2);
    expect((await root.collection('transactions').doc('manual').get()).data()?.categorization).toBeUndefined();
    await migrateCategorizationV2(db!, { ...opts, apply: true });
    expect((await root.collection('transactions').doc('manual').get()).data()?.categorization).toMatchObject({ origin: 'legacy_manual', override: true });
    expect((await migrateCategorizationV2(db!, { ...opts, apply: true })).candidates).toBe(0);
    expect((await root.collection('transactions').doc('manual').get()).data()?.categoryId).toBe('other');
    await db!.recursiveDelete(root);
  });

  it('snapshots more than 500 rows; retries, manual decisions, split rows and undo are safe', async () => {
    const transactions = db!.collection('users').doc(ownerId).collection('transactions');
    const batch1 = db!.batch();
    const batch2 = db!.batch();
    for (let i = 0; i < 512; i++) {
      const batch = i < 256 ? batch1 : batch2;
      batch.set(transactions.doc(`past-${String(i).padStart(3, '0')}`), {
        description: 'Purchase', counterparty: 'Synthetic Shop', categoryId: 'other',
        categorySource: 'merchant', amount: -10, date: Timestamp.fromDate(new Date('2026-08-01')),
      });
    }
    await batch1.commit(); await batch2.commit();
    await seed('manual', { categoryId: 'other', categorySource: 'manual' });
    await seed('split', { isSplit: true, splits: [{ categoryId: 'other', amount: -10 }] });
    await seed('current-main');

    const preview = await previewCorrection(db!, ownerId, actorId, {
      transactionId: 'current-main', categoryId: 'groceries', past: true, future: true,
    });
    expect(preview.counts.eligible).toBe(512);
    expect(preview.counts.protected).toBe(1);
    expect(preview.counts.splits).toBe(1);

    const first = await applyCorrection(db!, ownerId, actorId, preview.proposalId, 'operation-main-123');
    await db!.collection('users').doc(ownerId).collection('categorizationProposals').doc(preview.proposalId)
      .update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    const second = await applyCorrection(db!, ownerId, actorId, preview.proposalId, 'operation-main-123');
    expect(second.id).toBe(first.id);
    const rule = (await db!.collection('users').doc(ownerId).collection('rules').get()).docs.find((d) => d.data().confirmed);
    expect(rule?.data().targetField).toBe('counterparty');

    // A correction after preview must survive the historical worker.
    await transactions.doc('past-000').update({ categoryId: 'other', categorySource: 'manual' });
    let more = true, pages = 0;
    while (more) { more = await processCorrectionChunk(db!, ownerId, 'operation-main-123'); pages++; }
    expect(pages).toBe(9);
    const operation = await db!.collection('users').doc(ownerId).collection('categorizationOperations').doc('operation-main-123').get();
    expect(operation.data()?.updated).toBe(511);
    expect(operation.data()?.skipped).toBe(1);
    expect((await transactions.doc('manual').get()).data()?.categoryId).toBe('other');
    expect((await transactions.doc('split').get()).data()?.categoryId).toBe(null);

    await transactions.doc('past-001').update({ categoryId: 'other', categorySource: 'manual',
      categorization: { schemaVersion: 2, decisionVersion: 2, origin: 'user_override', override: true } });
    const undo = await undoCorrection(db!, ownerId, 'operation-main-123');
    expect(undo.conflicts).toBeGreaterThanOrEqual(1);
    expect((await transactions.doc('past-001').get()).data()?.categoryId).toBe('other');
    expect((await transactions.doc('past-002').get()).data()?.categoryId).toBe('other');
    expect((await transactions.doc('current-main').get()).data()?.categoryId).toBe(null);
    expect((await rule!.ref.get()).data()?.enabled).toBe(false);
  }, 180_000);
});
