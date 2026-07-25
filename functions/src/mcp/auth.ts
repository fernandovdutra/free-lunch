import { secureCompare } from '../shared/secureCompare.js';

/**
 * Authorizes an MCP request against the configured secret.
 *
 * Two mechanisms are accepted, both constant-time compared:
 *
 * 1. `Authorization: Bearer <token>` header — the preferred form. Headers are
 *    not written to Cloud Run / load-balancer request logs, unlike URL paths.
 * 2. Legacy URL-path token (`/<secret>`) — kept for backward compatibility so
 *    existing Claude connectors configured with the token-in-URL form keep
 *    working until they are updated.
 *
 * Priority: if an Authorization header is present it is authoritative — a
 * mismatching header is rejected even when the path token would match. Only
 * when no Authorization header is sent do we fall back to the path token.
 *
 * Never log the header or the path: both may carry the secret.
 */
export function isAuthorizedMcpRequest(
  authorizationHeader: string | undefined,
  path: string,
  secret: string
): boolean {
  if (authorizationHeader !== undefined) {
    const match = /^Bearer\s+(.+)$/.exec(authorizationHeader);
    const headerToken = match ? match[1] : '';
    return secureCompare(headerToken, secret);
  }
  const pathToken = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return secureCompare(pathToken, secret);
}
