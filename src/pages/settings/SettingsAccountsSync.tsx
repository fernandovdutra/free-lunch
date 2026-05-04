import { useState } from 'react';
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';
import { IcsImportCard } from '@/components/settings/IcsImportCard';
import { SectionHeader } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';
import { ToggleRow } from './_shared/ToggleRow';

/**
 * Settings · Accounts & Sync — connected banks, credit-card import (ICS),
 * and sync-cadence toggles. v8 frame folds ICS Import into this room as
 * "CREDIT CARD IMPORT", which is why ICS does NOT appear under the Export
 * room despite the route plan's earlier suggestion. The Sync Settings
 * toggles render with local UI state for now; persistence wires through
 * `useUserPreferences` in sub-checkpoint 10e.
 */
export function SettingsAccountsSync() {
  // TODO 10e: replace local state with useUserPreferences().syncCadence etc.
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState(true);
  const [backgroundRefresh, setBackgroundRefresh] = useState(true);
  const [syncNotifications, setSyncNotifications] = useState(false);

  return (
    <SettingsScreen title="ACCOUNTS & SYNC">
      <div className="px-4 pb-4">
        <BankConnectionCard />
      </div>

      <SectionHeader>CREDIT CARD IMPORT</SectionHeader>
      <div className="px-4 pb-4">
        <IcsImportCard />
      </div>

      <SectionHeader>SYNC SETTINGS</SectionHeader>
      <ToggleRow
        label="Auto-sync on app open"
        meta="Pull new transactions when you launch"
        checked={autoSyncOnOpen}
        onChange={setAutoSyncOnOpen}
      />
      <ToggleRow
        label="Background refresh"
        meta="Sync every 4 hours in background"
        checked={backgroundRefresh}
        onChange={setBackgroundRefresh}
      />
      <ToggleRow
        label="Sync notifications"
        meta="Notify on new transactions"
        checked={syncNotifications}
        onChange={setSyncNotifications}
      />

      <SectionHeader>PENDING JOBS</SectionHeader>
      <div className="border-t border-rule px-4 py-6 text-center font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
        NO PENDING JOBS
      </div>
    </SettingsScreen>
  );
}
