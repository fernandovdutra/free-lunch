# Free Lunch — Repository Assessment & Roadmap

**Date:** July 2026 · **Assessed at commit:** `a75792a` · **Scope:** full repo (frontend `src/`, backend `functions/src/`, Firestore rules, docs, tests, tooling)

This is a report-only assessment: nothing in the codebase was changed. It covers (1) bugs found, (2) architectural improvements and cleanup candidates, and (3) a prioritized roadmap. File/line references are as of the commit above. High-severity findings were verified directly against the source; the rest come from a systematic review of every subsystem.

## Snapshot

Free Lunch has grown well past its PRD: alongside the core MVP (bank sync via Enable Banking, 3-tier auto-categorization, budgets, reimbursements, ICS credit-card import, spending explorer, export) it now ships wealth/holdings tracking with live market data, savings goals, AI insights with advisor memory, household sharing, fixed-cost detection, benchmarks, and a remote MCP server — roughly 41k LOC (27.5k frontend, 13.8k functions), 73 components, 30 hooks, 31 Cloud Function handlers, 460 unit tests plus 8 Playwright specs.

Overall health is good: the architecture is coherent (TanStack Query + callable functions + user-scoped Firestore), money-critical libs are unit-tested, and Firestore rules enforce cross-user isolation correctly. The main risks are concentrated in three places: **sync idempotency** (duplicate-transaction races), **TanStack Query cache-key drift** (stale/wrong numbers shown in the UI), and **the absence of any CI quality gate** (deploys to production on push to `main` while typecheck, lint, and tests all currently fail on a clean checkout).

---

## 1. Bugs

### High severity

#### 1.1 Duplicate transactions from non-atomic sync dedup
`functions/src/shared/syncConnection.ts:287-312`

Dedup is a read (`where('externalId','==',…).limit(1)`) followed later by an unconditional batch `set()` on a **random** doc ID — not inside a Firestore transaction, and doc IDs are not derived from `externalId`. Two concurrent syncs (user pressing "Sync now" while `autoSyncTransactions` runs, or overlapping scheduled runs) both see the query empty and both insert. The 1-day overlap window (line 235) makes concurrent overlap of the same transactions likely.

**Fix direction:** key transaction docs deterministically by (a hash of) `externalId`, or wrap check+write in a transaction. Deterministic IDs also make re-syncs naturally idempotent.

#### 1.2 Synthetic-ID positional suffixing corrupts dedup
`functions/src/shared/syncConnection.ts:274-284`

Transactions without a usable `entry_reference` get `gen_<hash>` plus a positional `#seen` suffix computed per fetch. The suffix depends on the order and count of identical-hash transactions **in that fetch**. If a new identical reference-less transaction appears (or ordering shifts) between syncs, suffixes reassign: one real transaction is silently skipped as "existing" while another is re-inserted as a duplicate.

#### 1.3 Sync `success: true` is hardcoded; per-account errors are swallowed
`functions/src/shared/syncConnection.ts:497-517`, `functions/src/handlers/autoSyncTransactions.ts:96-103`

Account-level failures are caught into `result.errors`, but the function always returns `success: true`. `autoSyncTransactions` never inspects `results[].errors` and stamps a clean `lastAutoSyncAt` (deleting `lastAutoSyncError`) — so a connection whose transaction or balance fetch failed looks fully healthy. Only a thrown consent-expiry error surfaces. Partial sync failures are invisible to the user.

#### 1.4 `useBudgetProgress` query key omits the date range
`src/hooks/useBudgetProgress.ts:8-30`

The key is `['budgetProgress', uid, 'current']` but the `queryFn` closes over the caller's `dateRange`. Consequences:

- **Cache collision:** `Home.tsx` calls it with a month-to-today range while `SpendingExplorer.tsx` / `SpendingCategory.tsx` call it with no range. All share one key, so whichever mounts first wins and the others display progress computed for the wrong window.
- **No refetch on month change:** changing `selectedMonth` changes the closure but not the key.
- **Never invalidated:** no mutation anywhere invalidates `['budgetProgress']`, so spent/remaining stays stale after edits until the 5-minute staleTime.

#### 1.5 Transaction create/update/delete don't invalidate the dashboard or budgets
`src/hooks/useTransactionMutations.ts:91-95,126-130,191-195`

These mutations invalidate only `['transactions']` and `['spendingExplorer']` — not `['dashboard']` (Home's SpentCard, category list, projection) and not `['budgets']`/`['budgetProgress']`. Adding, editing, or deleting a transaction leaves Home totals stale for up to 5 minutes. Inconsistent with `useUpdateTransactionCategory` and `useBulkUpdateCategory`, which do invalidate `['dashboard']`.

#### 1.6 Conditional hook calls (rules-of-hooks violations)
`src/pages/settings/SettingsAccountsSync.tsx`, `src/pages/settings/SettingsDanger.tsx`

ESLint reports `react-hooks/rules-of-hooks` **errors**: hooks called after early returns. These are latent crashes — any render where the early-return condition flips changes hook order and React throws.

#### 1.7 MCP auth token in the URL path leaks into Cloud request logs
`functions/src/mcp/handler.ts:25-45`

The MCP endpoint authenticates via a secret embedded in the request path (`/<MCP_SECRET_TOKEN>`). The handler carefully avoids logging the path itself, but **Cloud Run / load-balancer request logs record full URL paths by default**, so the sole credential for the entire finance dataset (21 read/write tools) is written to Cloud Logging on every request. Move the token to an `Authorization` header (the constant-time comparison is already right).

### Medium severity

#### 1.8 `useCounterpartyAnalytics` key omits `selectedMonth`
`src/hooks/useCounterpartyAnalytics.ts:69` — the queryFn uses `selectedMonth` for current-month figures and the rolling 12-month window, but the key only contains the counterparty. Switching month on the detail page never refetches; figures stay frozen at the first-fetched month.

#### 1.9 N+1 Firestore reads during sync
`functions/src/shared/syncConnection.ts:287-290` — one indexed query **per transaction**, per sync, 4×/day. Initial sync (up to 1 year of history) issues hundreds–thousands of reads. A single bulk lookup of existing `externalId`s for the fetch window would collapse this (and disappears entirely with deterministic doc IDs per 1.1).

#### 1.10 Timestamps parsed in server-local time (UTC) instead of Europe/Amsterdam
`functions/src/shared/syncConnection.ts:655-692` — remittance times like `31.01.26/15:33` are parsed with `new Date(y, m, d, h, min)`, which is the **server** zone (UTC on Cloud Functions), so stored times are off by 1–2h vs CET/CEST and late-evening transactions can land on the wrong calendar day. Additionally `dateFrom`/`dateTo` (lines 227, 236) use UTC server time despite a comment claiming local dates — around local midnight, same-day transactions can briefly be missed.

#### 1.11 ICS lump-sum auto-exclude matches by amount alone
`functions/src/shared/syncConnection.ts:414-455` — a synced debit is matched to *any* `icsStatement` whose `totalNewExpenses` is within ±0.05, with no date constraint and `limit(1)`. An unrelated transaction equal to a statement total (or the wrong statement of two) can be wrongly marked `excludeFromTotals: true`, silently understating spending.

#### 1.12 All three quality gates fail on a clean checkout
- `npm run typecheck` (and therefore `npm run build`): TS 5.9 promotes the `baseUrl` deprecation to an error (`tsconfig.json:26`, `TS5101`).
- `npm run lint`: 98 problems (32 errors, 66 warnings), including the rules-of-hooks errors in 1.6.
- `npm run test`: 3 stale assertions in `functions/src/categorization/__tests__/merchantDatabase.test.ts` (NETFLIX/SPOTIFY moved to `subscriptions.streaming`, ZIGGO to `housing.communications`) — test rot, not code bugs.

Also undocumented setup traps: functions tests only run via the root Vitest include glob and silently fail without a separate `npm install` in `functions/`; hook tests need a `.env.test` (only `.env.test.example` is committed). Neither is mentioned in CLAUDE.md.

### Low severity

| # | Issue | Location |
|---|---|---|
| 1.13 | `getLiveQuote` triggers holding writes without a role check — a `viewer` member can cause writes to the owner's holdings | `functions/src/handlers/getLiveQuote.ts:25` |
| 1.14 | Agent bearer token compared with `!==` (non-constant-time), unlike the MCP handler | `functions/src/middleware/agentAuth.ts:21` |
| 1.15 | `bankConnections` readable by any member incl. `viewer` — exposes Enable Banking `sessionId` and IBANs | `firebase/firestore.rules:55-58` |
| 1.16 | `getFxRate`/`getLiveQuote` have no per-user throttle — any authenticated user can exhaust the shared Twelve Data free tier (800 credits/day) | `functions/src/handlers/getFxRate.ts`, `getLiveQuote.ts` |
| 1.17 | Optimistic category update omits `categoryConfidence` (server writes `1`), and patches rows in place so a moved transaction lingers in the wrong server-filtered list until invalidation | `src/hooks/useTransactionMutations.ts:29-61,159` |
| 1.18 | `useFixedMatches` read-modify-write with full-doc `setDoc` overwrite — two rapid marks can clobber each other | `src/hooks/useFixedMatches.ts:64-65` |
| 1.19 | Local/UTC month-boundary skew class: `MonthContext` builds local boundaries, hooks serialize via `toISOString()`; `burnUp.ts:11-24` documents and works around the resulting off-by-one-day row. Needs one canonical Amsterdam-aware month-range helper | `src/contexts/MonthContext.tsx:28,51-57` |
| 1.20 | Brittle LLM JSON parsing — bare `JSON.parse` after stripping code fences; any prose drops the whole categorization batch / insight silently, no retry | `functions/src/categorization/llmCategorizer.ts:114-119`, `functions/src/handlers/generateDailyInsight.ts:136-145` |
| 1.21 | Stale doc-comments on `refreshMarketData`/`refreshHoldings` claim they append history points; the code only updates the `livePrice`/`prevPrice` cache | `functions/src/marketData/refreshHoldings.ts:1-9`, `functions/src/handlers/refreshMarketData.ts:6-11` |

---

## 2. Architectural & design improvements

### 2.1 Add a CI quality gate (biggest maintainability gap)

The only workflow, `.github/workflows/deploy-hosting.yml`, deploys Firestore rules, functions, and hosting to production on every push to `main` — with **no typecheck, lint, unit tests, or E2E run first**. The PRD describes `test.yml`, `preview.yml`, and `deploy-production.yml`; none exist. Combined with 1.12 (all gates currently red), there is effectively no automated protection of production. A single PR-triggered workflow running `typecheck && lint && test` (E2E optional) plus making the deploy job depend on it would close this.

### 2.2 No error boundaries

Zero `ErrorBoundary` usage in the app. `App.tsx:52-64` documents a real past incident where a formatter throw blanked the entire app (worked around with a localStorage purge). A root boundary plus per-route boundaries would contain render failures to one page.

### 2.3 No route-level code splitting

`App.tsx` eagerly imports all ~40 pages; no `React.lazy`/`Suspense` anywhere. `recharts` is statically imported by counterparty charts, so the charts chunk loads on first paint despite the `manualChunks` split in `vite.config.ts`. (Positive: `pdfjs-dist` is correctly dynamic-imported in `icsParser.ts`.) Lazy routes would materially cut initial bundle and cold-start time — aligned with the recent perf work on `main`.

### 2.4 Centralize TanStack Query keys and invalidation

The root cause behind bugs 1.4, 1.5, and 1.8 is that every hook hand-rolls its keys and its invalidation list, and they drift. Introduce a single query-key factory (keys always include the inputs the queryFn actually uses — uid, month/range, filters) and a shared `invalidateFinancialData(qc)` helper that mutations call, so "which surfaces show money" is encoded once.

### 2.5 Backend consolidation

- **Duplicated categorization pipeline:** the match → LLM-fallback → batched-write flow exists twice (inline in `syncConnection.ts:301-401` and in `recategorizeTransactions.ts:99-202`) with different batch sizes (249 vs 500). Extract one shared routine.
- **Duplicated holdings mappers:** `functions/src/shared/holdings.ts` is a hand-maintained copy of `src/lib/holdingsMapping.ts` (separate `rootDir`s). Consider a shared package or a build-time copy step.
- **Half single-tenant, half multi-tenant:** insights, agent endpoints, and MCP hardcode `SINGLE_USER_ID`, while sync/market jobs iterate all users via collection-group scans. Pick a model (realistically: personal/household app → make the single-user parts iterate members like sync does, or document the constraint).
- **Blocking `sleep(60s)`** between quote batches inside `refreshMarketData`/`getLiveQuote` (`functions/src/marketData/twelveData.ts:126,154`) burns billable wall-clock and risks timeouts as symbols grow; spread across scheduled ticks or use Cloud Tasks.
- **Non-atomic holding upsert** in `upsertBankCashHolding` (`syncConnection.ts:110-159`) — get-then-set outside a transaction, racing client edits and concurrent syncs.
- **LLM failures are all swallow-and-continue** with no record of which transactions never got categorized — see roadmap item P1.7.

### 2.6 Frontend structure

Oversized units worth splitting when next touched: `TransactionForm.tsx` (571 lines), `pages/Budgets.tsx` (545 — page doing form + list + suggestions), `settings/BankConnectionCard.tsx` (439), `wealth/CheckInFlow.tsx` (389), `TransactionFilters.tsx` (386), `useBankConnection.ts` (364). Also: `MonthContext` doesn't persist the selected month across reloads (minor UX).

### 2.7 Documentation debt

`docs/PRD.md` is the most misleading file in the repo: it omits ~7 shipped feature areas (wealth, goals, insights/advisor, sharing, fixed costs, benchmarks, MCP) and still lists several of them as "future / out of scope". `README.md` describes only the MVP. The redesign plan's status table shows phases unchecked that have shipped, and `PHASE_7_NEXT_SESSION.md` is an obsolete mid-migration handoff. CLAUDE.md omits the dual-install and `.env.test` test-setup gotchas. A PRD v3 rewrite (or a superseding `FEATURES.md`) is overdue.

---

## 3. Cleanup candidates

**Repo weight** (dominates the 57 MB `.git` history):
- `.claude/reference/mockups/` — ~59 MB of PNG mockups. Remove (or move to LFS/external storage); ideally rewrite history to reclaim clone size.
- `docs/redesign/design_handoff_freelunch_redesign/` — 2.1 MB including the committed `Free Lunch v8.html` (which the implementation plan itself flags as not belonging in the repo).

**Irrelevant reference docs:** `.claude/reference/fastapi-best-practices.md` (Python), `sqlite-best-practices.md` (app is Firestore), `hudl-ui-design-system.md` (superseded by `free-lunch-design-system.md`).

**Dead frontend code** (verified zero importers):
- `src/lib/transactionGrouping.ts` (superseded by `src/components/transactions/groupTransactions.ts`)
- `src/dev/wealthPreview.tsx` + root `wealth-preview.html`
- `src/components/ui/checkbox.tsx`
- `src/lib/detectFixedCosts.ts` (used only by a review script per its own docstring — remove if that script is gone)

**One-off backend scripts** (retire once confirmed run): `functions/src/scripts/{debug-transactions.ts,backfillBankDescription.ts,run-daily-insight.mts,seed-advisor-memory.mts}`, `functions/scripts/wealth-import/*`, and the `repairSharing` handler (explicitly a one-shot migration for the fixed dotted-key bug).

**Misc:** `e2e/screenshots/register-page.png` (page deleted in the redesign); the 13 historical `.claude/plans/*.md` phase plans (fine as history — consider an `archive/` subfolder; note duplicate "phase-8" numbering).

**Explicitly NOT dead:** `src/components/redesign/*` is the live primitive kit (23 importers) — do not remove.

---

## 4. Prioritized roadmap

### P0 — Correctness & trust
1. **Make sync idempotent** — deterministic doc IDs keyed on `externalId` (or transactional check+write), stable synthetic-ID scheme, and surface per-account errors into `lastAutoSyncError` instead of hardcoded `success: true` (bugs 1.1–1.3). This protects the core dataset everything else is built on.
2. **Fix query keys/invalidation** — add range/month to `useBudgetProgress` and `useCounterpartyAnalytics` keys; make all transaction mutations invalidate dashboard + budget progress; introduce the shared key factory/invalidation helper (bugs 1.4, 1.5, 1.8; item 2.4).
3. **Green the gates, then gate deploys** — fix `tsconfig` `baseUrl` (build is broken on TS 5.9), the two rules-of-hooks errors, the 3 stale merchant tests; then add the CI workflow so `main` can't deploy red (1.6, 1.12, 2.1).
4. **Move the MCP token from URL path to a header** (bug 1.7) — small change, closes a real credential-leak channel.

### P1 — Robustness & performance
5. **Bulk dedup lookup** to kill the N+1 sync reads (1.9), and a **canonical Europe/Amsterdam date helper** used on both client and functions (1.10, 1.19).
6. **Error boundaries + route-level lazy loading** (2.2, 2.3) — resilience and a real cold-start win.
7. **Uncategorized-transactions visibility** — record LLM categorization failures instead of swallowing them; a small "needs review" surface with retry (1.20, 2.5).
8. **Security tightening** — restrict `bankConnections` reads to owner, role-check `getLiveQuote`, throttle FX/quote calls, constant-time agent-token compare (1.13–1.16).

### P2 — Features
9. **Restore the transaction-split UI** — a PRD MVP feature (US-4) whose data model (`isSplit`, `splits[]`) is fully in place but which lost its UI in the redesign (`TransactionForm.tsx:44` defers it). The clearest user-visible gap.
10. **First-class tags UI** — tags already exist in the data model and MCP tools; expose add/remove/filter in the transactions UI.
11. **Sharing invitation email** — `inviteMember.ts:92` TODO; today invitees must independently sign in for `acceptInvitation` to match by email. Email infra already exists in `functions/src/shared/email*`.
12. **Month-selection persistence** in `MonthContext` (and month-aware budget progress, which falls out of P0.2).

### P3 — Housekeeping & docs
13. **Slim the repo** — purge/LFS the ~60 MB of mockups and design-handoff assets; delete the dead code and one-off scripts listed in §3.
14. **Truthful docs** — rewrite PRD/README to shipped scope, update CLAUDE.md testing notes (functions dual-install, `.env.test`), archive redesign docs.

---

*Assessment produced by three parallel deep-exploration passes (frontend, backend/security, product/tests/hygiene); all high-severity findings were re-verified line-by-line against the source before inclusion.*
