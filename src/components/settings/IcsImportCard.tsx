import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIcsImport } from '@/hooks/useIcsImport';
import { formatAmount } from '@/lib/utils';
import type { IcsParseResult } from '@/lib/icsParser';

type Step = 'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error';

export function IcsImportCard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [parseResult, setParseResult] = useState<IcsParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useIcsImport();

  const reset = () => {
    setStep('idle');
    setParseResult(null);
    setErrorMessage('');
    setSuccessMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) reset();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('parsing');
    setErrorMessage('');

    try {
      const buffer = await file.arrayBuffer();
      // Dynamic import to keep pdfjs-dist out of initial bundle
      const { parseIcsStatement } = await import('@/lib/icsParser');
      const result = await parseIcsStatement(buffer);
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse PDF';
      setErrorMessage(msg);
      setStep('error');
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setStep('importing');

    try {
      const result = await importMutation.mutateAsync({
        statementId: parseResult.statementId,
        statementDate: parseResult.header.statementDate.toISOString(),
        customerNumber: parseResult.header.customerNumber,
        totalNewExpenses: parseResult.header.totalNewExpenses,
        estimatedDebitDate: parseResult.header.estimatedDebitDate.toISOString(),
        debitIban: parseResult.header.debitIban,
        transactions: parseResult.transactions.map((tx) => ({
          transactionDate: tx.transactionDate.toISOString(),
          bookingDate: tx.bookingDate.toISOString(),
          description: tx.description,
          city: tx.city,
          country: tx.country,
          foreignAmount: tx.foreignAmount,
          foreignCurrency: tx.foreignCurrency,
          exchangeRate: tx.exchangeRate,
          amountEur: tx.amountEur,
          direction: tx.direction,
        })),
      });
      setSuccessMessage(result.message);
      setStep('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setErrorMessage(msg);
      setStep('error');
    }
  };

  const afTransactions = parseResult?.transactions.filter((t) => t.direction === 'Af') ?? [];

  return (
    <>
      <div className="border border-rule bg-surface">
        <div className="flex items-center justify-between gap-3 px-[14px] py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span aria-hidden className="font-mono text-[14px] leading-none text-textLo">
                ▭
              </span>
              <span className="text-[14px] font-medium text-textHi">
                ICS statement import
              </span>
            </div>
            <div className="mt-[3px] text-[12px] leading-[1.35] text-textMid">
              Upload PDF statements from your ICS (ABN AMRO) credit card.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDialogOpen(true);
            }}
            className="border border-ruleHi px-[10px] py-[5px] font-mono text-[10.5px] tracking-[0.04em] text-textMid active:opacity-60"
          >
            ↑ IMPORT PDF
          </button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import ICS Statement</DialogTitle>
            <DialogDescription>
              Upload your ICS credit card PDF statement to import individual transactions.
            </DialogDescription>
          </DialogHeader>

          {/* Step: File Selection */}
          {step === 'idle' && (
            <div className="py-4">
              <label
                htmlFor="ics-pdf-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50"
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to select PDF statement</p>
                <p className="text-xs text-muted-foreground">Accepts .pdf files from ICS</p>
              </label>
              <input
                id="ics-pdf-upload"
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { void handleFileSelect(e); }}
              />
            </div>
          )}

          {/* Step: Parsing */}
          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Parsing PDF statement...</p>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Header summary */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Statement date</span>
                  <span className="font-medium">
                    {parseResult.header.statementDate.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total expenses</span>
                  <span className="font-medium">
                    {formatAmount(-parseResult.header.totalNewExpenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium">{afTransactions.length}</span>
                </div>
              </div>

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings
                  </div>
                  {parseResult.warnings.map((w, i) => (
                    <p key={i} className="mt-1">
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Transaction table */}
              <div className="max-h-64 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Description</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {afTransactions.map((tx, i) => (
                      <tr key={i} className="border-t">
                        <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                          {tx.transactionDate.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="font-medium">{tx.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {[tx.city, tx.country].filter(Boolean).join(', ')}
                            {tx.foreignAmount && tx.foreignCurrency && (
                              <span className="ml-2">
                                ({tx.foreignAmount.toFixed(2)} {tx.foreignCurrency})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium tabular-nums">
                          {formatAmount(-tx.amountEur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Importing transactions...</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Error
                </div>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <DialogFooter>
            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={() => { handleDialogChange(false); }}>
                  Cancel
                </Button>
                <Button onClick={() => { void handleImport(); }}>
                  Import {afTransactions.length} Transactions
                </Button>
              </>
            )}
            {step === 'success' && (
              <Button onClick={() => { handleDialogChange(false); }}>Done</Button>
            )}
            {step === 'error' && (
              <>
                <Button variant="outline" onClick={() => { handleDialogChange(false); }}>
                  Close
                </Button>
                <Button onClick={reset}>Try Again</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
