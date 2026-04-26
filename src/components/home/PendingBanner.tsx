import { Link } from 'react-router-dom';
import { formatAmount } from '@/lib/utils';

interface PendingBannerProps {
  amount: number;
  count: number;
}

export function PendingBanner({ amount, count }: PendingBannerProps) {
  if (amount <= 0 || count <= 0) return null;

  return (
    <Link
      to="/reimbursements"
      className="press mt-2 flex items-center gap-2 border border-accent/40 px-3.5 py-2.5 font-mono text-[11px] tracking-[0.04em] text-accent"
      style={{ backgroundColor: 'rgba(196, 242, 90, 0.06)' }}
    >
      <span aria-hidden className="block h-1.5 w-1.5 bg-accent" />
      <span className="nums">+{formatAmount(amount, { showSign: false })}</span>
      <span className="font-mono uppercase tracking-[0.08em]">PENDING</span>
      <span className="text-textLo">·</span>
      <span className="font-sans text-textLo">
        {count} {count === 1 ? 'item' : 'items'} to reimburse
      </span>
      <span className="ml-auto text-accent" aria-hidden>→</span>
    </Link>
  );
}
