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
| **3 — Import + retire old** | import the personal net-worth sheet → `holdings` (`functions/scripts/wealth-import/`, verified against the emulator: 21 holdings, net worth €628,655); retired `Investments.tsx` + `/investments`; swapped `get_investments` → `get_holdings` MCP tool | ✅ done |
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

## Phase 3 — done

Importer lives in `functions/scripts/wealth-import/` (see its `README.md`):

- `parse.mjs` parses the **transposed**, multi-currency sheet (EUR; BRL via
  per-date `1 EUR in BRL`; **BTC as a unit count** × `1 BTC in EUR`), skips the
  subtotal rows, and flips kind at the `Liabilities` marker. Dates were already
  ISO in the header, so no reconstruction was needed.
- It **reconciles** the sum of leaf values against the sheet's own
  `Assets` / `Liabilities` / `Total net worth` rows at every date (max diff
  €0.0005); the importer aborts on mismatch. Net worth ties out to **€628,655**.
- `mapping.mjs` is the reviewed account → Holding mapping. Added a `Vehicle`
  AssetType (types + grouping order + edit dialog) for the cars.
- `import.mjs` is idempotent (deterministic `<kind>-<slug>` doc ids),
  emulator-first, with prod run steps. **Raw data + generated JSON are
  gitignored — only scripts are committed.** Verified against the emulator
  (21 holdings, idempotent on re-run).
- Retired `src/pages/Investments.tsx`, the `/investments` route, and the now
  orphaned `useInvestments`/`useDebts` hooks. Swapped the `get_investments` MCP
  tool for `get_holdings` (reads the `holdings` collection; returns net worth +
  liquid assets) in `functions/src/mcp/tools.ts`.

Remaining: **Phases 4–6** (auto-pricing, benchmarks, bank-synced cash).

## PR

Draft PR **#65** → branch `claude/wealth-data-wiring-plan-cj6Dt`. Keep as draft;
the user will merge.
