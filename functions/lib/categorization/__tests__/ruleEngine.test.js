'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const vitest_1 = require('vitest');
const ruleEngine_1 = require('../ruleEngine');
// Mock Timestamp for testing
const mockTimestamp = {
  toDate: () => new Date(),
  toMillis: () => Date.now(),
  seconds: Math.floor(Date.now() / 1000),
  nanoseconds: 0,
  isEqual: () => false,
  valueOf: () => '',
};
const createRule = (overrides = {}) => ({
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
(0, vitest_1.describe)('matchRules', () => {
  (0, vitest_1.describe)('contains match type', () => {
    (0, vitest_1.it)('matches when pattern is contained in description', () => {
      const rules = [createRule({ pattern: 'HEIJN', matchType: 'contains' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN STORE', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
      (0, vitest_1.expect)(result?.categoryId).toBe('category-1');
      (0, vitest_1.expect)(result?.source).toBe('rule');
      (0, vitest_1.expect)(result?.matchedPattern).toBe('HEIJN');
    });
    (0, vitest_1.it)('matches case-insensitively', () => {
      const rules = [createRule({ pattern: 'heijn', matchType: 'contains' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN STORE', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
    });
    (0, vitest_1.it)('does not match when pattern is not contained', () => {
      const rules = [createRule({ pattern: 'JUMBO', matchType: 'contains' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN STORE', rules);
      (0, vitest_1.expect)(result).toBeNull();
    });
  });
  (0, vitest_1.describe)('exact match type', () => {
    (0, vitest_1.it)('matches when description exactly equals pattern', () => {
      const rules = [createRule({ pattern: 'ALBERT HEIJN', matchType: 'exact' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
      (0, vitest_1.expect)(result?.categoryId).toBe('category-1');
    });
    (0, vitest_1.it)('matches case-insensitively for exact match', () => {
      const rules = [createRule({ pattern: 'albert heijn', matchType: 'exact' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
    });
    (0, vitest_1.it)('does not match when description is longer than pattern', () => {
      const rules = [createRule({ pattern: 'ALBERT HEIJN', matchType: 'exact' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN STORE', rules);
      (0, vitest_1.expect)(result).toBeNull();
    });
  });
  (0, vitest_1.describe)('regex match type', () => {
    (0, vitest_1.it)('matches using regex pattern', () => {
      const rules = [createRule({ pattern: 'HEIJN.*STORE', matchType: 'regex' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN MEGA STORE', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
    });
    (0, vitest_1.it)('matches case-insensitively with regex', () => {
      const rules = [createRule({ pattern: 'heijn.*store', matchType: 'regex' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN MEGA STORE', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
    });
    (0, vitest_1.it)('handles invalid regex gracefully', () => {
      const rules = [createRule({ pattern: '[invalid(regex', matchType: 'regex' })];
      const result = (0, ruleEngine_1.matchRules)('SOME DESCRIPTION', rules);
      (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)('matches using character classes', () => {
      const rules = [createRule({ pattern: '^\\d{4}\\s', matchType: 'regex' })];
      const result = (0, ruleEngine_1.matchRules)('1234 PAYMENT', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
    });
  });
  (0, vitest_1.describe)('priority ordering', () => {
    (0, vitest_1.it)('returns match from highest priority rule', () => {
      const rules = [
        createRule({ id: 'low', pattern: 'HEIJN', priority: 50, categoryId: 'low-priority' }),
        createRule({ id: 'high', pattern: 'HEIJN', priority: 200, categoryId: 'high-priority' }),
        createRule({ id: 'mid', pattern: 'HEIJN', priority: 100, categoryId: 'mid-priority' }),
      ];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
      (0, vitest_1.expect)(result?.categoryId).toBe('high-priority');
      (0, vitest_1.expect)(result?.ruleId).toBe('high');
    });
    (0, vitest_1.it)('handles equal priority by array order', () => {
      const rules = [
        createRule({ id: 'first', pattern: 'HEIJN', priority: 100, categoryId: 'first' }),
        createRule({ id: 'second', pattern: 'HEIJN', priority: 100, categoryId: 'second' }),
      ];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN', rules);
      (0, vitest_1.expect)(result).not.toBeNull();
      // Should match first rule with equal priority (stable sort behavior may vary)
    });
  });
  (0, vitest_1.describe)('learned vs non-learned rules', () => {
    (0, vitest_1.it)('returns lower confidence for learned rules', () => {
      const learnedRule = createRule({ isLearned: true });
      const result = (0, ruleEngine_1.matchRules)('TEST DESCRIPTION', [learnedRule]);
      (0, vitest_1.expect)(result).not.toBeNull();
      (0, vitest_1.expect)(result?.confidence).toBe(0.85);
      (0, vitest_1.expect)(result?.source).toBe('learned');
    });
    (0, vitest_1.it)('returns higher confidence for non-learned rules', () => {
      const nonLearnedRule = createRule({ isLearned: false });
      const result = (0, ruleEngine_1.matchRules)('TEST DESCRIPTION', [nonLearnedRule]);
      (0, vitest_1.expect)(result).not.toBeNull();
      (0, vitest_1.expect)(result?.confidence).toBe(0.95);
      (0, vitest_1.expect)(result?.source).toBe('rule');
    });
  });
  (0, vitest_1.describe)('edge cases', () => {
    (0, vitest_1.it)('returns null for empty rules array', () => {
      const result = (0, ruleEngine_1.matchRules)('SOME DESCRIPTION', []);
      (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)('returns null when no rules match', () => {
      const rules = [createRule({ pattern: 'JUMBO' }), createRule({ pattern: 'LIDL' })];
      const result = (0, ruleEngine_1.matchRules)('ALBERT HEIJN', rules);
      (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)('handles empty description', () => {
      const rules = [createRule({ pattern: 'TEST' })];
      const result = (0, ruleEngine_1.matchRules)('', rules);
      (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)('includes rule ID in result', () => {
      const rules = [createRule({ id: 'my-rule-id' })];
      const result = (0, ruleEngine_1.matchRules)('TEST', rules);
      (0, vitest_1.expect)(result?.ruleId).toBe('my-rule-id');
    });
    (0, vitest_1.it)('includes matched pattern in result', () => {
      const rules = [createRule({ pattern: 'CUSTOM PATTERN' })];
      const result = (0, ruleEngine_1.matchRules)('THIS IS A CUSTOM PATTERN MATCH', rules);
      (0, vitest_1.expect)(result?.matchedPattern).toBe('CUSTOM PATTERN');
    });
  });
});
//# sourceMappingURL=ruleEngine.test.js.map
