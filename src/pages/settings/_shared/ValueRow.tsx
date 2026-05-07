import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ValueRowProps<T extends string> {
  label: string;
  meta?: string;
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
  /** Optional value-display formatter; defaults to the matching option label. */
  formatValue?: (value: T) => string;
  disabled?: boolean;
}

/**
 * Two-line settings row with a trailing select. The trigger renders inline
 * styled as `value · ›` (matching v8 Preferences "Currency", "Default tab",
 * "Month starts on" rows) so picker rows align with toggle rows below them.
 */
export function ValueRow<T extends string>({
  label,
  meta,
  value,
  onChange,
  options,
  formatValue,
  disabled,
}: ValueRowProps<T>) {
  const currentLabel =
    formatValue?.(value) ?? options.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="flex items-center gap-[14px] border-t border-rule px-4 py-[14px]">
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium leading-tight tracking-[-0.1px] text-textHi">
          {label}
        </div>
        {meta ? (
          <div className="text-[12.5px] text-textMid mt-[2px] leading-[1.35]">{meta}</div>
        ) : null}
      </div>
      <Select
        value={value}
        onValueChange={(next) => {
          onChange(next as T);
        }}
        {...(disabled === undefined ? {} : { disabled })}
      >
        <SelectTrigger
          className="h-auto w-auto min-w-0 gap-2 border-0 bg-transparent px-0 py-0 font-mono text-[12px] tracking-[0.04em] uppercase text-textMid hover:text-textHi focus:ring-0 focus:ring-offset-0"
          aria-label={label}
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
