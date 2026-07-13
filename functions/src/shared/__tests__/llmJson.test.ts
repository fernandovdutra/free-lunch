import { describe, it, expect, vi } from 'vitest';
import {
  extractJson,
  requestLlmJson,
  JSON_RETRY_INSTRUCTION,
  type LlmJsonClient,
} from '../llmJson';

describe('extractJson', () => {
  it('parses a plain JSON object', () => {
    expect(extractJson('{"a": 1}')).toEqual({ ok: true, value: { a: 1 } });
  });

  it('parses a plain JSON array', () => {
    expect(extractJson('[{"index": 0, "categoryId": "x"}]')).toEqual({
      ok: true,
      value: [{ index: 0, categoryId: 'x' }],
    });
  });

  it('strips markdown code fences (```json)', () => {
    const text = '```json\n[{"index": 1}]\n```';
    expect(extractJson(text)).toEqual({ ok: true, value: [{ index: 1 }] });
  });

  it('strips bare code fences with surrounding whitespace', () => {
    const text = '  ```\n{"a": true}\n```  ';
    expect(extractJson(text)).toEqual({ ok: true, value: { a: true } });
  });

  it('extracts JSON wrapped in leading and trailing prose', () => {
    const text =
      'Sure! Here are the categorizations you asked for:\n\n' +
      '[{"index": 0, "categoryId": "groceries", "confidence": 0.9}]\n\n' +
      'Let me know if you need anything else.';
    expect(extractJson(text)).toEqual({
      ok: true,
      value: [{ index: 0, categoryId: 'groceries', confidence: 0.9 }],
    });
  });

  it('handles braces and brackets inside JSON string values', () => {
    const text = 'Result: {"note": "an [odd] {value} with \\" escape"} — done.';
    expect(extractJson(text)).toEqual({
      ok: true,
      value: { note: 'an [odd] {value} with " escape' },
    });
  });

  it('skips an unbalanced early brace and still finds the real JSON', () => {
    const text = 'weird { prose... {"a": 1}';
    expect(extractJson(text)).toEqual({ ok: true, value: { a: 1 } });
  });

  it('returns a typed error for a truncated response', () => {
    const result = extractJson('[{"index": 0, "categoryId": "gro');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no parseable JSON/i);
  });

  it('returns a typed error for prose with no JSON at all', () => {
    const result = extractJson('I cannot categorize these transactions, sorry.');
    expect(result.ok).toBe(false);
  });

  it('returns a typed error for an empty response', () => {
    const result = extractJson('   ');
    expect(result.ok).toBe(false);
  });
});

function fakeClient(responses: Array<string | null>): {
  client: LlmJsonClient;
  create: ReturnType<typeof vi.fn>;
} {
  let call = 0;
  const create = vi.fn(async () => {
    const text = responses[Math.min(call, responses.length - 1)];
    call++;
    return {
      content: text === null ? [] : [{ type: 'text', text }],
    };
  });
  return { client: { messages: { create } }, create };
}

describe('requestLlmJson', () => {
  it('returns parsed JSON on the first attempt without retrying', async () => {
    const { client, create } = fakeClient(['{"summary": "ok"}']);

    const result = await requestLlmJson(client, {
      model: 'test-model',
      maxTokens: 100,
      prompt: 'PROMPT',
      label: 'test',
    });

    expect(result).toEqual({ ok: true, value: { summary: 'ok' } });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].messages[0].content).toBe('PROMPT');
  });

  it('retries once with the corrective instruction appended and succeeds', async () => {
    const { client, create } = fakeClient([
      'Sorry, something went wrong and here is my thinking...',
      '{"summary": "second time lucky"}',
    ]);

    const result = await requestLlmJson(client, {
      model: 'test-model',
      maxTokens: 100,
      prompt: 'PROMPT',
      label: 'test',
    });

    expect(result).toEqual({ ok: true, value: { summary: 'second time lucky' } });
    expect(create).toHaveBeenCalledTimes(2);
    const retryContent = create.mock.calls[1][0].messages[0].content as string;
    expect(retryContent).toContain('PROMPT');
    expect(retryContent).toContain(JSON_RETRY_INSTRUCTION);
    expect(retryContent).toMatch(/ONLY valid JSON/);
  });

  it('gives up after exactly one retry and returns a typed error', async () => {
    const { client, create } = fakeClient(['prose only', 'still prose only']);

    const result = await requestLlmJson(client, {
      model: 'test-model',
      maxTokens: 100,
      prompt: 'PROMPT',
      label: 'test',
    });

    expect(result.ok).toBe(false);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('treats a response with no text block as a retryable failure', async () => {
    const { client, create } = fakeClient([null, '[1, 2]']);

    const result = await requestLlmJson(client, {
      model: 'test-model',
      maxTokens: 100,
      prompt: 'PROMPT',
      label: 'test',
    });

    expect(result).toEqual({ ok: true, value: [1, 2] });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('propagates API errors instead of retrying (re-prompt cannot fix them)', async () => {
    const create = vi.fn(async () => {
      throw new Error('429 rate limited');
    });
    const client: LlmJsonClient = { messages: { create } };

    await expect(
      requestLlmJson(client, { model: 'm', maxTokens: 10, prompt: 'p', label: 'test' })
    ).rejects.toThrow('429 rate limited');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
