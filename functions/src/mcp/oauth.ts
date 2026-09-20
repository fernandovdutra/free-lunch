import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface McpOAuthConfig {
  issuer: string;
  audience: string;
  subject: string;
  publicUrl: string;
}

export type McpAccess = { canWrite: boolean };

const jwksCache = new Map<string, JWTVerifyGetKey>();

/** Fail closed unless every value is explicitly configured. */
export function getMcpOAuthConfig(env: NodeJS.ProcessEnv = process.env): McpOAuthConfig | null {
  const issuer = env.MCP_OAUTH_ISSUER?.trim();
  const audience = env.MCP_OAUTH_AUDIENCE?.trim();
  const subject = env.MCP_OAUTH_SUBJECT?.trim();
  const publicUrl = env.MCP_PUBLIC_URL?.trim();
  if (!issuer || !audience || !subject || !publicUrl) return null;
  try {
    const issuerUrl = new URL(issuer);
    const resourceUrl = new URL(publicUrl);
    if (issuerUrl.protocol !== 'https:' || resourceUrl.protocol !== 'https:') return null;
    if (issuerUrl.search || issuerUrl.hash || resourceUrl.search || resourceUrl.hash) return null;
    // Auth0 issuer identifiers end in /; preserve that exact value for JWT validation.
    return { issuer, audience, subject, publicUrl: publicUrl.replace(/\/+$/, '') };
  } catch {
    return null;
  }
}

export function protectedResourceMetadata(config: McpOAuthConfig) {
  return {
    resource: config.publicUrl,
    authorization_servers: [config.issuer],
    scopes_supported: ['finance:read', 'finance:write'],
  };
}

export function oauthChallenge(config: McpOAuthConfig, scope = 'finance:read'): string {
  return `Bearer resource_metadata="${config.publicUrl}/.well-known/oauth-protected-resource", scope="${scope}", error="insufficient_scope", error_description="Sign in and grant Free Lunch Finance access"`;
}

function remoteKeySet(issuer: string): JWTVerifyGetKey {
  let keySet = jwksCache.get(issuer);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL('.well-known/jwks.json', issuer.endsWith('/') ? issuer : `${issuer}/`));
    jwksCache.set(issuer, keySet);
  }
  return keySet;
}

/** Verify signature, token destination, exact account identity, expiry and scopes. */
export async function verifyMcpOAuthToken(
  token: string,
  config: McpOAuthConfig,
  keySet: JWTVerifyGetKey = remoteKeySet(config.issuer)
): Promise<McpAccess | null> {
  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
      requiredClaims: ['sub', 'exp'],
    });
    if (payload.sub !== config.subject) return null;
    const scopes = new Set(typeof payload.scope === 'string' ? payload.scope.split(/\s+/) : []);
    if (!scopes.has('finance:read')) return null;
    return { canWrite: scopes.has('finance:write') };
  } catch {
    return null;
  }
}
