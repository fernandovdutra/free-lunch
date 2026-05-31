import { cn } from '@/lib/utils';
import type { RangeKey } from '@/types/wealth';

const RANGES: RangeKey[] = ['6M', 'YTD', '1Y', '3Y', 'MAX'];

interface RangePickerProps {
  value: RangeKey;
  onChange: (range: RangeKey) => void;
}

export function RangePicker({ value, onChange }: RangePickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-pill border border-rule p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => { onChange(r); }}
          aria-pressed={value === r}
          className={cn(
            'flex-1 rounded-pill px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors active:opacity-60',
            value === r ? 'bg-accent-dim text-accent' : 'text-textLo'
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
