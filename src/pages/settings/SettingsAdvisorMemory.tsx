import { formatDistanceToNow } from 'date-fns';
import { useAdvisorMemoryMeta, useRefreshAdvisorMemory } from '@/hooks/useAdvisorMemory';
import { useToast } from '@/components/ui/toaster';
import { SectionHeader, PhosphorButton } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';
import { StatGrid } from './_shared/StatGrid';

/**
 * Settings · Advisor Memory — manages the self-learning advisor's memory store.
 * Re-implements the legacy "Financial Advisor Memory" card from the deleted
 * src/pages/Settings.tsx in the redesign IA.
 */
export function SettingsAdvisorMemory() {
  const { data: meta } = useAdvisorMemoryMeta();
  const refreshMutation = useRefreshAdvisorMemory();
  const { toast } = useToast();

  const isPending = refreshMutation.isPending;

  const onRefresh = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: (r) => {
        toast({
          title: 'Memory refreshed',
          description: `${r.baselines} baselines · ${r.merchants} merchants · ${r.patterns} patterns`,
        });
      },
      onError: () => {
        toast({
          variant: 'destructive',
          title: 'Refresh failed',
          description: 'Could not refresh advisor memory. Please try again.',
        });
      },
    });
  };

  const lastUpdated = meta?.updatedAt
    ? formatDistanceToNow(meta.updatedAt, { addSuffix: true }).toUpperCase()
    : 'NEVER';
  const lastConsolidated = meta?.consolidatedAt
    ? formatDistanceToNow(meta.consolidatedAt, { addSuffix: true }).toUpperCase()
    : 'NEVER';
  const patternsTotal =
    (meta?.behavioralPatternsCount ?? 0) + (meta?.temporalPatternsCount ?? 0);

  return (
    <SettingsScreen title="ADVISOR MEMORY">
      <div className="px-4 pt-2 pb-5 hairline-b">
        <StatGrid
          stats={[
            { label: 'BASELINES', value: meta?.baselinesCount ?? 0 },
            { label: 'MERCHANTS', value: meta?.merchantsCount ?? 0 },
            { label: 'PATTERNS', value: patternsTotal },
          ]}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[10px] text-textLo">
          <div>
            <div className="tracking-[0.06em]">UPDATED</div>
            <div className="mt-1 text-textHi">{lastUpdated}</div>
          </div>
          <div>
            <div className="tracking-[0.06em]">CONSOLIDATED</div>
            <div className="mt-1 text-textHi">{lastConsolidated}</div>
          </div>
        </div>
      </div>

      <SectionHeader>ACTIONS</SectionHeader>
      <div className="px-4 py-3">
        <PhosphorButton
          onClick={onRefresh}
          disabled={isPending}
        >
          {isPending ? 'REBUILDING…' : 'REFRESH MEMORY'}
        </PhosphorButton>
      </div>

      <SectionHeader>HOW IT WORKS</SectionHeader>
      <div className="px-4 py-3 font-sans text-[13px] leading-relaxed text-textMid">
        The advisor learns your spending patterns over time. Refresh rebuilds
        spending baselines, merchant knowledge, and behavioural patterns from
        all transactions. Takes 10–30 seconds. Also runs automatically every
        Sunday.
      </div>
    </SettingsScreen>
  );
}
