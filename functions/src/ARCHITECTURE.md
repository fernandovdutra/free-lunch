# Cloud Functions — architecture notes

## Single-user boundary (`SINGLE_USER_ID`)

Free Lunch is a **household app**: one primary data owner, optionally shared
with a partner via the members/roles model. Two classes of backend entry
points deliberately sit on different sides of a multi-user boundary:

**Multi-user (iterate/serve all users):**

- Bank sync — `syncTransactions` (per caller), `autoSyncTransactions`
  (scheduled, iterates every user's connections)
- Market data — `refreshMarketData` (collection-group over all users'
  holdings), `getLiveQuote` (per caller)
- All `onCall` handlers invoked from the app UI (they resolve the data owner
  from the authenticated caller via `shared/dataOwner.ts`)

**Single-user (pinned to the `SINGLE_USER_ID` secret):**

- Scheduled insights — `generateDailyInsight`, `generateWeeklyInsight`
- The agent HTTP endpoints (`getMonthlyAnalysisData`,
  `getYearlyAnalysisData`, `storeInsight`) via `middleware/agentAuth.ts`
- The MCP server (`mcp/handler.ts`)

This is a **deliberate, documented decision**, not an oversight: the insight
emails, advisor memory, and agent/MCP surfaces are inherently "the
household's finances" and their auth models (shared secret token, scheduled
job with no request context) have no per-user identity to resolve. Keeping
them single-user avoids per-user secret distribution and fan-out complexity
that a single household never needs.

**The boundary rule:** anything reachable from the app UI must resolve the
data owner from the authenticated request; anything keyed on `SINGLE_USER_ID`
must never be exposed to app users directly. To onboard a second household,
the single-user entry points above need per-user iteration plus per-user
credentials — grep for `SINGLE_USER_ID` to find every site.

## Twelve Data throttling (`marketData/twelveData.ts`)

The free tier allows 8 quote credits/minute, so `getQuotes` sleeps 60s
between symbol batches **inside the function invocation**. That blocking
sleep is paid Cloud Functions wall-time and is bounded by the function
timeout, so the number of batches per invocation is capped (see
`MAX_QUOTE_BATCHES_PER_CALL`). A queue-based design (Cloud Tasks) would
remove the blocking sleeps but is deliberately out of scope for a
single-household portfolio (typically one batch).
