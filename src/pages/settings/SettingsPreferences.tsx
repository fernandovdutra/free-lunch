import { SectionHeader } from '@/components/redesign';
import {
  useUpdateUserPreferences,
  useUserPreferences,
  type DefaultTab,
} from '@/hooks/useUserPreferences';
import { useToast } from '@/components/ui/toaster';
import { SettingsScreen } from './_shared/SettingsScreen';
import { ValueRow } from './_shared/ValueRow';

const DEFAULT_TAB_OPTIONS: Array<{ value: DefaultTab; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'budgets', label: 'Budgets' },
  { value: 'reimbursements', label: 'Reimbursements' },
];

/**
 * Settings · Preferences — DISPLAY section only.
 *
 * Earlier the screen mirrored the v8 mockup verbatim (PRIVACY · NUMBERS ·
 * NOTIFICATIONS sections with Blur amounts / App lock / Round to whole € /
 * Hide tiny amounts / Month starts on / Budget alerts) but those rows
 * were scope creep — none of them have downstream consumers built yet
 * and shipping persisted toggles that visually do nothing is worse than
 * not shipping the rows at all. They've been removed; if a feature
 * actually needs a preference it can land alongside the consumer in a
 * future phase.
 *
 * Theme renders read-only "DARK" per resolved Q2. Currency is read-only
 * "EUR · €" since v1 only supports EUR. Default tab is the one row that
 * actually persists — Phase 11 wires it into the post-login redirect.
 */
export function SettingsPreferences() {
  const { data: prefs, isLoading } = useUserPreferences();
  const update = useUpdateUserPreferences();
  const { toast } = useToast();

  if (isLoading || !prefs) {
    return (
      <SettingsScreen title="PREFERENCES">
        <div className="px-4 py-12 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
          LOADING…
        </div>
      </SettingsScreen>
    );
  }

  const onWriteError = (err: unknown) => {
    toast({
      title: 'Could not save preference',
      description: err instanceof Error ? err.message : String(err),
    });
  };

  return (
    <SettingsScreen title="PREFERENCES">
      <SectionHeader>DISPLAY</SectionHeader>
      <div className="flex items-center gap-[14px] border-t border-rule px-4 py-[14px]">
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-medium leading-tight tracking-[-0.1px] text-textHi">
            Theme
          </div>
          <div className="text-[12.5px] text-textMid mt-[2px] leading-[1.35]">
            Calm Terminal is dark-first
          </div>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
          DARK
        </span>
      </div>
      <div className="flex items-center gap-[14px] border-t border-rule px-4 py-[14px]">
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-medium leading-tight tracking-[-0.1px] text-textHi">
            Currency
          </div>
          <div className="text-[12.5px] text-textMid mt-[2px] leading-[1.35]">
            Used across the app
          </div>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
          EUR · €
        </span>
      </div>
      <ValueRow
        label="Default tab"
        meta="What opens on app launch"
        value={prefs.display.defaultTab}
        onChange={(defaultTab) => {
          update.mutate({ display: { defaultTab } }, { onError: onWriteError });
        }}
        options={DEFAULT_TAB_OPTIONS}
      />
    </SettingsScreen>
  );
}
