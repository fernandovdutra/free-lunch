interface IdentityHeroProps {
  /** Two-letter initials shown in the avatar tile. */
  initials: string;
  /** Display name. Falls back to email-prefix in the caller. */
  name: string;
  /** Email — rendered mono, single-line, ellipsises on overflow. */
  email: string;
}

/**
 * Hub identity card. Matches v8 frame "Settings · Hub":
 * 12px/16px/20px padding, 14px gap, 44×44 avatar with `--rule-hi` border,
 * 15px Inter Tight name, 11px mono email at textMid.
 */
export function IdentityHero({ initials, name, email }: IdentityHeroProps) {
  return (
    <div className="flex items-center gap-[14px] px-4 pt-3 pb-5">
      <div
        aria-hidden
        className="flex h-11 w-11 items-center justify-center border border-ruleHi font-mono text-[14px] tracking-[0.5px] text-accent"
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium tracking-[-0.2px] text-textHi">
          {name}
        </div>
        <div className="font-mono text-[11px] text-textMid mt-[2px] truncate">
          {email}
        </div>
      </div>
    </div>
  );
}
