import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateFinancialData } from '@/lib/queryKeys';
import { useTransactions } from '@/hooks/useTransactions';
import { useResetTransactionData } from '@/hooks/useBankConnection';
import { useToast } from '@/components/ui/toaster';
import { SectionHeader } from '@/components/redesign';
import { SettingsScreen } from './_shared/SettingsScreen';
import { TypedConfirmDialog } from './_shared/TypedConfirmDialog';

interface DangerRowProps {
  glyph: string;
  label: string;
  meta: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}

function DangerRow({ glyph, label, meta, onClick, disabled, pending }: DangerRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="flex w-full items-center gap-[14px] border-t border-rule px-4 py-[14px] text-left disabled:opacity-40 active:opacity-60"
    >
      <span aria-hidden className="w-6 text-center font-mono text-[16px] leading-none text-warn">
        {glyph}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-medium leading-tight tracking-[-0.1px] text-textHi">
          {label}
        </span>
        <span className="block text-[12.5px] text-textMid mt-[2px] leading-[1.35]">
          {meta}
        </span>
      </span>
      <span aria-hidden className="font-mono text-[10.5px] tracking-[0.04em] text-warn">
        {pending ? '…' : '›'}
      </span>
    </button>
  );
}

/**
 * Hook: clear `categoryId` on every transaction. Doesn't delete txns —
 * after running, the auto-categorize action in /settings/categorization
 * can re-categorize them via rules / merchant DB / AI.
 */
function useResetCategories() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!dataOwnerId) throw new Error('Not authenticated');
      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
      const snap = await getDocs(transactionsRef);
      const docs = snap.docs;
      let cleared = 0;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach((d) => {
          batch.update(d.ref, { categoryId: null, categorySource: 'auto' });
          cleared += 1;
        });
        await batch.commit();
      }
      return { cleared };
    },
    onSuccess: () => {
      invalidateFinancialData(queryClient);
    },
  });
}

type DialogId = 'resetCategories' | 'resetData' | null;

/**
 * Settings · Danger Zone — destructive actions gated behind typed-phrase
 * confirmations per resolved Q3. Wired actions:
 *   • RESET CATEGORIES — clears categoryId on every transaction; lets the
 *     auto-categorization engine re-process them.
 *   • RESET TRANSACTION DATA — uses the existing useResetTransactionData
 *     hook (deletes transactions + raw bank transactions, clears lastSync
 *     so the next sync re-imports everything).
 *
 * Stub actions (rendered disabled with a "needs Cloud Function" meta):
 *   • DELETE ALL DATA — would wipe all subcollections; out of scope for
 *     Phase 10 because doing it safely needs a transactional Function.
 *   • DELETE ACCOUNT — needs an Auth admin call from a Cloud Function.
 */
export function SettingsDanger() {
  const { user, currentRole } = useAuth();
  const { data: transactions = [] } = useTransactions({});
  const resetData = useResetTransactionData();
  const resetCategories = useResetCategories();
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState<DialogId>(null);

  const transactionCount = transactions.length;

  if (currentRole && currentRole !== 'owner') {
    return <Navigate to="/settings" replace />;
  }

  const handleResetCategories = async () => {
    try {
      const r = await resetCategories.mutateAsync();
      toast({
        title: 'Categories reset',
        description: `${r.cleared} transactions cleared`,
      });
      setOpenDialog(null);
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleResetData = async () => {
    try {
      const r = await resetData.mutateAsync();
      toast({
        title: 'Transaction data reset',
        description: `${r.deletedTransactions} txns · ${r.resetConnections} connection${r.resetConnections === 1 ? '' : 's'} ready to re-sync`,
      });
      setOpenDialog(null);
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <SettingsScreen title="DANGER ZONE">
      <div className="mx-4 mb-4 mt-2 border border-warn/40 bg-warn/10 px-4 py-3 text-[12px] leading-snug text-warn">
        <strong className="font-semibold">These actions are irreversible.</strong> Each one
        requires you to type the action name to confirm. Your account stays signed in.
      </div>

      <SectionHeader>RESET</SectionHeader>
      <DangerRow
        glyph="↻"
        label="Reset categories"
        meta={`Clear categoryId on all ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`}
        onClick={() => {
          setOpenDialog('resetCategories');
        }}
        disabled={transactionCount === 0}
        pending={resetCategories.isPending}
      />
      <DangerRow
        glyph="✕"
        label="Reset transaction data"
        meta="Delete all transactions and re-sync from your bank"
        onClick={() => {
          setOpenDialog('resetData');
        }}
        disabled={transactionCount === 0}
        pending={resetData.isPending}
      />

      <SectionHeader>ACCOUNT</SectionHeader>
      <DangerRow
        glyph="△"
        label="Delete all data"
        meta="Wipe categories, rules, and budgets — coming soon"
        onClick={() => {
          /* disabled */
        }}
        disabled
      />
      <DangerRow
        glyph="△"
        label="Delete account"
        meta="Closes the account. Requires a Cloud Function — coming soon"
        onClick={() => {
          /* disabled */
        }}
        disabled
      />

      <div className="px-4 pt-6 pb-4 font-mono text-[10.5px] uppercase tracking-[0.04em] text-textLo">
        SIGNED IN AS <span className="text-textMid">{user?.email ?? '—'}</span>
      </div>

      <TypedConfirmDialog
        open={openDialog === 'resetCategories'}
        onOpenChange={(o) => {
          setOpenDialog(o ? 'resetCategories' : null);
        }}
        phrase="RESET CATEGORIES"
        title="RESET CATEGORIES"
        description={`This will clear the category on all ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}. Manual categorizations will be lost; the auto-categorize action in CATEGORIZATION can rebuild them.`}
        warning="Manual categorizations will be lost. Your transaction list stays intact."
        confirmLabel="RESET CATEGORIES"
        onConfirm={handleResetCategories}
        pending={resetCategories.isPending}
      />

      <TypedConfirmDialog
        open={openDialog === 'resetData'}
        onOpenChange={(o) => {
          setOpenDialog(o ? 'resetData' : null);
        }}
        phrase="RESET DATA"
        title="RESET TRANSACTION DATA"
        description={`This deletes all ${transactionCount} transaction${transactionCount === 1 ? '' : 's'} and the raw bank cache. Your bank connection stays active so you can re-sync immediately.`}
        warning="All transaction history, manual categorizations, and reimbursement data will be lost."
        confirmLabel="RESET ALL DATA"
        onConfirm={handleResetData}
        pending={resetData.isPending}
      />
    </SettingsScreen>
  );
}
