// Dev-only script: bumps existing budget caps + marks 2 APR transactions
// as pending reimbursements so the redesigned Home renders an under-budget
// state and the PendingBanner. Talks to the Firestore emulator's REST API
// directly (no admin SDK / no functions/node_modules dependency).
//
// Usage (with emulators running): node scripts/_dev_bump_budgets.mjs

const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'free-lunch-85447';
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const UID = 'test-user-emulator';
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

const AUTH_HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

async function listDocs(coll) {
  const r = await fetch(`${BASE}/users/${UID}/${coll}?pageSize=300`, { headers: AUTH_HEADERS });
  if (!r.ok) throw new Error(`${coll} list ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.documents ?? [];
}

async function patchDoc(name, fields) {
  const updateMask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
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

const NEW_CAPS = {
  'food-groceries': 1200,
  'food-restaurants': 600,
  shopping: 1500,
  subscriptions: 200,
};

async function bumpBudgets() {
  const docs = await listDocs('budgets');
  let n = 0;
  for (const d of docs) {
    const cat = d.fields?.categoryId?.stringValue;
    const cap = NEW_CAPS[cat];
    if (cap === undefined) continue;
    await patchDoc(d.name, {
      monthlyLimit: { doubleValue: cap },
      updatedAt: { timestampValue: new Date().toISOString() },
    });
    n += 1;
    console.log(`  ↑ ${cat} → €${cap}`);
  }

  // Add NEW budgets for the heavy non-budgeted categories so the total cap
  // exceeds typical monthly spend (~€7k seeded), letting Home render the
  // under-budget visual.
  const existingCats = new Set(docs.map((d) => d.fields?.categoryId?.stringValue));
  const NEW_BUDGETS = [
    { name: 'Rent / Mortgage', categoryId: 'housing-rent', monthlyLimit: 3000, alertThreshold: 90 },
    { name: 'Travel', categoryId: 'travel', monthlyLimit: 1500, alertThreshold: 80 },
  ];
  for (const b of NEW_BUDGETS) {
    if (existingCats.has(b.categoryId)) continue;
    const r = await fetch(`${BASE}/users/${UID}/budgets`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        fields: {
          name: { stringValue: b.name },
          categoryId: { stringValue: b.categoryId },
          monthlyLimit: { doubleValue: b.monthlyLimit },
          alertThreshold: { doubleValue: b.alertThreshold },
          isActive: { booleanValue: true },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });
    if (!r.ok) throw new Error(`add budget ${b.categoryId} ${r.status} ${await r.text()}`);
    n += 1;
    console.log(`  + ${b.categoryId} → €${b.monthlyLimit}`);
  }
  console.log(`✓ ${n} budgets touched`);
}

async function injectPendingReimbursements() {
  // Pick 2 expense txns in the current month and tag them as pending work
  // reimbursements so the PendingBanner has data to render.
  const txns = await listDocs('transactions');
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const candidates = txns.filter((d) => {
    const date = d.fields?.date?.timestampValue;
    const amt = d.fields?.amount?.doubleValue ?? d.fields?.amount?.integerValue;
    const reimb = d.fields?.reimbursement;
    return (
      date && new Date(date) >= startOfMonth && Number(amt) < 0 &&
      (reimb == null || reimb?.nullValue !== undefined)
    );
  });
  // Sort by absolute amount asc, pick the smallest 2 so they're realistic
  candidates.sort((a, b) => Math.abs(Number(a.fields.amount?.doubleValue ?? a.fields.amount?.integerValue ?? 0)) - Math.abs(Number(b.fields.amount?.doubleValue ?? b.fields.amount?.integerValue ?? 0)));
  const picked = candidates.slice(0, 2);
  for (const d of picked) {
    await patchDoc(d.name, {
      reimbursement: {
        mapValue: {
          fields: {
            type: { stringValue: 'work' },
            note: { stringValue: 'Reimbursable per dev seed' },
            status: { stringValue: 'pending' },
            linkedTransactionId: { nullValue: null },
            clearedAt: { nullValue: null },
          },
        },
      },
      updatedAt: { timestampValue: new Date().toISOString() },
    });
    console.log(`  ◐ pending: ${d.fields?.description?.stringValue ?? d.name.split('/').pop()}`);
  }
  console.log(`✓ ${picked.length} pending reimbursements`);
}

await bumpBudgets();
await injectPendingReimbursements();
console.log('done');
