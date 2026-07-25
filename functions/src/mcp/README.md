# Free Lunch MCP Server

Exposes your Free Lunch financial data to the Claude apps (iPhone, web, desktop)
via the Model Context Protocol (MCP). Deployed as the `mcp` Firebase Cloud
Function — it ships with the rest of the backend, no separate service.

## Tools

### Read tools

| Tool | Description |
|------|-------------|
| `get_transactions` | Query transactions with date/category/counterparty/tag/amount filters. Tag filters (single `tag` or multi `tags` with `tagMatch` AND/OR) search the full history. Returns `{ transactions, totalCount, totalAmount }`; each record carries `categoryName` and a cleaner `merchantName`. |
| `aggregate_transactions` | Spending totals and counts for a filtered set without the individual records — optionally grouped by category, tag, counterparty, or month |
| `search_transactions` | Full-text search across descriptions and counterparties |
| `get_spending_summary` | Category-level spending totals for a date range |
| `get_category_trends` | Month-over-month trends for a specific category |
| `get_budget_progress` | Current month budget vs actuals |
| `get_goals` | Financial goals with progress |
| `get_holdings` | Wealth/net-worth overview: holdings (assets + liabilities) with values, plus net worth and liquid assets |
| `get_insights` | Past AI-generated insights |
| `get_advisor_memory` | Advisor's persistent memory (profile, recurring expenses) |
| `get_recurring_expenses` | Detected recurring/subscription expenses |

### Write tools

| Tool | Description |
|------|-------------|
| `recategorize_transaction` | Change the category of one or more transactions (`transactionId` or `transactionIds`) |
| `update_transaction_note` | Set or clear a transaction's note |
| `create_transaction` | Create a manual transaction |
| `add_transaction_tags` | Add free-form tags to one or more transactions (`transactionId` or `transactionIds`) |
| `remove_transaction_tags` | Remove tags from one or more transactions (`transactionId` or `transactionIds`) |
| `create_budget` | Create a monthly category budget |
| `update_budget` | Update an existing budget |
| `create_goal` | Create a financial goal |
| `update_goal` | Update a goal's progress, status, or details |
| `create_rule` | Create a categorization rule |

There are no delete tools — the assistant can create and update data but never
delete it.

## Security model — shared secret

There is **no OAuth**. The connector is authenticated by a long random token
(`MCP_SECRET_TOKEN`), accepted in either of two forms:

1. **Preferred — Authorization header.** Use the plain function URL and send
   `Authorization: Bearer <MCP_SECRET_TOKEN>`. Headers are not written to
   Cloud Run / load-balancer request logs, so the credential never lands in
   Cloud Logging.
2. **Legacy — token in the URL path.** `https://<function-url>/<MCP_SECRET_TOKEN>`.
   Still accepted so existing connectors keep working, but the URL path **is
   recorded in Cloud logging** on every request — migrate to the header form
   and rotate the token afterwards.

If an `Authorization` header is present it is authoritative: a wrong header is
rejected even when the path token would match. The path is only checked when
no header is sent. Both comparisons are constant-time.

Whoever holds the token can read and modify the finance data, so keep it
private. The token is rotatable: change the secret and redeploy.

## Deploy

1. Create the secret token (once):

   ```bash
   firebase functions:secrets:set MCP_SECRET_TOKEN
   # paste a long random value, e.g. the output of: openssl rand -hex 24
   ```

   `SINGLE_USER_ID` (your Firebase Auth UID) is already configured as a secret
   for the other agent endpoints; reuse it.

2. Deploy the function:

   ```bash
   firebase deploy --only functions:mcp,firestore:indexes
   ```

   Note the function URL printed in the deploy output (region `europe-west1`).
   The `firestore:indexes` target builds the composite index that tag filtering
   in `get_transactions` / `aggregate_transactions` relies on.

## Add the connector in the Claude app

1. Open the Claude app → **Settings → Connectors → Add custom connector**.
2. Name: `Free Lunch Finance`.
3. **Preferred:** URL = the plain function URL (no token in the path), and
   configure the connector to send `Authorization: Bearer <MCP_SECRET_TOKEN>`
   (use the connector's bearer-token / API-key authentication option).
   **Legacy fallback:** if your client cannot send an Authorization header, use
   the function URL followed by the secret token —
   `https://<function-url>/<MCP_SECRET_TOKEN>` with Authentication **None**
   (note the logging caveat above).
4. Save. Claude runs the MCP handshake and the finance tools appear. In any
   normal chat, enable the connector and ask e.g. "What did I spend on groceries
   last month?" or "Tag my last Albert Heijn transaction as 'work-lunch'".

An existing connector configured with the token-in-URL form keeps working
unchanged; switch it to the header form when convenient, then rotate the
token.

Chatting this way uses your Claude subscription — no Anthropic API tokens are
billed. The only cost is the Google Cloud side (function invocations + Firestore
reads/writes), which scales to zero and is negligible for personal use.

## Implementation

- `handler.ts` — Cloud Function HTTP entry point, Streamable HTTP transport
  (stateless).
- `auth.ts` — token authorization (header-first, path fallback, constant-time).
- `server.ts` — builds the MCP server instance per request.
- `tools.ts` — read tool definitions, dispatch, and the combined tool list.
- `writeTools.ts` — write tool definitions and dispatch.
