import { useState } from 'react';
import {
  benchmarkOptions,
  buildSeries,
  clipToRange,
  equitiesTotal,
  liquidTotal,
  netWorth,
  normalizeBenchmark,
  periodLabel,
  rangeDelta,
} from '@/lib/wealth';
import { cn } from '@/lib/utils';
import { useHoldings } from '@/hooks/useHoldings';
import { useBenchmarks } from '@/hooks/useBenchmarks';
import { useRefreshPrices } from '@/hooks/useRefreshPrices';
import {
  useCreateHolding,
  useDeleteHolding,
  useUpdateHoldingDetails,
  useUpdateHoldingValue,
} from '@/hooks/useHoldingMutations';
import type { Benchmark, ChartSubject, Holding, RangeKey } from '@/types/wealth';
import { WealthHero } from '@/components/wealth/WealthHero';
import { RangePicker } from '@/components/wealth/RangePicker';
import { WealthChart } from '@/components/wealth/WealthChart';
import { CompareControl } from '@/components/wealth/CompareControl';
import { CompositionBars } from '@/components/wealth/CompositionBars';
import { HoldingsList } from '@/components/wealth/HoldingsList';
import { HoldingDetailSheet } from '@/components/wealth/HoldingDetailSheet';
import { UpdateValueDialog } from '@/components/wealth/UpdateValueDialog';
import { EditDetailsDialog } from '@/components/wealth/EditDetailsDialog';
import { CheckInFlow } from '@/components/wealth/CheckInFlow';

const SUBJECT_LABELS: Record<ChartSubject, string> = {
  NET_WORTH: 'NET WORTH',
  LIQUID: 'LIQUID',
  EQUITIES: 'EQUITIES',
};

const STALE_DAYS = 30;

function subjectValue(holdings: Holding[], subject: ChartSubject): number {
  switch (subject) {
    case 'LIQUID':
      return liquidTotal(holdings);
    case 'EQUITIES':
      return equitiesTotal(holdings);
    default:
      return netWorth(holdings);
  }
}

export function Wealth() {
  const { data: holdings = [] } = useHoldings();
  const { data: benchmarks = {} } = useBenchmarks();
  const updateValue = useUpdateHoldingValue();
  const updateDetails = useUpdateHoldingDetails();
  const createHolding = useCreateHolding();
  const deleteHolding = useDeleteHolding();
  const refreshPrices = useRefreshPrices();

  const [range, setRange] = useState<RangeKey>('1Y');
  const [subject, setSubject] = useState<ChartSubject>('NET_WORTH');
  const [benchmark, setBenchmark] = useState<Benchmark>('NONE');

  const [detailHolding, setDetailHolding] = useState<Holding | null>(null);
  const [updateTarget, setUpdateTarget] = useState<Holding | null>(null);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);

  // ── Chart + hero series ────────────────────────────────────────────────
  const fullSeries = buildSeries(holdings, subject);
  const series = clipToRange(fullSeries, range);
  const delta = rangeDelta(series);

  const liquidSeries = clipToRange(buildSeries(holdings, 'LIQUID'), range);
  const liquidDelta = rangeDelta(liquidSeries);

  // ── Benchmark overlay ──────────────────────────────────────────────────
  let chartBenchmark: { label: string; series: typeof series } | null = null;
  let heroBenchmark = null as null | {
    label: string;
    benchPct: number;
    ppDiff: number;
    beating: boolean;
  };
  if (benchmark !== 'NONE' && series.length > 0) {
    const bench = benchmarks[benchmark];
    if (bench) {
      const startDate = series[0]!.date;
      const benchClipped = bench.history.filter((p) => p.date >= startDate);
      const normalized = normalizeBenchmark(series, bench.history);
      chartBenchmark = { label: bench.label, series: normalized };
      const benchPct = rangeDelta(benchClipped).pct;
      heroBenchmark = {
        label: bench.label,
        benchPct,
        ppDiff: delta.pct - benchPct,
        beating: delta.pct >= benchPct,
      };
    }
  }

  // ── Freshness ──────────────────────────────────────────────────────────
  const manualHoldings = holdings.filter((h) => h.updateSource === 'manual');
  const lastManualDays =
    manualHoldings.length > 0
      ? Math.min(...manualHoldings.map((h) => h.updatedDaysAgo))
      : 0;
  const overdue = lastManualDays > STALE_DAYS;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSubjectChange = (next: ChartSubject) => {
    setSubject(next);
    if (!benchmarkOptions(next).includes(benchmark)) setBenchmark('NONE');
  };

  const applyValuePoint = (id: string, point: { date: string; value: number }) => {
    updateValue.mutate({ id, point });
  };

  const handleEdit = (id: string, patch: Partial<Holding>) => {
    updateDetails.mutate({ id, patch });
  };

  const handleDelete = (holding: Holding) => {
    deleteHolding.mutate(holding.id);
    setDetailHolding(null);
  };

  const handleAdd = () => {
    createHolding.mutate(undefined, {
      onSuccess: (created) => {
        setEditTarget(created);
      },
    });
  };

  const liquidNow = liquidTotal(holdings);
  const hasAutoHoldings = holdings.some((h) => h.updateSource === 'auto' && h.symbol);

  return (
    <>
    <div className="space-y-6 py-2">
      {/* Page header row: freshness + add */}
      <div className="flex items-center justify-end gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]',
            overdue ? 'text-alert' : 'text-textLo'
          )}
        >
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 rounded-full', overdue ? 'bg-alert' : 'bg-accent')}
          />
          Updated {lastManualDays}d ago
        </span>
        {hasAutoHoldings && (
          <button
            type="button"
            onClick={() => { refreshPrices.mutate(undefined); }}
            disabled={refreshPrices.isPending}
            aria-label="Refresh prices"
            className={cn(
              'font-mono text-[10px] uppercase tracking-[0.1em] text-textLo active:opacity-60',
              refreshPrices.isPending && 'animate-pulse'
            )}
          >
            {refreshPrices.isPending ? 'Refreshing…' : '↻ Prices'}
          </button>
        )}
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Add holding"
          className="font-mono text-[16px] leading-none text-textLo active:opacity-60"
        >
          ⊕
        </button>
      </div>

      {/* Hero */}
      <WealthHero
        label={SUBJECT_LABELS[subject]}
        value={subjectValue(holdings, subject)}
        delta={delta}
        periodLabel={periodLabel(range)}
        benchmark={heroBenchmark}
        liquid={subject === 'LIQUID' ? null : { value: liquidNow, pct: liquidDelta.pct }}
      />

      {/* Chart block: range → chart → compare */}
      <div className="space-y-3">
        <RangePicker value={range} onChange={setRange} />
        <WealthChart series={series} benchmark={chartBenchmark} height={200} ariaLabel={`${SUBJECT_LABELS[subject]} over time`} />
        <CompareControl
          subject={subject}
          benchmark={benchmark}
          onSubjectChange={handleSubjectChange}
          onBenchmarkChange={setBenchmark}
        />
      </div>

      {/* Update entry */}
      <button
        type="button"
        onClick={() => { setCheckInOpen(true); }}
        className={cn(
          'w-full rounded-pill py-3 font-mono text-[12px] font-medium uppercase tracking-[0.12em] active:opacity-80',
          overdue ? 'bg-alert-dim text-alert' : 'bg-accent-dim text-accent'
        )}
      >
        {overdue ? `Wealth check-in · ${lastManualDays}d overdue` : 'Update values'}
      </button>

      {/* Composition */}
      <CompositionBars holdings={holdings} />

      {/* Holdings */}
      <HoldingsList holdings={holdings} onSelect={setDetailHolding} onAdd={handleAdd} />

      {/* ── Overlays ── */}
      <HoldingDetailSheet
        holding={detailHolding}
        onClose={() => { setDetailHolding(null); }}
        onUpdateValue={(h) => {
          setDetailHolding(null);
          setUpdateTarget(h);
        }}
        onEditDetails={(h) => {
          setDetailHolding(null);
          setEditTarget(h);
        }}
        onDelete={handleDelete}
      />

      <UpdateValueDialog
        holding={updateTarget}
        onClose={() => { setUpdateTarget(null); }}
        onSubmit={applyValuePoint}
      />

      <EditDetailsDialog
        holding={editTarget}
        onClose={() => { setEditTarget(null); }}
        onSubmit={handleEdit}
      />

    </div>

      {/* Full-screen overlay — rendered outside the spacing flow so its fixed
          positioning isn't offset by the parent's space-y top margin. */}
      {checkInOpen && (
        <CheckInFlow
          holdings={holdings}
          onConfirm={(id, value) =>
            { applyValuePoint(id, { date: new Date().toISOString().slice(0, 10), value }); }
          }
          onClose={() => { setCheckInOpen(false); }}
        />
      )}
    </>
  );
}
