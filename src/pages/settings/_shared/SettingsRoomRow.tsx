import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SettingsRoomRowProps {
  /** Mono glyph rendered in the 24px-wide leading slot. */
  glyph: string;
  /** Row label (sentence case per v8). */
  label: string;
  /** Single-line meta below the label. Shown in textMid. */
  meta?: string;
  /** Destination route. Either `to` or `onClick` must be provided. */
  to?: string;
  /** Tap handler used when the row should fire an action instead of
   *  navigating (e.g. categorization actions). */
  onClick?: () => void;
  /** Optional trailing badge rendered before the `›` arrow (e.g. rule
   *  count). */
  badge?: string | number;
  /** Render the warn/lime accent on the glyph (e.g. for danger row). */
  accent?: 'warn' | 'accent';
  /** Disable interactivity — used while a mutation is in flight. */
  disabled?: boolean;
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
  onClick,
  badge,
  accent,
  disabled,
}: SettingsRoomRowProps) {
  const inner = (
    <>
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
      {badge !== undefined && badge !== '' ? (
        <span className="font-mono text-[12px] tracking-[-0.2px] text-textMid">{badge}</span>
      ) : null}
      <span
        aria-hidden
        className="ml-1 font-mono text-[14px] leading-none text-textLo"
      >
        ›
      </span>
    </>
  );

  const className = cn(
    'flex items-center gap-[14px] border-t border-rule px-4 py-[14px]',
    disabled ? 'opacity-40 cursor-not-allowed' : 'active:opacity-60'
  );

  if (to) {
    return (
      <Link to={to} className={className} aria-disabled={disabled}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(className, 'w-full text-left')}>
      {inner}
    </button>
  );
}
