import { cn } from '@/lib/utils';

type TransactionRowVariant = 'default' | 'pending' | 'transfer' | 'uncat' | 'income';

interface TransactionRowProps {
  merchant: string;
  amount: string;
  sign?: '+' | '-' | '';
  meta?: string;
  variant?: TransactionRowVariant;
  onClick?: () => void;
  className?: string;
}

export function TransactionRow({
  merchant,
  amount,
  sign = '',
  meta,
  variant = 'default',
  onClick,
  className,
}: TransactionRowProps) {
  const isTransfer = variant === 'transfer';
  const isUncat = variant === 'uncat';
  const isPending = variant === 'pending';
  const isIncome = variant === 'income';

  const amountColor = isTransfer
    ? 'text-textLo'
    : isPending || isIncome
      ? 'text-accent'
      : 'text-textHi';

  const metaColor = isUncat ? 'text-warn' : isTransfer ? 'text-textLo' : 'text-textMid';

  const bodyContent = (
    <>
      <div className="min-w-0">
        <div
          className={cn(
            'truncate font-sans text-[13px] text-textHi',
            isTransfer && 'italic'
          )}
        >
          {merchant}
        </div>
        {meta && (
          <div
            className={cn(
              'mt-1 font-mono text-ct-meta upper-tight',
              metaColor
            )}
          >
            {meta}
          </div>
        )}
      </div>
      <div className={cn('nums font-mono text-ct-row', amountColor)}>
        {sign}
        {amount}
      </div>
    </>
  );

  const baseClasses = cn(
    'grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hairline-b text-left',
    isTransfer && 'opacity-70'
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(baseClasses, 'press', className)}
      >
        {bodyContent}
      </button>
    );
  }

  return <div className={cn(baseClasses, className)}>{bodyContent}</div>;
}
