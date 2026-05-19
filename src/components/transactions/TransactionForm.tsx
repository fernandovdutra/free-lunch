import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetBody,
} from '@/components/ui/sheet';
import { CategoryPicker } from './CategoryPicker';
import { ManualResolveSheet } from './ManualResolveSheet';
import { useUpdateTransaction, useUpdateTransactionCategory, useDeleteTransaction, useBulkUpdateCategory } from '@/hooks/useTransactions';
import { useMarkAsReimbursable, useClearReimbursement } from '@/hooks/useReimbursements';
import { useToast } from '@/components/ui/toaster';
import { formatAmount, cn } from '@/lib/utils';
import type { Category, Transaction } from '@/types';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  /** Legacy prop kept so the page wiring doesn't break — Phase 6 ignores it. */
  onSubmit?: unknown;
  /** Legacy prop kept for the same reason. */
  isSubmitting?: boolean;
}

/**
 * Phase 6 Transaction Edit Sheet (replaces the modal Dialog).
 *
 * Layout per README §09:
 *   [HEADLINE: merchant · amount · date]
 *   CATEGORY        ›  → nested CategoryPicker sheet
 *   FLAGS           [Reimbursable toggle]
 *   NOTE            <textarea>
 *   MERCHANT RULES  ›  → bulk-update similar txns
 *   MANUAL RESOLVE  ›  → nested ManualResolveSheet (only when reimbursement.status === 'pending')
 *   [DELETE TRANSACTION]
 *
 * Each section calls its own TanStack Query mutation. No global submit
 * button. The Note textarea is the only field that's "dirty"-tracked;
 * backdrop tap or Esc with a dirty note shows an inline confirm strip
 * (`SAVE / DISCARD`) instead of closing.
 *
 * Split is deferred per resolved Q3 — the FLAGS section shows only the
 * Reimbursable toggle.
 */
export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  categories,
}: TransactionFormProps) {
  const { toast } = useToast();

  const updateMutation = useUpdateTransaction();
  const updateCategoryMutation = useUpdateTransactionCategory();
  const markReimbursableMutation = useMarkAsReimbursable();
  const bulkUpdateMutation = useBulkUpdateCategory();
  const deleteMutation = useDeleteTransaction();
  const clearReimbursementMutation = useClearReimbursement();

  const [note, setNote] = useState('');
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const initialNoteRef = useRef('');

  const dirty = note !== initialNoteRef.current;

  // Reset local state when the sheet opens / target txn changes
  useEffect(() => {
    if (open && transaction) {
      const startingNote = transaction.note ?? '';
      setNote(startingNote);
      initialNoteRef.current = startingNote;
      setConfirmingDiscard(false);
    }
    if (!open) {
      setPickerOpen(false);
      setResolveOpen(false);
    }
  }, [open, transaction]);

  if (!transaction) return null;

  const isExpense = transaction.amount < 0;
  const isReimbursable = !!transaction.reimbursement;
  const isPendingReimb = transaction.reimbursement?.status === 'pending';
  const currentCategory = transaction.categoryId
    ? categories.find((c) => c.id === transaction.categoryId)
    : null;

  const closeIfClean = () => {
    if (dirty) {
      setConfirmingDiscard(true);
      return;
    }
    onOpenChange(false);
  };

  const saveNoteAndClose = async () => {
    try {
      await updateMutation.mutateAsync({
        id: transaction.id,
        data: { note: note.trim() === '' ? null : note },
      });
    } catch {
      toast({ title: 'Failed to save note', variant: 'destructive' });
      return;
    }
    initialNoteRef.current = note;
    setConfirmingDiscard(false);
    onOpenChange(false);
  };

  const discardAndClose = () => {
    setNote(initialNoteRef.current);
    setConfirmingDiscard(false);
    onOpenChange(false);
  };

  const handleCategoryPick = async (categoryId: string | null) => {
    setPickerOpen(false);
    try {
      await updateCategoryMutation.mutateAsync({ id: transaction.id, categoryId });
    } catch {
      toast({ title: 'Failed to change category', variant: 'destructive' });
    }
  };

  const handleToggleReimbursable = async () => {
    try {
      if (isReimbursable) {
        await updateMutation.mutateAsync({
          id: transaction.id,
          data: { reimbursement: null } as never,
        });
        toast({ title: 'Reimbursable flag cleared' });
      } else {
        await markReimbursableMutation.mutateAsync({
          id: transaction.id,
          type: 'work',
        });
        toast({ title: 'Marked as reimbursable' });
      }
    } catch {
      toast({ title: 'Failed to update reimbursable', variant: 'destructive' });
    }
  };

  const handleApplyMerchantRule = async () => {
    if (!transaction.counterparty || !transaction.categoryId) return;
    try {
      await bulkUpdateMutation.mutateAsync({
        counterparty: transaction.counterparty,
        categoryId: transaction.categoryId,
        excludeTransactionId: transaction.id,
      });
      toast({ title: `Applied to other ${transaction.counterparty} transactions` });
    } catch {
      toast({ title: 'Failed to apply rule', variant: 'destructive' });
    }
  };

  const handleResolvePicked = async (incomeTransactionId: string) => {
    setResolveOpen(false);
    try {
      await clearReimbursementMutation.mutateAsync({
        incomeTransactionId,
        expenseTransactionIds: [transaction.id],
      });
      toast({ title: 'Reimbursement resolved' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to resolve reimbursement', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(transaction.id);
      toast({ title: 'Transaction deleted' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const merchant = transaction.counterparty ?? transaction.description;
  const amountText = formatAmount(transaction.amount, { showSign: false });
  const sign = transaction.amount > 0 ? '+' : transaction.amount < 0 ? '−' : '';
  const dateText = format(transaction.date, 'EEE · MMM d · yyyy').toUpperCase();

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            closeIfClean();
            return;
          }
          onOpenChange(next);
        }}
      >
        <SheetContent
          onPointerDownOutside={(e) => {
            if (dirty) {
              e.preventDefault();
              setConfirmingDiscard(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            if (dirty) {
              e.preventDefault();
              setConfirmingDiscard(true);
            }
          }}
        >
          <div className="flex justify-end px-4 pb-1">
            <button
              type="button"
              onClick={closeIfClean}
              aria-label="Close"
              className="press font-mono text-[14px] leading-none text-textLo"
            >
              ✕
            </button>
          </div>

          <SheetBody>
            {/* HEADLINE */}
            <div className="px-4 pb-4">
              <div className="font-sans text-[20px] font-medium text-textHi">{merchant}</div>
              <div className="nums mt-1 font-mono text-[28px] font-medium text-textHi">
                {sign}
                {amountText}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-textLo">
                {dateText}
              </div>
            </div>

            {/* BANK DESCRIPTION — read-only full remittance text from the bank */}
            {transaction.bankDescription && (
              <>
                <SectionHeader>BANK DESCRIPTION</SectionHeader>
                <div className="hairline-b whitespace-pre-line px-4 py-3 font-mono text-[12px] leading-relaxed text-textMid">
                  {transaction.bankDescription}
                </div>
              </>
            )}

            {/* CATEGORY */}
            <SectionHeader>CATEGORY</SectionHeader>
            <RowButton
              onClick={() => {
                setPickerOpen(true);
              }}
              right="›"
            >
              <span className="font-sans text-[13.5px] text-textHi">
                {currentCategory?.name ?? 'Uncategorized'}
              </span>
            </RowButton>

            {/* FLAGS */}
            <SectionHeader>FLAGS</SectionHeader>
            <RowToggle
              label="Reimbursable"
              active={isReimbursable}
              onToggle={() => void handleToggleReimbursable()}
              disabled={markReimbursableMutation.isPending || updateMutation.isPending}
            />

            {/* NOTE */}
            <SectionHeader>NOTE</SectionHeader>
            <div className="hairline-b px-4 py-3">
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                }}
                placeholder="Add a note…"
                rows={3}
                className={cn(
                  'block w-full resize-none border border-rule bg-bg px-3 py-2',
                  'font-sans text-[13px] text-textHi placeholder:text-textLo',
                  'focus:outline-none focus:ring-1 focus:ring-accent'
                )}
              />
            </div>

            {/* MERCHANT RULES */}
            {transaction.counterparty && transaction.categoryId && currentCategory && (
              <>
                <SectionHeader>MERCHANT RULES</SectionHeader>
                <RowButton
                  onClick={() => void handleApplyMerchantRule()}
                  right="›"
                  disabled={bulkUpdateMutation.isPending}
                >
                  <span className="font-sans text-[13.5px] text-textMid">
                    Always categorize{' '}
                    <span className="text-textHi">{transaction.counterparty}</span> as{' '}
                    <span className="text-textHi">{currentCategory.name}</span>
                  </span>
                </RowButton>
              </>
            )}

            {/* MANUAL RESOLVE */}
            {isPendingReimb && (
              <>
                <SectionHeader>MANUAL RESOLVE</SectionHeader>
                <RowButton
                  onClick={() => {
                    setResolveOpen(true);
                  }}
                  right="›"
                >
                  <span className="font-sans text-[13.5px] text-textHi">Mark as reimbursed</span>
                </RowButton>
              </>
            )}

            {/* DELETE — slide-to-confirm to prevent accidental taps */}
            <div className="px-4 pb-6 pt-6">
              <SlideToDelete
                onConfirm={() => void handleDelete()}
                disabled={deleteMutation.isPending}
              />
            </div>

            {/* type='expense' currently ignored on display; the toggle uses 'work' default */}
            {!isExpense && isReimbursable && null}
          </SheetBody>

          {/* Discard confirm strip — pinned just above the sheet's safe-inset */}
          {confirmingDiscard && (
            <div className="hairline-t flex items-center gap-2 bg-surfaceHi px-4 py-3">
              <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.08em] text-textMid">
                Unsaved note
              </span>
              <button
                type="button"
                onClick={discardAndClose}
                className="press border border-rule px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-textMid"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => void saveNoteAndClose()}
                disabled={updateMutation.isPending}
                className="press border border-accent bg-accent-dim px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-accent disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CategoryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        categories={categories}
        currentCategoryId={transaction.categoryId}
        onPick={(id) => void handleCategoryPick(id)}
      />

      <ManualResolveSheet
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        onPick={(id) => void handleResolvePicked(id)}
      />
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-t hairline-b bg-bg/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
      {children}
    </div>
  );
}

interface RowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
}

function RowButton({ children, onClick, right, disabled }: RowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'press hairline-b flex w-full items-center gap-3 px-4 py-3.5 text-left',
        'disabled:opacity-50'
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {right && <span className="text-[16px] leading-none text-textLo">{right}</span>}
    </button>
  );
}

interface RowToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function RowToggle({ label, active, onToggle, disabled }: RowToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={active}
      className={cn(
        'press hairline-b flex w-full items-center justify-between px-4 py-3.5 text-left',
        'disabled:opacity-50'
      )}
    >
      <span className="font-sans text-[13.5px] text-textHi">{label}</span>
      <span
        className={cn(
          'inline-flex h-[22px] w-[40px] items-center border px-1 transition-colors duration-180',
          active ? 'border-accent bg-accent-dim' : 'border-rule bg-bg'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'block h-[14px] w-[14px] transition-transform duration-180',
            active ? 'translate-x-[18px] bg-accent' : 'translate-x-0 bg-textLo'
          )}
        />
      </span>
    </button>
  );
}

interface SlideToDeleteProps {
  onConfirm: () => void;
  disabled?: boolean;
}

/**
 * Slide-to-confirm delete control. The user drags the warn-coloured thumb
 * from left to right; once the drag passes ~85% of the track, deletion
 * fires. Releasing before that snaps the thumb back. Pointer events make
 * this work uniformly across mouse / touch / pen.
 *
 * Replaces the prior two-step `Delete → Confirm` button pair which was
 * easy to mistap on iPhone.
 */
function SlideToDelete({ onConfirm, disabled }: SlideToDeleteProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [committed, setCommitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number } | null>(null);

  const COMMIT_THRESHOLD = 0.85;
  const THUMB_W = 56;

  // Pointer events live on the track itself (the bigger touch target).
  // The thumb is purely visual (pointer-events: none). Drag progress is
  // computed from the live `getBoundingClientRect` of the track on every
  // event — this avoids the stale-trackW bug that bit when the sheet's
  // slide-up animation finished AFTER the SlideToDelete component first
  // mounted (ResizeObserver did fire eventually, but state updates didn't
  // reach the active drag closure). Reading the rect on each event is
  // cheap and always correct.
  //
  // Thumb position is rendered with `calc((100% - thumb) * progress)` so
  // CSS handles the layout — no JS-side pixel math needed for the visual.

  const handleProgressFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const max = rect.width - THUMB_W;
    if (max <= 0) return;
    const x = e.clientX - rect.left - THUMB_W / 2;
    setProgress(Math.max(0, Math.min(1, x / max)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || committed) return;
    const track = trackRef.current;
    if (!track) return;
    track.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId };
    setDragging(true);
    handleProgressFromEvent(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    handleProgressFromEvent(e);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (progress >= COMMIT_THRESHOLD) {
      setProgress(1);
      setCommitted(true);
      onConfirm();
    } else {
      setProgress(0);
    }
  };

  const labelOpacity = Math.max(0, 1 - progress * 1.5);

  return (
    <div
      ref={trackRef}
      role="button"
      tabIndex={disabled || committed ? -1 : 0}
      aria-label="Slide to delete transaction"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        'relative h-12 w-full overflow-hidden border border-warn/40 bg-warn-dim',
        'touch-none select-none',
        disabled || committed
          ? 'opacity-50'
          : 'cursor-grab active:cursor-grabbing'
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[12px] uppercase tracking-[0.08em] text-warn transition-opacity duration-100"
        style={{ opacity: labelOpacity }}
      >
        {committed ? 'Deleting…' : 'Slide to delete'}
      </span>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 flex items-center justify-center bg-warn text-bg',
          dragging ? '' : 'transition-[left] duration-180 ease-out'
        )}
        style={{
          width: `${THUMB_W}px`,
          left: `calc((100% - ${THUMB_W}px) * ${progress})`,
        }}
      >
        <span className="font-mono text-[16px] leading-none">›</span>
      </span>
    </div>
  );
}
