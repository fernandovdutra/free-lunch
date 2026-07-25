/**
 * Robust JSON extraction for LLM responses.
 *
 * Models occasionally wrap the requested JSON in markdown fences or prose
 * ("Here is the categorization: [...] Let me know…"). A bare `JSON.parse`
 * on the raw text silently discards the whole payload in those cases, so
 * every LLM call site that expects JSON goes through {@link extractJson}
 * (pure) or {@link requestLlmJson} (call + parse + one corrective retry).
 */

export type ExtractJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/** Strip a leading/trailing markdown code fence (``` or ```json). */
function stripCodeFences(text: string): string {
  let out = text.trim();
  if (out.startsWith('```')) {
    out = out.replace(/^```[a-zA-Z]*\r?\n?/, '').replace(/\r?\n?```\s*$/, '');
  }
  return out.trim();
}

/**
 * Scan for a balanced `{…}` / `[…]` block starting at `start`, respecting
 * JSON string literals and escapes. Returns the end index (exclusive) of the
 * balanced block, or null when the text ends before the block closes
 * (e.g. a truncated response).
 */
function findBalancedEnd(text: string, start: number): number | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') {
      const open = stack.pop();
      if ((ch === '}' && open !== '{') || (ch === ']' && open !== '[')) return null;
      if (stack.length === 0) return i + 1;
    }
  }
  return null;
}

/** Max candidate blocks to attempt before giving up (guards pathological input). */
const MAX_BLOCK_ATTEMPTS = 10;

/**
 * Extract and parse the first JSON value from an LLM response: strips code
 * fences, tries a direct parse, then locates the first balanced `{…}` or
 * `[…]` block inside surrounding prose. Returns a typed error (never throws)
 * so callers can decide whether to retry.
 */
export function extractJson(text: string): ExtractJsonResult {
  const unfenced = stripCodeFences(text);
  if (unfenced.length === 0) {
    return { ok: false, error: 'empty response' };
  }

  try {
    return { ok: true, value: JSON.parse(unfenced) };
  } catch {
    // fall through to balanced-block scan
  }

  let attempts = 0;
  for (let i = 0; i < unfenced.length && attempts < MAX_BLOCK_ATTEMPTS; i++) {
    const ch = unfenced[i];
    if (ch !== '{' && ch !== '[') continue;
    attempts++;
    const end = findBalancedEnd(unfenced, i);
    if (end === null) {
      // No balanced close from this opener — with well-formed JSON later in
      // the text a later opener can still succeed, so keep scanning.
      continue;
    }
    try {
      return { ok: true, value: JSON.parse(unfenced.slice(i, end)) };
    } catch {
      // Balanced but not valid JSON (e.g. code snippet) — try the next block.
    }
  }

  return {
    ok: false,
    error: 'no parseable JSON found in response (possibly truncated or prose-only)',
  };
}

/**
 * Corrective instruction appended to the prompt on the single retry after a
 * parse failure.
 */
export const JSON_RETRY_INSTRUCTION =
  'IMPORTANT: Your previous reply could not be parsed as JSON. ' +
  'Respond with ONLY valid JSON — no prose, no markdown code fences, no explanations.';

/**
 * The minimal Anthropic-client surface {@link requestLlmJson} needs. The real
 * `Anthropic` instance satisfies this structurally; tests pass a stub.
 */
export interface LlmJsonClient {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: 'user'; content: string }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

export interface RequestLlmJsonOptions {
  model: string;
  maxTokens: number;
  prompt: string;
  /** Short label for log lines, e.g. `categorization batch (42 txns)`. */
  label: string;
}

function responseText(message: { content: Array<{ type: string; text?: string }> }): string | null {
  const block = message.content.find((b) => b.type === 'text');
  return block && typeof block.text === 'string' ? block.text : null;
}

/**
 * Call the LLM expecting a JSON response; on a parse failure retry ONCE with
 * {@link JSON_RETRY_INSTRUCTION} appended to the prompt. Parse failures are
 * logged with the label and the first 200 chars of the offending text (never
 * the full payload). API/network errors are NOT caught here — a corrective
 * re-prompt cannot fix those, so they propagate to the caller.
 */
export async function requestLlmJson(
  client: LlmJsonClient,
  options: RequestLlmJsonOptions
): Promise<ExtractJsonResult> {
  const { model, maxTokens, prompt, label } = options;

  let lastError = 'no attempt made';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const content = attempt === 1 ? prompt : `${prompt}\n\n${JSON_RETRY_INSTRUCTION}`;
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    });

    const text = responseText(message);
    if (text === null) {
      lastError = 'LLM returned no text content';
      console.warn(`LLM ${label}: attempt ${attempt} returned no text content`);
      continue;
    }

    const extracted = extractJson(text);
    if (extracted.ok) return extracted;

    lastError = extracted.error;
    console.warn(
      `LLM ${label}: attempt ${attempt} JSON parse failed (${extracted.error}); ` +
        `first 200 chars: ${JSON.stringify(text.slice(0, 200))}`
    );
  }

  console.error(`LLM ${label}: giving up after retry — ${lastError}`);
  return { ok: false, error: lastError };
}
