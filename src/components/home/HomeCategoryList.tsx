import { Link } from 'react-router-dom';
import { CategoryRow } from '@/components/redesign';

export interface HomeCategoryEntry {
  categoryId: string;
  name: string;
  amount: string;
  amountTrailing?: string;
  meta?: string;
  progress?: number;
  max?: number;
  variant: 'ok' | 'over';
}

interface HomeCategoryListProps {
  entries: HomeCategoryEntry[];
  totalCount: number;
  moreCount: number;
  onCategoryClick: (categoryId: string) => void;
}

export function HomeCategoryList({
  entries,
  totalCount,
  moreCount,
  onCategoryClick,
}: HomeCategoryListProps) {
  return (
    <section className="relative">
      {/* Tether ┗ glyph: small left-and-bottom-bordered box. Sits 6px below
          the previous section's bottom hairline (small visual gap, per v8),
          and its bottom edge aligns with the BY CATEGORY text vertical
          center. Inner corner has a 4px radius. */}
      <span
        aria-hidden
        className="absolute"
        style={{
          left: 20,
          top: 6,
          width: 18,
          height: 13,
          borderLeft: '1px solid var(--rule-hi)',
          borderBottom: '1px solid var(--rule-hi)',
          borderBottomLeftRadius: 4,
        }}
      />
      <div className="ml-11 mr-5">
        <header className="flex items-baseline justify-between border-b border-rule py-3">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.04em] text-textLo">
            BY CATEGORY
          </span>
          <span className="nums font-mono text-[9.5px] uppercase tracking-[0.04em] text-textLo">
            {totalCount} TOTAL
          </span>
        </header>
        {entries.map((entry) => (
          <CategoryRow
            key={entry.categoryId}
            categoryId={entry.categoryId}
            className="!px-0"
            name={entry.name}
            amount={entry.amount}
            {...(entry.amountTrailing ? { amountTrailing: entry.amountTrailing } : {})}
            {...(entry.meta ? { meta: entry.meta } : {})}
            {...(entry.progress !== undefined ? { progress: entry.progress } : {})}
            {...(entry.max !== undefined ? { max: entry.max } : {})}
            variant={entry.variant}
            onClick={() => {
              onCategoryClick(entry.categoryId);
            }}
          />
        ))}
        {moreCount > 0 && (
          <Link
            to="/expenses"
            className="press flex items-center justify-center border-b border-rule py-3 font-mono text-[10px] uppercase tracking-[0.06em] text-accent"
          >
            + {moreCount} MORE {moreCount === 1 ? 'CATEGORY' : 'CATEGORIES'} →
          </Link>
        )}
      </div>
    </section>
  );
}
