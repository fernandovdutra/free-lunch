import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PendingReimbursementList,
  ClearedReimbursementList,
  ReimbursementSummary,
} from '@/components/reimbursements';
import {
  usePendingReimbursements,
  useClearedReimbursements,
  useUnmarkReimbursement,
  calculateReimbursementSummary,
} from '@/hooks/useReimbursements';
import type { Transaction } from '@/types';

export function Reimbursements() {
  const {
    data: pendingReimbursements = [],
    isLoading: isPendingLoading,
    error: pendingError,
  } = usePendingReimbursements();

  const {
    data: clearedReimbursements = [],
    isLoading: isClearedLoading,
    error: clearedError,
  } = useClearedReimbursements({ limit: 10 });

  const unmarkMutation = useUnmarkReimbursement();

  const summaryData = calculateReimbursementSummary(pendingReimbursements, clearedReimbursements);

  const handleUnmark = (transaction: Transaction) => {
    unmarkMutation.mutate(transaction.id);
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
            <CardTitle className="flex items-center gap-2">
              Pending Reimbursements
              {pendingReimbursements.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {pendingReimbursements.length}
                </span>
              )}
            </CardTitle>
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
    </div>
  );
}
