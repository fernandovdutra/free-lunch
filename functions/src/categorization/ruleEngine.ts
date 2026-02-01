import type { StoredRule, CategorizationResult } from './types.js';

/**
 * Match a transaction description against user rules.
 * Rules are checked in priority order (highest first).
 */
export function matchRules(description: string, rules: StoredRule[]): CategorizationResult | null {
  // Sort by priority descending
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (matchesRule(description, rule)) {
      return {
        categoryId: rule.categoryId,
        confidence: rule.isLearned ? 0.85 : 0.95,
        source: rule.isLearned ? 'learned' : 'rule',
        matchedPattern: rule.pattern,
        ruleId: rule.id,
      };
    }
  }

  return null;
}

/**
 * Check if a description matches a single rule
 */
function matchesRule(description: string, rule: StoredRule): boolean {
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
        // Invalid regex, skip this rule
        return false;
      }

    default:
      return false;
  }
}
