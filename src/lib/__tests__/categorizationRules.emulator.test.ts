import { afterAll, beforeAll, describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
let env: RulesTestEnvironment;
const projectId = `demo-rules-test-${process.pid}`;

describe.skipIf(!enabled)('categorization Firestore role and provenance rules', () => {
  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    env = await initializeTestEnvironment({ projectId, firestore: {
      host, port: Number(port), rules: readFileSync('firebase/firestore.rules', 'utf8'),
    } });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'owner'), { members: { editor: 'editor', viewer: 'viewer' } });
      await setDoc(doc(ctx.firestore(), 'users', 'owner', 'transactions', 'tx'), { categoryId: null, categorySource: 'none', note: '' });
      await setDoc(doc(ctx.firestore(), 'users', 'owner', 'rules', 'rule'), { categoryId: 'pets', pattern: 'PET' });
      await setDoc(doc(ctx.firestore(), 'users', 'owner', 'categorizationOperations', 'op'), { status: 'pending' });
    });
  });
  afterAll(async () => { await env.cleanup(); });

  it('permits editor notes but rejects client-authored decisions, operations and confirmed rules', async () => {
    const editor = env.authenticatedContext('editor').firestore();
    await assertSucceeds(updateDoc(doc(editor, 'users', 'owner', 'transactions', 'tx'), { note: 'reviewed' }));
    await assertFails(updateDoc(doc(editor, 'users', 'owner', 'transactions', 'tx'), { categorization: { override: true } }));
    await assertFails(setDoc(doc(editor, 'users', 'owner', 'categorizationOperations', 'invented'), { status: 'complete' }));
    await assertFails(updateDoc(doc(editor, 'users', 'owner', 'rules', 'rule'), { confirmed: true }));
    await assertSucceeds(getDoc(doc(editor, 'users', 'owner', 'categorizationOperations', 'op')));
  });

  it('rejects viewer writes and prevents deleting a confirmed rule', async () => {
    const viewer = env.authenticatedContext('viewer').firestore();
    await assertFails(updateDoc(doc(viewer, 'users', 'owner', 'transactions', 'tx'), { note: 'changed' }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'users', 'owner', 'rules', 'rule'), { confirmed: true });
    });
    const editor = env.authenticatedContext('editor').firestore();
    await assertFails(deleteDoc(doc(editor, 'users', 'owner', 'rules', 'rule')));
  });
});
