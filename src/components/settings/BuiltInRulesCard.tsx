import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { MERCHANT_GROUPS } from '@/data/merchantGroups';

/**
 * Flat-rewrite of the original shadcn-card built-in rules browser. No
 * Card/CardHeader/CardContent shells; uses the surface + rule tokens so
 * it sits inside SettingsCategorization's #merchants section without
 * looking like a foreign island. Search input, expand/collapse controls,
 * and per-group merchant chips all preserved.
 */
export function BuiltInRulesCard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(MERCHANT_GROUPS)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const filteredGroups = Object.entries(MERCHANT_GROUPS)
    .map(([key, group]) => ({
      key,
      name: group.name,
      merchants: searchTerm
        ? group.merchants.filter((m) =>
            m.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : group.merchants,
    }))
    .filter((group) => group.merchants.length > 0);

  return (
    <div className="border border-rule bg-surface">
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
        <span aria-hidden className="font-mono text-[14px] text-textLo leading-none">
          ⌕
        </span>
        <Input
          placeholder="Search merchants…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
          className="h-8 flex-1 border-0 bg-transparent px-0 font-mono text-[12px] focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <button
          type="button"
          onClick={expandAll}
          className="font-mono text-[10px] uppercase tracking-[0.04em] text-textLo hover:text-textHi"
        >
          EXPAND
        </button>
        <span aria-hidden className="font-mono text-[10px] text-textLo">
          ·
        </span>
        <button
          type="button"
          onClick={collapseAll}
          className="font-mono text-[10px] uppercase tracking-[0.04em] text-textLo hover:text-textHi"
        >
          COLLAPSE
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {filteredGroups.map((group, idx) => {
          const expanded = expandedGroups.has(group.key);
          return (
            <div
              key={group.key}
              className={idx > 0 ? 'border-t border-rule' : ''}
            >
              <button
                type="button"
                onClick={() => {
                  toggleGroup(group.key);
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left active:opacity-60"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="w-3 font-mono text-[12px] text-textLo leading-none"
                  >
                    {expanded ? '▾' : '▸'}
                  </span>
                  <span className="text-[14px] font-medium text-textHi">
                    {group.name}
                  </span>
                </div>
                <span className="font-mono text-[11px] tracking-[-0.2px] text-textMid">
                  {group.merchants.length}
                </span>
              </button>
              {expanded ? (
                <div className="border-t border-rule px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {group.merchants.map((merchant) => (
                      <span
                        key={merchant}
                        className="border border-rule px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-textMid"
                      >
                        {merchant}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {filteredGroups.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
            NO MERCHANTS MATCHING &ldquo;{searchTerm}&rdquo;
          </div>
        ) : null}
      </div>

      <div className="border-t border-rule px-4 py-3 font-mono text-[10px] uppercase tracking-[0.04em] text-textLo">
        BUILT-IN RULES — YOUR CUSTOM RULES TAKE PRIORITY
      </div>
    </div>
  );
}
