import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssetType, Holding, Liquidity, UpdateSource } from '@/types/wealth';

const ASSET_TYPES: AssetType[] = [
  'Real Estate',
  'Vehicle',
  'Equities',
  'Crypto',
  'Cash',
  'Mortgage',
  'Credit',
  'Loan',
];

interface EditDetailsDialogProps {
  holding: Holding | null;
  onClose: () => void;
  /** Updates holding attributes (distinct from writing a value point). */
  onSubmit: (id: string, patch: Partial<Holding>) => void;
}

export function EditDetailsDialog({ holding, onClose, onSubmit }: EditDetailsDialogProps) {
  const [name, setName] = useState(holding?.name ?? '');
  const [platform, setPlatform] = useState(holding?.platform ?? '');
  const [type, setType] = useState<AssetType>(holding?.type ?? 'Cash');
  const [cost, setCost] = useState(String(holding?.cost ?? ''));
  const [liquidity, setLiquidity] = useState<Liquidity>(holding?.liquidity ?? 'liquid');
  const [source, setSource] = useState<UpdateSource>(holding?.updateSource ?? 'manual');
  const [symbol, setSymbol] = useState(holding?.symbol ?? '');

  if (!holding) return null;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(holding.id, {
      name,
      platform,
      type,
      cost: parseFloat(cost) || 0,
      liquidity,
      updateSource: source,
      symbol: source === 'auto' ? symbol.trim() || null : null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit details · {holding.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ed-name">Name</Label>
            <Input id="ed-name" value={name} onChange={(e) => { setName(e.target.value); }} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-platform">Platform</Label>
            <Input
              id="ed-platform"
              value={platform}
              onChange={(e) => { setPlatform(e.target.value); }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => { setType(v as AssetType); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {holding.kind === 'asset' && (
            <div className="space-y-2">
              <Label htmlFor="ed-cost">Cost basis (€)</Label>
              <Input
                id="ed-cost"
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => { setCost(e.target.value); }}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Liquidity</Label>
              <Select value={liquidity} onValueChange={(v) => { setLiquidity(v as Liquidity); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liquid">Liquid</SelectItem>
                  <SelectItem value="illiquid">Illiquid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => { setSource(v as UpdateSource); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto">Auto-priced</SelectItem>
                  <SelectItem value="bank">Bank sync</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {source === 'auto' && (
            <div className="space-y-2">
              <Label htmlFor="ed-symbol">Ticker / symbol</Label>
              <Input
                id="ed-symbol"
                value={symbol}
                onChange={(e) => { setSymbol(e.target.value); }}
                placeholder="e.g. IWDA, BTC/USD"
              />
            </div>
          )}
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
