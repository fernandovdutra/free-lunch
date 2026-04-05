import { useState } from 'react';
import { Loader2, Plus, X, Wand2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function CategorizationRulesCard({ categories }: CategorizationRulesCardProps) {
  const [newRuleDialogOpen, setNewRuleDialogOpen] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleMatchType, setNewRuleMatchType] = useState<'contains' | 'exact'>('contains');
  const [newRuleCategoryId, setNewRuleCategoryId] = useState('');

  const { data: rules = [], isLoading: isLoadingRules } = useRules();
  const createRuleMutation = useCreateRule();
  const deleteRuleMutation = useDeleteRule();

  const handleCreateRule = async () => {
    if (!newRulePattern.trim() || !newRuleCategoryId) return;
    await createRuleMutation.mutateAsync({
      pattern: newRulePattern.trim(),
      matchType: newRuleMatchType,
      categoryId: newRuleCategoryId,
      isLearned: false,
    });
    setNewRuleDialogOpen(false);
    setNewRulePattern('');
    setNewRuleMatchType('contains');
    setNewRuleCategoryId('');
  };

  const handleDeleteRule = async (ruleId: string) => {
    await deleteRuleMutation.mutateAsync(ruleId);
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Categorization Rules
              </CardTitle>
              <CardDescription>
                Rules automatically categorize transactions based on patterns
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setNewRuleDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRules ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              No rules yet. Rules are created when you manually categorize transactions.
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-0.5 text-sm">{rule.pattern}</code>
                      <span className="text-xs text-muted-foreground">
                        ({rule.matchType === 'contains' ? 'contains' : 'exact match'})
                      </span>
                      {rule.isLearned && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          learned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      → Categorize as{' '}
                      <span className="font-medium text-foreground">
                        {getCategoryName(rule.categoryId)}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleDeleteRule(rule.id)}
                    disabled={deleteRuleMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Delete rule</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Rule Dialog */}
      <Dialog
        open={newRuleDialogOpen}
        onOpenChange={(open) => {
          setNewRuleDialogOpen(open);
          if (!open) {
            setNewRulePattern('');
            setNewRuleMatchType('contains');
            setNewRuleCategoryId('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Categorization Rule</DialogTitle>
            <DialogDescription>
              Transactions matching this pattern will be automatically categorized.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pattern">Match Pattern</Label>
              <Input
                id="pattern"
                value={newRulePattern}
                onChange={(e) => {
                  setNewRulePattern(e.target.value);
                }}
                placeholder="e.g., ALBERT HEIJN, Netflix, etc."
              />
              <p className="text-xs text-muted-foreground">
                Enter the text to match in transaction descriptions or counterparty names.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchType">Match Type</Label>
              <Select
                value={newRuleMatchType}
                onValueChange={(value) => {
                  setNewRuleMatchType(value as 'contains' | 'exact');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains (recommended)</SelectItem>
                  <SelectItem value="exact">Exact match</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={newRuleCategoryId} onValueChange={setNewRuleCategoryId}>
                <SelectTrigger>
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
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewRuleDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateRule()}
              disabled={
                !newRulePattern.trim() || !newRuleCategoryId || createRuleMutation.isPending
              }
            >
              {createRuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
