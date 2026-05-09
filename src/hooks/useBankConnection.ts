import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAvailableBanks,
  getBankStatus,
  initBankConnection,
  syncTransactions,
  recategorizeTransactions,
} from '@/lib/bankingFunctions';
import {
  pickSiblingsByIban,
  routeTxnsForDisconnect,
  type ConnectionLike,
  type TxnLike,
} from './disconnectBankRouting';

export function useAvailableBanks(country = 'NL') {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: ['availableBanks', country],
    queryFn: async () => {
      const result = await getAvailableBanks({ country });
      return result.data;
    },
    enabled: !!dataOwnerId,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useBankConnections() {
  const { dataOwnerId } = useAuth();

  return useQuery({
    queryKey: ['bankConnections', dataOwnerId],
    queryFn: async () => {
      const result = await getBankStatus();
      return result.data;
    },
    enabled: !!dataOwnerId,
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

export function useInitBankConnection() {
  return useMutation({
    mutationFn: async (params: { bankName: string; bankCountry?: string }) => {
      const result = await initBankConnection(params);
      return result.data;
    },
    onSuccess: (data) => {
      // Redirect to bank authorization
      window.location.href = data.authUrl;
    },
  });
}

export function useSyncTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const result = await syncTransactions({ connectionId });
      return result.data;
    },
    onSuccess: () => {
      // Invalidate transactions and bank connections
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
    },
  });
}

/**
 * Sync all bank connections at once.
 * Used by the header sync button.
 */
export function useSyncAllConnections() {
  const queryClient = useQueryClient();
  const { data: connections = [] } = useBankConnections();

  return useMutation({
    mutationFn: async () => {
      const activeConnections = connections.filter((c) => c.status === 'active');

      if (activeConnections.length === 0) {
        return { synced: 0, total: 0, errors: [] as Error[] };
      }

      const results = await Promise.allSettled(
        activeConnections.map((connection) => syncTransactions({ connectionId: connection.id }))
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason as Error);

      return {
        synced: successCount,
        total: activeConnections.length,
        errors,
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Reset all transaction data to allow re-syncing with auto-categorization.
 * This deletes all transactions and raw bank transactions, and resets
 * the lastSync date on bank connections.
 */
export function useResetTransactionData() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!dataOwnerId) throw new Error('Not authenticated');

      // Delete all transactions
      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);

      // Delete in batches of 500 (Firestore limit)
      const transactionDocs = transactionsSnapshot.docs;
      for (let i = 0; i < transactionDocs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = transactionDocs.slice(i, i + 500);
        chunk.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
        });
        await batch.commit();
      }

      // Delete all raw bank transactions
      const rawTransactionsRef = collection(db, 'users', dataOwnerId, 'rawBankTransactions');
      const rawTransactionsSnapshot = await getDocs(rawTransactionsRef);

      const rawTransactionDocs = rawTransactionsSnapshot.docs;
      for (let i = 0; i < rawTransactionDocs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = rawTransactionDocs.slice(i, i + 500);
        chunk.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
        });
        await batch.commit();
      }

      // Reset lastSync on all bank connections to allow full re-sync
      const connectionsRef = collection(db, 'users', dataOwnerId, 'bankConnections');
      const connectionsSnapshot = await getDocs(connectionsRef);

      for (const connectionDoc of connectionsSnapshot.docs) {
        await updateDoc(doc(db, 'users', dataOwnerId, 'bankConnections', connectionDoc.id), {
          lastSync: null,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        deletedTransactions: transactionDocs.length,
        deletedRawTransactions: rawTransactionDocs.length,
        resetConnections: connectionsSnapshot.docs.length,
      };
    },
    onSuccess: () => {
      // Invalidate all related queries
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    },
  });
}

export interface DisconnectResult {
  removedConnectionId: string;
  reassigned: number;
  deleted: number;
  /** Set when at least one IBAN on the removed connection had a surviving
   *  sibling — i.e. this was a duplicate-cleanup, not a true disconnect. */
  merged: boolean;
}

/**
 * Disconnect a bank connection. If another active connection shares any of
 * the target's IBANs, the target's transactions migrate to that sibling
 * (deduped by externalId) so manual categorizations and splits survive.
 * Otherwise the target's transactions are deleted alongside the connection.
 *
 * Implemented client-side over Firestore so we don't need a Cloud Function
 * deploy to ship the cleanup. All work runs as the user under existing
 * collection rules.
 */
export function useDisconnectBankConnection() {
  const queryClient = useQueryClient();
  const { dataOwnerId } = useAuth();

  return useMutation<DisconnectResult, Error, { connectionId: string }>({
    mutationFn: async ({ connectionId }) => {
      if (!dataOwnerId) throw new Error('Not authenticated');

      const connectionsRef = collection(db, 'users', dataOwnerId, 'bankConnections');
      const connectionsSnap = await getDocs(connectionsRef);

      const allConnections: (ConnectionLike & { docId: string })[] = connectionsSnap.docs.map(
        (snap) => {
          const data = snap.data();
          const ts: unknown = data.updatedAt;
          const updatedAtMs =
            ts instanceof Timestamp ? ts.toMillis()
              : typeof ts === 'number' ? ts
              : typeof ts === 'string' ? Date.parse(ts)
              : undefined;
          return {
            docId: snap.id,
            id: (data.id as string | undefined) ?? snap.id,
            status: (data.status as string | undefined) ?? 'active',
            accounts: ((data.accounts ?? []) as { iban?: string | null }[])
              .map((a) => ({ iban: a.iban ?? '' }))
              .filter((a) => a.iban !== ''),
            updatedAtMs:
              updatedAtMs !== undefined && !Number.isNaN(updatedAtMs) ? updatedAtMs : undefined,
          };
        }
      );

      const target = allConnections.find((c) => c.id === connectionId || c.docId === connectionId);
      if (!target) throw new Error('Bank connection not found');

      const transactionsRef = collection(db, 'users', dataOwnerId, 'transactions');
      const targetTxnsSnap = await getDocs(
        query(transactionsRef, where('bankConnectionId', '==', target.id))
      );
      const targetTxns: TxnLike[] = targetTxnsSnap.docs.map((snap) => {
        const data = snap.data();
        return {
          id: snap.id,
          bankConnectionId: (data.bankConnectionId as string | undefined) ?? '',
          bankAccountId: (data.bankAccountId as string | null | undefined) ?? null,
          externalId: (data.externalId as string | null | undefined) ?? null,
        };
      });

      // Bulk-load externalIds for every distinct sibling we'd reassign to
      // (one query per sibling, in parallel). One sequential dedup query
      // per target txn caused the disconnect to hang on large duplicate
      // accounts; this collapses it to ~M reads (M = number of siblings).
      const siblingIds = Array.from(
        new Set(
          Array.from(pickSiblingsByIban(target, allConnections).values()).map((s) => s.id)
        )
      );
      const siblingExternalIds = new Map<string, Set<string>>();
      await Promise.all(
        siblingIds.map(async (sid) => {
          const snap = await getDocs(
            query(transactionsRef, where('bankConnectionId', '==', sid))
          );
          const set = new Set<string>();
          snap.docs.forEach((d) => {
            const ext = d.data().externalId as string | null | undefined;
            if (ext) set.add(ext);
          });
          siblingExternalIds.set(sid, set);
        })
      );

      const decision = routeTxnsForDisconnect({
        target,
        allConnections,
        targetTxns,
        siblingHasExternalId: (siblingId, externalId) =>
          siblingExternalIds.get(siblingId)?.has(externalId) ?? false,
      });

      const toDelete = decision.toDelete;
      const toReassign = decision.toReassign;

      // Apply writes in batches of 500 (Firestore's batch limit).
      const allOps: { kind: 'delete' | 'reassign'; txnId: string; newConnectionId?: string }[] = [
        ...toDelete.map((id) => ({ kind: 'delete' as const, txnId: id })),
        ...toReassign.map((r) => ({
          kind: 'reassign' as const,
          txnId: r.txnId,
          newConnectionId: r.newConnectionId,
        })),
      ];

      for (let i = 0; i < allOps.length; i += 500) {
        const batch = writeBatch(db);
        for (const op of allOps.slice(i, i + 500)) {
          const ref = doc(db, 'users', dataOwnerId, 'transactions', op.txnId);
          if (op.kind === 'delete') {
            batch.delete(ref);
          } else {
            batch.update(ref, {
              bankConnectionId: op.newConnectionId,
              updatedAt: serverTimestamp(),
            });
          }
        }
        await batch.commit();
      }

      // Finally remove the connection doc itself.
      await deleteDoc(doc(db, 'users', dataOwnerId, 'bankConnections', target.docId));

      const merged = toReassign.length > 0;
      return {
        removedConnectionId: target.id,
        reassigned: toReassign.length,
        deleted: toDelete.length,
        merged,
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['bankConnections'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    },
  });
}

/**
 * Re-run auto-categorization on all non-manually categorized transactions.
 * Optionally use LLM for uncategorized transactions.
 */
export function useRecategorizeTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { useLLM?: boolean; mode?: 'all' | 'uncategorized' }) => {
      const result = await recategorizeTransactions(options);
      return result.data;
    },
    onSuccess: () => {
      // Invalidate transactions to reflect new categories
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
