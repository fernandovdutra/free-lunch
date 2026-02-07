import { useState } from 'react';
import { Download, Loader2, AlertTriangle, Trash2, RefreshCw, Plus, X, Wand2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';
import { IcsImportCard } from '@/components/settings/IcsImportCard';
import { BuiltInRulesCard } from '@/components/settings/BuiltInRulesCard';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useRules, useCreateRule, useDeleteRule } from '@/hooks/useRules';
import { useResetTransactionData, useRecategorizeTransactions } from '@/hooks/useBankConnection';
import { exportTransactionsAsCSV, exportTransactionsAsJSON } from '@/lib/export';

export function Settings() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [newRuleDialogOpen, setNewRuleDialogOpen] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleMatchType, setNewRuleMatchType] = useState<'contains' | 'exact'>('contains');
  const [newRuleCategoryId, setNewRuleCategoryId] = useState('');

  // Fetch all transactions for export (no date filter)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions({});
  const { data: categories = [] } = useCategories();
  const { data: rules = [], isLoading: isLoadingRules } = useRules();
  const resetMutation = useResetTransactionData();
  const recategorizeMutation = useRecategorizeTransactions();
  const createRuleMutation = useCreateRule();
  const deleteRuleMutation = useDeleteRule();

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BankConnectionCard />
        <IcsImportCard />

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

      {/* Re-categorization Section */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Categorization</CardTitle>
          <CardDescription>
            Re-run the auto-categorization algorithm on existing transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                This will re-apply auto-categorization to all transactions that weren't manually
                categorized. Manually set categories will not be changed.
              </p>
              {recategorizeMutation.data && (
                <p className="text-sm text-emerald-600">
                  Processed {recategorizeMutation.data.processed} transactions, updated{' '}
                  {recategorizeMutation.data.updated}, skipped {recategorizeMutation.data.skipped}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => void recategorizeMutation.mutateAsync()}
              disabled={recategorizeMutation.isPending || transactions.length === 0}
            >
              {recategorizeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {recategorizeMutation.isPending ? 'Re-categorizing...' : 'Re-categorize'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categorization Rules Section */}
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

      {/* Built-in Merchant Database */}
      <BuiltInRulesCard />

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
    </div>
  );
}
