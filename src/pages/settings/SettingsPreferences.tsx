import { SectionHeader } from '@/components/redesign';
import {
  useUpdateUserPreferences,
  useUserPreferences,
  type DefaultTab,
  type BudgetAlert,
} from '@/hooks/useUserPreferences';
import { useToast } from '@/components/ui/toaster';
import { SettingsScreen } from './_shared/SettingsScreen';
import { ToggleRow } from './_shared/ToggleRow';
import { ValueRow } from './_shared/ValueRow';

const DEFAULT_TAB_OPTIONS: Array<{ value: DefaultTab; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'budgets', label: 'Budgets' },
  { value: 'reimbursements', label: 'Reimbursements' },
];

const BUDGET_ALERT_OPTIONS: Array<{ value: BudgetAlert; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: '80', label: 'At 80%' },
  { value: '100', label: 'At 100%' },
  { value: 'both', label: '80% + 100%' },
];

const FISCAL_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `Day ${i + 1}`,
}));

/**
 * Settings · Preferences — persists to users/{uid}/meta/preferences via
 * useUserPreferences (optimistic). v8 IA: DISPLAY · PRIVACY · NUMBERS ·
 * NOTIFICATIONS. Theme is rendered as a read-only "DARK" line per the
 * resolved Q2 (light theme is being deleted, omitted entirely from UI).
 *
 * Most preferences persist but are not yet consumed elsewhere (Phase 11
 * polish wires fiscalMonthStart into Home days-left, blurAmounts into
 * formatAmount, etc.). The exception is Sync Settings, which lives in
 * the Accounts & Sync screen and was wired in 10c with local state — it
 * gets repointed at this hook in a follow-up.
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

  const setDisplay = (patch: Partial<typeof prefs.display>) => {
    update.mutate({ display: patch }, { onError: onWriteError });
  };
  const setPrivacy = (patch: Partial<typeof prefs.privacy>) => {
    update.mutate({ privacy: patch }, { onError: onWriteError });
  };
  const setNumbers = (patch: Partial<typeof prefs.numbers>) => {
    update.mutate({ numbers: patch }, { onError: onWriteError });
  };
  const setNotifications = (patch: Partial<typeof prefs.notifications>) => {
    update.mutate({ notifications: patch }, { onError: onWriteError });
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
          setDisplay({ defaultTab });
        }}
        options={DEFAULT_TAB_OPTIONS}
      />

      <SectionHeader>PRIVACY</SectionHeader>
      <ToggleRow
        label="Blur amounts"
        meta="Hide numbers until tapped — useful in public"
        checked={prefs.privacy.blurAmounts}
        onChange={(blurAmounts) => {
          setPrivacy({ blurAmounts });
        }}
      />
      <ToggleRow
        label="App lock"
        meta="Require Face ID to open"
        checked={prefs.privacy.appLock}
        onChange={(appLock) => {
          setPrivacy({ appLock });
        }}
      />

      <SectionHeader>NUMBERS</SectionHeader>
      <ToggleRow
        label="Round to whole €"
        meta="Hide cents across summaries"
        checked={prefs.numbers.roundToWhole}
        onChange={(roundToWhole) => {
          setNumbers({ roundToWhole });
        }}
      />
      <ToggleRow
        label="Hide tiny amounts"
        meta="Collapse anything under €1 into 'other'"
        checked={prefs.numbers.hideTinyAmounts}
        onChange={(hideTinyAmounts) => {
          setNumbers({ hideTinyAmounts });
        }}
      />
      <ValueRow
        label="Month starts on"
        meta="Calendar month · day 1 is standard"
        value={String(prefs.numbers.fiscalMonthStart)}
        onChange={(value) => {
          setNumbers({ fiscalMonthStart: Number(value) });
        }}
        options={FISCAL_DAY_OPTIONS}
      />

      <SectionHeader>NOTIFICATIONS</SectionHeader>
      <ValueRow
        label="Budget alerts"
        meta="Ping when a category crosses 80% / 100%"
        value={prefs.notifications.budgetAlerts}
        onChange={(budgetAlerts) => {
          setNotifications({ budgetAlerts });
        }}
        options={BUDGET_ALERT_OPTIONS}
      />
    </SettingsScreen>
  );
}
