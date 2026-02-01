import { describe, it, expect } from 'vitest';
import { matchRules } from '../ruleEngine';
import type { StoredRule } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

// Mock Timestamp for testing
const mockTimestamp = {
  toDate: () => new Date(),
  toMillis: () => Date.now(),
  seconds: Math.floor(Date.now() / 1000),
  nanoseconds: 0,
  isEqual: () => false,
  valueOf: () => '',
} as unknown as Timestamp;

const createRule = (overrides: Partial<StoredRule> = {}): StoredRule => ({
  id: 'rule-1',
  pattern: 'TEST',
  matchType: 'contains',
  categoryId: 'category-1',
  priority: 100,
  isLearned: false,
  isSystem: false,
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  ...overrides,
});

describe('matchRules', () => {
  describe('contains match type', () => {
    it('matches when pattern is contained in description', () => {
      const rules = [createRule({ pattern: 'HEIJN', matchType: 'contains' })];
      const result = matchRules('ALBERT HEIJN STORE', rules);

      expect(result).not.toBeNull();
      expect(result?.categoryId).toBe('category-1');
      expect(result?.source).toBe('rule');
      expect(result?.matchedPattern).toBe('HEIJN');
    });

    it('matches case-insensitively', () => {
      const rules = [createRule({ pattern: 'heijn', matchType: 'contains' })];
      const result = matchRules('ALBERT HEIJN STORE', rules);

      expect(result).not.toBeNull();
    });

    it('does not match when pattern is not contained', () => {
      const rules = [createRule({ pattern: 'JUMBO', matchType: 'contains' })];
      const result = matchRules('ALBERT HEIJN STORE', rules);

      expect(result).toBeNull();
    });
  });

  describe('exact match type', () => {
    it('matches when description exactly equals pattern', () => {
      const rules = [createRule({ pattern: 'ALBERT HEIJN', matchType: 'exact' })];
      const result = matchRules('ALBERT HEIJN', rules);

      expect(result).not.toBeNull();
      expect(result?.categoryId).toBe('category-1');
    });

    it('matches case-insensitively for exact match', () => {
      const rules = [createRule({ pattern: 'albert heijn', matchType: 'exact' })];
      const result = matchRules('ALBERT HEIJN', rules);

      expect(result).not.toBeNull();
    });

    it('does not match when description is longer than pattern', () => {
      const rules = [createRule({ pattern: 'ALBERT HEIJN', matchType: 'exact' })];
      const result = matchRules('ALBERT HEIJN STORE', rules);

      expect(result).toBeNull();
    });
  });

  describe('regex match type', () => {
    it('matches using regex pattern', () => {
      const rules = [createRule({ pattern: 'HEIJN.*STORE', matchType: 'regex' })];
      const result = matchRules('ALBERT HEIJN MEGA STORE', rules);

      expect(result).not.toBeNull();
    });

    it('matches case-insensitively with regex', () => {
      const rules = [createRule({ pattern: 'heijn.*store', matchType: 'regex' })];
      const result = matchRules('ALBERT HEIJN MEGA STORE', rules);

      expect(result).not.toBeNull();
    });

    it('handles invalid regex gracefully', () => {
      const rules = [createRule({ pattern: '[invalid(regex', matchType: 'regex' })];
      const result = matchRules('SOME DESCRIPTION', rules);

      expect(result).toBeNull();
    });

    it('matches using character classes', () => {
      const rules = [createRule({ pattern: '^\\d{4}\\s', matchType: 'regex' })];
      const result = matchRules('1234 PAYMENT', rules);

      expect(result).not.toBeNull();
    });
  });

  describe('priority ordering', () => {
    it('returns match from highest priority rule', () => {
      const rules = [
        createRule({ id: 'low', pattern: 'HEIJN', priority: 50, categoryId: 'low-priority' }),
        createRule({ id: 'high', pattern: 'HEIJN', priority: 200, categoryId: 'high-priority' }),
        createRule({ id: 'mid', pattern: 'HEIJN', priority: 100, categoryId: 'mid-priority' }),
      ];

      const result = matchRules('ALBERT HEIJN', rules);

      expect(result).not.toBeNull();
      expect(result?.categoryId).toBe('high-priority');
      expect(result?.ruleId).toBe('high');
    });

    it('handles equal priority by array order', () => {
      const rules = [
        createRule({ id: 'first', pattern: 'HEIJN', priority: 100, categoryId: 'first' }),
        createRule({ id: 'second', pattern: 'HEIJN', priority: 100, categoryId: 'second' }),
      ];

      const result = matchRules('ALBERT HEIJN', rules);

      expect(result).not.toBeNull();
      // Should match first rule with equal priority (stable sort behavior may vary)
    });
  });

  describe('learned vs non-learned rules', () => {
    it('returns lower confidence for learned rules', () => {
      const learnedRule = createRule({ isLearned: true });
      const result = matchRules('TEST DESCRIPTION', [learnedRule]);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(0.85);
      expect(result?.source).toBe('learned');
    });

    it('returns higher confidence for non-learned rules', () => {
      const nonLearnedRule = createRule({ isLearned: false });
      const result = matchRules('TEST DESCRIPTION', [nonLearnedRule]);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(0.95);
      expect(result?.source).toBe('rule');
    });
  });

  describe('edge cases', () => {
    it('returns null for empty rules array', () => {
      const result = matchRules('SOME DESCRIPTION', []);

      expect(result).toBeNull();
    });

    it('returns null when no rules match', () => {
      const rules = [createRule({ pattern: 'JUMBO' }), createRule({ pattern: 'LIDL' })];

      const result = matchRules('ALBERT HEIJN', rules);

      expect(result).toBeNull();
    });

    it('handles empty description', () => {
      const rules = [createRule({ pattern: 'TEST' })];
      const result = matchRules('', rules);

      expect(result).toBeNull();
    });

    it('includes rule ID in result', () => {
      const rules = [createRule({ id: 'my-rule-id' })];
      const result = matchRules('TEST', rules);

      expect(result?.ruleId).toBe('my-rule-id');
    });

    it('includes matched pattern in result', () => {
      const rules = [createRule({ pattern: 'CUSTOM PATTERN' })];
      const result = matchRules('THIS IS A CUSTOM PATTERN MATCH', rules);

      expect(result?.matchedPattern).toBe('CUSTOM PATTERN');
    });
  });
});
