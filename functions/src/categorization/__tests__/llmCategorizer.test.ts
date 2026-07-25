import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

import { categorizeWithLLM } from '../llmCategorizer';

const CATEGORIES = [
  { id: 'groceries', name: 'Groceries', parentName: 'Food' },
  { id: 'transport', name: 'Public Transport', parentName: 'Transport' },
];

function txn(index: number, description = `txn ${index}`) {
  return { index, description, counterparty: null, amount: -10 };
}

function textResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

beforeEach(() => {
  createMock.mockReset();
});

describe('categorizeWithLLM', () => {
  it('parses a clean JSON response into results, with no failures', async () => {
    createMock.mockResolvedValue(
      textResponse('[{"index": 0, "categoryId": "groceries", "confidence": 0.9}]')
    );

    const outcome = await categorizeWithLLM([txn(0)], CATEGORIES, 'key');

    expect(outcome.results.get(0)).toEqual({
      categoryId: 'groceries',
      confidence: 0.9,
      source: 'llm',
    });
    expect(outcome.failures.size).toBe(0);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('recovers JSON wrapped in prose (previously dropped the whole batch)', async () => {
    createMock.mockResolvedValue(
      textResponse(
        'Here are your categorizations:\n' +
          '[{"index": 0, "categoryId": "groceries", "confidence": 0.8}]\n' +
          'Hope this helps!'
      )
    );

    const outcome = await categorizeWithLLM([txn(0)], CATEGORIES, 'key');

    expect(outcome.results.get(0)?.categoryId).toBe('groceries');
    expect(outcome.failures.size).toBe(0);
  });

  it('retries once with a corrective instruction on a malformed response', async () => {
    createMock
      .mockResolvedValueOnce(textResponse('I am not able to produce the JSON right now'))
      .mockResolvedValueOnce(
        textResponse('[{"index": 0, "categoryId": "transport", "confidence": 0.7}]')
      );

    const outcome = await categorizeWithLLM([txn(0)], CATEGORIES, 'key');

    expect(createMock).toHaveBeenCalledTimes(2);
    const retryPrompt = createMock.mock.calls[1][0].messages[0].content as string;
    expect(retryPrompt).toMatch(/ONLY valid JSON/);
    expect(outcome.results.get(0)?.categoryId).toBe('transport');
    expect(outcome.failures.size).toBe(0);
  });

  it('marks every transaction in the batch failed when both attempts are unparseable', async () => {
    createMock.mockResolvedValue(textResponse('truncated [{"index": 0'));

    const outcome = await categorizeWithLLM([txn(0), txn(1)], CATEGORIES, 'key');

    expect(createMock).toHaveBeenCalledTimes(2); // one retry, then give up
    expect(outcome.results.size).toBe(0);
    expect(outcome.failures.get(0)).toMatch(/LLM response unusable/);
    expect(outcome.failures.get(1)).toMatch(/LLM response unusable/);
  });

  it('records a failure for indices the model skipped or answered with an unknown category', async () => {
    createMock.mockResolvedValue(
      textResponse(
        '[{"index": 0, "categoryId": "groceries", "confidence": 0.9},' +
          ' {"index": 1, "categoryId": "uncategorized", "confidence": 0.3}]'
      )
    );

    const outcome = await categorizeWithLLM([txn(0), txn(1), txn(2)], CATEGORIES, 'key');

    expect(outcome.results.get(0)?.categoryId).toBe('groceries');
    expect(outcome.failures.get(1)).toMatch(/no valid category/);
    expect(outcome.failures.get(2)).toMatch(/no valid category/);
    expect(outcome.results.size).toBe(1);
    expect(outcome.failures.size).toBe(2);
  });

  it('fails only the batch an API error hits, keeping earlier batch results', async () => {
    // 60 transactions → two batches of 50 + 10. First batch succeeds, second throws.
    const transactions = Array.from({ length: 60 }, (_, i) => txn(i));
    const firstBatchJson = JSON.stringify(
      Array.from({ length: 50 }, (_, i) => ({ index: i, categoryId: 'groceries', confidence: 0.9 }))
    );
    createMock
      .mockResolvedValueOnce(textResponse(firstBatchJson))
      .mockRejectedValueOnce(new Error('529 overloaded'));

    const outcome = await categorizeWithLLM(transactions, CATEGORIES, 'key');

    expect(outcome.results.size).toBe(50);
    expect(outcome.failures.size).toBe(10);
    expect(outcome.failures.get(55)).toMatch(/529 overloaded/);
  });

  it('marks everything failed when there are no leaf categories to assign', async () => {
    const outcome = await categorizeWithLLM([txn(0)], [], 'key');

    expect(createMock).not.toHaveBeenCalled();
    expect(outcome.failures.get(0)).toMatch(/no leaf categories/);
  });

  it('clamps confidence into [0, 1] and defaults a missing confidence', async () => {
    createMock.mockResolvedValue(
      textResponse(
        '[{"index": 0, "categoryId": "groceries", "confidence": 7},' +
          ' {"index": 1, "categoryId": "transport"}]'
      )
    );

    const outcome = await categorizeWithLLM([txn(0), txn(1)], CATEGORIES, 'key');

    expect(outcome.results.get(0)?.confidence).toBe(1);
    expect(outcome.results.get(1)?.confidence).toBe(0.7);
  });
});
