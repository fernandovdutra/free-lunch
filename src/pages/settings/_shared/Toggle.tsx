import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean | undefined;
}

/**
 * 36×20 pill toggle matching v8 frame "Settings · Accounts & Sync" sync-row.
 * Track adopts the accent color when on, neutral rule color when off; the
 * 14px circle slides between left:2 / left:17 over 150ms.
 */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
      className={cn(
        'relative h-5 w-9 rounded-xl border transition-colors duration-150',
        checked
          ? 'border-accent bg-accent/20'
          : 'border-rule-hi bg-transparent border-ruleHi',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-[2px] block h-3.5 w-3.5 rounded-full transition-[left] duration-150',
          checked ? 'left-[17px] bg-accent' : 'left-[2px] bg-textLo'
        )}
      />
    </button>
  );
}
