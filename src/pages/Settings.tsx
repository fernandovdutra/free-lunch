import { useState } from 'react';
import { Download, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useResetTransactionData } from '@/hooks/useBankConnection';
import { exportTransactionsAsCSV, exportTransactionsAsJSON } from '@/lib/export';

export function Settings() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Fetch all transactions for export (no date filter)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions({});
  const { data: categories = [] } = useCategories();
  const resetMutation = useResetTransactionData();

  const handleExportCSV = async () => {
    setIsExporting('csv');
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));
      exportTransactionsAsCSV(transactions, categories);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting('json');
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));
      exportTransactionsAsJSON(transactions, categories);
    } finally {
      setIsExporting(null);
    }
  };

  const handleResetTransactions = async () => {
    await resetMutation.mutateAsync();
    setResetDialogOpen(false);
    setResetConfirmText('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BankConnectionCard />

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? 'Not signed in'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Display Name</p>
              <p className="text-sm text-muted-foreground">{user?.displayName ?? 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[100px] items-center justify-center text-muted-foreground">
              Preference settings will go here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>
              Export your transaction data ({transactions.length} transaction
              {transactions.length !== 1 ? 's' : ''})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void handleExportCSV()}
              disabled={isExporting !== null || isLoadingTransactions || transactions.length === 0}
            >
              {isExporting === 'csv' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export as CSV
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void handleExportJSON()}
              disabled={isExporting !== null || isLoadingTransactions || transactions.length === 0}
            >
              {isExporting === 'json' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export as JSON
            </Button>
            {transactions.length === 0 && !isLoadingTransactions && (
              <p className="text-center text-xs text-muted-foreground">No transactions to export</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone - at the bottom */}
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
              disabled={transactions.length === 0}
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
              This will permanently delete all {transactions.length} transaction
              {transactions.length !== 1 ? 's' : ''} and associated data. After reset, you can sync
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
    </div>
  );
}
