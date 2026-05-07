/**
 * Phosphor icon picker for user-created categories.
 *
 * Storage convention: callers persist the selected name as `phosphor:${name}`
 * in `Category.icon`. <CategoryIcon> resolves that prefix back to a component
 * via the curated catalog in `src/lib/phosphorCatalog.ts`.
 *
 * Existing user-created categories whose `icon` is still a raw emoji keep
 * working — <CategoryIcon> falls through to the emoji renderer when no
 * `phosphor:` prefix is present. No migration is required.
 */
import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { PHOSPHOR_CATALOG, PHOSPHOR_CATALOG_ORDER } from '@/lib/phosphorCatalog';

interface CategoryIconPickerProps {
  /** Bare Phosphor name without prefix (e.g. "Wallet"), or undefined. */
  value?: string;
  /** Called with the bare Phosphor name on selection. */
  onChange: (name: string) => void;
  className?: string;
}

function splitCamel(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

export function CategoryIconPicker({ value, onChange, className }: CategoryIconPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHOSPHOR_CATALOG_ORDER;
    return PHOSPHOR_CATALOG_ORDER.filter((name) => splitCamel(name).includes(q));
  }, [query]);

  return (
    <div className={cn('flex flex-col', className)}>
      <label className="flex items-center gap-2 px-4 py-2 hairline-b">
        <MagnifyingGlassIcon size={14} weight="regular" className="text-textLo shrink-0" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Search icons"
          className="flex-1 bg-transparent font-sans text-[13px] text-textHi placeholder:text-textLo focus:outline-none"
          aria-label="Search icons"
        />
      </label>

      <div
        className="grid grid-cols-6 gap-1 p-3"
        role="radiogroup"
        aria-label="Category icon"
      >
        {filtered.map((name) => {
          const Icon = PHOSPHOR_CATALOG[name];
          if (!Icon) return null;
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={splitCamel(name)}
              onClick={() => {
                onChange(name);
              }}
              className={cn(
                'press flex aspect-square items-center justify-center rounded-md',
                selected ? 'bg-accent/15 text-accent' : 'text-textHi hover:bg-textLo/5'
              )}
            >
              <Icon size={20} weight="regular" aria-hidden />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-6 px-1 py-6 text-center font-mono text-ct-meta upper-tight text-textLo">
            No icons match
          </div>
        )}
      </div>
    </div>
  );
}
