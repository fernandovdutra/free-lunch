/** Safe, resumable additive legacy conversion. Dry run is the default.
 * Usage: node lib/scripts/migrateCategorizationV2.js --owner <uid> [--apply]
 *        [--after <last-id>] [--limit <count>] [--manifest <local-file>]
 * Never pass a production owner without an approved backup and impact review.
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';

interface Options { ownerId: string; apply: boolean; after?: string; limit: number; manifest?: string }
function options(argv: string[]): Options {
  const flag = (name: string) => argv.includes(name);
  const value = (name: string) => argv[argv.indexOf(name) + 1];
  const ownerId = flag('--owner') ? value('--owner') : '';
  if (!ownerId || ownerId.startsWith('--') || ownerId.includes('/')) throw new Error('Provide --owner <uid>');
  const limit = flag('--limit') ? Number(value('--limit')) : 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('Limit must be 1–1000');
  return { ownerId, apply: flag('--apply'), after: flag('--after') ? value('--after') : undefined,
    limit, manifest: flag('--manifest') ? value('--manifest') : undefined };
}

export async function migrateCategorizationV2(db: FirebaseFirestore.Firestore, input: Options) {
  const user = db.collection('users').doc(input.ownerId);
  const categories = await user.collection('categories').get();
  const valid = new Set(categories.docs.filter((d) => !d.data().archived && d.data().status !== 'retiring').map((d) => d.id));
  const ref = user.collection('transactions');
  let cursor = input.after, scanned = 0, changed = 0;
  const manifest: Array<{ id: string; action: string; oldCategoryId: string | null }> = [];
  while (scanned < input.limit) {
    const page = await (cursor ? ref.orderBy('__name__').startAfter(cursor) : ref.orderBy('__name__'))
      .limit(Math.min(100, input.limit - scanned)).get();
    if (page.empty) break;
    for (const doc of page.docs) {
      cursor = doc.id; scanned++;
      const data = doc.data();
      if (data.categorization?.schemaVersion === 2) continue;
      const oldCategoryId = typeof data.categoryId === 'string' ? data.categoryId : null;
      const assigned = !!oldCategoryId && oldCategoryId !== 'uncategorized' && oldCategoryId !== 'none';
      const invalid = assigned && !valid.has(oldCategoryId);
      const manual = data.categorySource === 'manual';
      const state = invalid ? 'unresolved' : assigned ? 'assigned' : 'unresolved';
      const origin = manual ? 'legacy_manual' : data.categorySource === 'rule' ? 'legacy_rule' :
        assigned ? 'legacy_auto' : 'legacy_unknown';
      manifest.push({ id: doc.id, action: invalid ? 'missing_category_review' : manual ? 'protected_manual' : 'metadata_only', oldCategoryId });
      changed++;
      if (input.apply) {
        // Single-document transaction avoids overwriting a user correction
        // between this scan and the write. No amount, split, note or category
        // is changed; a second run sees schemaVersion 2 and does nothing.
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(doc.ref);
          if (!fresh.exists || fresh.updateTime?.toMillis() !== doc.updateTime.toMillis() ||
              fresh.data()?.categorization?.schemaVersion === 2) return;
          tx.update(doc.ref, { categorization: { schemaVersion: 2, decisionVersion: 1,
            state, origin, override: manual, legacyCategoryId: invalid ? oldCategoryId : null,
            migratedAt: FieldValue.serverTimestamp() } });
        });
      }
    }
    if (page.size < Math.min(100, input.limit - scanned + page.size)) break;
  }
  const summary = { dryRun: !input.apply, ownerId: input.ownerId, scanned, candidates: changed,
    nextCursor: cursor ?? null, entries: manifest };
  if (input.manifest) writeFileSync(input.manifest, JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1]?.endsWith('migrateCategorizationV2.js')) {
  try {
    if (!getApps().length) initializeApp();
    migrateCategorizationV2(getFirestore(), options(process.argv.slice(2)))
      .then((result) => { process.stdout.write(JSON.stringify(result) + '\n'); })
      .catch((err: unknown) => { process.stderr.write(String(err) + '\n'); process.exitCode = 1; });
  } catch (err) { process.stderr.write(String(err) + '\n'); process.exitCode = 1; }
}
