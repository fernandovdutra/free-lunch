import { useState } from 'react';
import { Plus, AlertTriangle, TrendingUp, TrendingDown, Wallet, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useInvestments,
  useCreateInvestment,
  useUpdateInvestment,
  useAddInvestmentEntry,
  useDeleteInvestment,
} from '@/hooks/useInvestments';
import {
  useDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
} from '@/hooks/useDebts';
import { formatAmount } from '@/lib/utils';
import type { Investment, InvestmentFormData, Debt, DebtFormData } from '@/types';

const investmentTypeLabels: Record<Investment['type'], string> = {
  etf: 'ETF',
  stock: 'Stock',
  bond: 'Bond',
  crypto: 'Crypto',
  savings: 'Savings',
  pension: 'Pension',
  other: 'Other',
};

const debtTypeLabels: Record<Debt['type'], string> = {
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  credit_card: 'Credit Card',
  other: 'Other',
};

// Build an aggregate net-worth timeline from all investments.
// Strategy: collect all unique snapshot dates, then for each date sum the most
// recent marketValue of every investment at or before that date.
function buildPortfolioTimeline(investments: Investment[]) {
  const allDates = Array.from(
    new Set(
      investments.flatMap((inv) => inv.entries.map((e) => e.date.getTime()))
    )
  ).sort((a, b) => a - b);

  return allDates.map((ts) => {
    const date = new Date(ts);
    let total = 0;
    for (const inv of investments) {
      // Latest entry at or before this date
      const entry = [...inv.entries]
        .filter((e) => e.date.getTime() <= ts)
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      if (entry) total += entry.marketValue;
    }
    return { date: format(date, 'MMM yy'), value: total, ts };
  });
}

// Tiny 32px sparkline — no axes, no tooltip, pure trend indicator
function Sparkline({ entries }: { entries: Investment['entries'] }) {
  if (entries.length < 2) return null;
  const data = entries.map((e) => ({ v: e.marketValue }));
  const first = data[0]!.v;
  const last = data[data.length - 1]!.v;
  const color = last >= first ? '#10b981' : '#ef4444';
  return (
    <div className="h-8 w-20 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <Line type="monotone" dataKey="v" dot={false} strokeWidth={1.5} stroke={color} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Investments() {
  const [invFormOpen, setInvFormOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState<string | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deleteInvestmentTarget, setDeleteInvestmentTarget] = useState<Investment | null>(null);

  const [debtFormOpen, setDebtFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deleteDebtTarget, setDeleteDebtTarget] = useState<Debt | null>(null);

  const { data: investments, isLoading: invLoading, error: invError } = useInvestments();
  const { data: debts, isLoading: debtLoading } = useDebts();

  const createInvMutation = useCreateInvestment();
  const updateInvMutation = useUpdateInvestment();
  const addEntryMutation = useAddInvestmentEntry();
  const deleteInvMutation = useDeleteInvestment();

  const createDebtMutation = useCreateDebt();
  const updateDebtMutation = useUpdateDebt();
  const deleteDebtMutation = useDeleteDebt();

  const investmentsList = investments ?? [];
  const debtsList = debts ?? [];
  const isLoading = invLoading || debtLoading;

  // Totals
  let totalAssets = 0;
  let totalCost = 0;
  for (const inv of investmentsList) {
    if (inv.entries.length > 0) {
      const latest = inv.entries[inv.entries.length - 1]!;
      totalAssets += latest.marketValue;
      totalCost += latest.costBasis;
    }
  }
  const totalDebt = debtsList.reduce((s, d) => s + d.balance, 0);
  const netWorth = totalAssets - totalDebt;
  const totalGain = totalAssets - totalCost;
  const totalReturnPct = totalCost > 0 ? ((totalAssets - totalCost) / totalCost) * 100 : 0;

  const portfolioTimeline = buildPortfolioTimeline(investmentsList);
  const showPortfolioChart = portfolioTimeline.length >= 2;

  // ── Investment form ──────────────────────────────────────────────────────
  const handleInvSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: InvestmentFormData = {
      name: fd.get('name') as string,
      platform: fd.get('platform') as string,
      type: fd.get('type') as Investment['type'],
      currency: 'EUR',
      notes: (fd.get('notes') as string) || null,
    };
    if (editingInvestment) {
      await updateInvMutation.mutateAsync({ id: editingInvestment.id, data });
    } else {
      await createInvMutation.mutateAsync(data);
    }
    setInvFormOpen(false);
    setEditingInvestment(null);
  };

  const handleAddSnapshot = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!snapshotOpen) return;
    const fd = new FormData(e.currentTarget);
    await addEntryMutation.mutateAsync({
      investmentId: snapshotOpen,
      entry: {
        date: new Date(fd.get('date') as string),
        marketValue: parseFloat(fd.get('marketValue') as string),
        costBasis: parseFloat(fd.get('costBasis') as string),
      },
    });
    setSnapshotOpen(null);
  };

  // ── Debt form ────────────────────────────────────────────────────────────
  const handleDebtSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: DebtFormData = {
      name: fd.get('name') as string,
      type: fd.get('type') as Debt['type'],
      balance: parseFloat(fd.get('balance') as string),
      originalAmount: fd.get('originalAmount') ? parseFloat(fd.get('originalAmount') as string) : null,
      interestRate: fd.get('interestRate') ? parseFloat(fd.get('interestRate') as string) : null,
      monthlyPayment: fd.get('monthlyPayment') ? parseFloat(fd.get('monthlyPayment') as string) : null,
      notes: (fd.get('notes') as string) || null,
    };
    if (editingDebt) {
      await updateDebtMutation.mutateAsync({ id: editingDebt.id, data });
    } else {
      await createDebtMutation.mutateAsync(data);
    }
    setDebtFormOpen(false);
    setEditingDebt(null);
  };

  if (invError) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load data</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Net Worth</h1>
          <p className="text-muted-foreground">Assets, investments, and liabilities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingDebt(null); setDebtFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Debt
          </Button>
          <Button onClick={() => { setEditingInvestment(null); setInvFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Investment
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tabular-nums ${netWorth >= 0 ? '' : 'text-red-500'}`}>
                {formatAmount(netWorth, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">assets − liabilities</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(totalAssets, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalGain >= 0 ? '+' : ''}{formatAmount(totalGain, { showSign: false })} ({totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-red-500">
                {formatAmount(totalDebt, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">{debtsList.length} liabilit{debtsList.length === 1 ? 'y' : 'ies'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Basis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatAmount(totalCost, { showSign: false })}
              </div>
              <p className="text-xs text-muted-foreground">total invested</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Portfolio overview chart */}
      {!isLoading && showPortfolioChart && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioTimeline} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D4739" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1D4739" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    formatter={(v: number) => [`€${v.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 'Portfolio']}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#1D4739" strokeWidth={2} fill="url(#portfolioGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investments list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Investments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : investmentsList.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No investments yet. Add one to start tracking!
            </div>
          ) : (
            <div className="divide-y">
              {investmentsList.map((inv) => {
                const latest = inv.entries.length > 0 ? inv.entries[inv.entries.length - 1] : null;
                const gain = latest ? latest.marketValue - latest.costBasis : 0;
                const returnPct = latest && latest.costBasis > 0
                  ? ((latest.marketValue - latest.costBasis) / latest.costBasis) * 100
                  : 0;

                return (
                  <div key={inv.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">{inv.name}</span>
                        <span className="text-xs text-muted-foreground">{inv.platform} · {investmentTypeLabels[inv.type]}</span>
                      </div>
                      {latest && (
                        <div className="mt-0.5 flex items-baseline gap-2">
                          <span className="text-sm font-semibold tabular-nums">{formatAmount(latest.marketValue, { showSign: false })}</span>
                          <span className={`text-xs ${gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {gain >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                          </span>
                          {latest && (
                            <span className="text-xs text-muted-foreground">{format(latest.date, 'MMM d')}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Sparkline entries={inv.entries} />
                    <div className="flex shrink-0 gap-1">
                      <Button variant="outline" size="sm" onClick={() => { setSnapshotOpen(inv.id); }}>
                        Snapshot
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingInvestment(inv); setInvFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteInvestmentTarget(inv); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debts / Liabilities list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : debtsList.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No liabilities recorded. Add a mortgage or loan to track your net worth accurately.
            </div>
          ) : (
            <div className="divide-y">
              {debtsList.map((debt) => {
                const paidPct = debt.originalAmount && debt.originalAmount > 0
                  ? ((debt.originalAmount - debt.balance) / debt.originalAmount) * 100
                  : null;

                return (
                  <div key={debt.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">{debt.name}</span>
                        <span className="text-xs text-muted-foreground">{debtTypeLabels[debt.type]}</span>
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-sm font-semibold tabular-nums text-red-500">
                          {formatAmount(debt.balance, { showSign: false })}
                        </span>
                        {debt.interestRate != null && (
                          <span className="text-xs text-muted-foreground">{debt.interestRate}% p.a.</span>
                        )}
                        {paidPct != null && (
                          <span className="text-xs text-muted-foreground">{paidPct.toFixed(0)}% paid off</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingDebt(debt); setDebtFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteDebtTarget(debt); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}

      {/* Investment form */}
      <Dialog open={invFormOpen} onOpenChange={(open) => { setInvFormOpen(open); if (!open) setEditingInvestment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInvestment ? 'Edit Investment' : 'Add Investment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleInvSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={editingInvestment?.name ?? ''} required placeholder="e.g., DeGiro ETF Portfolio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Input id="platform" name="platform" defaultValue={editingInvestment?.platform ?? ''} required placeholder="e.g., DeGiro, ABN AMRO" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={editingInvestment?.type ?? 'etf'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(investmentTypeLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" name="notes" defaultValue={editingInvestment?.notes ?? ''} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setInvFormOpen(false); }}>Cancel</Button>
              <Button type="submit" disabled={createInvMutation.isPending || updateInvMutation.isPending}>
                {editingInvestment ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Snapshot dialog */}
      <Dialog open={!!snapshotOpen} onOpenChange={(open) => { if (!open) setSnapshotOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Portfolio Snapshot</DialogTitle>
            <DialogDescription>Record the current market value and cost basis.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleAddSnapshot(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marketValue">Market Value (€)</Label>
                <Input id="marketValue" name="marketValue" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costBasis">Cost Basis (€)</Label>
                <Input id="costBasis" name="costBasis" type="number" step="0.01" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setSnapshotOpen(null); }}>Cancel</Button>
              <Button type="submit" disabled={addEntryMutation.isPending}>Save Snapshot</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete investment confirmation */}
      <Dialog open={!!deleteInvestmentTarget} onOpenChange={(open) => { if (!open) setDeleteInvestmentTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Investment</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteInvestmentTarget?.name}&quot;? All snapshot history will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteInvestmentTarget(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => void deleteInvMutation.mutateAsync(deleteInvestmentTarget!.id).then(() => setDeleteInvestmentTarget(null))} disabled={deleteInvMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debt form */}
      <Dialog open={debtFormOpen} onOpenChange={(open) => { setDebtFormOpen(open); if (!open) setEditingDebt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDebt ? 'Edit Liability' : 'Add Liability'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleDebtSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="debt-name">Name</Label>
              <Input id="debt-name" name="name" defaultValue={editingDebt?.name ?? ''} required placeholder="e.g., ING Mortgage" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-type">Type</Label>
              <Select name="type" defaultValue={editingDebt?.type ?? 'mortgage'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(debtTypeLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance">Current Balance (€)</Label>
                <Input id="balance" name="balance" type="number" step="0.01" defaultValue={editingDebt?.balance ?? ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalAmount">Original Amount (€)</Label>
                <Input id="originalAmount" name="originalAmount" type="number" step="0.01" defaultValue={editingDebt?.originalAmount ?? ''} placeholder="optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input id="interestRate" name="interestRate" type="number" step="0.01" defaultValue={editingDebt?.interestRate ?? ''} placeholder="optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyPayment">Monthly Payment (€)</Label>
                <Input id="monthlyPayment" name="monthlyPayment" type="number" step="0.01" defaultValue={editingDebt?.monthlyPayment ?? ''} placeholder="optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-notes">Notes (optional)</Label>
              <Input id="debt-notes" name="notes" defaultValue={editingDebt?.notes ?? ''} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDebtFormOpen(false); }}>Cancel</Button>
              <Button type="submit" disabled={createDebtMutation.isPending || updateDebtMutation.isPending}>
                {editingDebt ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete debt confirmation */}
      <Dialog open={!!deleteDebtTarget} onOpenChange={(open) => { if (!open) setDeleteDebtTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Liability</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteDebtTarget?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDebtTarget(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => void deleteDebtMutation.mutateAsync(deleteDebtTarget!.id).then(() => setDeleteDebtTarget(null))} disabled={deleteDebtMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
