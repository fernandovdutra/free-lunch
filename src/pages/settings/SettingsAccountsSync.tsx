import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BankConnectionCard } from '@/components/settings/BankConnectionCard';
import { useAuth } from '@/contexts/AuthContext';
import { SectionHeader } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';
import { SettingsRoomRow } from './_shared/SettingsRoomRow';
import { ToggleRow } from './_shared/ToggleRow';

/**
 * Settings · Accounts & Sync — connected banks, credit-card import (ICS),
 * and sync-cadence toggles. v8 frame folds ICS Import into this room as
 * "CREDIT CARD IMPORT", which is why ICS does NOT appear under the Export
 * room despite the route plan's earlier suggestion.
 *
 * The Sync Settings toggles intentionally stay in local component state
 * — they have no downstream consumer yet (the actual sync cadence is
 * handled server-side by Cloud Scheduler), so persisting them would just
 * be storing state that does nothing. When a real client-side sync
 * trigger lands, it can wire these to a hook.
 */
export function SettingsAccountsSync() {
  const { currentRole } = useAuth();
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState(true);
  const [backgroundRefresh, setBackgroundRefresh] = useState(true);
  const [syncNotifications, setSyncNotifications] = useState(false);

  if (currentRole && currentRole !== 'owner') {
    return <Navigate to="/settings" replace />;
  }

  return (
    <SettingsScreen title="ACCOUNTS & SYNC">
      <div className="px-4 pb-4">
        <BankConnectionCard />
      </div>

      <SectionHeader>CREDIT CARD IMPORT</SectionHeader>
      <SettingsRoomRow
        glyph="▭"
        label="ICS statement import"
        meta="Import PDF statements & review monthly coverage"
        to="/ics"
      />

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
