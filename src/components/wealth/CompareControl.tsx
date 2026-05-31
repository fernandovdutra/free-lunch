import { cn } from '@/lib/utils';
import { benchmarkOptions } from '@/lib/wealth';
import type { Benchmark, ChartSubject } from '@/types/wealth';

const SUBJECTS: { key: ChartSubject; label: string }[] = [
  { key: 'NET_WORTH', label: 'NET WORTH' },
  { key: 'LIQUID', label: 'LIQUID' },
  { key: 'EQUITIES', label: 'EQUITIES' },
];

const BENCHMARK_LABELS: Record<Benchmark, string> = {
  NONE: 'NONE',
  SP500: 'S&P 500',
  MSCI_WORLD: 'MSCI WORLD',
  CASH: 'CASH 3.5%',
};

interface CompareControlProps {
  subject: ChartSubject;
  benchmark: Benchmark;
  onSubjectChange: (subject: ChartSubject) => void;
  onBenchmarkChange: (benchmark: Benchmark) => void;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-pill border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors active:opacity-60',
        active ? 'border-accent bg-accent-dim text-accent' : 'border-rule text-textLo'
      )}
    >
      {children}
    </button>
  );
}

export function CompareControl({
  subject,
  benchmark,
  onSubjectChange,
  onBenchmarkChange,
}: CompareControlProps) {
  const options = benchmarkOptions(subject);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {SUBJECTS.map((s) => (
          <Chip key={s.key} active={subject === s.key} onClick={() => { onSubjectChange(s.key); }}>
            {s.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-textDim">vs</span>
        {options.map((b) => (
          <Chip key={b} active={benchmark === b} onClick={() => { onBenchmarkChange(b); }}>
            {BENCHMARK_LABELS[b]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
