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

## Remote / iPhone access

The plan is to add HTTP/SSE transport and deploy to Cloud Run so claude.ai on iPhone can reach the server without needing Claude Desktop.
