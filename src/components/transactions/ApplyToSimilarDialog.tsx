import { useState, useEffect } from 'react';
import { Loader2, Users, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Transaction, Category } from '@/types';

interface ApplyToSimilarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  newCategoryId: string;
  categories: Category[];
  matchingCount: number;
  onApply: (options: {
    applyToSimilar: boolean;
    createRule: boolean;
    pattern: string;
    matchType: 'contains' | 'exact';
  }) => void;
  isApplying: boolean;
}

export function ApplyToSimilarDialog({
  open,
  onOpenChange,
  transaction,
  newCategoryId,
  categories,
  matchingCount,
  onApply,
  isApplying,
}: ApplyToSimilarDialogProps) {
  const [createRule, setCreateRule] = useState(true);
  const [pattern, setPattern] = useState('');

  // Pre-fill pattern from counterparty
  const suggestedPattern = transaction?.counterparty || '';
  const hasMatches = matchingCount > 0;
  const categoryName = categories.find((c) => c.id === newCategoryId)?.name || 'Unknown';

  // Reset state when dialog opens with new transaction
  useEffect(() => {
    if (open && transaction) {
      setCreateRule(true);
      setPattern('');
    }
  }, [open, transaction]);

  const handleApply = () => {
    onApply({
      applyToSimilar: hasMatches,
      createRule,
      pattern: pattern || suggestedPattern,
      matchType: 'contains',
    });
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  // If no matches and no counterparty (can't create rule), just close
  if (!hasMatches && !suggestedPattern) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Apply to Similar Transactions
          </DialogTitle>
          <DialogDescription>
            You&apos;ve categorized this as &ldquo;{categoryName}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Matching transactions count */}
          {hasMatches && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <Users className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  Found {matchingCount} other transaction{matchingCount !== 1 ? 's' : ''} from{' '}
                  <span className="text-primary">&ldquo;{transaction?.counterparty}&rdquo;</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  These will also be categorized as &ldquo;{categoryName}&rdquo;.
                </p>
              </div>
            </div>
          )}

          {/* Create rule option */}
          {suggestedPattern && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="createRule"
                  checked={createRule}
                  onCheckedChange={(checked) => {
                    setCreateRule(checked === true);
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="createRule" className="cursor-pointer font-medium">
                    Create rule for future transactions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    New transactions from this merchant will be auto-categorized.
                  </p>
                </div>
              </div>

              {createRule && (
                <div className="ml-7 space-y-2">
                  <Label htmlFor="pattern" className="text-sm">
                    Match pattern
                  </Label>
                  <Input
                    id="pattern"
                    placeholder={suggestedPattern}
                    value={pattern}
                    onChange={(e) => {
                      setPattern(e.target.value);
                    }}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Transactions containing &ldquo;{pattern || suggestedPattern}&rdquo; will be
                    categorized as &ldquo;{categoryName}&rdquo;.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip} disabled={isApplying}>
            Skip
          </Button>
          <Button onClick={handleApply} disabled={isApplying}>
            {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isApplying
              ? 'Applying...'
              : hasMatches
                ? `Apply to ${matchingCount + 1} transaction${matchingCount > 0 ? 's' : ''}`
                : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
