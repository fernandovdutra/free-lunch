import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { SectionHeader } from '@/components/redesign/SectionHeader';
import { PhosphorButton } from '@/components/redesign/PhosphorButton';
import {
  useFixedSchedule,
  useAddFixedCost,
  useUpdateFixedCost,
  useDeleteFixedCost,
} from '@/hooks/useFixedSchedule';
import { formatAmount, cn } from '@/lib/utils';
import type { FixedCost } from '@/lib/burnUp.types';

interface EditingState {
  index: number;
  item: FixedCost;
}

function splitCents(formatted: string): { whole: string; cents: string | null } {
  const m = /^(.*)([.,])(\d{2})$/.exec(formatted);
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    return { whole: formatted, cents: null };
  }
  return { whole: m[1].replace(/[.,]$/, ''), cents: m[3] };
}

const inputClass = cn(
  'w-full rounded-md border border-rule bg-bg px-3 py-2.5',
  'font-mono text-[14px] text-textHi tabular-nums',
  'focus:border-ruleHi focus:outline-none',
  'disabled:opacity-50'
);

const labelClass = 'font-mono text-[10px] uppercase tracking-[0.08em] text-textLo';

export function FixedCosts() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: items, isLoading, error } = useFixedSchedule();
  const addMutation = useAddFixedCost();
  const updateMutation = useUpdateFixedCost();
  const deleteMutation = useDeleteFixedCost();

  const list = items ?? [];
  const total = list.reduce((sum, i) => sum + i.a, 0);
  const totalFormatted = formatAmount(total, { showSign: false });
  const { whole, cents } = splitCents(totalFormatted);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!sheetOpen) {
      setEditing(null);
      setFormError(null);
      setConfirmDelete(false);
    }
  }, [sheetOpen]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setConfirmDelete(false);
    setSheetOpen(true);
  };

  const openEdit = (index: number, item: FixedCost) => {
    setEditing({ index, item });
    setFormError(null);
    setConfirmDelete(false);
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    const label = (formData.get('label') as string).trim();
    const day = parseInt(formData.get('day') as string, 10);
    const amount = parseFloat(formData.get('amount') as string);

    if (!label) {
      setFormError('Label is required');
      return;
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setFormError('Day must be a whole number between 1 and 31');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }

    const item: FixedCost = { d: day, a: amount, l: label };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ index: editing.index, item });
      } else {
        await addMutation.mutateAsync(item);
      }
      setSheetOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    await deleteMutation.mutateAsync(editing.index);
    setSheetOpen(false);
  };

  if (error) {
    return (
      <div className="px-5 py-12 font-mono text-[12px] uppercase tracking-[0.12em] text-warn">
        ▲ FAILED TO LOAD FIXED COSTS
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-12 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
        LOADING…
      </div>
    );
  }

  return (
    <div className="-mx-4 pb-8">
      <section
        className="border-b border-rule"
        style={{ padding: '14px 20px 18px' }}
      >
        <div
          className="font-mono text-[10px] text-textLo"
          style={{ letterSpacing: '0.06em', marginBottom: 8 }}
        >
          MONTHLY TOTAL
        </div>
        <div
          className="flex items-baseline gap-2 nums font-mono text-textHi"
          style={{
            fontWeight: 400,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            fontFeatureSettings: '"tnum"',
            fontSize: 36,
          }}
        >
          <span>{whole}</span>
          {cents && (
            <span
              className="text-textMid"
              style={{ fontSize: 18 }}
            >
              .{cents}
            </span>
          )}
        </div>
        <div
          className="font-mono text-[10.5px] text-textLo"
          style={{ letterSpacing: '0.05em', marginTop: 10 }}
        >
          {list.length} ITEM{list.length === 1 ? '' : 'S'} · USED BY HOME BURN-UP
        </div>
      </section>

      <SectionHeader
        right={`${list.length} ITEM${list.length === 1 ? '' : 'S'}`}
      >
        SCHEDULE
      </SectionHeader>

      {list.length === 0 ? (
        <div className="px-5 py-10 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
          NOTHING SCHEDULED YET
        </div>
      ) : (
        list.map((item, index) => {
          const amountFormatted = formatAmount(item.a, { showSign: false });
          return (
            <button
              key={`${index}-${item.l}-${item.d}`}
              type="button"
              onClick={() => {
                openEdit(index, item);
              }}
              className="press grid w-full items-center border-b border-rule text-left"
              style={{
                gridTemplateColumns: '54px 1fr auto',
                gap: 12,
                padding: '12px 16px',
              }}
            >
              <span
                className="font-mono text-textLo"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                DAY {item.d}
              </span>
              <div className="min-w-0">
                <div
                  className="truncate text-textHi"
                  style={{ fontSize: 13.5 }}
                >
                  {item.l}
                </div>
              </div>
              <div
                className="nums font-mono text-textMid"
                style={{
                  fontSize: 14,
                  letterSpacing: '-0.02em',
                  fontFeatureSettings: '"tnum"',
                  textAlign: 'right',
                }}
              >
                {amountFormatted}
              </div>
            </button>
          );
        })
      )}

      <div className="px-4 pt-6">
        <PhosphorButton onClick={openCreate}>+ ADD FIXED COST</PhosphorButton>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'EDIT FIXED COST' : 'ADD FIXED COST'}</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-4 pb-6">
            <form
              ref={formRef}
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label htmlFor="label" className={labelClass}>
                  LABEL
                </label>
                <input
                  id="label"
                  name="label"
                  type="text"
                  defaultValue={editing?.item.l ?? ''}
                  placeholder="Rent, Internet, Spotify…"
                  maxLength={40}
                  required
                  autoComplete="off"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="day" className={labelClass}>
                    DAY
                  </label>
                  <input
                    id="day"
                    name="day"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    step={1}
                    defaultValue={editing?.item.d ?? ''}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="amount" className={labelClass}>
                    AMOUNT (€)
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step={0.01}
                    defaultValue={editing?.item.a ?? ''}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="font-mono text-[11px] uppercase tracking-[0.06em] text-warn"
                >
                  ▲ {formError}
                </p>
              )}

              <PhosphorButton
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'SAVE CHANGES' : 'ADD'}
              </PhosphorButton>
            </form>

            {editing && (
              <div className="mt-8 border-t border-rule pt-5">
                {!confirmDelete ? (
                  <PhosphorButton
                    variant="warn"
                    onClick={() => {
                      setConfirmDelete(true);
                    }}
                  >
                    DELETE FIXED COST
                  </PhosphorButton>
                ) : (
                  <div className="space-y-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-textMid">
                      DELETE &ldquo;{editing.item.l}&rdquo;? AFFECTS HOME BURN-UP.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <PhosphorButton
                        onClick={() => {
                          setConfirmDelete(false);
                        }}
                      >
                        CANCEL
                      </PhosphorButton>
                      <PhosphorButton
                        variant="warn"
                        onClick={() => void handleDelete()}
                        disabled={deleteMutation.isPending}
                      >
                        CONFIRM DELETE
                      </PhosphorButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
