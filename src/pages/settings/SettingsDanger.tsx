import { SettingsScreen } from './_shared/SettingsScreen';

export function SettingsDanger() {
  return (
    <SettingsScreen title="DANGER ZONE">
      <p className="px-4 pb-8 font-mono text-[12px] text-textLo">
        Placeholder — destructive actions with typed confirms land in 10h.
      </p>
    </SettingsScreen>
  );
}
