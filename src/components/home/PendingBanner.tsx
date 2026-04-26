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
      className="press block bg-accentDim px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-accent"
    >
      <span className="nums">+{formatAmount(amount, { showSign: false })}</span> PENDING ·{' '}
      {count} {count === 1 ? 'ITEM' : 'ITEMS'} · ▸
    </Link>
  );
}
