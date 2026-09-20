import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
import { isAuthorizedMcpRequest } from './auth.js';
import { getMcpOAuthConfig, oauthChallenge, protectedResourceMetadata, verifyMcpOAuthToken } from './oauth.js';

/**
 * Remote MCP endpoint. OAuth access tokens are supported for ChatGPT; the
 * legacy shared secret remains available during migration. OAuth is enabled
 * only when all MCP_OAUTH_* settings are present. See docs/CHATGPT_FINANCE.md.
 *
 * Uses the MCP Streamable HTTP transport in stateless mode: a fresh server +
 * transport is created per request, which is required because Cloud Functions
 * scale horizontally and to zero with no shared in-memory state.
 */
export const mcp = onRequest(
  {
    region: 'europe-west1',
    cors: false,
    secrets: ['MCP_SECRET_TOKEN', 'SINGLE_USER_ID'],
    timeoutSeconds: 120,
  },
  async (request, response) => {
    const secret = process.env.MCP_SECRET_TOKEN ?? '';
    // The MCP server is single-user by design (household app) — see
    // functions/src/ARCHITECTURE.md for the boundary and its rationale.
    const userId = process.env.SINGLE_USER_ID ?? '';
    if (!userId) {
      response.status(500).json({ error: 'MCP server not configured' });
      return;
    }

    const oauth = getMcpOAuthConfig();
    if (request.method === 'GET' && request.path === '/.well-known/oauth-protected-resource' && oauth) {
      response.json(protectedResourceMetadata(oauth));
      return;
    }

    // Never log request.path / request.url / the Authorization header here —
    // they may contain the secret token.
    const authHeader = request.headers.authorization;
    const legacyAuthorized = !!secret && isAuthorizedMcpRequest(authHeader, request.path, secret);
    let canWrite = legacyAuthorized;
    let challenge: string | undefined;
    if (!legacyAuthorized) {
      const token = /^Bearer\s+([^\s]+)$/.exec(authHeader ?? '')?.[1];
      const access = token && oauth ? await verifyMcpOAuthToken(token, oauth) : null;
      if (!access) {
        if (oauth) {
          // Permit MCP initialization and tool discovery without a token so
          // ChatGPT can see each tool's securitySchemes. tools/call then sends
          // the MCP auth challenge; no Firestore call runs before auth.
          challenge = oauthChallenge(oauth);
        } else {
          response.status(404).json({ error: 'Not found' });
          return;
        }
      } else {
        canWrite = access.canWrite;
      }
    }

    if (request.method !== 'POST') {
      // Stateless transport does not use the GET SSE stream.
      if (challenge) response.set('WWW-Authenticate', challenge);
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const server = createServer(getFirestore(), userId, canWrite, challenge);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    response.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (err) {
      console.error('MCP request failed:', err);
      if (!response.headersSent) {
        response.status(500).json({ error: 'Internal error' });
      }
    }
  }
);
