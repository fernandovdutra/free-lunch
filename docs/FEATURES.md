# Free Lunch — Shipped Features

**This document describes what the application actually does today.** It is written from the
code, not from plans, and it supersedes `docs/PRD.md` (kept as a historical MVP planning
document — see the banner at the top of that file).

Free Lunch is a personal finance app for the Netherlands. It connects to Dutch banks over
PSD2, categorizes transactions automatically, and provides budgeting, reimbursement tracking,
spending analytics, wealth tracking, savings goals, AI insights, and household sharing. It also
exposes a remote MCP server so an AI assistant can query and update the data directly.

---

## 1. Accounts and access

- **Authentication:** Firebase Auth (Google sign-in). All app routes are behind `ProtectedRoute`.
- **Household sharing:** the data owner can invite others by email with a role of `editor` or
  `viewer`. Invitations are stored as pending members plus a lookup record, an invitation email
  is sent, and the invite is matched when the invitee signs in with that address.
  Members read the owner's data; viewers cannot write. Bank connection documents are readable
  by the **owner only** — they hold the bank `sessionId` and IBANs — while members see bank
  status through a callable that returns sanitized fields.
- **Collections** (all under `users/{userId}/`): `transactions`, `rawBankTransactions`,
  `categories`, `rules`, `budgets`, `goals`, `holdings`, `investments`,
  `investmentTransactions`, `insights`, `advisorMemory`, `icsStatements`, `bankConnections`,
  `settings`, `memberships`, plus a top-level `marketData` cache and `pendingInviteLookup`.

## 2. Bank sync (Enable Banking / PSD2)

- Connect a bank, complete consent in the bank's flow, and the callback stores the connection.
- **Scheduled sync runs four times daily** (07:00, 12:00, 17:00, 22:00) in addition to manual
  "Sync now".
- **Idempotent writes.** Transaction documents are keyed deterministically by a hash of the
  bank's `externalId`, and inserts use create-only semantics, so concurrent or overlapping syncs
  cannot produce duplicates and a re-sync never overwrites user edits. Transactions without a
  usable bank reference get a stable synthetic id derived from their content.
- **Legacy-safe deduplication.** One bulk lookup per account per sync covers the fetch window,
  matching both current and older documents (including ones whose booking date was stored as a
  string by an earlier code path), so historical rows are never re-inserted.
- **Error visibility.** Per-account failures are reported rather than swallowed: a partial
  failure records `lastAutoSyncError` on the connection (shown on the bank card in Settings) and
  does not advance the sync watermark, so the missed window is retried. A clean run clears it.
- **Timezone correctness.** Times parsed out of remittance text are interpreted as
  Europe/Amsterdam wall-clock and stored as exact instants, and the sync window uses Amsterdam
  calendar days, so evening transactions land on the right day across CET/CEST.
- Account balances are mirrored into a cash holding so bank balances appear in net worth.

## 3. Categorization

Three tiers, in order, with a confidence score and a `categorySource` recorded on every
transaction (`rule`, `merchant`, `llm`, `manual`, `learned`, `auto`, `none`):

1. **User rules** — pattern-matching rules, including rules learned from corrections.
2. **Merchant database** — a curated database of Dutch and international merchants.
3. **LLM fallback** — Claude categorizes what the first two tiers could not.

- **Failure visibility.** When the LLM step genuinely fails, affected transactions are marked
  `categorizationStatus: 'failed'` with a short reason instead of being silently left alone.
  Settings → Categorization shows the count and offers a retry that re-runs only those
  transactions. Manual categorizations are never overwritten by that retry.
- **Resilient parsing.** Model responses are parsed with a fence-stripping, balanced-block
  extractor plus one corrective retry, so surrounding prose no longer discards a whole batch.
- Bulk recategorization is available from Settings, and correcting a category can be applied to
  similar transactions.

## 4. Transactions

- List with server-side date/category filtering and client-side search, amount, direction and
  status filters, infinite scrolling, and month selection that persists across reloads.
- **Editing** via a sheet: category, note, reimbursement flags, splits and tags.
- **Splitting** — a transaction can be divided across categories. Split amounts are stored
  positive and must sum to the transaction amount; the editor shows the live remainder and
  refuses to save until it is exactly zero, and the invariant is enforced again in the write
  layer. Analytics credit each split's own category.
- **Tags** — free-form tags with chip editing, suggestions from tags already in use, and
  filtering. Normalization (trim, drop empties, case-sensitive de-duplication) is identical to
  the MCP tag tools, so writes from the UI and from an assistant are indistinguishable.
- **Reimbursements** — mark a transaction as reimbursable (work expense or personal IOU) and
  later clear it against matching income; pending and cleared views with suggestions.

## 5. Budgets, goals and fixed costs

- **Budgets:** monthly limits per category with alert thresholds, progress computed server-side
  for the selected window, and suggestions based on history.
- **Goals:** savings goals with target amounts and progress tracking.
- **Fixed costs:** recurring-expense detection with a schedule view and per-month match marking.

## 6. Spending analytics

- **Home dashboard:** spend card, burn-up against the month, category breakdown, projection and
  recent activity.
- **Spending Explorer / Income:** three-level drill-down — category → subcategory →
  counterparty — with monthly bars and per-level detail pages.
- **Counterparty detail:** per-merchant history, current-month figures and a rolling
  twelve-month window.
- **ICS credit-card import:** import a statement PDF, break it down by category, and reconcile
  the lump-sum direct debit against the statement (matched by amount *and* date proximity, so
  an unrelated equal-amount transaction is not excluded by mistake).
- **Export:** transactions as CSV or JSON.

## 7. Wealth

- Holdings with quantities and prices, investment transactions, and a net-worth view including
  bank cash balances.
- **Market data:** quotes refreshed on a nightly schedule (23:30) and on demand, with FX
  conversion; benchmarks refresh nightly at 23:45. Only owners and editors can trigger the
  refresh path that writes holdings, and per-user hourly throttles protect the shared market-data
  quota.

## 8. AI insights and advisor memory

- **Daily insight** generated at 21:00 and a **weekly insight** on Sundays at 20:00, plus
  on-demand generation. Insights include highlights, recommendations, anomalies, goal progress
  and an investment summary.
- **Advisor memory:** consolidated spending baselines, known merchants, and behavioural and
  temporal patterns, refreshable from Settings, so advice reflects longer-term context.

## 9. Remote MCP server

A hosted MCP endpoint exposes 21 tools to an AI assistant — reads
(`get_transactions`, `search_transactions`, `aggregate_transactions`, `get_spending_summary`,
`get_category_trends`, `get_budget_progress`, `get_goals`, `get_holdings`, `get_insights`,
`get_advisor_memory`, `get_recurring_expenses`) and writes (`recategorize_transaction`,
`update_transaction_note`, `create_transaction`, `add_transaction_tags`,
`remove_transaction_tags`, `create_budget`, `update_budget`, `create_goal`, `update_goal`,
`create_rule`).

**Authentication:** send the secret as an `Authorization: Bearer <token>` header against the
plain function URL. The older form — the token embedded in the URL path — is still accepted for
backward compatibility, but it should not be used: URL paths are recorded in Cloud request logs,
which is why the header form exists. Both comparisons are constant-time.

> If you are still using a path-token connector URL, switch it to the header form and then
> rotate the token, since the old one has been written to request logs.

## 10. Platform behaviour

- **PWA:** installable, with an offline indicator.
- **Resilience:** a root error boundary means a render failure can no longer blank the whole
  app, and a route-level boundary keeps navigation alive when a single page fails; navigating
  away (or "Try again") recovers, including after a failed chunk load from a stale deploy.
- **Performance:** routes are code-split, so pages and their heavy dependencies (charts, PDF
  parsing) load on demand rather than at first paint.
- **Caching:** all server state goes through TanStack Query with a central key factory; keys
  always include the inputs their queries actually use, and money-affecting mutations invalidate
  every surface that displays money through one shared helper.

## 11. Architecture notes

- **Single-tenant assumptions:** insights, the agent endpoints and the MCP server operate on a
  single configured user, while sync and market-data jobs iterate all users. This is a
  deliberate choice for a personal/household app; see `functions/src/ARCHITECTURE.md`.
- **Deployment:** pushes to `main` deploy Firestore rules, Cloud Functions and hosting — but
  only after the quality workflow (typecheck, lint, tests, functions compile) passes.

---

*Feature-level questions this document does not answer are best resolved by reading the code:
routes in `src/App.tsx`, backend entry points in `functions/src/index.ts`, and the data model in
`src/types/index.ts` and `firebase/firestore.rules`.*
