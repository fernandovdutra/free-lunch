import { formatAmount } from '@/lib/utils';

interface BalanceRowProps {
  label: string;
  amount: number;
}

export function BalanceRow({ label, amount }: BalanceRowProps) {
  return (
    <div className="mt-2 flex items-center justify-between border border-rule px-4 py-3">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-textMid">
        {label}
      </span>
      <span className="nums font-mono text-[16px] text-textHi">
        {formatAmount(amount, { showSign: false })}
      </span>
    </div>
  );
}
