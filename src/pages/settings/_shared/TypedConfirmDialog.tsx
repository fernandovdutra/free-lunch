import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface TypedConfirmDialogProps {
  /** Phrase the user must type verbatim to enable the destructive button. */
  phrase: string;
  /** Localized title (uppercase recommended). */
  title: string;
  /** Plain-language description of what will happen. */
  description: string;
  /** Optional warning paragraph rendered in the warn-tinted banner. */
  warning?: string;
  /** Label for the destructive button. Pending state is handled internally. */
  confirmLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  pending?: boolean;
}

/**
 * Two-step confirm modal for Danger Zone actions. The destructive button
 * stays disabled until the user types the exact `phrase` (case-sensitive)
 * — matches the resolved Q3 (typed-phrase per action). Closing the dialog
 * resets the typed input so a stale value can't bypass the gate on reopen.
 */
export function TypedConfirmDialog({
  phrase,
  title,
  description,
  warning,
  confirmLabel,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: TypedConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const armed = typed === phrase && !pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-warn">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {warning ? (
            <div className="border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] text-warn leading-snug">
              <strong className="font-semibold">Warning: </strong>
              {warning}
            </div>
          ) : null}
          <label className="block text-[12px] text-textMid">
            Type <span className="font-mono font-bold text-textHi">{phrase}</span> to
            confirm.
            <Input
              autoFocus
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
              }}
              placeholder={phrase}
              className="mt-2 font-mono"
            />
          </label>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
            }}
            className="border border-rule px-4 py-2 font-mono text-[11px] uppercase tracking-[0.04em] text-textMid"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              if (!armed) return;
              void onConfirm();
            }}
            disabled={!armed}
            className="border border-warn bg-warn/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.04em] text-warn disabled:opacity-40"
          >
            {pending ? '…' : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
