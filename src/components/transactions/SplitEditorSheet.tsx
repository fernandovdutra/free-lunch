import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CategoryPicker } from './CategoryPicker';
import { formatAmount, cn } from '@/lib/utils';
import {
  MAX_SPLIT_ROWS,
  amountToInputText,
  makeSplitFormSchema,
  parseAmountInput,
  rowsToStoredSplits,
  splitRemainder,
  type SplitFormValues,
} from '@/lib/splits';
import type { Category, Transaction, TransactionSplit } from '@/types';

interface SplitEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  categories: Category[];
  /**
   * Called with the stored-shape rows on save. `splits: null` means the user
   * collapsed the editor to a single row — remove the split; the second
   * argument is then the surviving row's category (or the transaction's own).
   */
  onSave: (splits: TransactionSplit[] | null, singleRowCategoryId?: string | null) => void;
  isSaving?: boolean;
}

function buildDefaultValues(transaction: Transaction): SplitFormValues {
  if (transaction.isSplit && transaction.splits && transaction.splits.length > 0) {
    return {
      splits: transaction.splits.map((s) => ({
        amountText: amountToInputText(s.amount),
        categoryId: s.categoryId,
        note: s.note ?? '',
      })),
    };
  }
  // Fresh split: row 1 starts with the full amount + current category, row 2
  // empty. Typical flow: lower row 1, then "assign remainder" fills row 2.
  return {
    splits: [
      {
        amountText: amountToInputText(Math.abs(transaction.amount)),
        categoryId: transaction.categoryId ?? '',
        note: '',
      },
      { amountText: '', categoryId: '', note: '' },
    ],
  };
}

/**
 * US-4 split editor — nested sheet on top of the Transaction Edit Sheet
 * (same pattern as CategoryPicker). Rows of amount / category / note; live
 * remainder against `abs(transaction.amount)`; one-tap "assign remainder to
 * last row"; removing down to one row turns Save into "remove split".
 */
export function SplitEditorSheet({
  open,
  onOpenChange,
  transaction,
  categories,
  onSave,
  isSaving,
}: SplitEditorSheetProps) {
  const totalAbs = Math.abs(transaction.amount);
  const schema = useMemo(() => makeSplitFormSchema(totalAbs), [totalAbs]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SplitFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: buildDefaultValues(transaction),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'splits' });

  // Which row the nested CategoryPicker is choosing for (null = closed).
  const [pickingIndex, setPickingIndex] = useState<number | null>(null);

  // Re-seed the form each time the sheet opens for a (possibly different) txn.
  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(transaction));
      setPickingIndex(null);
    }
  }, [open, transaction, reset]);

  const watchedRows = useWatch({ control, name: 'splits' });
  const remainder = splitRemainder(
    totalAbs,
    watchedRows.map((row) => parseAmountInput(row.amountText))
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories]
  );

  const singleRow = fields.length === 1;
  const canSave = !isSaving && (singleRow || remainder === 0);

  const submitSplit = handleSubmit((values) => {
    onSave(rowsToStoredSplits(values.splits));
  });

  const removeSplit = () => {
    const survivingCategoryId = getValues('splits.0.categoryId');
    onSave(null, survivingCategoryId !== '' ? survivingCategoryId : (transaction.categoryId ?? null));
  };

  const assignRemainderToLast = () => {
    const idx = fields.length - 1;
    const current = parseAmountInput(getValues(`splits.${idx}.amountText`)) ?? 0;
    const next = Math.round((current + remainder) * 100) / 100;
    if (next <= 0) return;
    setValue(`splits.${idx}.amountText`, amountToInputText(next), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const addRow = () => {
    append({
      amountText: remainder > 0 ? amountToInputText(remainder) : '',
      categoryId: '',
      note: '',
    });
  };

  const splitsErrors = errors.splits;
  const remainderZero = remainder === 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>SPLIT TRANSACTION</SheetTitle>
            <span className="nums font-mono text-[12px] text-textHi">
              {formatAmount(totalAbs, { showSign: false })}
            </span>
          </SheetHeader>

          <SheetBody>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (singleRow) {
                  removeSplit();
                } else {
                  void submitSplit(e);
                }
              }}
            >
              {fields.map((field, index) => {
                const rowErrors = splitsErrors?.[index];
                const categoryId = watchedRows[index]?.categoryId ?? '';
                const category = categoryId ? categoriesById.get(categoryId) : undefined;
                return (
                  <div key={field.id} className="hairline-b px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
                        Split {index + 1}
                      </span>
                      {/* No ✕ on the last remaining row — removing it would
                          leave zero rows and a permanently dead Save. */}
                      {!singleRow && (
                        <button
                          type="button"
                          onClick={() => {
                            remove(index);
                          }}
                          aria-label={`Remove split ${index + 1}`}
                          className="press font-mono text-[13px] leading-none text-textLo"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        aria-label={`Amount for split ${index + 1}`}
                        data-testid={`split-amount-${index}`}
                        {...register(`splits.${index}.amountText`)}
                        className={cn(
                          'nums block h-9 w-[104px] border bg-bg px-3 text-right',
                          'font-mono text-[13px] text-textHi placeholder:text-textLo',
                          'focus:outline-none focus:ring-1 focus:ring-accent',
                          rowErrors?.amountText ? 'border-warn' : 'border-rule'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPickingIndex(index);
                        }}
                        aria-label={`Category for split ${index + 1}`}
                        data-testid={`split-category-${index}`}
                        className={cn(
                          'press flex h-9 min-w-0 flex-1 items-center justify-between gap-2 border bg-bg px-3',
                          rowErrors?.categoryId ? 'border-warn' : 'border-rule'
                        )}
                      >
                        <span
                          className={cn(
                            'truncate font-sans text-[13px]',
                            category ? 'text-textHi' : 'text-textLo'
                          )}
                        >
                          {category?.name ?? 'Pick category…'}
                        </span>
                        <span className="text-[14px] leading-none text-textLo">›</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Note…"
                      aria-label={`Note for split ${index + 1}`}
                      {...register(`splits.${index}.note`)}
                      className={cn(
                        'mt-2 block h-9 w-full border border-rule bg-bg px-3',
                        'font-sans text-[13px] text-textHi placeholder:text-textLo',
                        'focus:outline-none focus:ring-1 focus:ring-accent'
                      )}
                    />

                    {rowErrors && (rowErrors.amountText ?? rowErrors.categoryId) && (
                      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-warn">
                        {rowErrors.amountText?.message ?? rowErrors.categoryId?.message}
                      </div>
                    )}
                  </div>
                );
              })}

              {fields.length < MAX_SPLIT_ROWS && (
                <button
                  type="button"
                  onClick={addRow}
                  className="press hairline-b w-full px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.08em] text-accent"
                >
                  + Add split
                </button>
              )}

              {singleRow && (
                <div className="px-4 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-textMid">
                  A split needs at least two rows — saving now removes the split.
                </div>
              )}

              {/* FOOTER — remainder + save */}
              <div className="px-4 pb-6 pt-4">
                {!singleRow && (
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={cn(
                        'font-mono text-[10px] uppercase tracking-[0.12em]',
                        remainderZero ? 'text-textLo' : 'text-warn'
                      )}
                    >
                      Remaining
                    </span>
                    <div className="flex items-center gap-3">
                      {!remainderZero && (
                        <button
                          type="button"
                          onClick={assignRemainderToLast}
                          className="press border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-textMid"
                        >
                          Assign to last row
                        </button>
                      )}
                      <span
                        className={cn(
                          'nums font-mono text-[13px]',
                          remainderZero ? 'text-accent' : 'text-warn'
                        )}
                      >
                        {remainder < 0 ? '−' : ''}
                        {formatAmount(remainder, { showSign: false })}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="split-save"
                  disabled={!canSave}
                  className={cn(
                    'press w-full border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em]',
                    'disabled:opacity-50',
                    singleRow
                      ? 'border-warn/60 bg-warn-dim text-warn'
                      : 'border-accent bg-accent-dim text-accent'
                  )}
                >
                  {isSaving ? 'Saving…' : singleRow ? 'Remove split' : 'Save split'}
                </button>
              </div>
            </form>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <CategoryPicker
        open={pickingIndex !== null}
        onOpenChange={(next) => {
          if (!next) setPickingIndex(null);
        }}
        categories={categories}
        currentCategoryId={
          pickingIndex !== null ? (watchedRows[pickingIndex]?.categoryId ?? '') || null : null
        }
        onPick={(id) => {
          if (pickingIndex !== null) {
            setValue(`splits.${pickingIndex}.categoryId`, id ?? '', {
              shouldValidate: true,
              shouldDirty: true,
            });
          }
          setPickingIndex(null);
        }}
      />
    </>
  );
}
