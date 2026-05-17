import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

/**
 * Constant-time comparison of the URL path token against the configured secret.
 */
function tokenMatches(candidate: string, secret: string): boolean {
  if (secret.length === 0 || candidate.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(secret));
}

/**
 * Remote MCP endpoint reachable from the Claude apps (web/desktop/iPhone) as a
 * custom connector. Authentication is a secret token embedded in the URL path
 * (`/<MCP_SECRET_TOKEN>`) — there is no OAuth. The token is the only credential,
 * so the connector URL must be kept private.
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
    const userId = process.env.SINGLE_USER_ID ?? '';
    if (!secret || !userId) {
      response.status(500).json({ error: 'MCP server not configured' });
      return;
    }

    // Never log request.path / request.url here — it contains the secret token.
    const pathToken = request.path.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!tokenMatches(pathToken, secret)) {
      response.status(404).json({ error: 'Not found' });
      return;
    }

    if (request.method !== 'POST') {
      // Stateless transport does not use the GET SSE stream.
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const server = createServer(getFirestore(), userId);
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
