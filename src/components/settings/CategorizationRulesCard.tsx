import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRules, useCreateRule, useDeleteRule } from '@/hooks/useRules';
import type { Category } from '@/types';

interface CategorizationRulesCardProps {
  categories: Category[];
}

/**
 * Flat-rewrite of the original shadcn-card categorization rules editor.
 * Drops Card/Card{Header,Content} + lucide icons, renders against
 * bg-surface + border-rule with mono labels and an inline `+ NEW` action
 * in the header. The dialog body is preserved (still uses shadcn Dialog
 * primitives) so the input + select wiring keeps working.
 */
export function CategorizationRulesCard({
  categories,
}: CategorizationRulesCardProps) {
  const [newRuleDialogOpen, setNewRuleDialogOpen] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleMatchType, setNewRuleMatchType] = useState<'contains' | 'exact'>(
    'contains'
  );
  const [newRuleCategoryId, setNewRuleCategoryId] = useState('');

  const { data: rules = [], isLoading: isLoadingRules } = useRules();
  const createRuleMutation = useCreateRule();
  const deleteRuleMutation = useDeleteRule();

  const resetForm = () => {
    setNewRulePattern('');
    setNewRuleMatchType('contains');
    setNewRuleCategoryId('');
  };

  const handleCreateRule = async () => {
    if (!newRulePattern.trim() || !newRuleCategoryId) return;
    await createRuleMutation.mutateAsync({
      pattern: newRulePattern.trim(),
      matchType: newRuleMatchType,
      categoryId: newRuleCategoryId,
      isLearned: false,
    });
    setNewRuleDialogOpen(false);
    resetForm();
  };

  const handleDeleteRule = async (ruleId: string) => {
    await deleteRuleMutation.mutateAsync(ruleId);
  };

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? 'Unknown';

  return (
    <>
      <div className="border border-rule bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-textLo">
            RULES · {rules.length}
          </div>
          <button
            type="button"
            onClick={() => {
              setNewRuleDialogOpen(true);
            }}
            className="border border-ruleHi px-[10px] py-[5px] font-mono text-[10.5px] tracking-[0.04em] text-textMid active:opacity-60"
          >
            + NEW RULE
          </button>
        </div>

        {isLoadingRules ? (
          <div className="px-4 py-8 text-center font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
            LOADING…
          </div>
        ) : rules.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-textMid">
            No rules yet. Rules are created when you manually categorize
            transactions, or you can add one with{' '}
            <span className="font-mono text-[11px] uppercase text-textHi">
              + NEW RULE
            </span>
            .
          </div>
        ) : (
          <ul>
            {rules.map((rule, idx) => (
              <li
                key={rule.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-rule' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="border border-rule px-2 py-[1px] font-mono text-[11px] text-textHi">
                      {rule.pattern}
                    </code>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.04em] text-textLo">
                      {rule.matchType === 'contains' ? 'CONTAINS' : 'EXACT'}
                    </span>
                    {rule.isLearned ? (
                      <span className="border border-accent/40 bg-accent/10 px-2 py-[1px] font-mono text-[9.5px] uppercase tracking-[0.04em] text-accent">
                        LEARNED
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[12px] text-textMid">
                    → Categorize as{' '}
                    <span className="text-textHi">
                      {getCategoryName(rule.categoryId)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Delete rule"
                  onClick={() => void handleDeleteRule(rule.id)}
                  disabled={deleteRuleMutation.isPending}
                  className="font-mono text-[14px] leading-none text-textLo hover:text-warn disabled:opacity-40 active:opacity-60"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New Rule Dialog */}
      <Dialog
        open={newRuleDialogOpen}
        onOpenChange={(open) => {
          setNewRuleDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create categorization rule</DialogTitle>
            <DialogDescription>
              Transactions matching this pattern will be auto-categorized.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="block text-[12px] text-textMid">
              Pattern
              <Input
                value={newRulePattern}
                onChange={(e) => {
                  setNewRulePattern(e.target.value);
                }}
                placeholder="e.g. ALBERT HEIJN, Netflix"
                className="mt-1 font-mono"
              />
              <span className="mt-1 block text-[10.5px] tracking-[0.02em] text-textLo">
                Match against transaction description or counterparty.
              </span>
            </label>

            <label className="block text-[12px] text-textMid">
              Match type
              <Select
                value={newRuleMatchType}
                onValueChange={(value) => {
                  setNewRuleMatchType(value as 'contains' | 'exact');
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains (recommended)</SelectItem>
                  <SelectItem value="exact">Exact match</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="block text-[12px] text-textMid">
              Category
              <Select value={newRuleCategoryId} onValueChange={setNewRuleCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setNewRuleDialogOpen(false);
              }}
              className="border border-rule px-4 py-2 font-mono text-[11px] uppercase tracking-[0.04em] text-textMid"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => void handleCreateRule()}
              disabled={
                !newRulePattern.trim() ||
                !newRuleCategoryId ||
                createRuleMutation.isPending
              }
              className="border border-accent/60 bg-accent/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.04em] text-accent disabled:opacity-40 active:opacity-60"
            >
              {createRuleMutation.isPending ? '…' : 'CREATE RULE'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
