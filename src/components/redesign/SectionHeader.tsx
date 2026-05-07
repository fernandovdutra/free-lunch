import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  children: ReactNode;
  right?: ReactNode;
  tether?: boolean;
  className?: string;
}

export function SectionHeader({ children, right, tether, className }: SectionHeaderProps) {
  return (
    <header
      className={cn(
        'relative flex items-baseline justify-between px-4 pt-[18px] pb-2',
        'font-mono text-ct-meta text-textLo upper-tight',
        className
      )}
    >
      {tether && (
        <span aria-hidden className="absolute left-2 top-[14px] text-textDim">
          ┗
        </span>
      )}
      <span>{children}</span>
      {right && <span className="text-textMid">{right}</span>}
    </header>
  );
}
