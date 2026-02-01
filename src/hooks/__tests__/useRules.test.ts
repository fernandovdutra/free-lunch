import { describe, it, expect } from 'vitest';
import type { CategorizationRule } from '@/types';
import type { CreateRuleData } from '../useRules';

// Note: Since useRules depends heavily on Firebase and hooks,
// we test the type contracts here. Full integration tests
// would require Firebase emulator setup.

describe('CategorizationRule type', () => {
  it('has all required fields', () => {
    const rule: CategorizationRule = {
      id: 'rule-123',
      pattern: 'ALBERT HEIJN',
      matchType: 'contains',
      categoryId: 'groceries',
      priority: 100,
      isLearned: true,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(rule.id).toBe('rule-123');
    expect(rule.pattern).toBe('ALBERT HEIJN');
    expect(rule.matchType).toBe('contains');
    expect(rule.categoryId).toBe('groceries');
    expect(rule.priority).toBe(100);
    expect(rule.isLearned).toBe(true);
    expect(rule.isSystem).toBe(false);
    expect(rule.createdAt).toBeInstanceOf(Date);
    expect(rule.updatedAt).toBeInstanceOf(Date);
  });

  it('allows different match types', () => {
    const containsRule: CategorizationRule = {
      id: '1',
      pattern: 'test',
      matchType: 'contains',
      categoryId: 'cat',
      priority: 1,
      isLearned: false,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const exactRule: CategorizationRule = {
      ...containsRule,
      id: '2',
      matchType: 'exact',
    };

    const regexRule: CategorizationRule = {
      ...containsRule,
      id: '3',
      matchType: 'regex',
    };

    expect(containsRule.matchType).toBe('contains');
    expect(exactRule.matchType).toBe('exact');
    expect(regexRule.matchType).toBe('regex');
  });

  it('distinguishes learned from system rules', () => {
    const learnedRule: CategorizationRule = {
      id: 'learned',
      pattern: 'test',
      matchType: 'contains',
      categoryId: 'cat',
      priority: 1,
      isLearned: true,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const systemRule: CategorizationRule = {
      ...learnedRule,
      id: 'system',
      isLearned: false,
      isSystem: true,
    };

    expect(learnedRule.isLearned).toBe(true);
    expect(learnedRule.isSystem).toBe(false);
    expect(systemRule.isLearned).toBe(false);
    expect(systemRule.isSystem).toBe(true);
  });
});

describe('CreateRuleData type', () => {
  it('requires pattern, matchType, and categoryId', () => {
    const minimalData: CreateRuleData = {
      pattern: 'JUMBO',
      matchType: 'contains',
      categoryId: 'groceries',
    };

    expect(minimalData.pattern).toBe('JUMBO');
    expect(minimalData.matchType).toBe('contains');
    expect(minimalData.categoryId).toBe('groceries');
    expect(minimalData.isLearned).toBeUndefined();
  });

  it('allows optional isLearned flag', () => {
    const withLearned: CreateRuleData = {
      pattern: 'JUMBO',
      matchType: 'contains',
      categoryId: 'groceries',
      isLearned: true,
    };

    expect(withLearned.isLearned).toBe(true);
  });

  it('allows all match types', () => {
    const containsData: CreateRuleData = {
      pattern: 'test',
      matchType: 'contains',
      categoryId: 'cat',
    };

    const exactData: CreateRuleData = {
      pattern: 'test',
      matchType: 'exact',
      categoryId: 'cat',
    };

    const regexData: CreateRuleData = {
      pattern: '^test$',
      matchType: 'regex',
      categoryId: 'cat',
    };

    expect(containsData.matchType).toBe('contains');
    expect(exactData.matchType).toBe('exact');
    expect(regexData.matchType).toBe('regex');
  });
});

// Rule matching logic tests (simulating what the backend does)
describe('Rule matching logic', () => {
  interface MockRule {
    pattern: string;
    matchType: 'contains' | 'exact' | 'regex';
    categoryId: string;
    priority: number;
    isLearned: boolean;
  }

  const matchesRule = (description: string, rule: MockRule): boolean => {
    const desc = description.toUpperCase();
    const pattern = rule.pattern.toUpperCase();

    switch (rule.matchType) {
      case 'exact':
        return desc === pattern;
      case 'contains':
        return desc.includes(pattern);
      case 'regex':
        try {
          const regex = new RegExp(rule.pattern, 'i');
          return regex.test(description);
        } catch {
          return false;
        }
      default:
        return false;
    }
  };

  const findMatch = (
    description: string,
    rules: MockRule[]
  ): { rule: MockRule; confidence: number } | null => {
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (matchesRule(description, rule)) {
        return {
          rule,
          confidence: rule.isLearned ? 0.85 : 0.95,
        };
      }
    }

    return null;
  };

  it('matches contains patterns', () => {
    const rules: MockRule[] = [
      {
        pattern: 'HEIJN',
        matchType: 'contains',
        categoryId: 'groceries',
        priority: 100,
        isLearned: false,
      },
    ];

    const result = findMatch('ALBERT HEIJN AMSTERDAM', rules);
    expect(result).not.toBeNull();
    expect(result?.rule.categoryId).toBe('groceries');
    expect(result?.confidence).toBe(0.95);
  });

  it('matches exact patterns', () => {
    const rules: MockRule[] = [
      {
        pattern: 'SALARY',
        matchType: 'exact',
        categoryId: 'income',
        priority: 100,
        isLearned: false,
      },
    ];

    expect(findMatch('SALARY', rules)).not.toBeNull();
    expect(findMatch('SALARY PAYMENT', rules)).toBeNull();
  });

  it('matches regex patterns', () => {
    const rules: MockRule[] = [
      {
        pattern: 'HEIJN.*\\d+',
        matchType: 'regex',
        categoryId: 'groceries',
        priority: 100,
        isLearned: false,
      },
    ];

    expect(findMatch('ALBERT HEIJN STORE 1234', rules)).not.toBeNull();
    expect(findMatch('ALBERT HEIJN', rules)).toBeNull();
  });

  it('respects priority order', () => {
    const rules: MockRule[] = [
      {
        pattern: 'HEIJN',
        matchType: 'contains',
        categoryId: 'low',
        priority: 50,
        isLearned: false,
      },
      {
        pattern: 'HEIJN',
        matchType: 'contains',
        categoryId: 'high',
        priority: 200,
        isLearned: false,
      },
    ];

    const result = findMatch('ALBERT HEIJN', rules);
    expect(result?.rule.categoryId).toBe('high');
  });

  it('returns lower confidence for learned rules', () => {
    const rules: MockRule[] = [
      { pattern: 'TEST', matchType: 'contains', categoryId: 'cat', priority: 100, isLearned: true },
    ];

    const result = findMatch('TEST TRANSACTION', rules);
    expect(result?.confidence).toBe(0.85);
  });

  it('handles invalid regex gracefully', () => {
    const rules: MockRule[] = [
      {
        pattern: '[invalid(',
        matchType: 'regex',
        categoryId: 'cat',
        priority: 100,
        isLearned: false,
      },
    ];

    const result = findMatch('TEST', rules);
    expect(result).toBeNull();
  });
});
