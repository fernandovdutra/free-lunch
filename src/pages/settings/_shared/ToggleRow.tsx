import { Toggle } from './Toggle';

interface ToggleRowProps {
  label: string;
  meta?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

/**
 * Two-line settings row with a trailing Toggle. Matches v8 frame
 * "Settings · Accounts & Sync" sync-settings layout (14px/16px padding,
 * top border, label 14.5px / meta 12.5px).
 */
export function ToggleRow({ label, meta, checked, onChange, disabled }: ToggleRowProps) {
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
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}
