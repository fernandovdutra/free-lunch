// Dev-only script: marks ~5 random transactions as uncategorized so the
// `! UNCAT` filter pill on the redesigned Transactions page has something
// to show. Talks to the Firestore emulator's REST API directly (no admin
// SDK / no functions/node_modules dependency).
//
// Usage (with emulators running): node scripts/_dev_uncategorize_some.mjs

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'free-lunch-85447';
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const UID = 'test-user-emulator';
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH_HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

const TARGET_COUNT = 5;

async function listDocs(coll) {
  const docs = [];
  let pageToken;
  while (true) {
    const url = `${BASE}/users/${UID}/${coll}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const r = await fetch(url, { headers: AUTH_HEADERS });
    if (!r.ok) throw new Error(`${coll} list ${r.status} ${await r.text()}`);
    const j = await r.json();
    docs.push(...(j.documents ?? []));
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  return docs;
}

async function patchDoc(name, fields, deletes = []) {
  const fieldPaths = [...Object.keys(fields), ...deletes];
  const updateMask = fieldPaths.map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const r = await fetch(
    `http://${HOST}/v1/${name}?${updateMask}&currentDocument.exists=true`,
    {
      method: 'PATCH',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ fields }),
    }
  );
  if (!r.ok) throw new Error(`patch ${name} ${r.status} ${await r.text()}`);
}

async function main() {
  const txns = await listDocs('transactions');

  // Pick a deterministic subset for repeatability: every Nth recent
  // expense-ish transaction.
  const candidates = txns
    .filter((d) => {
      const f = d.fields ?? {};
      const amount = f.amount?.doubleValue ?? f.amount?.integerValue ?? 0;
      const hasCat = !!f.categoryId?.stringValue;
      return hasCat && Number(amount) < 0;
    })
    .sort((a, b) => {
      // Sort by date desc — date stored as Timestamp string
      const da = a.fields?.date?.timestampValue ?? '';
      const db = b.fields?.date?.timestampValue ?? '';
      return db.localeCompare(da);
    });

  const stride = Math.max(1, Math.floor(candidates.length / TARGET_COUNT));
  const picks = [];
  for (let i = 0; i < candidates.length && picks.length < TARGET_COUNT; i += stride) {
    picks.push(candidates[i]);
  }

  console.log(`Uncategorizing ${picks.length} of ${candidates.length} candidate transactions…`);
  for (const d of picks) {
    const counterparty = d.fields?.counterparty?.stringValue ?? '(no counterparty)';
    const amount = d.fields?.amount?.doubleValue ?? d.fields?.amount?.integerValue ?? '?';
    console.log(`  · ${counterparty} (€${amount})`);
    await patchDoc(d.name, {
      categoryId: { nullValue: null },
      categorySource: { stringValue: 'none' },
      categoryConfidence: { doubleValue: 0 },
    });
  }
  console.log('Done. Reload the Transactions page and tap the `! UNCAT` filter pill.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
