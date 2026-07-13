# Assessment Execution Plan & Progress Tracker

Implements `docs/ASSESSMENT.md` (merged in PR #84, assessed at `a75792a`). Code is unchanged
since the assessed commit, so all file:line references in the assessment remain valid.

**Owner branch (this tracker):** `claude/assessment-implementation-plan-f9ah1e`
**Strategy:** one PR per coherent work unit, each on its own branch based off `main`.
Each PR is opened as a draft, gets an independent review pass, must have all gates green,
and is then merged in unit order — U1 (CI gate) lands first so every later merge to `main`
is protected before it auto-deploys. Units are file-disjoint where possible; later branches
rebase onto the updated `main` before merge.

**Orchestration model:** the main session is a thin orchestration layer. Each unit is
implemented by a subagent with a self-contained brief (assessment excerpt, target files,
acceptance criteria); each diff gets an independent review pass before the PR is opened.
This file is the durable state — update status here after every unit.

## Environment gotchas (for every implementer)

- `functions/` needs its own `npm install` (root install does not cover it).
- Hook tests need `.env.test` — copy from `.env.test.example`.
- Gates: `npm run typecheck`, `npm run lint`, `npm run test`. All three fail on a clean
  checkout until U1 merges (tsconfig `baseUrl` TS5101, 32 lint errors, 3 stale merchant tests).
  Until U1 lands, pre-existing failures unrelated to your diff are acceptable; your diff
  must not add new ones.

## Work units

| Unit | Branch | Scope (assessment items) | Status | PR |
|---|---|---|---|---|
| U1 | `claude/assess-u01-ci-gates` | Green all gates + CI workflow: tsconfig baseUrl, rules-of-hooks fixes (1.6), stale merchant tests, lint errors → 0; add PR-triggered quality workflow; gate deploy on it (1.12, 2.1, P0.3) | pending | — |
| U2 | `claude/assess-u02-query-keys` | Query-key factory + shared invalidation helper (2.4); fix 1.4, 1.5, 1.8, 1.17; month-aware budget progress + month persistence in MonthContext (P0.2, P2.12) | pending | — |
| U3 | `claude/assess-u03-sync-idempotency` | Deterministic transaction doc IDs from `externalId`, stable synthetic IDs, per-account error surfacing (1.1–1.3), bulk dedup lookup (1.9), ICS match date constraint (1.11) | pending | — |
| U4 | `claude/assess-u04-security` | MCP token → Authorization header, backward-compatible with path token (1.7); constant-time agent-token compare (1.14); `bankConnections` reads owner-only (1.15); role-check `getLiveQuote` (1.13); per-user FX/quote throttle (1.16) (P0.4, P1.8) | pending | — |
| U5 | `claude/assess-u05-timezones` | Canonical Europe/Amsterdam date helpers on functions + client; fix remittance-time parsing and sync date windows (1.10); month-boundary skew (1.19) | pending | — |
| U6 | `claude/assess-u06-resilience` | Root + route error boundaries (2.2); route-level `React.lazy` code splitting incl. recharts (2.3) (P1.6) | pending | — |
| U7 | `claude/assess-u07-backend-robustness` | Robust LLM JSON parsing w/ retry (1.20); record categorization failures + "needs review" surface with retry (P1.7); extract shared categorization pipeline (2.5); transactional holding upsert (2.5); fix stale doc-comments (1.21); document single-user constraint decision (2.5) | pending | — |
| U8 | `claude/assess-u08-split-ui` | Restore transaction-split UI (P2.9, US-4) on existing `isSplit`/`splits[]` model | pending | — |
| U9 | `claude/assess-u09-tags-ui` | First-class tags UI: add/remove/filter in transactions UI (P2.10) | pending | — |
| U10 | `claude/assess-u10-invite-email` | Sharing invitation email via existing email infra (P2.11, `inviteMember.ts:92`) | pending | — |
| U11 | `claude/assess-u11-repo-slim` | Remove mockups + design-handoff binaries from working tree (NO history rewrite — owner decision), dead frontend code, one-off scripts, irrelevant reference docs (§3, P3.13) | pending | — |
| U12 | `claude/assess-u12-docs` | Truthful docs: PRD/README rewrite to shipped scope, CLAUDE.md test-setup notes, archive redesign docs (2.7, P3.14) | pending | — |

Status values: `pending` → `in-progress` → `pushed` → `reviewed` → `PR-open` → `merged`.

## Decisions log (pre-made design decisions; update as implementation confirms or changes them)

- **No history rewrite** for large binaries (explicit owner instruction): U11 removes them
  from the working tree in a normal commit; purging history is a separate owner decision.
- **Sync idempotency vs existing data (U3):** deterministic IDs apply to *new* writes only.
  Existing random-ID docs are left in place and deduped via a bulk `externalId` lookup in
  the sync window. No backfill/rename: doc IDs are referenced by `reimbursement.linkedTransactionId`
  (and any external references); renaming risks breaking real data for zero user benefit.
- **MCP auth (U4):** header (`Authorization: Bearer <token>`) becomes the primary; the
  URL-path token keeps working (still constant-time compared) so the existing Claude
  connector doesn't break. Owner should update the connector, then path support can be
  dropped later.
- **Single- vs multi-tenant (2.5):** pragmatic choice for a personal/household app — keep
  `SINGLE_USER_ID` for insights/agent/MCP and document the constraint (U7), rather than
  generalizing scheduled jobs further.
- **Merge policy:** PRs are merged sequentially by the session after independent review +
  green gates (per the owner's brief: "land CI first so everything after is protected",
  "keep main deployable at every merge"). U1 merges first; every subsequent unit is
  rebased/re-verified against the then-current `main` before its merge.
- **U1 CI shape:** a quality workflow running typecheck+lint+tests on PRs and pushes to
  `main`, and the deploy workflow made to depend on it. E2E stays out of CI for now
  (needs emulators + secrets).

## Verification ledger

Every unit must pass before PR-open: `npm run typecheck` · `npm run lint` (0 errors) ·
`npm run test` · plus unit-specific checks. Filled in as units complete.

| Unit | typecheck | lint | tests | extra verification |
|---|---|---|---|---|
