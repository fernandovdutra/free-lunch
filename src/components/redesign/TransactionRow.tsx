import { cn } from '@/lib/utils';

type TransactionRowVariant = 'default' | 'pending' | 'transfer' | 'uncat' | 'income';

interface TransactionRowProps {
  merchant: string;
  amount: string;
  sign?: '+' | '-' | '';
  meta?: string;
  /** Optional left-aligned mono time column (e.g. "14:22"). */
  time?: string;
  /**
   * Optional small glyph rendered between the time slot and the merchant
   * name, in warn colour. Used for `!` on uncategorized rows in v8.
   */
  flag?: string;
  variant?: TransactionRowVariant;
  onClick?: () => void;
  className?: string;
}

export function TransactionRow({
  merchant,
  amount,
  sign = '',
  meta,
  time,
  flag,
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

  const metaColor = isUncat ? 'text-alert' : isTransfer ? 'text-textLo' : 'text-textMid';

  const bodyContent = (
    <>
      {time && (
        <div className="nums font-mono text-[10px] leading-tight text-textLo">
          {time}
        </div>
      )}
      <div className="min-w-0">
        <div
          className={cn(
            'truncate font-sans text-[13px] text-textHi',
            isTransfer && 'italic'
          )}
        >
          {flag && (
            <span className="mr-1.5 font-mono font-semibold text-alert">{flag}</span>
          )}
          {merchant}
        </div>
        {meta && (
          <div
            className={cn(
              'mt-1 font-mono text-[9.5px] uppercase tracking-[0.04em]',
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
    'grid w-full items-center gap-3 px-4 py-3 hairline-b text-left',
    time ? 'grid-cols-[40px_1fr_auto]' : 'grid-cols-[1fr_auto]',
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
