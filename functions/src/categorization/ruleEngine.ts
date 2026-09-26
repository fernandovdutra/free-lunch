import type { StoredRule, CategorizationResult } from './types.js';

/**
 * Match a transaction description against user rules.
 * Rules are checked in priority order (highest first).
 */
export function matchRules(description: string, rules: StoredRule[], counterparty: string | null = null): CategorizationResult | null {
  const sortedRules = [...rules].filter((r) => r.enabled !== false).sort((a, b) =>
    (Number(b.confirmed === true) - Number(a.confirmed === true)) ||
    ((Number.isFinite(b.priority) ? b.priority : 0) - (Number.isFinite(a.priority) ? a.priority : 0)) ||
    (Number(b.targetField === 'counterparty') - Number(a.targetField === 'counterparty')) ||
    a.id.localeCompare(b.id)
  );

  for (const rule of sortedRules) {
    const target = rule.targetField === 'counterparty' ? counterparty :
      rule.targetField === 'description' ? description :
      [description, counterparty].filter(Boolean).join(' ');
    if (target !== null && matchesRule(target, rule)) {
      return {
        categoryId: rule.categoryId,
        confidence: rule.isLearned && !rule.confirmed ? 0.85 : 0.95,
        source: rule.isLearned && !rule.confirmed ? 'learned' : 'rule',
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
  const desc = description.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
  const pattern = rule.pattern.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!pattern || pattern.length > 256) return false;

  switch (rule.matchType) {
    case 'exact':
      return desc === pattern;

    case 'contains':
      return desc.includes(pattern);

    case 'regex':
      try {
        // Existing regex rules remain readable; reject unbounded/nested
        // quantifiers and oversized inputs until a bounded evaluator exists.
        if (description.length > 2048 || /\([^)]*[+*][^)]*\)[+*{]/.test(rule.pattern)) return false;
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
