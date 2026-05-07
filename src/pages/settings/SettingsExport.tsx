import { useMemo, useState } from 'react';
import { format, max, min } from 'date-fns';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { exportTransactionsAsCSV, exportTransactionsAsJSON } from '@/lib/export';
import { useToast } from '@/components/ui/toaster';
import { SectionHeader } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';
import { SettingsRoomRow } from './_shared/SettingsRoomRow';

type Format = 'csv' | 'json';

interface FormatCardProps {
  format: Format;
  title: string;
  description: string;
  chips: string[];
  onExport: () => void;
  busy: boolean;
  disabled: boolean;
}

function FormatCard({
  title,
  description,
  chips,
  onExport,
  busy,
  disabled,
}: FormatCardProps) {
  return (
    <div className="mx-4 mb-3 border border-rule bg-surface px-[14px] py-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[12px] tracking-[0.04em] text-textHi">{title}</div>
        <button
          type="button"
          onClick={onExport}
          disabled={disabled || busy}
          className="border border-ruleHi px-[10px] py-[5px] font-mono text-[10.5px] tracking-[0.04em] text-textMid disabled:opacity-40 active:opacity-60"
        >
          {busy ? '…' : '↓ EXPORT'}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-textMid">{description}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.04em] text-textLo">
        {chips.map((chip) => (
          <span key={chip}>{chip}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings · Export — v8 IA: AVAILABLE banner (txn count + range), RANGE
 * filter rows (currently read-only stubs since the export hook always
 * exports everything), FORMAT cards for CSV / JSON with leading chips
 * matching v8, and a SHARE section currently stubbed disabled.
 *
 * ICS Import does NOT live here — v8 puts it under Accounts & Sync as
 * "CREDIT CARD IMPORT", and 10c wired it there. The Export room is
 * data-out only.
 */
export function SettingsExport() {
  const { data: transactions = [], isLoading } = useTransactions({});
  const { data: categories = [] } = useCategories();
  const [busy, setBusy] = useState<Format | null>(null);
  const { toast } = useToast();

  const range = useMemo(() => {
    if (transactions.length === 0) return null;
    const dates = transactions.map((t) => t.date);
    const earliest = min(dates);
    const latest = max(dates);
    return {
      earliest,
      latest,
      monthsSpan:
        (latest.getFullYear() - earliest.getFullYear()) * 12 +
        (latest.getMonth() - earliest.getMonth()) +
        1,
    };
  }, [transactions]);

  const handleExport = async (fmt: Format) => {
    setBusy(fmt);
    try {
      await new Promise((r) => setTimeout(r, 80));
      if (fmt === 'csv') {
        exportTransactionsAsCSV(transactions, categories);
      } else {
        exportTransactionsAsJSON(transactions, categories);
      }
      toast({
        title: 'Export ready',
        description: `${transactions.length} transactions · ${fmt.toUpperCase()}`,
      });
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  const empty = !isLoading && transactions.length === 0;

  return (
    <SettingsScreen title="EXPORT DATA">
      <div className="mx-4 mb-4 mt-2 border border-rule bg-surface px-[14px] py-3 nums font-mono">
        <div className="text-[10px] tracking-[0.04em] text-textLo">AVAILABLE</div>
        <div className="mt-1 text-[28px] leading-tight tracking-[-0.04em] text-textHi">
          {transactions.length.toLocaleString('en-US')}
        </div>
        <div className="mt-1 text-[10px] tracking-[0.04em] text-textLo">
          TRANSACTIONS
          {range
            ? ` · ${format(range.earliest, 'MMM yyyy').toUpperCase()} — ${format(range.latest, 'MMM yyyy').toUpperCase()}`
            : ''}
        </div>
      </div>

      <SectionHeader>RANGE</SectionHeader>
      <SettingsRoomRow
        glyph="◷"
        label="Date range"
        meta={
          range
            ? `${transactions.length} transactions across ${range.monthsSpan} month${range.monthsSpan === 1 ? '' : 's'}`
            : '—'
        }
        onClick={() => {
          toast({ title: 'Date range filter — coming soon' });
        }}
        badge="All time"
      />
      <SettingsRoomRow
        glyph="◧"
        label="Categories"
        meta="Filter to specific categories"
        onClick={() => {
          toast({ title: 'Category filter — coming soon' });
        }}
        badge="All"
      />
      <SettingsRoomRow
        glyph="⎌"
        label="Accounts"
        meta="Filter to specific accounts"
        onClick={() => {
          toast({ title: 'Account filter — coming soon' });
        }}
        badge="All banks"
      />

      <SectionHeader>FORMAT</SectionHeader>
      <FormatCard
        format="csv"
        title="CSV"
        description="Spreadsheet-ready. One row per transaction."
        chips={['DATE', 'MERCHANT', 'AMOUNT', 'CATEGORY', 'ACCOUNT', 'NOTE']}
        onExport={() => {
          void handleExport('csv');
        }}
        busy={busy === 'csv'}
        disabled={empty}
      />
      <FormatCard
        format="json"
        title="JSON"
        description="Full fidelity — includes rules, tags, and reimbursement state."
        chips={['NESTED', 'TYPED', 'LOSSLESS']}
        onExport={() => {
          void handleExport('json');
        }}
        busy={busy === 'json'}
        disabled={empty}
      />

      <SectionHeader>SHARE</SectionHeader>
      <SettingsRoomRow
        glyph="✉"
        label="Email to accountant"
        meta="Send the latest export by email — coming soon"
        onClick={() => {
          toast({ title: 'Email export — coming soon' });
        }}
        disabled
      />
    </SettingsScreen>
  );
}
