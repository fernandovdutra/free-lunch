import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { secureCompare } from '../shared/secureCompare.js';

/**
 * Simple bearer token auth for agent endpoints.
 * Returns userId if authenticated, null otherwise (sends 401 response).
 * The token comparison is constant-time to avoid timing side channels.
 */
export function authenticateAgent(
  request: Request,
  response: Response
): string | null {
  const token = request.headers.authorization?.replace('Bearer ', '') ?? '';
  const expectedToken = process.env.AGENT_API_TOKEN;
  const userId = process.env.SINGLE_USER_ID;

  if (!expectedToken || !userId) {
    response.status(500).json({ error: 'Agent auth not configured' });
    return null;
  }

  if (!secureCompare(token, expectedToken)) {
    response.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return userId;
}
