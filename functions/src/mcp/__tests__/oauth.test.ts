// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { getMcpOAuthConfig, oauthChallenge, protectedResourceMetadata, verifyMcpOAuthToken } from '../oauth.js';
import { allowedTools } from '../server.js';
import { createServer } from '../server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Firestore } from 'firebase-admin/firestore';

const config = {
  issuer: 'https://finance-test.auth0.com/',
  audience: 'https://example.com/mcp',
  publicUrl: 'https://example.com/mcp',
  subject: 'google-oauth2|one-owner',
};

describe('MCP OAuth', () => {
  it('fails closed on incomplete or non-HTTPS configuration', () => {
    expect(getMcpOAuthConfig({ MCP_OAUTH_ISSUER: config.issuer } as NodeJS.ProcessEnv)).toBeNull();
    expect(getMcpOAuthConfig({
      MCP_OAUTH_ISSUER: 'http://example.com/', MCP_OAUTH_AUDIENCE: config.audience,
      MCP_OAUTH_SUBJECT: config.subject, MCP_PUBLIC_URL: config.publicUrl,
    } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('advertises OAuth discovery without exposing account identity', () => {
    expect(protectedResourceMetadata(config)).toEqual({
      resource: config.publicUrl,
      authorization_servers: [config.issuer],
      scopes_supported: ['finance:read', 'finance:write'],
    });
    expect(oauthChallenge(config)).toContain(`${config.publicUrl}/.well-known/oauth-protected-resource`);
    expect(oauthChallenge(config)).not.toContain(config.subject);
  });

  it('does not advertise write tools to a read-only OAuth connection', () => {
    expect(allowedTools(false).some((tool) => tool.name === 'create_transaction')).toBe(false);
    expect(allowedTools(false).some((tool) => tool.name === 'get_advisor_memory')).toBe(true);
    expect(allowedTools(true).some((tool) => tool.name === 'create_transaction')).toBe(true);
  });

  it('allows unauthenticated discovery but never calls Firestore without a token', async () => {
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer(null as unknown as Firestore, 'owner', false, oauthChallenge(config));
    const client = new Client({ name: 'auth-test', version: '1.0.0' }, { capabilities: {} });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = await client.listTools();
      expect(tools.tools.some((tool) => tool.name === 'get_advisor_memory')).toBe(true);
      const result = await client.callTool({ name: 'get_advisor_memory', arguments: {} });
      expect(result.isError).toBe(true);
      expect(result._meta?.['mcp/www_authenticate']).toEqual([oauthChallenge(config)]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('accepts only a signed token for the exact issuer, audience, subject and read scope', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'test-key';
    jwk.alg = 'RS256';
    const keys = createLocalJWKSet({ keys: [jwk] });
    const sign = (overrides: { issuer?: string; audience?: string; subject?: string; scope?: string; expiry?: string } = {}) =>
      new SignJWT({ scope: overrides.scope ?? 'finance:read' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(overrides.issuer ?? config.issuer)
        .setAudience(overrides.audience ?? config.audience)
        .setSubject(overrides.subject ?? config.subject)
        .setIssuedAt()
        .setExpirationTime(overrides.expiry ?? '1h')
        .sign(privateKey);

    expect(await verifyMcpOAuthToken(await sign(), config, keys)).toEqual({ canWrite: false });
    expect(await verifyMcpOAuthToken(await sign({ scope: 'finance:read finance:write' }), config, keys))
      .toEqual({ canWrite: true });
    expect(await verifyMcpOAuthToken(await sign({ scope: 'finance:write' }), config, keys)).toBeNull();
    expect(await verifyMcpOAuthToken(await sign({ subject: 'another-user' }), config, keys)).toBeNull();
    expect(await verifyMcpOAuthToken(await sign({ audience: 'https://other.example' }), config, keys)).toBeNull();
    expect(await verifyMcpOAuthToken(await sign({ issuer: 'https://other.auth0.com/' }), config, keys)).toBeNull();
    expect(await verifyMcpOAuthToken(await sign({ expiry: '-1s' }), config, keys)).toBeNull();

    const { privateKey: wrongKey } = await generateKeyPair('RS256');
    const forged = await new SignJWT({ scope: 'finance:read' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(config.issuer).setAudience(config.audience).setSubject(config.subject)
      .setExpirationTime('1h').sign(wrongKey);
    expect(await verifyMcpOAuthToken(forged, config, keys)).toBeNull();
  });
});
