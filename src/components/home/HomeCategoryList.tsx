import { Link } from 'react-router-dom';
import { CategoryRow, SectionHeader } from '@/components/redesign';

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
    <section className="mt-6">
      <SectionHeader
        right={
          <span className="nums font-mono text-[10px] uppercase tracking-[0.06em] text-textLo">
            {totalCount} TOTAL
          </span>
        }
      >
        BY CATEGORY
      </SectionHeader>
      {entries.map((entry) => (
        <CategoryRow
          key={entry.categoryId}
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
          className="press mt-3 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.08em] text-accent"
        >
          + {moreCount} MORE {moreCount === 1 ? 'CATEGORY' : 'CATEGORIES'} →
        </Link>
      )}
    </section>
  );
}
