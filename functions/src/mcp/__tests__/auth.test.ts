import { describe, it, expect } from 'vitest';
import { isAuthorizedMcpRequest } from '../auth';

const SECRET = 'a-long-random-mcp-secret';

describe('isAuthorizedMcpRequest', () => {
  describe('Authorization header (preferred)', () => {
    it('accepts a correct bearer token with a plain base URL path', () => {
      expect(isAuthorizedMcpRequest(`Bearer ${SECRET}`, '/', SECRET)).toBe(true);
      expect(isAuthorizedMcpRequest(`Bearer ${SECRET}`, '', SECRET)).toBe(true);
    });

    it('accepts a correct bearer token regardless of path content', () => {
      expect(isAuthorizedMcpRequest(`Bearer ${SECRET}`, '/whatever', SECRET)).toBe(true);
    });

    it('rejects a wrong bearer token even when the path token is correct', () => {
      expect(isAuthorizedMcpRequest('Bearer wrong-token', `/${SECRET}`, SECRET)).toBe(false);
    });

    it('rejects a malformed Authorization header even with a correct path', () => {
      expect(isAuthorizedMcpRequest(SECRET, `/${SECRET}`, SECRET)).toBe(false);
      expect(isAuthorizedMcpRequest('', `/${SECRET}`, SECRET)).toBe(false);
      expect(isAuthorizedMcpRequest('Basic abc', `/${SECRET}`, SECRET)).toBe(false);
    });
  });

  describe('URL path token (legacy fallback)', () => {
    it('accepts the correct path token when no header is sent', () => {
      expect(isAuthorizedMcpRequest(undefined, `/${SECRET}`, SECRET)).toBe(true);
    });

    it('tolerates leading/trailing slashes around the path token', () => {
      expect(isAuthorizedMcpRequest(undefined, `//${SECRET}/`, SECRET)).toBe(true);
    });

    it('rejects a wrong path token', () => {
      expect(isAuthorizedMcpRequest(undefined, '/wrong-token', SECRET)).toBe(false);
    });

    it('rejects an empty path when no header is sent', () => {
      expect(isAuthorizedMcpRequest(undefined, '/', SECRET)).toBe(false);
    });
  });

  it('rejects everything when the secret is not configured', () => {
    expect(isAuthorizedMcpRequest('Bearer ', '/', '')).toBe(false);
    expect(isAuthorizedMcpRequest(undefined, '/', '')).toBe(false);
  });
});
