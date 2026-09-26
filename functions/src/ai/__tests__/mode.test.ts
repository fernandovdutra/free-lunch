import { afterEach, describe, expect, it } from 'vitest';
import { financeAiMode, reportOwner } from '../mode.js';

afterEach(() => { delete process.env.FINANCE_AI_MODE; delete process.env.FINANCE_REPORT_OWNER; });

describe('assisted defaults', () => {
  it('does not admit paid inference or duplicate backend reports by default', () => {
    delete process.env.FINANCE_AI_MODE;
    delete process.env.FINANCE_REPORT_OWNER;
    expect(financeAiMode()).toBe('assisted');
    expect(reportOwner()).toBe('chatgpt');
    process.env.FINANCE_AI_MODE = 'openai';
    process.env.FINANCE_REPORT_OWNER = 'backend';
    expect(financeAiMode()).toBe('assisted');
    expect(reportOwner()).toBe('chatgpt');
  });
  it('legacy provider requires exact, explicit transitional configuration', () => {
    process.env.FINANCE_AI_MODE = 'legacy_anthropic';
    process.env.FINANCE_REPORT_OWNER = 'legacy_backend';
    expect(financeAiMode()).toBe('legacy_anthropic');
    expect(reportOwner()).toBe('legacy_backend');
  });
});
