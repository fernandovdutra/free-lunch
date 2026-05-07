import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PhosphorButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: 'default' | 'warn';
  className?: string;
}

export function PhosphorButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'default',
  className,
}: PhosphorButtonProps) {
  const variantClasses =
    variant === 'warn' ? 'border-warn text-warn' : 'border-ruleHi text-textHi';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12 w-full items-center justify-center rounded-[8px] border bg-surface px-5',
        'font-mono text-[12px] upper-tight',
        'transition-colors duration-180 ease-ct-out',
        'active:bg-surfaceHi',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses,
        className
      )}
    >
      {children}
    </button>
  );
}
