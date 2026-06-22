import { createAnthropic } from '../shared/anthropic.js';
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

const MAX_BATCH_SIZE = 50;

/**
 * Categorize transactions using Claude Haiku.
 * Sends a batch of uncategorized transactions along with the user's category tree,
 * and returns category assignments.
 */
export async function categorizeWithLLM(
  transactions: TransactionInput[],
  categories: CategoryInfo[],
  apiKey: string
): Promise<Map<number, CategorizationResult>> {
  const results = new Map<number, CategorizationResult>();

  if (transactions.length === 0 || categories.length === 0) {
    return results;
  }

  // Process in batches
  for (let i = 0; i < transactions.length; i += MAX_BATCH_SIZE) {
    const batch = transactions.slice(i, i + MAX_BATCH_SIZE);
    const batchResults = await categorizeBatch(batch, categories, apiKey);
    for (const [key, value] of batchResults) {
      results.set(key, value);
    }
  }

  return results;
}

async function categorizeBatch(
  transactions: TransactionInput[],
  categories: CategoryInfo[],
  apiKey: string
): Promise<Map<number, CategorizationResult>> {
  const results = new Map<number, CategorizationResult>();

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

  const prompt = `You are a Dutch personal finance categorization assistant. Categorize each bank transaction into exactly one category from the list below.

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

  try {
    const client = await createAnthropic(apiKey);
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text content
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.error('LLM returned no text content');
      return results;
    }

    // Parse JSON response — handle markdown code blocks
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed: LlmCategorizationResult[] = JSON.parse(jsonText);

    // Validate and build results
    const validCategoryIds = new Set(categories.map((c) => c.id));

    for (const item of parsed) {
      if (
        typeof item.index === 'number' &&
        typeof item.categoryId === 'string' &&
        validCategoryIds.has(item.categoryId)
      ) {
        results.set(item.index, {
          categoryId: item.categoryId,
          confidence: Math.min(1, Math.max(0, item.confidence ?? 0.7)),
          source: 'llm',
        });
      }
    }
  } catch (error) {
    console.error('LLM categorization failed:', error);
    // Non-fatal: return whatever we have (empty map if first batch)
  }

  return results;
}
