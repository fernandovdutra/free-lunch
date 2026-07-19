# Testing Free Lunch

How this project is tested without ever touching production, and what
"verified" means before a PR is opened. Companion doc:
[PHONE_DEV_WORKFLOW.md](./PHONE_DEV_WORKFLOW.md) covers the same emulator
stack running on the Windows PC for manual testing from an iPhone.

## The three layers

| Layer | Command | What it covers |
|---|---|---|
| Unit (frontend) | `npm run test -- --run` | categorization, lib utilities, hooks |
| Unit (functions) | same runner, `functions/src/**/__tests__` | aggregations, MCP tools, handlers |
| E2E | `npm run e2e` | real browser against the emulator stack |

All writes in every layer go to local Firebase **emulators** (Auth,
Firestore, Functions). Production is never touched — bank sync is the only
deploy-only feature (Enable Banking OAuth is bound to the prod redirect URL).

## E2E: how the stack fits together

```
Playwright (chromium)
   └─► Vite dev server :5173  (VITE_USE_EMULATORS=true)
          ├─► Auth emulator      :9099
          ├─► Firestore emulator :8080
          └─► Functions emulator :5001  (real compiled Cloud Functions)
```

- `e2e/fixtures/auth.ts` logs in as the seeded user
  (`test@freelunch.local` / `test1234`, pinned UID `test-user-emulator`).
- `e2e/fixtures/emulator.ts` talks to the emulators' REST APIs directly
  (`Bearer owner` is the emulator admin token) to stage deterministic test
  data — e.g. the reimbursement scenario — idempotently on every run, and
  to call `getBudgetProgress` on the Functions emulator for numeric
  assertions against the real backend code.
- Specs that drive the bottom-sheet UI pin an iPhone viewport (390×844):
  the app is mobile-first and that is the stable, production-representative
  way to interact with the sheets.

### Bootstrapping (fresh machine or cloud sandbox)

```bash
npm ci && (cd functions && npm ci)
npm install --no-save firebase-tools     # if the firebase CLI isn't present
(cd functions && npm run build)          # Functions emulator loads lib/

# .env.local — the demo- prefix keeps the Firebase CLI fully offline
cat > .env.local <<'ENV'
VITE_FIREBASE_API_KEY=emulator-dummy-key
VITE_FIREBASE_AUTH_DOMAIN=demo-freelunch.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-freelunch
VITE_FIREBASE_STORAGE_BUCKET=demo-freelunch.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:000000000000000000
VITE_APP_ENV=development
VITE_USE_EMULATORS=true
ENV

npx firebase emulators:start --only auth,firestore,functions --project demo-freelunch &
FIREBASE_PROJECT_ID=demo-freelunch node scripts/seed-emulator.mjs

npm run e2e        # Playwright starts the Vite dev server itself
```

Sandbox specifics (Claude Code on the web / remote containers):

- A Chromium is pre-installed whose build may not match the pinned
  Playwright version. Point the config's escape hatch at it instead of
  downloading: `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run e2e`.
- The container is resource-constrained; `--workers=2` keeps runs stable.
- Emulator state is in-memory — after a container restart, re-run the seed.

### Seeded data

`scripts/seed-emulator.mjs` creates the test user plus ~250 NL-flavored
transactions over five months, budgets, goals and investments. It appends
on re-run (delete emulator state for a clean slate). E2E specs must NOT
depend on specific seeded amounts — they stage their own documents with
`e2e-`-prefixed IDs and unique merchant names via `fixtures/emulator.ts`.

The transactions list is virtualized: rows outside the viewport are not in
the DOM. Specs locate staged rows through the search box, not by scrolling.

## Verification policy — Claude runs the tests, you press approve

Claude (or any agent) making changes here must verify them before opening
or updating a PR, so that reviewing the PR is the only human step:

1. `npm run typecheck` and `npm run lint` clean on touched files.
2. `npm run test -- --run` — unit suites green (the known exception:
   `useCategories.test.ts` requires Firebase env config and fails at import
   time without it; unrelated failures must not hide behind it).
3. For anything touching UI or Cloud Functions: boot the emulator stack,
   seed it, and run `npm run e2e` — or at minimum the specs covering the
   changed flows — plus drive the changed flow once in the browser
   (screenshots in the PR are appreciated).
4. The PR description states exactly what was run and what passed. A PR
   whose behavior claims aren't backed by a test run isn't ready for review.

New user-visible flows should land together with an E2E spec covering
them, and fixes to data semantics (e.g. what counts as "spent") with a
unit test pinning the new behavior.
