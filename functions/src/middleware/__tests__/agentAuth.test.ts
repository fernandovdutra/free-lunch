import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticateAgent } from '../agentAuth';

function createMockRequest(authHeader?: string) {
  return {
    headers: {
      authorization: authHeader,
    },
  } as any;
}

function createMockResponse() {
  const res: any = {
    statusCode: 0,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe('authenticateAgent', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null and sends 500 when env vars missing', () => {
    delete process.env.AGENT_API_TOKEN;
    delete process.env.SINGLE_USER_ID;

    const req = createMockRequest('Bearer some-token');
    const res = createMockResponse();

    const result = authenticateAgent(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toContain('not configured');
  });

  it('returns null and sends 401 on wrong token', () => {
    process.env.AGENT_API_TOKEN = 'correct-token';
    process.env.SINGLE_USER_ID = 'user-123';

    const req = createMockRequest('Bearer wrong-token');
    const res = createMockResponse();

    const result = authenticateAgent(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns userId on correct token', () => {
    process.env.AGENT_API_TOKEN = 'correct-token';
    process.env.SINGLE_USER_ID = 'user-123';

    const req = createMockRequest('Bearer correct-token');
    const res = createMockResponse();

    const result = authenticateAgent(req, res);
    expect(result).toBe('user-123');
  });
});
