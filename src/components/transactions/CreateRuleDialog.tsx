import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Transaction, Category } from '@/types';

interface CreateRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  newCategoryId: string;
  categories: Category[];
  onCreateRule: (pattern: string, matchType: 'contains' | 'exact') => void;
  isCreating: boolean;
}

export function CreateRuleDialog({
  open,
  onOpenChange,
  transaction,
  newCategoryId,
  categories,
  onCreateRule,
  isCreating,
}: CreateRuleDialogProps) {
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact'>('contains');

  // Pre-fill pattern from transaction
  const suggestedPattern =
    transaction?.counterparty || transaction?.description.split(' ').slice(0, 2).join(' ') || '';

  // Reset state when dialog opens with new transaction
  useEffect(() => {
    if (open && transaction) {
      setPattern('');
      setMatchType('contains');
    }
  }, [open, transaction]);

  const categoryName = categories.find((c) => c.id === newCategoryId)?.name || 'Unknown';

  const handleCreate = () => {
    const finalPattern = pattern || suggestedPattern;
    if (finalPattern.trim()) {
      onCreateRule(finalPattern.trim(), matchType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Categorization Rule</DialogTitle>
          <DialogDescription>
            Create a rule to automatically categorize similar transactions as &ldquo;{categoryName}
            &rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pattern">Match Pattern</Label>
            <Input
              id="pattern"
              placeholder={suggestedPattern}
              value={pattern}
              onChange={(e) => {
                setPattern(e.target.value);
              }}
            />
            <p className="text-sm text-muted-foreground">
              Transactions containing this text will be auto-categorized.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchType">Match Type</Label>
            <Select
              value={matchType}
              onValueChange={(v) => {
                setMatchType(v as 'contains' | 'exact');
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

          <div className="rounded-md bg-muted p-3 text-sm">
            <strong>Preview:</strong> Transactions{' '}
            {matchType === 'contains' ? 'containing' : 'exactly matching'} &ldquo;
            {pattern || suggestedPattern}&rdquo; will be categorized as &ldquo;{categoryName}&rdquo;
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Skip
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !(pattern || suggestedPattern)}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
