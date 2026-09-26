import { MERCHANT_CATEGORY_IDS, isAssignableCategory, type AssignableCategory } from './categoryRegistry.js';
import { matchMerchant } from './merchantDatabase.js';
import { matchRules } from './ruleEngine.js';
import type { CategorizationResult, StoredRule } from './types.js';

export interface EvaluationInput {
  description: string;
  counterparty: string | null;
  categoryId?: string | null;
  categorySource?: string;
  override?: boolean;
  intentionallyUncategorized?: boolean;
  isSplit?: boolean;
  isTransfer?: boolean;
  excludeFromTotals?: boolean;
}

const unresolved: CategorizationResult = { categoryId: null, confidence: 0, source: 'none' };

/** Pure evaluator used by imports and repairs. No provider calls or writes. */
export function evaluateCategorization(input: EvaluationInput, rules: StoredRule[], categories: AssignableCategory[]): CategorizationResult {
  if (input.override || input.intentionallyUncategorized ||
      ['manual', 'user_bulk'].includes(input.categorySource ?? '') ||
      input.isSplit || input.isTransfer || input.excludeFromTotals ||
      (typeof input.categoryId === 'string' && input.categoryId.startsWith('transfer'))) {
    return { ...unresolved };
  }

  const confirmed = matchRules(input.description, rules.filter((r) => !r.isLearned || r.confirmed === true), input.counterparty);
  if (confirmed && isAssignableCategory(confirmed.categoryId, categories)) return confirmed;

  // A verified counterparty is more reliable than arbitrary bank remittance
  // text. The matcher uses word boundaries and prefers a service-specific name.
  const merchant = matchMerchant(input.counterparty || input.description);
  if (merchant) {
    const id = MERCHANT_CATEGORY_IDS[merchant.categorySlug];
    if (id && isAssignableCategory(id, categories)) return {
      categoryId: id, confidence: merchant.confidence, source: 'merchant', matchedPattern: merchant.pattern,
    };
  }

  const legacy = matchRules(input.description, rules.filter((r) => r.isLearned && r.confirmed !== true), input.counterparty);
  if (legacy && isAssignableCategory(legacy.categoryId, categories)) return legacy;
  return { ...unresolved };
}
