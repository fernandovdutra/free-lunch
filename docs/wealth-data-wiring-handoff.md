# Wealth data wiring — handoff

> Working notes for continuing the Wealth-module data/backend pass in a fresh
> session. The authoritative plan lives at (local, not in repo)
> `~/.claude/plans/we-have-a-personal-finance-jolly-sunbeam.md`; this file
> mirrors its phases plus current status so the next session can pick up cleanly.

## Goal

The Wealth module (PR #63) shipped a polished UI driven entirely by a mock
fixture (`src/data/wealthMock.ts`). This branch replaces the mock with real
Firestore-backed data, then adds auto-pricing, benchmarks, bank-synced cash, and
retires the old `Investments.tsx` surface. **Data/backend pass only** —
`src/lib/wealth.ts` (pure logic, 17 tests) and the `src/components/wealth/*`
components stay intact.

## Confirmed decisions

1. **Data model:** new `users/{uid}/holdings` collection (not an adapter over the
   old `investments`/`debts`). One Holding per account; full dated history inline.
2. **Price provider:** Twelve Data (single provider) for equities + crypto +
   indices.
3. **ADD HOLDING:** manual entry only for v1 (auto-priced holdings carry an
   optional `symbol`). No brokerage auto-import.
4. **Refresh:** daily scheduled Cloud Function + on-demand callable; charts read
   denormalized/cached values.

## Status

| Phase | Scope | Status |
|---|---|---|
| **0 — Foundations** | `holdings` doc model; `firestore.rules` (`holdings` + read-only `marketData`); collection-group index `holdings(updateSource, symbol)`; pure `src/lib/holdingsMapping.ts` mappers + tests | ✅ done (commit `ee02bdc`) |
| **1 — Read path** | `src/hooks/useHoldings.ts` + `transformHolding` (mirrors `useInvestments`) | ✅ done |
| **2 — Write path** | `src/hooks/useHoldingMutations.ts` (update-value / edit-details / create / delete, optimistic); `Wealth.tsx` rewired off the mock; `EditDetailsDialog` ticker field | ✅ done |
| **3 — Import + retire old** | import the personal net-worth sheet → `holdings`; retire `Investments.tsx` + `/investments`; swap `get_investments` → `get_holdings` MCP tool | ⛔ not started |
| **4 — Auto-pricing** | Twelve Data client + scheduled `refreshMarketData` fn + on-demand `getLiveQuote` callable | ⛔ not started |
| **5 — Benchmarks** | EOD index series → `marketData/indices/{key}`; `useBenchmarks.ts` replaces `MOCK_BENCHMARKS` | ⛔ not started |
| **6 — Bank-synced cash** | upsert a Cash holding per account from `bankConnections.accountBalances` in `syncConnection.ts` | ⛔ not started |

Verified at commit `ee02bdc`: **28/28 vitest pass, eslint clean, tsc clean.**

### Important: empty-state after merge
Merging Phases 0–2 makes `Wealth.tsx` read from the (initially empty) `holdings`
collection — the mock is no longer used, so **the Wealth screen shows empty state
until Phase 3 imports data.** Consider merging Phase 3 together with this, or
import data right after merge.

## Key files (already committed)

- `src/types/wealth.ts` — added optional `symbol` to `Holding`.
- `src/lib/holdingsMapping.ts` — pure mappers: `quoteToHoldingUpdate`,
  `balanceToCashHolding`, `deriveUpdatedDaysAgo`, fallback
  `investmentToHolding`/`debtToHolding` (+ `src/lib/__tests__/holdingsMapping.test.ts`).
- `src/hooks/useHoldings.ts` — query `['holdings', userId]`, `transformHolding`.
- `src/hooks/useHoldingMutations.ts` — 4 mutations, optimistic cache updates.
- `src/pages/Wealth.tsx` — reads `useHoldings()`; handlers call mutations.
- `src/components/wealth/EditDetailsDialog.tsx` — ticker/symbol field for `auto`.
- `firebase/firestore.rules`, `firebase/firestore.indexes.json`.

## Next session — start here (Phase 3)

The blocker was parsing the Google Sheet through MCP/base64 in an ephemeral
container (`/tmp` reaped mid-run, replayed tool calls). **Do not re-parse via
MCP.** Instead:

1. Ask the user to **export the "patrimonio" tab to CSV and place the file in the
   repo working dir** (e.g. `./networth.csv`), or paste the rows. Parse the local
   file directly — no base64/Drive round-trip.
2. Sheet shape (confirmed): **transposed** (rows = accounts, cols = dated
   snapshots), **multi-currency** (EUR; BRL via per-date `1 EUR in BRL` row;
   **BTC stored as a unit count** × per-date `1 BTC in EUR` row). Skip subtotal
   rows (`Total net worth`, `Assets`, `Liquid Assets`, `Deposits`,
   `Financial instruments`, `Real estate`, `Digital assets`, `Liabilities`). A
   `Liabilities` marker row disambiguates labels appearing as both asset and
   liability (e.g. `House, Eindhoven` = property above / mortgage below).
   Reconstruct ISO dates from the year row + day-month row (month-reset → year).
   Sheet's current net worth ≈ **€628,655** — use as the reconciliation target.
3. Account rows actually present (do **not** invent others): `ABN`,
   `Transferwise` (Wise), `BB (R$)`, `Nubank (R$)`, `XP (R$)`, `NOVIA`,
   `ASML Stocks`, `Hudl VESTED stock`, `House, Eindhoven`, `Apto, POA (R$)`,
   `BTC`, `BTC Oranje (Paulo)`, `MiTo`, `Tesla Model 3`; liabilities:
   `House, Eindhoven` (mortgage), `Apto, POA`, `Tesla Model 3 (ribank...)`,
   `Nubank (R$)`. The user's earlier feedback: there is **no** N26/Indexa/
   Coinbase/pension/etc — only what's in the sheet.
4. Deliverable: an **account → Holding mapping** the user reviews + a
   firebase-admin importer that writes to `holdings` (deterministic per-name doc
   ids, idempotent). **Gitignore the CSV and generated JSON** — never commit real
   balances. Run emulator-first.
5. Then retire `src/pages/Investments.tsx` + `/investments` route
   (`src/App.tsx`), and replace `get_investments` in
   `functions/src/mcp/tools.ts` with `get_holdings`.

## PR

Draft PR **#65** → branch `claude/wealth-data-wiring-plan-cj6Dt`. Keep as draft;
the user will merge (likely together with Phase 3 to avoid the empty-state gap).
