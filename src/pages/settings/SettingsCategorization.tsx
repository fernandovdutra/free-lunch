import { useRules } from '@/hooks/useRules';
import { useRecategorizeTransactions } from '@/hooks/useBankConnection';
import { CategorizationRulesCard } from '@/components/settings/CategorizationRulesCard';
import { BuiltInRulesCard } from '@/components/settings/BuiltInRulesCard';
import { CategorizationReviewCard } from '@/components/settings/CategorizationReviewCard';
import { useCategories } from '@/hooks/useCategories';
import { MERCHANT_GROUPS } from '@/data/merchantGroups';
import { useToast } from '@/components/ui/toaster';
import { SectionHeader } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';
import { SettingsRoomRow } from './_shared/SettingsRoomRow';
import { StatGrid } from './_shared/StatGrid';

const TOTAL_BUILT_IN_MERCHANTS = Object.values(MERCHANT_GROUPS).reduce(
  (sum, g) => sum + g.merchants.length,
  0
);

/**
 * Settings · Categorization — merges AutoCategorizationCard,
 * CategorizationRulesCard, BuiltInRulesCard into one screen with the
 * v8 IA: stat grid (RULES / MERCHANTS / UNCATEG.), ACTIONS rows,
 * BROWSE rows, HOW IT WORKS info, then the existing rules + merchant
 * cards inlined under #rules / #merchants anchors. The action rows
 * call the same useRecategorizeTransactions mutation as the legacy
 * AutoCategorizationCard, with "coming soon" toasts only when an
 * action genuinely has no implementation today.
 */
export function SettingsCategorization() {
  const { data: rules = [] } = useRules();
  const { data: categories = [] } = useCategories();
  const recategorize = useRecategorizeTransactions();
  const { toast } = useToast();

  const isPending = recategorize.isPending;

  const onRecatError = (err: unknown) => {
    toast({
      title: 'Re-categorize failed',
      description: err instanceof Error ? err.message : String(err),
    });
  };

  const runRulesOnly = () => {
    recategorize.mutate(
      {},
      {
        onSuccess: (r) => {
          toast({
            title: 'Re-categorized',
            description: `${r.updated} updated · ${r.skipped} skipped`,
          });
        },
        onError: onRecatError,
      }
    );
  };

  return (
    <SettingsScreen title="CATEGORIZATION">
      <div className="px-4 pb-4 mt-2">
        <StatGrid
          stats={[
            { label: 'RULES', value: rules.length, meta: 'LEARNED + MANUAL' },
            { label: 'MERCHANTS', value: TOTAL_BUILT_IN_MERCHANTS, meta: 'DUTCH, BUILT-IN' },
            { label: 'AI MODE', value: 'ASSISTED', meta: 'CHATGPT TASK' },
          ]}
        />
      </div>

      <SectionHeader>ACTIONS</SectionHeader>
      <SettingsRoomRow
        glyph="↻"
        label="Re-categorize (rules only)"
        meta="Re-apply pattern matching to all transactions"
        onClick={runRulesOnly}
        disabled={isPending}
      />
      <SettingsRoomRow
        glyph="?"
        label="Needs review"
        meta="Browse unresolved merchants and use ChatGPT for research"
        onClick={() => { document.getElementById('review')?.scrollIntoView({ behavior: 'smooth' }); }}
        accent="accent"
      />

      <SectionHeader>BROWSE</SectionHeader>
      <SettingsRoomRow
        glyph="≡"
        label="Rules"
        meta={`${rules.length} rule${rules.length === 1 ? '' : 's'} · search, edit, disable`}
        onClick={() => {
          document
            .getElementById('rules')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        badge={rules.length}
      />
      <SettingsRoomRow
        glyph="⌕"
        label="Recognized merchants"
        meta={`${TOTAL_BUILT_IN_MERCHANTS} Dutch merchants auto-categorized`}
        onClick={() => {
          document
            .getElementById('merchants')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        badge={TOTAL_BUILT_IN_MERCHANTS}
      />

      <div className="mx-4 mt-6 border border-rule bg-surface px-4 py-4 font-mono text-[10.5px] uppercase tracking-[0.04em] text-textMid">
        <div className="text-textLo mb-2">HOW IT WORKS</div>
        <p className="leading-[1.55] normal-case tracking-normal font-sans text-[12px] text-textMid">
          Individual corrections and confirmed merchant rules win. Built-in merchants fill clear matches.
          Unresolved merchants appear in the review queue for your connected ChatGPT daily task or a manual choice.
        </p>
      </div>

      <div id="review" className="px-4 pt-8 pb-4 scroll-mt-16">
        <CategorizationReviewCard categories={categories} />
      </div>

      <div id="rules" className="px-4 pt-8 pb-4 scroll-mt-16">
        <CategorizationRulesCard categories={categories} />
      </div>

      <div id="merchants" className="px-4 pb-4 scroll-mt-16">
        <BuiltInRulesCard />
      </div>
    </SettingsScreen>
  );
}
