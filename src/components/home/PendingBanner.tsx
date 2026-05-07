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
      className="press mx-4 mt-3 flex items-center gap-2 border px-3.5 py-2.5"
      style={{
        borderColor: 'rgba(196, 242, 90, 0.22)',
        backgroundColor: 'rgba(196, 242, 90, 0.06)',
      }}
    >
      <span
        aria-hidden
        className="block bg-accent"
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          boxShadow: '0 0 5px var(--accent)',
        }}
      />
      <span className="nums font-mono text-[11px] uppercase tracking-[0.04em] text-accent">
        +{formatAmount(amount, { showSign: false })} PENDING
      </span>
      <span className="text-textLo">·</span>
      <span className="font-sans text-[12px] text-textMid">
        {count} {count === 1 ? 'item' : 'items'} to reimburse
      </span>
      <span className="ml-auto font-mono text-[14px] text-accent" aria-hidden>→</span>
    </Link>
  );
}
