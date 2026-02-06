import { useState } from 'react';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PendingReimbursementList,
  ClearedReimbursementList,
  ReimbursementSummary,
  ClearFromReimbursementsDialog,
} from '@/components/reimbursements';
import {
  usePendingReimbursements,
  useClearedReimbursements,
  useUnmarkReimbursement,
  useClearReimbursement,
  calculateReimbursementSummary,
} from '@/hooks/useReimbursements';
import type { Transaction } from '@/types';

export function Reimbursements() {
  const {
    data: pendingReimbursements,
    isLoading: isPendingLoading,
    error: pendingError,
  } = usePendingReimbursements();

  const {
    data: clearedReimbursements,
    isLoading: isClearedLoading,
    error: clearedError,
  } = useClearedReimbursements({ limit: 10 });

  const unmarkMutation = useUnmarkReimbursement();
  const clearMutation = useClearReimbursement();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const summaryData = calculateReimbursementSummary(pendingReimbursements, clearedReimbursements);

  const handleUnmark = (transaction: Transaction) => {
    unmarkMutation.mutate(transaction.id);
  };

  const handleClearWithIncome = async (incomeId: string, expenseIds: string[]) => {
    await clearMutation.mutateAsync({
      incomeTransactionId: incomeId,
      expenseTransactionIds: expenseIds,
    });
  };

  const hasError = pendingError || clearedError;

  if (hasError) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load reimbursements</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reimbursements</h1>
        <p className="text-muted-foreground">Track work expenses and personal IOUs</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pending Reimbursements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Pending Reimbursements
                {pendingReimbursements.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {pendingReimbursements.length}
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                disabled={pendingReimbursements.length === 0}
                onClick={() => {
                  setClearDialogOpen(true);
                }}
              >
                <ArrowLeftRight className="mr-1.5 h-4 w-4" />
                Clear with Income
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PendingReimbursementList
              transactions={pendingReimbursements}
              onUnmark={handleUnmark}
              isLoading={isPendingLoading}
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ReimbursementSummary
              data={summaryData}
              isLoading={isPendingLoading || isClearedLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recently Cleared */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Cleared</CardTitle>
        </CardHeader>
        <CardContent>
          <ClearedReimbursementList
            transactions={clearedReimbursements}
            isLoading={isClearedLoading}
          />
        </CardContent>
      </Card>

      <ClearFromReimbursementsDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        pendingReimbursements={pendingReimbursements}
        onSubmit={handleClearWithIncome}
        isSubmitting={clearMutation.isPending}
      />
    </div>
  );
}
