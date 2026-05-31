import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MoreRow {
  href: string;
  label: string;
  meta?: string;
  disabled?: boolean;
}

const PRIMARY: MoreRow[] = [
  { href: '/reimbursements', label: 'REIMBURSEMENTS' },
  { href: '/fixed-costs', label: 'FIXED COSTS' },
  { href: '/settings', label: 'SETTINGS' },
];

const ARCHIVE: MoreRow[] = [
  { href: '/insights', label: 'INSIGHTS' },
  { href: '/goals', label: 'GOALS' },
];

const DEFERRED: MoreRow[] = [
  { href: '#', label: 'REPORTS', meta: 'COMING SOON', disabled: true },
];

function Row({ row, onClick }: { row: MoreRow; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={row.disabled ? undefined : onClick}
      aria-disabled={row.disabled || undefined}
      className={cn(
        'flex w-full items-center justify-between border-b border-rule px-4 py-4 text-left',
        row.disabled
          ? 'cursor-default text-textDim'
          : 'text-textHi active:opacity-60'
      )}
    >
      <span className="font-mono text-[12px] uppercase tracking-[0.08em]">
        {row.label}
      </span>
      <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
        {row.meta && <span>{row.meta}</span>}
        {!row.disabled && <span aria-hidden>›</span>}
      </span>
    </button>
  );
}

function Section({
  title,
  rows,
  onNavigate,
}: {
  title: string;
  rows: MoreRow[];
  onNavigate: (href: string) => void;
}) {
  return (
    <section>
      <div className="px-4 pb-2 pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
          {title}
        </span>
      </div>
      {rows.map((row) => (
        <Row
          key={row.label}
          row={row}
          onClick={() => {
            onNavigate(row.href);
          }}
        />
      ))}
    </section>
  );
}

export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const navigate = useNavigate();

  const handleNavigate = (href: string) => {
    void navigate(href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>MORE</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Section title="PRIMARY" rows={PRIMARY} onNavigate={handleNavigate} />
          <Section title="ARCHIVE" rows={ARCHIVE} onNavigate={handleNavigate} />
          <Section title="DEFERRED" rows={DEFERRED} onNavigate={handleNavigate} />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
