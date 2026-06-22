/**
 * Lazily construct an Anthropic client.
 *
 * The Functions runtime loads the entire entry module (`index.ts`) on every
 * cold start to discover triggers, which transitively loads every handler's
 * top-level imports. A top-level `import '@anthropic-ai/sdk'` therefore taxes
 * the cold start of *every* function — even ones that never call the LLM
 * (e.g. getDashboardData, getBankStatus). Importing the SDK dynamically here
 * keeps it out of that cold path; it loads only when an LLM call actually runs.
 * The runtime memoizes `import()`, so repeat calls don't re-evaluate the module.
 */
export async function createAnthropic(apiKey: string) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey });
}

/** Instance type of the lazily-created Anthropic client. */
export type AnthropicClient = Awaited<ReturnType<typeof createAnthropic>>;
