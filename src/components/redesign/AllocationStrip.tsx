import { cn } from '@/lib/utils';

export interface AllocationSlice {
  id: string;
  label: string;
  value: number;
}

interface AllocationStripProps {
  slices: AllocationSlice[];
  total: number;
  className?: string;
}

const SLICE_OPACITIES = [0.95, 0.87, 0.78, 0.7, 0.62, 0.53, 0.45, 0.37, 0.28, 0.2];

export function AllocationStrip({ slices, total, className }: AllocationStripProps) {
  const allocated = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const free = Math.max(0, total - allocated);

  return (
    <div
      className={cn('flex w-full', className)}
      style={{ height: 14, gap: 2 }}
    >
      {slices.map((s, i) => {
        const v = Math.max(0, s.value);
        if (v <= 0) return null;
        const opacity = SLICE_OPACITIES[Math.min(i, SLICE_OPACITIES.length - 1)];
        return (
          <div
            key={s.id}
            title={`${s.label}: ${s.value}`}
            style={{
              flex: `${v} 1 0%`,
              backgroundColor: 'var(--accent)',
              opacity,
            }}
          />
        );
      })}
      {free > 0 && (
        <div
          title={`Unallocated: ${free}`}
          style={{
            flex: `${free} 1 0%`,
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(255,255,255,0.18)',
          }}
        />
      )}
    </div>
  );
}
