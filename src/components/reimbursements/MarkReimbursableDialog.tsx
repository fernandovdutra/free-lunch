import { useEffect, useState } from 'react';
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
import { formatAmount, formatDate } from '@/lib/utils';
import type { Transaction } from '@/types';

interface MarkReimbursableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSubmit: (data: { type: 'work' | 'personal'; note?: string | undefined }) => Promise<void>;
  isSubmitting: boolean;
}

export function MarkReimbursableDialog({
  open,
  onOpenChange,
  transaction,
  onSubmit,
  isSubmitting,
}: MarkReimbursableDialogProps) {
  const [type, setType] = useState<'work' | 'personal'>('work');
  const [note, setNote] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType(transaction?.reimbursement?.type ?? 'work');
      setNote(transaction?.reimbursement?.note ?? '');
    }
  }, [open, transaction]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await onSubmit({ type, note: note.trim() || undefined });
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark as Reimbursable</DialogTitle>
          <DialogDescription>
            Track this expense for reimbursement. It will be excluded from your personal spending
            until cleared.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Transaction details */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="font-medium">{transaction.description}</p>
            <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
              <span>{formatDate(transaction.date)}</span>
              <span className="font-medium text-red-500">
                {formatAmount(transaction.amount)}
              </span>
            </div>
          </div>

          {/* Type selector */}
          <div className="space-y-2">
            <Label htmlFor="reimbursement-type">Type</Label>
            <Select value={type} onValueChange={(v) => { setType(v as 'work' | 'personal'); }}>
              <SelectTrigger id="reimbursement-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work Expense</SelectItem>
                <SelectItem value="personal">Paid for Someone</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {type === 'work'
                ? 'Expense to be reimbursed by your employer'
                : 'Money you paid on behalf of someone else'}
            </p>
          </div>

          {/* Optional note */}
          <div className="space-y-2">
            <Label htmlFor="reimbursement-note">Note (optional)</Label>
            <Input
              id="reimbursement-note"
              placeholder="e.g., Team dinner, Train ticket to client"
              value={note}
              onChange={(e) => { setNote(e.target.value); }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Reimbursable
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
