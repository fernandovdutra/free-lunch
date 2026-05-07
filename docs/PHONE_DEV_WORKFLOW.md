# Phone dev workflow — develop with Claude, test from iPhone

Work on Free Lunch while away from your desk: chat with Claude on your iPhone,
Claude edits code on the Windows PC, and you load the running app in iPhone
Safari to click through changes. This doc describes the local dev stack Claude
sets up so that works.

## Starting (and resuming) Claude sessions from your phone

The Claude iPhone app can talk to two very different backends and it's
easy to conflate them:

- **Remote Control** — the phone drives a Claude session running on your
  **Windows PC**. Tool calls execute on your desktop, see your worktree,
  your running emulators, everything.
- **Cowork** — the phone talks to an Anthropic cloud sandbox (a Linux
  container somewhere; paths like `/home/user/…`). It has no access to
  your desktop, your LAN, or your local branch.

**Starting a new chat in the iPhone app defaults to Cowork, not Remote
Control.** You cannot get to a Remote Control session by "just starting
a new chat" — the cloud session won't even know your desktop exists.

### The flow to get a Remote Control session (the one we want)

1. At the desktop, open the **Claude desktop app** → new chat (or any
   chat) → type `/remote-control`. That prints a pairing QR / URL and
   parks the session waiting for a phone to attach.
2. On iPhone, open the **Claude mobile app** → Remote Control tab (or
   scan the QR via the desktop's paired-devices screen). The session
   picks up on the phone. Tool calls now execute on the Windows PC.

### To start a **fresh** Remote Control session

There's no phone-only shortcut. You have to re-pair, which means a quick
desktop step:

1. Desktop: new chat in the Claude desktop app → `/remote-control` again.
2. Phone: scan / reconnect. That new pairing = a new session on the PC.

Slash commands are not a substitute: `/clear` from the phone side of
Remote Control returns *"not available in this environment"*. The only
way to wipe context is to pair a new session.

### First message in a new session

> Read `docs/PHONE_DEV_WORKFLOW.md` and `docs/ADVISOR_E2E_TEST_PLAN.md`,
> then run the session-kickoff checklist. I'm on my iPhone, you drive
> the PC.

### Dispatch

Separate option for "fire and forget" tasks — send a dev-flavored
message from the mobile app's Cowork side, it spawns a Desktop Code
session, pings you when done. Pro/Max plans only. Not used for the
interactive test loop.

**Properties:**
- **Zero production impact.** Every write goes to a local Firebase emulator. Prod data is untouched.
- **Free.** No Firebase Blaze tier needed; everything runs on the PC.
- **Realistic data.** ~5 months of NL-flavored seeded data (transactions, goals, investments).
- **Real external APIs.** Anthropic + Resend are called for real from the Functions emulator when you want to test the advisor end-to-end.

## Architecture

```
   iPhone Safari ── Wi-Fi ──► Windows PC LAN IP : 5173
                                     │
                                     ▼
                          Vite dev server  (node.exe)
                                     │
                                     ├─ /identitytoolkit.googleapis.com/*  ─► Auth emulator :9099  (java)
                                     ├─ /emulator/v1, /securetoken/*       ─► Auth emulator :9099
                                     ├─ /v1/projects/*                     ─► Firestore emulator :8080 (java)
                                     ├─ /google.firestore.v1.Firestore/*   ─► Firestore emulator :8080
                                     └─ /<your-project-id>/europe-west1/*   ─► Functions emulator :5001 (node)
                                                       │
                                                       └─► Anthropic API, Resend API (real external)
```

Every emulator port is proxied through the Vite dev server (port 5173) because
Windows Firewall on this machine only allows inbound LAN traffic to `node.exe`;
`java.exe` (which runs the Auth + Firestore emulators) is blocked on the
Private network profile. The proxy also keeps things tidy — the phone only has
to reach one port.

Proxy routes are configured in `vite.config.ts` → `server.proxy`.

## Prerequisites (one-time setup, already completed on this machine)

| Item | Where | Notes |
|---|---|---|
| Portable Temurin JRE 21 | `C:\Users\<you>\.local\opt\jdk-21.0.10+7-jre` | Needed by Firebase emulators for Auth + Firestore |
| Node / npm | System-wide | Used by Vite, Functions emulator, seed script |
| `npm install` in root, `functions/`, `mcp-server/` | | |
| Firebase CLI logged in | `firebase projects:list` should show `<your-project-id>` | |
| `.env.local` at repo root | See template in §Setup | Points the web app at the Vite-proxied emulator URLs |
| `functions/.secret.local` | See template in §Setup | Loaded by the Functions emulator as env vars |
| `scripts/seed-emulator.mjs` | Committed | Seeds the emulator with a test user + realistic data |

The app's normal Firebase-emulator plumbing (`src/lib/firebase.ts`, `firebase.json`)
is already set up to read the emulator URLs from `VITE_EMULATOR_*` env vars
and to bind the emulators to `0.0.0.0`.

## Startup (per session)

Claude runs these automatically when you say something like *"let's test on my phone"* or *"start the phone dev stack"*. You shouldn't need to run anything manually.

```bash
# 1. Export Java onto PATH (the emulators are Java-based)
export JAVA_HOME=/c/Users/$USER/.local/opt/jdk-21.0.10+7-jre
export PATH="$JAVA_HOME/bin:$PATH"

# 2. Boot emulators — imports prior state if any, auto-exports on clean shutdown
firebase emulators:start \
  --only auth,firestore,functions \
  --project <your-project-id> \
  --import=./.emulator-data \
  --export-on-exit=./.emulator-data &

# 3. (One-time per fresh state) seed the emulator
node scripts/seed-emulator.mjs

# 4. Start Vite dev server, bound to 0.0.0.0 via --host
npm run dev -- --host &
```

A helper that runs all of this in one command lives at
[`scripts/start-phone-dev.sh`](../scripts/start-phone-dev.sh).

## Test credentials

```
URL:      http://<PC-LAN-IP>:5173   (currently http://<your-lan-ip>:5173)
Email:    test@freelunch.local
Password: test1234
```

After login, the test user sees:

- 25 categories (subset of the prod default tree)
- ~245 transactions across the last five months (Albert Heijn, Jumbo, KPN, Vattenfall, Netflix, Spotify, ACME BV salary, etc.)
- 4 active budgets (groceries, restaurants, shopping, subscriptions)
- 3 goals (emergency fund, student loan payoff, Japan 2027 trip)
- 3 investments (VWRL ETF, ING pension, Trade Republic savings) with 6 monthly value points each

Everything lives in the Firestore emulator. It persists across emulator restarts as long as the emulator shuts down cleanly (auto-exports to `.emulator-data/`). If the process is killed abruptly (e.g. Claude's session ends and background tasks get reaped) the data vanishes — re-seed next session.

## Setup templates (for bootstrapping on another machine)

### `.env.local` (repo root)
```
VITE_FIREBASE_API_KEY=emulator-dummy-key
VITE_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project-id>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:000000000000000000

VITE_APP_ENV=development
VITE_USE_EMULATORS=true

# Replace the IP with your PC's current LAN IP (see `ipconfig`).
VITE_EMULATOR_AUTH_URL=http://<your-lan-ip>:5173
VITE_EMULATOR_FIRESTORE_HOST=<your-lan-ip>:5173
VITE_EMULATOR_FUNCTIONS_URL=http://<your-lan-ip>:5173
```

### `functions/.secret.local`
```
ANTHROPIC_API_KEY=sk-ant-REPLACE-ME
RESEND_API_KEY=re_REPLACE-ME
AGENT_API_TOKEN=dev-local-token-change-me
SINGLE_USER_ID=<emulator UID — printed by seed script on every run>
```

Only fill in real keys when you want to exercise the advisor Cloud Functions end-to-end. Goals / investments / categories / transactions work without any secrets.

## Customizing the seed

Edit `scripts/seed-emulator.mjs`. Templates are at the top:

- `CATEGORIES` — category tree
- `TX_TEMPLATES` — transaction templates. Each has a `recurring` field:
  - `monthly` — once per month
  - `weekly` — 4 hits per month with jittered amounts
  - `random` — 1–3 hits per month

Re-running the script:
- Is idempotent for the test user (updates password to `test1234`)
- **Is not idempotent for Firestore data** — it appends. Delete `.emulator-data/` first for a clean slate.

### Dev convenience: under-budget Home visuals

The default seed budgets total ~€810 vs ~€7,000 monthly spend, so Home
always renders the over-budget (warn) state. To verify the under-budget
(accent) visuals against the redesigned Home:

```bash
node scripts/_dev_bump_budgets.mjs
```

This bumps the existing budget caps and adds two new ones (housing-rent,
travel) so total ~€11,500 > spend, plus tags two small APR transactions
as pending reimbursements so the Home pending banner renders. Talks to
the Firestore emulator's REST API directly — no functions/node_modules
dependency. Idempotent enough to run multiple times.

## Testing advisor Cloud Functions end-to-end

1. Paste real keys into `functions/.secret.local`.
2. Make sure `SINGLE_USER_ID` matches the current emulator UID (re-seed if unsure).
3. Restart the emulators so the Functions runtime picks up the new secrets.
4. Either:
   - Call the HTTP handler directly: `curl -X POST http://<your-lan-ip>:5173/<your-project-id>/europe-west1/generateOnDemandInsight -H "Authorization: Bearer <idToken>" …`
   - Or use the Emulator UI at `http://localhost:4000` → *Functions* tab → invoke `generateOnDemandInsight` with a fabricated auth context.

Emails sent via Resend land in whatever real inbox you configured in the template. Insight docs land in `users/{uid}/insights/*` in the emulator's Firestore.

## Shutdown / cleanup

On a clean emulator shutdown the data auto-exports to `.emulator-data/`. On a hard kill (session ends, process reaped) it doesn't — you re-seed next session.

Force-kill everything:
```bash
tasklist | grep -E "^(java|node)\.exe" | awk '{print $2}' | xargs -I{} taskkill //PID {} //F
```

Delete persisted data for a clean slate:
```bash
rm -rf .emulator-data
```

## Known gotchas

| Issue | Cause | Fix |
|---|---|---|
| Phone can't reach `:5173` at all | Mesh router client isolation (guest SSID mode) | Put phone + PC on the same non-guest SSID |
| PC LAN IP changed after router restart | DHCP reassigned | `ipconfig` to find new IP, update `.env.local` + anywhere else the IP appears |
| Login fails with network error | Firewall blocks Java emulator ports (default on this machine) | Proxy through Vite is already in place — if it breaks, verify `vite.config.ts` proxy entries still match SDK paths |
| Firestore listeners stop updating mid-session | gRPC streaming through Vite proxy occasionally glitches | Firebase SDK has `experimentalForceLongPolling: true` fallback — add to `getFirestore()` init if you hit this |
| Bank sync / transaction sync doesn't work in dev | Enable Banking OAuth tokens are bound to the prod project's redirect URL | Rely on seeded transactions; bank sync is deploy-only |
| `.emulator-data/` is empty on restart | Previous emulator didn't shut down cleanly | Re-seed (`node scripts/seed-emulator.mjs`) |
| Background processes die between Claude turns | Sessions have limited lifetime; backgrounded tasks get reaped | Just ask Claude to restart the stack; it knows the drill |

## Claude's responsibilities

When you mention anything like *"phone dev"*, *"test on my phone"*, *"start the emulator stack"*, or log in fails because nothing is running, Claude should:

1. Check whether emulators + Vite are already up:
   ```
   curl -s -o /dev/null -m 2 -w "%{http_code}" http://<your-lan-ip>:5173
   curl -s -o /dev/null -m 2 -w "%{http_code}" http://127.0.0.1:9099
   ```
2. If either is down, restart via `scripts/start-phone-dev.sh` or the manual steps above.
3. Check `.emulator-data/auth_export/` — if missing, re-seed.
4. Verify end-to-end with a proxied login curl:
   ```
   curl -s -m 5 -X POST "http://<your-lan-ip>:5173/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@freelunch.local","password":"test1234","returnSecureToken":true}'
   ```
5. Hand back the URL + credentials.

**Firewall rules**: Claude is not permitted to modify Windows Firewall without explicit user authorization. Don't attempt it — the Vite proxy workaround is the correct path.

## Why the Vite-proxy workaround instead of fixing the firewall

Opening the Java emulator ports on the Private profile requires admin. UAC prompts appear on the physical PC, which doesn't help when the user is on iPhone with no way to click "Yes". The proxy accomplishes the same thing (phone reaches the emulators) without touching system security settings.
