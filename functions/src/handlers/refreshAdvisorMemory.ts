import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createAnthropic } from '../shared/anthropic.js';
import { consolidateAdvisorMemory } from '../shared/memoryManager.js';
import { config } from '../config.js';
import { resolveDataOwner, requireRole } from '../shared/dataOwner.js';

/**
 * On-demand memory consolidation — callable from the app.
 * Reads ALL transactions, rebuilds spending baselines, known merchants,
 * and LLM-extracted behavioral/temporal patterns.
 * Human-provided fields (financialProfile, recurringExpenses, etc.) are preserved.
 */
export const refreshAdvisorMemory = onCall(
  {
    region: 'europe-west1',
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 120,
    secrets: ['ANTHROPIC_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const apiKey = config.anthropicApiKey;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Anthropic API key not configured');
    }

    const userId = await resolveDataOwner(request.auth.uid);
    await requireRole(request.auth.uid, userId, ['owner', 'editor']);
    const client = await createAnthropic(apiKey);

    const result = await consolidateAdvisorMemory(userId, client);

    return {
      success: true,
      baselines: result.baselines,
      merchants: result.merchants,
      patterns: result.patterns,
    };
  }
);
