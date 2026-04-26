import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusGlyphProps {
  glyph?: string;
  label: string;
  trailing?: ReactNode;
  tone?: 'accent' | 'textLo' | 'textMid';
  className?: string;
}

const TONE_CLASS = {
  accent: 'text-accent',
  textLo: 'text-textLo',
  textMid: 'text-textMid',
} as const;

export function StatusGlyph({
  glyph,
  label,
  trailing,
  tone = 'textLo',
  className,
}: StatusGlyphProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-[11px] upper-wide',
        TONE_CLASS[tone],
        className
      )}
    >
      {glyph && <span aria-hidden>{glyph}</span>}
      <span>{label}</span>
      {trailing}
    </span>
  );
}
