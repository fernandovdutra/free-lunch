import { Link } from 'react-router-dom';
import { CategoryRow, SectionHeader } from '@/components/redesign';

export interface HomeCategoryEntry {
  categoryId: string;
  name: string;
  amount: string;
  meta: string;
  progress?: number;
  max?: number;
  variant: 'ok' | 'over';
}

interface HomeCategoryListProps {
  entries: HomeCategoryEntry[];
  moreCount: number;
  onCategoryClick: (categoryId: string) => void;
}

export function HomeCategoryList({
  entries,
  moreCount,
  onCategoryClick,
}: HomeCategoryListProps) {
  return (
    <section>
      <SectionHeader
        tether
        right={
          moreCount > 0 ? (
            <Link to="/expenses" className="press text-textMid">
              + {moreCount} MORE {moreCount === 1 ? 'CATEGORY' : 'CATEGORIES'} ›
            </Link>
          ) : (
            <Link to="/expenses" className="press text-textMid">
              VIEW ALL ›
            </Link>
          )
        }
      >
        BY CATEGORY
      </SectionHeader>
      {entries.map((entry) => (
        <CategoryRow
          key={entry.categoryId}
          name={entry.name}
          amount={entry.amount}
          meta={entry.meta}
          {...(entry.progress !== undefined ? { progress: entry.progress } : {})}
          {...(entry.max !== undefined ? { max: entry.max } : {})}
          variant={entry.variant}
          onClick={() => {
            onCategoryClick(entry.categoryId);
          }}
        />
      ))}
    </section>
  );
}
