import { describe, it, expect } from 'vitest';
import { formatMemoryForPrompt, type AdvisorMemoryData } from '../memoryManager';

function createMemory(overrides: Partial<AdvisorMemoryData> = {}): AdvisorMemoryData {
  return {
    financialProfile: overrides.financialProfile ?? '',
    recurringExpenses: overrides.recurringExpenses ?? [],
    activeGoals: overrides.activeGoals ?? [],
    investmentProfile: overrides.investmentProfile ?? '',
    pastAdvice: overrides.pastAdvice ?? [],
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

describe('formatMemoryForPrompt', () => {
  it('returns all sections for full memory', () => {
    const result = formatMemoryForPrompt(
      createMemory({
        financialProfile: 'Moderate spender in Amsterdam',
        recurringExpenses: [
          { counterparty: 'Spotify', amount: 9.99, frequency: 'monthly' },
        ],
        activeGoals: [
          { goalId: 'g1', name: 'Emergency Fund', summary: '€5000 target' },
        ],
        investmentProfile: 'Conservative ETF portfolio',
        pastAdvice: [
          { date: new Date(), advice: 'Reduce dining out' },
        ],
      })
    );
    expect(result).toContain('Financial Profile: Moderate spender in Amsterdam');
    expect(result).toContain('Known Recurring Expenses:');
    expect(result).toContain('Spotify: €9.99 (monthly)');
    expect(result).toContain('Active Goals:');
    expect(result).toContain('Emergency Fund: €5000 target');
    expect(result).toContain('Investment Profile: Conservative ETF portfolio');
    expect(result).toContain('Recent Advice Given:');
    expect(result).toContain('Reduce dining out');
  });

  it('returns empty string for empty memory', () => {
    const result = formatMemoryForPrompt(createMemory());
    expect(result).toBe('');
  });

  it('returns only populated sections', () => {
    const result = formatMemoryForPrompt(
      createMemory({ financialProfile: 'Test profile' })
    );
    expect(result).toContain('Financial Profile: Test profile');
    expect(result).not.toContain('Known Recurring Expenses');
    expect(result).not.toContain('Active Goals');
    expect(result).not.toContain('Investment Profile');
    expect(result).not.toContain('Recent Advice Given');
  });

  it('caps past advice output at last 5 entries', () => {
    const advice = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(),
      advice: `Tip-${String.fromCharCode(65 + i)}`, // Tip-A through Tip-J
    }));
    const result = formatMemoryForPrompt(createMemory({ pastAdvice: advice }));
    // Should show last 5: Tip-F through Tip-J
    expect(result).not.toContain('Tip-A');
    expect(result).not.toContain('Tip-E');
    expect(result).toContain('Tip-F');
    expect(result).toContain('Tip-J');
  });

  it('shows outcomes with arrow notation', () => {
    const result = formatMemoryForPrompt(
      createMemory({
        pastAdvice: [
          { date: new Date(), advice: 'Cut subscriptions', outcome: 'Saved €30/month' },
        ],
      })
    );
    expect(result).toContain('Cut subscriptions');
    expect(result).toContain('→ Saved €30/month');
  });
});
