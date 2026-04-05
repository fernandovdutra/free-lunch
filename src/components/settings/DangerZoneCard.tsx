import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
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
import { useResetTransactionData } from '@/hooks/useBankConnection';

interface DangerZoneCardProps {
  transactionCount: number;
}

export function DangerZoneCard({ transactionCount }: DangerZoneCardProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const resetMutation = useResetTransactionData();

  const handleResetTransactions = async () => {
    await resetMutation.mutateAsync();
    setResetDialogOpen(false);
    setResetConfirmText('');
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">Reset Transaction Data</p>
              <p className="text-sm text-muted-foreground">
                Delete all transactions and re-sync from your bank. This allows transactions to be
                re-categorized using the auto-categorization engine. Your bank connection will
                remain active.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                setResetDialogOpen(true);
              }}
              disabled={transactionCount === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) setResetConfirmText('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset Transaction Data
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {transactionCount} transaction
              {transactionCount !== 1 ? 's' : ''} and associated data. After reset, you can sync
              your bank connection to re-import transactions with auto-categorization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Warning:</strong> This action cannot be undone. All transaction history,
              including manual categorizations and reimbursement data, will be lost.
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-mono font-bold">RESET</span> to confirm
              </Label>
              <Input
                id="confirm"
                value={resetConfirmText}
                onChange={(e) => {
                  setResetConfirmText(e.target.value);
                }}
                placeholder="RESET"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setResetConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleResetTransactions()}
              disabled={resetConfirmText !== 'RESET' || resetMutation.isPending}
            >
              {resetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resetMutation.isPending ? 'Resetting...' : 'Reset All Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
