import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SettingsRoomRowProps {
  /** Mono glyph rendered in the 24px-wide leading slot. */
  glyph: string;
  /** Row label (sentence case per v8). */
  label: string;
  /** Single-line meta below the label. Shown in textMid. */
  meta?: string;
  /** Destination route. */
  to: string;
  /** Render the warn/lime accent on the glyph (e.g. for danger row). */
  accent?: 'warn' | 'accent';
}

/**
 * Hub row used inside MANAGE / DATA / DANGER sections. Layout matches v8
 * frame "Settings · Hub": 14px vertical padding, 16px sides, 14px gap, top
 * border at `--rule`. The leading glyph slot is 24px wide and rendered in
 * mono so symbols like ⎌ ◱ ⚙ ↓ ◷ △ line up vertically.
 */
export function SettingsRoomRow({
  glyph,
  label,
  meta,
  to,
  accent,
}: SettingsRoomRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-[14px] border-t border-rule px-4 py-[14px] active:opacity-60"
    >
      <span
        aria-hidden
        className={cn(
          'w-6 text-center font-mono text-[16px] leading-none',
          accent === 'warn'
            ? 'text-warn'
            : accent === 'accent'
              ? 'text-accent'
              : 'text-textMid'
        )}
      >
        {glyph}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-medium leading-tight tracking-[-0.1px] text-textHi">
          {label}
        </span>
        {meta ? (
          <span className="block text-[12.5px] text-textMid mt-[2px] leading-[1.35] truncate">
            {meta}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className="ml-1 font-mono text-[14px] leading-none text-textLo"
      >
        ›
      </span>
    </Link>
  );
}
