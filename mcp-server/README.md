# Free Lunch MCP Server

Exposes your Free Lunch financial data to Claude via the Model Context Protocol (MCP).

## Tools

| Tool | Description |
|------|-------------|
| `get_transactions` | Query transactions with date/category/amount filters |
| `search_transactions` | Full-text search across descriptions and counterparties |
| `get_spending_summary` | Category-level spending totals for a date range |
| `get_category_trends` | Month-over-month trends for a specific category |
| `get_budget_progress` | Current month budget vs actuals |
| `get_goals` | Financial goals with progress |
| `get_investments` | Portfolio overview with values and returns |
| `get_insights` | Past AI-generated insights |
| `get_advisor_memory` | Advisor's persistent memory (profile, recurring expenses) |
| `get_recurring_expenses` | Detected recurring/subscription expenses |

## Claude Desktop setup (local PC)

### 1. Build

```bash
cd mcp-server
npm install
npm run build
```

### 2. Credentials

The server uses Firebase Application Default Credentials (ADC) set up by the Firebase CLI.
After `firebase login`, the ADC file lives at:

```
%APPDATA%\firebase\<email>_application_default_credentials.json
```

No service account key is needed for local use.

### 3. Wire up Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "free-lunch-finance": {
      "command": "node",
      "args": ["C:\\path\\to\\free-lunch\\mcp-server\\dist\\index.js"],
      "env": {
        "FREE_LUNCH_USER_ID": "your-firebase-uid-here",
        "FIREBASE_PROJECT_ID": "your-firebase-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "%APPDATA%\\firebase\\<your-email>_application_default_credentials.json"
      }
    }
  }
}
```

> **Note:** After merging the PR and checking out `main`, rebuild the server (`npm install && npm run build` in `mcp-server/`) and update the `args` path in your local `claude_desktop_config.json` to point to the `main` checkout. The `FREE_LUNCH_USER_ID` and `GOOGLE_APPLICATION_CREDENTIALS` values in `claude_desktop_config.json` are personal — keep them out of source control.

### 4. Restart Claude Desktop

Quit and reopen Claude Desktop. The free-lunch tools should appear in the toolbar.

### 5. Verify

Ask Claude: "What did I spend last month?" — it should query Firestore and return real data.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FREE_LUNCH_USER_ID` | Yes | Your Firebase Auth UID |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (local) | Path to Firebase ADC JSON |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Yes (remote) | Path to service account key JSON (overrides ADC) |

## Remote access (iPhone / phone)

The stdio server above only works when Claude Desktop spawns it locally. To "talk to
your finances" from the **Claude iPhone app** (or claude.ai on any device) you connect to
a **remote MCP server over HTTPS**, added as a custom connector.

That remote server is deployed as a Firebase Cloud Function — `mcp`, in
`functions/src/mcp/` — so it ships with the rest of the backend (no separate service or
container). It exposes the same read-only tools as the stdio server over the MCP
Streamable HTTP transport.

### Security model — "secret link"

There is **no OAuth**. The connector is authenticated by a long random token embedded in
the URL path (`https://<function-url>/<MCP_SECRET_TOKEN>`). The URL itself is the
credential — anyone who has it can read the finance data, so keep it private. The token
is rotatable: change the secret and redeploy. Note that the URL path is recorded in
Cloud logging, so restrict log access and rotate the token if it is ever exposed.

### Deploy

1. Create the secret token (once):

   ```bash
   firebase functions:secrets:set MCP_SECRET_TOKEN
   # paste a long random value, e.g. the output of: openssl rand -hex 24
   ```

   `SINGLE_USER_ID` (your Firebase Auth UID) is already configured as a secret for the
   other agent endpoints; reuse it.

2. Deploy the function:

   ```bash
   firebase deploy --only functions:mcp
   ```

   Note the function URL printed in the deploy output (region `europe-west1`).

### Add the connector in the Claude app

1. Open the Claude app → **Settings → Connectors → Add custom connector**.
2. Name: `Free Lunch Finance`.
3. URL: the function URL followed by the secret token —
   `https://<function-url>/<MCP_SECRET_TOKEN>`.
4. Authentication: **None** (the secret is in the URL).
5. Save. Claude runs the MCP handshake and the finance tools appear. In any normal chat,
   enable the connector and ask e.g. "What did I spend on groceries last month?".

Chatting this way uses your Claude subscription — no Anthropic API tokens are billed.
The only cost is the Google Cloud side (function invocations + Firestore reads), which
scales to zero and is negligible for personal use.

### Planned: write tools

The remote server is **read-only** for now. A future phase will add write tools
(recategorize a transaction, add notes, update budgets, update goal progress) so the
assistant can make changes, not just answer questions.
