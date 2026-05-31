import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAmount } from '@/lib/utils';
import { formatUnits } from '@/lib/wealth';
import type { Holding } from '@/types/wealth';

interface UpdateValueDialogProps {
  holding: Holding | null;
  onClose: () => void;
  /** Writes a new dated history point. */
  onSubmit: (id: string, point: { date: string; value: number }) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function UpdateValueDialog({ holding, onClose, onSubmit }: UpdateValueDialogProps) {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(today());

  if (!holding) return null;

  const estimate =
    holding.updateSource === 'auto' && holding.livePrice != null && holding.units != null
      ? holding.livePrice * holding.units
      : null;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = parseFloat(value);
    if (Number.isNaN(v)) return;
    onSubmit(holding.id, { date, value: v });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update value · {holding.name}</DialogTitle>
          <DialogDescription>Records a new dated point in this holding's history.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {holding.updateSource === 'auto' && estimate != null && (
            <div className="rounded-card border border-rule bg-surfaceHi p-3 font-mono text-[11px]">
              <div className="flex justify-between text-textLo">
                <span>LIVE PRICE</span>
                <span className="tabular-nums text-textHi">
                  {formatAmount(holding.livePrice!, { showSign: false })}
                </span>
              </div>
              <div className="flex justify-between text-textLo">
                <span>YOUR HOLDING</span>
                <span className="tabular-nums text-textHi">
                  {formatUnits(holding.units!, holding.type)} units
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-rule pt-1 text-textLo">
                <span>ESTIMATED VALUE</span>
                <span className="tabular-nums text-accent">
                  {formatAmount(estimate, { showSign: false, noCents: true })}
                </span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="uv-date">Date</Label>
            <Input id="uv-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); }} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uv-value">New value (€)</Label>
            <Input
              id="uv-value"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => { setValue(e.target.value); }}
              placeholder={
                estimate != null
                  ? estimate.toFixed(2)
                  : String(holding.value)
              }
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
