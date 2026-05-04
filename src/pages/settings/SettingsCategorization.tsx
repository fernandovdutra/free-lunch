import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useRules } from '@/hooks/useRules';
import { useRecategorizeTransactions } from '@/hooks/useBankConnection';
import { CategorizationRulesCard } from '@/components/settings/CategorizationRulesCard';
import { BuiltInRulesCard } from '@/components/settings/BuiltInRulesCard';
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
  const { data: transactions = [] } = useTransactions({});
  const { data: categories = [] } = useCategories();
  const recategorize = useRecategorizeTransactions();
  const { toast } = useToast();

  const uncategorizedCount = useMemo(
    () => transactions.filter((t) => !t.categoryId).length,
    [transactions]
  );

  const hasTransactions = transactions.length > 0;
  const isPending = recategorize.isPending;

  const onRecatError = (err: unknown) => {
    toast({
      title: 'Re-categorize failed',
      description: err instanceof Error ? err.message : String(err),
    });
  };

  const runRulesOnly = () => {
    if (!hasTransactions) return;
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

  const runAiUncategorized = () => {
    if (!hasTransactions) return;
    recategorize.mutate(
      { useLLM: true, mode: 'uncategorized' },
      {
        onSuccess: (r) => {
          toast({
            title: 'AI categorize · uncategorized only',
            description: `${r.llmCategorized} by AI · ${r.updated} updated`,
          });
        },
        onError: onRecatError,
      }
    );
  };

  const runAiAll = () => {
    if (!hasTransactions) return;
    recategorize.mutate(
      { useLLM: true, mode: 'all' },
      {
        onSuccess: (r) => {
          toast({
            title: 'AI categorize · all',
            description: `${r.llmCategorized} by AI · ${r.updated} updated`,
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
            { label: 'UNCATEG.', value: uncategorizedCount, meta: 'NEEDS ATTENTION' },
          ]}
        />
      </div>

      <SectionHeader>ACTIONS</SectionHeader>
      <SettingsRoomRow
        glyph="↻"
        label="Re-categorize (rules only)"
        meta="Re-apply pattern matching to all transactions"
        onClick={runRulesOnly}
        disabled={!hasTransactions || isPending}
      />
      <SettingsRoomRow
        glyph="✦"
        label="AI categorize uncategorized"
        meta="Only rows rules couldn't match"
        onClick={runAiUncategorized}
        accent="accent"
        disabled={!hasTransactions || isPending || uncategorizedCount === 0}
      />
      <SettingsRoomRow
        glyph="✦"
        label="AI categorize all"
        meta="Claude re-reviews every transaction (keeps manual)"
        onClick={runAiAll}
        accent="accent"
        disabled={!hasTransactions || isPending}
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
      <SettingsRoomRow
        glyph="◧"
        label="Categories"
        meta="Rename, colorize, hide, merge — coming soon"
        onClick={() => {
          /* disabled */
        }}
        disabled
      />

      <div className="mx-4 mt-6 border border-rule bg-surface px-4 py-4 font-mono text-[10.5px] uppercase tracking-[0.04em] text-textMid">
        <div className="text-textLo mb-2">HOW IT WORKS</div>
        <p className="leading-[1.55] normal-case tracking-normal font-sans text-[12px] text-textMid">
          Your <span className="text-textHi">manual</span> categorizations win. Below
          that, custom <span className="text-textHi">rules</span> beat the built-in{' '}
          <span className="text-textHi">merchant database</span>. Anything left goes
          through <span className="text-accent">Claude</span>.
        </p>
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
