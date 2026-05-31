import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import {
  Breadcrumb,
  DrillHeadline,
  DrillRow,
  Scrubber,
  type BreadcrumbSegment,
  type ScrubberBar,
} from '@/components/redesign';
import { useIcsBreakdownExplorer } from '@/hooks/useIcsBreakdownExplorer';
import { deleteIcsImportFn } from '@/lib/bankingFunctions';
import { useToast } from '@/components/ui/toaster';
import { formatAmount } from '@/lib/utils';

/**
 * ICS L1 — top-level category breakdown for a single imported statement
 * (`/ics/:statementId`). Mirrors the Spending drill (SpendingExplorer): in-page
 * Breadcrumb, DrillHeadline, Scrubber, indexed DrillRow list — so ICS matches
 * the calm-terminal design system instead of the legacy spending components.
 *
 * Tapping a category drills to the editable transaction list (L2). The
 * statement can be deleted from here (unique to ICS).
 */
export function IcsBreakdown() {
  const { statementId } = useParams<{ statementId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [highlightedMonth, setHighlightedMonth] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data } = useIcsBreakdownExplorer({
    statementId,
    ...(highlightedMonth ? { breakdownMonthKey: highlightedMonth } : {}),
  });

  const scrubberBars: ScrubberBar[] = useMemo(() => {
    const totals = data?.monthlyTotals ?? [];
    if (totals.length === 6) {
      return totals.map((t) => ({
        monthKey: t.monthKey,
        label: format(parseISO(`${t.monthKey}-01`), 'MMM').toUpperCase(),
        amount: t.amount,
      }));
    }
    return Array.from({ length: 6 }, (_, i) => ({
      monthKey: `placeholder-${i}`,
      label: '',
      amount: 0,
    }));
  }, [data]);

  const backendCurrentMonthKey = scrubberBars[scrubberBars.length - 1]?.monthKey ?? '';
  const selectedMonthKey = highlightedMonth ?? backendCurrentMonthKey;

  const breakdownLabel = useMemo(() => {
    const cm = data?.currentMonth;
    if (!cm) return '';
    const parsed = new Date(`${cm} 1`);
    if (Number.isNaN(parsed.getTime())) return cm.toUpperCase();
    return format(parsed, 'MMM yyyy').toUpperCase();
  }, [data]);
  const breakdownMonthShort = breakdownLabel.split(' ')[0] ?? '';

  const sortedCategories = useMemo(
    () => [...(data?.categories ?? [])].sort((a, b) => b.amount - a.amount),
    [data]
  );

  const segments: BreadcrumbSegment[] = [
    { label: 'CREDIT CARD', href: '/ics' },
    { label: breakdownLabel || 'STATEMENT' },
  ];

  const total = data?.currentTotal ?? 0;

  const handleSelectMonth = (monthKey: string) => {
    setHighlightedMonth(monthKey === backendCurrentMonthKey ? undefined : monthKey);
  };

  const handleDelete = async () => {
    if (!statementId) return;
    setIsDeleting(true);
    try {
      const result = await deleteIcsImportFn({ statementId });
      toast({ title: 'ICS import deleted', description: result.data.message });
      await queryClient.invalidateQueries();
      void navigate('/ics');
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="pb-8">
      <Breadcrumb
        segments={segments}
        onBack={() => {
          void navigate('/ics');
        }}
        onSegmentClick={(href) => {
          void navigate(href);
        }}
      />

      <DrillHeadline
        amountFormatted={formatAmount(total, { noCents: true })}
        monthLabel={breakdownLabel}
      />

      <div className="mt-6 flex justify-center px-4">
        <Scrubber
          bars={scrubberBars}
          selectedMonthKey={selectedMonthKey}
          onSelectMonth={handleSelectMonth}
        />
      </div>

      <div className="mt-4 h-px w-full bg-rule" />

      <div className="mt-1">
        <DrillSectionHeader label="BY CATEGORY" right={`${sortedCategories.length} TOTAL`} />

        {sortedCategories.length === 0 && (
          <div className="px-4 py-12 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
            No transactions for this statement.
          </div>
        )}

        {sortedCategories.map((cat, i) => (
          <DrillRow
            key={cat.categoryId}
            index={i + 1}
            categoryId={cat.categoryId}
            name={cat.categoryName}
            amount={formatAmount(cat.amount, { showSign: false, noCents: true })}
            meta={`${cat.transactionCount} TXN · ${cat.percentage.toFixed(1)}% OF ${breakdownMonthShort}`}
            onClick={() => {
              void navigate(`/ics/${statementId}/${cat.categoryId}`);
            }}
          />
        ))}
      </div>

      {/* Delete import — unique to ICS statements. */}
      <div className="mt-6 px-4">
        {showDeleteConfirm ? (
          <div className="flex items-center justify-between gap-3 border border-warn/30 bg-warn-dim px-3.5 py-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-warn">
              Delete all transactions for this statement?
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="border border-warn/40 px-[10px] py-[5px] font-mono text-[10.5px] uppercase tracking-[0.04em] text-warn active:opacity-60 disabled:opacity-40"
              >
                {isDeleting ? 'DELETING…' : 'CONFIRM'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                }}
                disabled={isDeleting}
                className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo active:opacity-60"
              >
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(true);
            }}
            className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo active:opacity-60"
          >
            ⌫ DELETE IMPORT
          </button>
        )}
      </div>
    </div>
  );
}

function DrillSectionHeader({ label, right }: { label: string; right?: string }) {
  return (
    <header className="flex items-baseline justify-between px-4 pt-3 pb-2 font-mono text-[9.5px] uppercase tracking-[0.04em] text-textLo">
      <span>{label}</span>
      {right && <span className="nums">{right}</span>}
    </header>
  );
}
