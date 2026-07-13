import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';

/**
 * Simple bearer token auth for agent endpoints.
 * Returns userId if authenticated, null otherwise (sends 401 response).
 */
export function authenticateAgent(
  request: Request,
  response: Response
): string | null {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const expectedToken = process.env.AGENT_API_TOKEN;
  // Agent endpoints are single-user by design (household app) — see
  // functions/src/ARCHITECTURE.md for the boundary and its rationale.
  const userId = process.env.SINGLE_USER_ID;

  if (!expectedToken || !userId) {
    response.status(500).json({ error: 'Agent auth not configured' });
    return null;
  }

  if (token !== expectedToken) {
    response.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return userId;
}
