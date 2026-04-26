import { cn } from '@/lib/utils';

interface DayHeaderProps {
  label: string;
  total?: string;
  className?: string;
}

export function DayHeader({ label, total, className }: DayHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between px-4 pt-[14px] pb-1.5',
        'font-mono text-ct-meta text-textLo upper-tight',
        className
      )}
    >
      <span>{label}</span>
      {total && <span className="nums text-textMid">{total}</span>}
    </div>
  );
}
