import { useState } from 'react';
import { XIcon } from '@phosphor-icons/react';
import { normalizeTags } from '@/lib/tags';
import { cn } from '@/lib/utils';

interface TagInputProps {
  /** Current tags on the transaction (already normalized). */
  tags: string[];
  /** Called with the full next tag array whenever a tag is added/removed. */
  onChange: (next: string[]) => void;
  /** The user's existing tags, offered as tap-to-add suggestion chips. */
  suggestions?: string[];
  disabled?: boolean;
}

/**
 * Chip-style tag editor (US tags UI). Type and press Enter or comma to add a
 * tag; tap a chip's × to remove it; tap a suggestion chip to add an existing
 * tag. All additions run through `normalizeTags`, the exact normalization the
 * MCP server applies (trim, drop empties, case-sensitive dedupe), so adding a
 * duplicate is a silent no-op and `onChange` only fires when the set actually
 * changes.
 */
export function TagInput({ tags, onChange, suggestions = [], disabled }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addTags = (raw: string[]) => {
    const next = normalizeTags([...tags, ...raw]);
    const changed = next.length !== tags.length || next.some((t, i) => t !== tags[i]);
    if (changed) onChange(next);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const commitDraft = () => {
    if (draft.trim().length === 0) return;
    addTags(draft.split(','));
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  };

  // A comma arriving via change (paste, mobile keyboards that skip keydown)
  // commits everything before it and keeps the remainder as the draft.
  const handleChange = (value: string) => {
    if (value.includes(',')) {
      const parts = value.split(',');
      const remainder = parts.pop() ?? '';
      addTags(parts);
      setDraft(remainder);
    } else {
      setDraft(value);
    }
  };

  const draftLower = draft.trim().toLowerCase();
  const visibleSuggestions = suggestions
    .filter((s) => !tags.includes(s))
    .filter((s) => (draftLower ? s.toLowerCase().includes(draftLower) : true))
    .slice(0, 8);

  return (
    <div>
      <div className="flex min-h-[30px] flex-wrap items-center gap-1.5 border border-rule px-2 py-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-[22px] items-center gap-1.5 border border-rule bg-surface px-1.5 font-mono text-[11px] text-textHi"
          >
            {tag}
            <button
              type="button"
              onClick={() => {
                removeTag(tag);
              }}
              disabled={disabled}
              aria-label={`Remove tag ${tag}`}
              className="press text-textLo disabled:opacity-50"
            >
              <XIcon size={11} weight="bold" aria-hidden />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            handleChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'ADD TAG · ENTER' : ''}
          aria-label="Add tag"
          className={cn(
            'h-[22px] min-w-[96px] flex-1 bg-transparent font-mono text-[11px] tracking-[0.04em]',
            'text-textHi placeholder:text-textLo focus:outline-none'
          )}
        />
      </div>
      {visibleSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => {
                addTags([s]);
                setDraft('');
              }}
              className="press inline-flex h-[22px] items-center border border-rule px-1.5 font-mono text-[10px] text-textMid disabled:opacity-50"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
