import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PillProps {
  children: ReactNode;
  active?: boolean;
  variant?: 'default' | 'warn';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export function Pill({
  children,
  active = false,
  variant = 'default',
  onClick,
  type = 'button',
  disabled = false,
  className,
}: PillProps) {
  const offClasses = 'border-rule text-textMid bg-transparent';
  const onAccent = 'border-accent text-accent bg-accent-dim';
  const onWarn = 'border-warn text-warn bg-warn-dim';
  const onClasses = variant === 'warn' ? onWarn : onAccent;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'press inline-flex h-7 items-center whitespace-nowrap rounded-pill border px-3',
        'font-mono text-ct-meta upper-tight',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active ? onClasses : offClasses,
        className
      )}
    >
      {children}
    </button>
  );
}
