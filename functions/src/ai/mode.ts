/** Only an explicit transitional setting can invoke the old paid backend.
 * The normal operation uses the connected ChatGPT daily task for research.
 */
export const financeAiMode = () => process.env.FINANCE_AI_MODE === 'legacy_anthropic' ? 'legacy_anthropic' : 'assisted';
export const reportOwner = () => process.env.FINANCE_REPORT_OWNER === 'legacy_backend' ? 'legacy_backend' : 'chatgpt';
