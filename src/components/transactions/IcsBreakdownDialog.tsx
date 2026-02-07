import { CreditCard, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/categories/CategoryBadge';
import { useIcsBreakdown } from '@/hooks/useIcsBreakdown';
import { formatAmount, formatDate } from '@/lib/utils';
import type { Category } from '@/types';

interface IcsBreakdownDialogProps {
  icsStatementId: string;
  lumpSumAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
}

export function IcsBreakdownDialog({
  icsStatementId,
  lumpSumAmount,
  open,
  onOpenChange,
  categories,
}: IcsBreakdownDialogProps) {
  const { data: transactions, isLoading } = useIcsBreakdown(icsStatementId, open);

  const totalAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const count = transactions?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            ICS Credit Card Breakdown
          </DialogTitle>
          <DialogDescription>
            Individual transactions from this credit card statement
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No individual ICS transactions found for this statement
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Summary bar */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm text-muted-foreground">Statement total</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatAmount(lumpSumAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Breakdown</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatAmount(totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            </div>

            {/* Transaction list */}
            <div className="divide-y rounded-lg border">
              {transactions.map((t) => {
                const category = categories.find((c) => c.id === t.categoryId);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    {/* Date */}
                    <div className="w-16 flex-shrink-0 text-xs text-muted-foreground">
                      {formatDate(t.transactionDate ?? t.date, 'short')}
                    </div>

                    {/* Description */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      {t.counterparty && (
                        <p className="truncate text-xs text-muted-foreground">
                          {t.counterparty}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="flex-shrink-0">
                      {category ? (
                        <CategoryBadge category={category} size="sm" />
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Uncategorized
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="w-20 flex-shrink-0 text-right text-sm font-medium tabular-nums">
                      {formatAmount(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => { onOpenChange(false); }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
