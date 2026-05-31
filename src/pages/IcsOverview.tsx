import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { IcsImportDialog } from '@/components/ics/IcsImportDialog';
import { useIcsStatements } from '@/hooks/useIcsStatements';
import { formatAmount } from '@/lib/utils';
import type { IcsMonthCoverage } from '@/lib/icsCoverage';

/**
 * ICS Credit Card — the dedicated home for the monthly ABN AMRO credit-card
 * statement import. Shows a prominent import action plus a month-by-month
 * coverage timeline (imported vs missing) so gaps are obvious. Imported months
 * deep-link into the existing /ics/:statementId breakdown.
 */
export function IcsOverview() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { months, missingMonths, hasAnyStatements, isLoading } = useIcsStatements();

  const importedCount = months.filter((m) => m.imported).length;

  return (
    <div className="-mx-4 pb-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <h1 className="text-[18px] font-semibold text-textHi">ICS Credit Card</h1>
          <p className="mt-[2px] text-[12px] leading-[1.35] text-textMid">
            Upload ABN AMRO credit-card PDF statements each month.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDialogOpen(true);
          }}
          className="shrink-0 border border-ruleHi px-[12px] py-[7px] font-mono text-[10.5px] uppercase tracking-[0.04em] text-textHi active:opacity-60"
        >
          ↑ IMPORT PDF
        </button>
      </header>

      {/* Coverage summary */}
      {!isLoading && hasAnyStatements && (
        <div className="flex items-baseline gap-2 px-5 pt-4 font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
          <span>{importedCount} IMPORTED</span>
          {missingMonths.length > 0 && (
            <>
              <span className="text-textDim">·</span>
              <span className="text-warn">{missingMonths.length} MISSING</span>
            </>
          )}
        </div>
      )}

      {/* Coverage list */}
      <section className="mt-3 px-5">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[58px] w-full" />
            ))}
          </div>
        ) : !hasAnyStatements ? (
          <EmptyState onImport={() => { setDialogOpen(true); }} />
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {months.map((m) =>
              m.imported ? (
                <ImportedRow
                  key={m.monthKey}
                  month={m}
                  onClick={() => void navigate(`/ics/${m.statementId}`)}
                />
              ) : (
                <MissingRow
                  key={m.monthKey}
                  month={m}
                  onImport={() => { setDialogOpen(true); }}
                />
              )
            )}
          </ul>
        )}
      </section>

      <IcsImportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function ImportedRow({ month, onClick }: { month: IcsMonthCoverage; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 py-3 text-left active:opacity-60"
      >
        <span aria-hidden className="font-mono text-[12px] leading-none text-accent">
          ▦
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-textHi">{month.monthLabel}</span>
          <span className="mt-[2px] block font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
            {month.transactionsCreated ?? 0} TXNS
          </span>
        </span>
        <span className="nums font-mono text-[13px] tabular-nums text-textMid">
          {formatAmount(-(month.total ?? 0))}
        </span>
        <span aria-hidden className="font-mono text-[12px] text-textLo">
          ›
        </span>
      </button>
    </li>
  );
}

function MissingRow({ month, onImport }: { month: IcsMonthCoverage; onImport: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onImport}
        className="flex w-full items-center gap-3 py-3 text-left active:opacity-60"
      >
        <span aria-hidden className="font-mono text-[12px] leading-none text-warn">
          ▢
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-textMid">{month.monthLabel}</span>
          <span className="mt-[2px] block font-mono text-[10.5px] uppercase tracking-[0.04em] text-warn">
            NOT IMPORTED
          </span>
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-warn">
          ↑ IMPORT
        </span>
      </button>
    </li>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-rule px-6 py-12 text-center">
      <span aria-hidden className="font-mono text-[20px] leading-none text-textLo">
        ▭
      </span>
      <p className="text-[13px] text-textMid">
        No statements imported yet. Upload your first ICS PDF to start tracking
        credit-card spending and monthly coverage.
      </p>
      <button
        type="button"
        onClick={onImport}
        className="border border-ruleHi px-[12px] py-[7px] font-mono text-[10.5px] uppercase tracking-[0.04em] text-textHi active:opacity-60"
      >
        ↑ IMPORT PDF
      </button>
    </div>
  );
}
