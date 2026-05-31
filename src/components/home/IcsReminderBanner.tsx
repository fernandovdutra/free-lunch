import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIcsStatements } from '@/hooks/useIcsStatements';

const DISMISS_KEY = 'ics-reminder-dismissed';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/**
 * Home banner nudging the user to import the latest ICS statement. The card
 * is debited around the 1st, so the previous month's statement should be in by
 * now — if it (or any older month) is missing, prompt for it. Only shown to
 * users who already use ICS, and dismissible per-month so it doesn't nag.
 */
export function IcsReminderBanner() {
  const navigate = useNavigate();
  const { latestMissingMonth, missingMonths, hasAnyStatements } = useIcsStatements();
  const [dismissed, setDismissed] = useState<string | null>(() => readDismissed());

  if (!hasAnyStatements || !latestMissingMonth) return null;
  if (dismissed === latestMissingMonth.monthKey) return null;

  const extra = missingMonths.length - 1;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, latestMissingMonth.monthKey);
    } catch {
      // ignore storage failures
    }
    setDismissed(latestMissingMonth.monthKey);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => void navigate('/ics')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') void navigate('/ics');
      }}
      className="press mx-4 mt-3 flex cursor-pointer items-center gap-2 border px-3.5 py-2.5"
      style={{
        borderColor: 'rgba(255, 159, 67, 0.28)',
        backgroundColor: 'rgba(255, 159, 67, 0.07)',
      }}
    >
      <span aria-hidden className="font-mono text-[12px] leading-none text-warn">
        ▲
      </span>
      <span className="nums font-mono text-[11px] uppercase tracking-[0.04em] text-warn">
        IMPORT ICS STATEMENT
      </span>
      <span className="text-textLo">·</span>
      <span className="font-sans text-[12px] text-textMid">
        {latestMissingMonth.monthLabel} missing
        {extra > 0 ? ` · +${extra} more` : ''}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss reminder"
        className="ml-auto font-mono text-[14px] leading-none text-textLo active:opacity-60"
      >
        ✕
      </button>
    </div>
  );
}
