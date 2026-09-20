# Connect Free Lunch to ChatGPT

The Free Lunch MCP endpoint can serve ChatGPT over OAuth 2.1 while retaining the
existing shared-secret connector during the transition. ChatGPT reads your live
Firestore data through tools; your transactions and advisor memory stay in
Free Lunch. This does **not** use the OpenAI API or an API key for conversation
or scheduled ChatGPT reports.

This guide assumes the existing Firebase project `free-lunch-85447`, the `mcp`
Cloud Function in `europe-west1`, and an Auth0 tenant used solely to issue OAuth
tokens. Complete the account/credential steps yourself; never put tokens, bank
data, or service-account keys in GitHub issues, PRs, or chat.

## 1. Configure an OAuth issuer

OpenAI's [authenticated MCP guide](https://developers.openai.com/plugins/build/auth)
recommends a standards-compliant identity provider. The
[Auth0 setup in OpenAI's reference scaffold](https://github.com/openai/openai-mcpkit/blob/main/typescript-authenticated-mcp-server-scaffold/README.md#2-configure-auth0-authentication)
is a starting point:

1. Create or use an Auth0 tenant. Configure a personal login (Google or an Auth0
   database user). Make sure you can see your user in **User Management → Users**.
2. Create an **API** with identifier
   `https://europe-west1-free-lunch-85447.cloudfunctions.net/mcp` and signing
   algorithm **RS256**. Define permissions `finance:read` and `finance:write`.
3. Set the tenant's **Default Audience** to that API identifier. Enable a
   standards-compatible OAuth authorization-code/PKCE client-registration path
   for ChatGPT. Prefer Auth0's **CIMD** (Client ID Metadata Document) support;
   OpenAI's guide explains the Auth0 dashboard steps. Use a **per-application
   grant**, granting user-delegated access to `finance:read` first. Add
   `finance:write` only when you want ChatGPT to create/update finance records.
4. When ChatGPT shows its actual CIMD URL and redirect URI for this connection,
   register/allowlist **those exact URLs** in Auth0. Depending on Auth0 and
   ChatGPT's issuer-identification mode, ChatGPT can use stable or
   callback-specific URLs; do not guess them.
5. Copy the Auth0 **issuer** exactly as returned by its OpenID discovery
   document, including its trailing slash, and copy your Auth0 **user_id** from
   User Management → Users. The server checks this exact subject on every
   request. A successful login as someone else cannot access your Firestore.

## 2. Set deployment configuration

The repo's GitHub Actions workflow deploys all functions on every push to
`main`. Before merging this change, create three repository **Actions
variables** and one **Actions secret** at GitHub → repo → Settings → Secrets
and variables → Actions:

| Kind | Name | Value |
| --- | --- | --- |
| Variable | `MCP_OAUTH_ISSUER` | Auth0 issuer, e.g. `https://YOUR-TENANT.eu.auth0.com/` |
| Variable | `MCP_OAUTH_AUDIENCE` | The API identifier from step 1 |
| Variable | `MCP_PUBLIC_URL` | `https://europe-west1-free-lunch-85447.cloudfunctions.net/mcp` |
| Secret | `MCP_OAUTH_SUBJECT` | Your exact Auth0 `user_id` |

The workflow writes these values into an ignored Firebase Functions environment
file before deployment. When any value is absent, it does not create the file
and OAuth remains disabled; the existing shared-secret integration remains.
If an old `functions/.env.free-lunch-85447` file exists in a local checkout,
inspect it before deploying manually so its values match the GitHub settings.

After merging, wait for the Deploy to Firebase workflow. Check the public
resource metadata endpoint (no secret in the URL):

```text
https://europe-west1-free-lunch-85447.cloudfunctions.net/mcp/.well-known/oauth-protected-resource
```

It should contain the configured `resource`, `authorization_servers`, and
`scopes_supported`. MCP initialization and tool discovery work without a token
so ChatGPT can see the OAuth requirements; unauthenticated tool calls return
an MCP authentication challenge without finance data. Do not paste tokens into
a browser URL to test it.

## 3. Connect in ChatGPT

1. In ChatGPT, go to **Settings → Security and login → Developer mode**. If the
   switch is unavailable, your account/workspace does not yet expose this
   connection method; leave the old report jobs running.
2. At [ChatGPT Plugins](https://chatgpt.com/plugins), add a new MCP connection
   called **Free Lunch Finance** with URL
   `https://europe-west1-free-lunch-85447.cloudfunctions.net/mcp`.
3. Complete the Auth0 login. Check that the user is *your* Auth0 account and
   the requested API scopes are what you intended. Verify `get_advisor_memory`
   and a small `get_transactions` query in a fresh chat. A read-only grant
   should not expose write tools.
4. If you enable writes later, verify a reversible edit (for example updating
   a test transaction note) before relying on categorization/budget edits.

ChatGPT cannot use this server's legacy `MCP_SECRET_TOKEN` as a manually
configured API key. Do not use the `/<MCP_SECRET_TOKEN>` legacy path as a
connection URL: request paths can land in Cloud logs. Once the new connection
works, remove the old Claude connector and rotate the shared secret. Removing
the legacy path-token support in code can follow after the cutover.

## 4. Cut over reports and memory

Only schedule ChatGPT reports **after** a live finance tool succeeds. Keep the
old Firebase jobs until both new tasks produce accurate reports, then disable
the old scheduled functions to avoid duplicate mail and Anthropic charges.

Suggested ChatGPT task instructions (timezone **Europe/Amsterdam**):

**Daily at 21:00** — "Using Free Lunch Finance, review today's posted
transactions, monthly budget progress, relevant recent history and advisor
memory. Send me a concise daily finance report in this chat with income,
spending, noteworthy changes, uncategorized transactions and actions worth
taking. Ground every number in the tool data. If there are no new transactions,
say so briefly. Do not edit finance data."

**Weekly Sunday at 20:00** — "Using Free Lunch Finance, compare this week with
last week, show spending by category, budgets, goals and holdings, note genuine
anomalies, and use advisor memory for context. Send a practical weekly review
in this chat, distinguishing recurring costs from one-offs and avoiding
unsupported savings claims. Do not edit finance data."

The old daily job calls Claude Haiku and applies an incremental memory patch.
The old weekly job calls Claude Sonnet and consolidates memory from all
transactions. **Those memory updates do not automatically move to ChatGPT**
just because ChatGPT can read `get_advisor_memory`. Before disabling the old
jobs, either (a) keep `refreshAdvisorMemory` running with a separate model
replacement, or (b) add a deterministic memory refresh plus a narrowly
authorized MCP memory-update tool and test that the ChatGPT tasks maintain it.
Keep the Firestore memory document as the canonical store; do not bulk-copy
transaction-derived facts into ChatGPT's general memory.

The app's **on-demand insight** and **manual memory refresh** buttons also
still call Anthropic. Disabling the scheduled functions alone does not migrate
those buttons. Replace or retire them separately after the chat workflow is
proven.

## Connection checks

- Auth challenge on a tool call: OAuth is enabled and the token is absent or rejected.
- `404` on an unauthenticated request: OAuth configuration is incomplete.
- Login succeeds but finance tools still require authentication: check issuer, API audience,
  exact Auth0 user ID, token expiry, and `finance:read` scope.
- Read tools work but write tools are missing: expected with a read-only grant.
- No data in ChatGPT: verify `SINGLE_USER_ID` still points to the original
  Firebase owner account. Do not replace it with the Auth0 user ID; they are
  separate identifiers.
