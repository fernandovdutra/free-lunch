import Anthropic from '@anthropic-ai/sdk';
import { extractJson, JSON_RETRY_INSTRUCTION } from '../shared/llmJson.js';
import type { CategorizationResult } from './types.js';

interface CategoryInfo {
  id: string;
  name: string;
  parentName: string | null;
}

interface TransactionInput {
  index: number;
  description: string;
  counterparty: string | null;
  amount: number;
}

interface LlmCategorizationResult {
  index: number;
  categoryId: string;
  confidence: number;
}

/**
 * Outcome of an LLM categorization pass. Every input index appears in exactly
 * one of the two maps, so callers can record failures instead of silently
 * leaving transactions uncategorized.
 */
export interface LlmCategorizationOutcome {
  /** index → successful assignment */
  results: Map<number, CategorizationResult>;
  /** index → concise reason the model produced no usable category */
  failures: Map<number, string>;
}

const MAX_BATCH_SIZE = 50;

const MODEL = 'claude-haiku-4-5-20251001';

/**
 * Categorize transactions using Claude Haiku.
 * Sends batches of uncategorized transactions along with the user's category
 * tree, and returns per-index assignments plus per-index failure reasons.
 *
 * Malformed responses are retried once (with a corrective instruction) and
 * then reported per index via `failures`; an API/network error fails only the
 * indices of the batch it hit, so earlier batches' results survive.
 */
export async function categorizeWithLLM(
  transactions: TransactionInput[],
  categories: CategoryInfo[],
  apiKey: string
): Promise<LlmCategorizationOutcome> {
  const outcome: LlmCategorizationOutcome = { results: new Map(), failures: new Map() };

  if (transactions.length === 0) return outcome;

  if (categories.length === 0) {
    for (const t of transactions) {
      outcome.failures.set(t.index, 'no leaf categories available to assign');
    }
    return outcome;
  }

  // Process in batches
  for (let i = 0; i < transactions.length; i += MAX_BATCH_SIZE) {
    const batch = transactions.slice(i, i + MAX_BATCH_SIZE);
    try {
      const batchOutcome = await categorizeBatch(batch, categories, apiKey);
      for (const [key, value] of batchOutcome.results) outcome.results.set(key, value);
      for (const [key, value] of batchOutcome.failures) outcome.failures.set(key, value);
    } catch (err) {
      // API/network error — fail this batch's indices, keep other batches.
      const msg = err instanceof Error ? err.message : 'LLM request failed';
      console.error(`LLM categorization batch of ${batch.length} failed: ${msg}`);
      for (const t of batch) {
        outcome.failures.set(t.index, `LLM request failed: ${msg}`.slice(0, 200));
      }
    }
  }

  return outcome;
}

function buildPrompt(transactions: TransactionInput[], categories: CategoryInfo[]): string {
  // Build category list for the prompt
  const categoryList = categories
    .map((c) => {
      const label = c.parentName ? `${c.parentName} > ${c.name}` : c.name;
      return `- "${c.id}": ${label}`;
    })
    .join('\n');

  // Build transaction list
  const transactionList = transactions
    .map((t) => {
      const parts = [`#${t.index}: "${t.description}"`];
      if (t.counterparty) parts.push(`counterparty: "${t.counterparty}"`);
      parts.push(`amount: €${t.amount.toFixed(2)}`);
      return parts.join(', ');
    })
    .join('\n');

  return `You are a Dutch personal finance categorization assistant. Categorize each bank transaction into exactly one category from the list below.

CATEGORIES:
${categoryList}

TRANSACTIONS:
${transactionList}

For each transaction, respond with a JSON array of objects: [{"index": <number>, "categoryId": "<id>", "confidence": <0.0-1.0>}]

Rules:
- Use the exact category ID from the list
- Only assign leaf categories (with a parent), not parent categories themselves
- confidence: 0.9 for clear matches, 0.7 for reasonable guesses, 0.5 for uncertain
- If you truly cannot categorize a transaction, use "uncategorized" with confidence 0.3
- This is for Dutch bank transactions (Netherlands). Descriptions may be in Dutch.
- Negative amounts are expenses, positive amounts are income

Respond ONLY with the JSON array, no other text.`;
}

async function categorizeBatch(
  transactions: TransactionInput[],
  categories: CategoryInfo[],
  apiKey: string
): Promise<LlmCategorizationOutcome> {
  const outcome: LlmCategorizationOutcome = { results: new Map(), failures: new Map() };
  const prompt = buildPrompt(transactions, categories);
  const label = `categorization batch (${transactions.length} txns)`;

  const client = new Anthropic({ apiKey });

  // One retry on a malformed response, with the corrective instruction
  // appended to the prompt. (Inlined rather than using requestLlmJson so we
  // can also demand the top-level value be an array before accepting it.)
  let parsed: LlmCategorizationResult[] | null = null;
  let lastError = 'no attempt made';

  for (let attempt = 1; attempt <= 2 && parsed === null; attempt++) {
    const content = attempt === 1 ? prompt : `${prompt}\n\n${JSON_RETRY_INSTRUCTION}`;
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      lastError = 'LLM returned no text content';
      console.warn(`LLM ${label}: attempt ${attempt} returned no text content`);
      continue;
    }

    const extracted = extractJson(textBlock.text);
    if (!extracted.ok) {
      lastError = extracted.error;
      console.warn(
        `LLM ${label}: attempt ${attempt} JSON parse failed (${extracted.error}); ` +
          `first 200 chars: ${JSON.stringify(textBlock.text.slice(0, 200))}`
      );
      continue;
    }
    if (!Array.isArray(extracted.value)) {
      lastError = 'response was valid JSON but not an array';
      console.warn(`LLM ${label}: attempt ${attempt} — ${lastError}`);
      continue;
    }
    parsed = extracted.value as LlmCategorizationResult[];
  }

  if (parsed === null) {
    console.error(`LLM ${label}: giving up after retry — ${lastError}`);
    for (const t of transactions) {
      outcome.failures.set(t.index, `LLM response unusable: ${lastError}`);
    }
    return outcome;
  }

  // Validate and build results
  const validCategoryIds = new Set(categories.map((c) => c.id));

  for (const item of parsed) {
    if (
      item !== null &&
      typeof item === 'object' &&
      typeof item.index === 'number' &&
      typeof item.categoryId === 'string' &&
      validCategoryIds.has(item.categoryId)
    ) {
      outcome.results.set(item.index, {
        categoryId: item.categoryId,
        confidence: Math.min(1, Math.max(0, item.confidence ?? 0.7)),
        source: 'llm',
      });
    }
  }

  // Anything the model skipped, marked "uncategorized", or answered with an
  // unknown category id gets an explicit failure record.
  for (const t of transactions) {
    if (!outcome.results.has(t.index)) {
      outcome.failures.set(t.index, 'model returned no valid category for this transaction');
    }
  }

  return outcome;
}
