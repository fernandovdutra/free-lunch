import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useRecentIncomeTransactions } from '@/hooks/useReimbursements';
import { formatAmount, cn } from '@/lib/utils';

interface ManualResolveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the income transaction id when the user picks one. */
  onPick: (incomeTransactionId: string) => void;
}

/**
 * Phase 6 nested sheet — opens on top of the Transaction Edit Sheet
 * when the user taps "Mark as reimbursed" on a pending reimbursable
 * txn. Lists candidate income transactions (uncleared, amount > 0)
 * with a search input. Tap a row → caller invokes
 * `useClearReimbursement` with `{ incomeTransactionId, expenseTransactionIds }`.
 */
export function ManualResolveSheet({ open, onOpenChange, onPick }: ManualResolveSheetProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 300ms debounce on search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      clearTimeout(t);
    };
  }, [search]);

  const { data: incomeTxns = [], isLoading } = useRecentIncomeTransactions(debouncedSearch || undefined);

  // Reset search on open/close
  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>RESOLVE · PICK INCOME</SheetTitle>
        </SheetHeader>
        <div className="hairline-b px-4 pb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search by counterparty or description…"
            className={cn(
              'block h-9 w-full border border-rule bg-bg px-3',
              'font-sans text-[13px] text-textHi placeholder:text-textLo',
              'focus:outline-none focus:ring-1 focus:ring-accent'
            )}
            autoFocus
          />
        </div>
        <SheetBody>
          {isLoading ? (
            <div className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
              Loading income transactions…
            </div>
          ) : incomeTxns.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-textLo">
              No matching income transactions.
              <div className="mt-1 normal-case tracking-normal">
                Try a different search term.
              </div>
            </div>
          ) : (
            incomeTxns.map((t) => {
              const dateLabel = format(t.date, 'MMM d').toUpperCase();
              const counterparty = t.counterparty ?? t.description;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onPick(t.id);
                  }}
                  className="press hairline-b grid w-full grid-cols-[60px_1fr_auto] items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="nums font-mono text-[10px] uppercase tracking-[0.04em] text-textLo">
                    {dateLabel}
                  </span>
                  <span className="truncate font-sans text-[13.5px] text-textHi">
                    {counterparty}
                  </span>
                  <span className="nums font-mono text-[13px] text-accent">
                    +{formatAmount(t.amount, { showSign: false })}
                  </span>
                </button>
              );
            })
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
