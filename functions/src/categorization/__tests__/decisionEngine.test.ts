import { describe, expect, it } from 'vitest';
import { evaluateCategorization } from '../decisionEngine.js';
import { MERCHANT_CATEGORY_IDS, isAssignableCategory } from '../categoryRegistry.js';
import { DUTCH_MERCHANTS } from '../merchantDatabase.js';
import type { StoredRule } from '../types.js';

const categories = [
  { id: 'food', parentId: null }, { id: 'food-groceries', parentId: 'food' },
  { id: 'food-coffee', parentId: 'food' }, { id: 'food-takeaway', parentId: 'food' },
  { id: 'transport', parentId: null }, { id: 'transport-public', parentId: 'transport' },
  { id: 'transport-fuel', parentId: 'transport' }, { id: 'transport-taxi', parentId: 'transport' },
  { id: 'shopping', parentId: null }, { id: 'shopping-home', parentId: 'shopping' },
  { id: 'subscriptions', parentId: null }, { id: 'subscriptions-streaming', parentId: 'subscriptions' },
  { id: 'pets', parentId: null }, { id: 'uncategorized', parentId: null },
];

function evaluate(counterparty: string, rules: StoredRule[] = []) {
  return evaluateCategorization({ description: `${counterparty} receipt`, counterparty }, rules, categories);
}
function rule(overrides: Partial<StoredRule>): StoredRule {
  return { id: 'r1', pattern: 'SHELL', matchType: 'exact', targetField: 'counterparty',
    categoryId: 'pets', priority: 1, isLearned: true, isSystem: false, confirmed: true,
    createdAt: {} as StoredRule['createdAt'], updatedAt: {} as StoredRule['updatedAt'], ...overrides };
}

describe('pure categorization policy', () => {
  it('maps built-in merchants to exact default IDs and distinguishes services', () => {
    expect(evaluate('IKEA').categoryId).toBe('shopping-home');
    expect(evaluate('SHELL').categoryId).toBe('transport-fuel');
    expect(evaluate('NS GROEP').categoryId).toBe('transport-public');
    expect(evaluate('STARBUCKS').categoryId).toBe('food-coffee');
    expect(evaluate('NETFLIX').categoryId).toBe('subscriptions-streaming');
    expect(evaluate('UBER EATS').categoryId).toBe('food-takeaway');
    expect(evaluate('UBER TRIP').categoryId).toBe('transport-taxi');
  });

  it('abstains on payment processors, bank names and partial word collisions', () => {
    for (const name of ['PAYPAL IKEA', 'ADYEN SHELL', 'RABOBANK', 'SHELLFISH', 'SUPERSTARBUCKS']) {
      expect(evaluate(name).categoryId, name).toBeNull();
    }
  });

  it('confirmed ChatGPT rule beats a built-in and exact counterparty ignores a repeated description', () => {
    const confirmed = rule({ pattern: 'SHELL', categoryId: 'pets' });
    const result = evaluateCategorization({ description: 'SHELL SHELL', counterparty: 'SHELL' }, [confirmed], categories);
    expect(result.categoryId).toBe('pets');
    expect(result.source).toBe('rule');
    expect(evaluate('SHELL', [rule({ confirmed: false })]).categoryId).toBe('transport-fuel');
  });

  it('protects explicit/manual and structural decisions; root leaves are assignable', () => {
    expect(isAssignableCategory('pets', categories)).toBe(true);
    expect(isAssignableCategory('food', categories)).toBe(false);
    expect(isAssignableCategory('uncategorized', categories)).toBe(false);
    expect(evaluateCategorization({ description: 'IKEA', counterparty: 'IKEA', override: true }, [], categories).categoryId).toBeNull();
    expect(evaluateCategorization({ description: 'IKEA', counterparty: 'IKEA', isSplit: true }, [], categories).categoryId).toBeNull();
    expect(evaluateCategorization({ description: 'IKEA', counterparty: 'IKEA', categoryId: 'transfer-cc' }, [], categories).categoryId).toBeNull();
  });

  it('every built-in slug is declared, with ambiguous broad types explicitly abstaining', () => {
    for (const merchant of DUTCH_MERCHANTS) expect(Object.hasOwn(MERCHANT_CATEGORY_IDS, merchant.categorySlug)).toBe(true);
    expect(MERCHANT_CATEGORY_IDS.health).toBeNull();
  });
});
