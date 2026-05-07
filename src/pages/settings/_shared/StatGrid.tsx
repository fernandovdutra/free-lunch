interface Stat {
  label: string;
  value: string | number;
  meta?: string;
}

interface StatGridProps {
  stats: Stat[];
}

/**
 * 3-column mono stat grid used on the hub sync card and the categorization
 * screen header. Label 9.5px textLo, value 18px textHi tnum, meta 9.5px
 * textLo. Caller wraps in whatever container/padding they need.
 */
export function StatGrid({ stats }: StatGridProps) {
  return (
    <div
      className="grid gap-[10px] nums font-mono"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-[9.5px] tracking-[0.04em] text-textLo">{s.label}</div>
          <div className="text-[18px] leading-tight tracking-[-0.5px] text-textHi mt-0.5">
            {s.value}
          </div>
          {s.meta ? (
            <div className="text-[9.5px] tracking-[0.04em] text-textLo mt-1.5">
              {s.meta}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
