import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
  serverTimestamp,
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

export function useAvailableBanks(country = 'NL') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['availableBanks', country],
    queryFn: async () => {
      const result = await getAvailableBanks({ country });
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useBankConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bankConnections', user?.id],
    queryFn: async () => {
      const result = await getBankStatus();
      return result.data;
    },
    enabled: !!user?.id,
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
 * Reset all transaction data to allow re-syncing with auto-categorization.
 * This deletes all transactions and raw bank transactions, and resets
 * the lastSync date on bank connections.
 */
export function useResetTransactionData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Delete all transactions
      const transactionsRef = collection(db, 'users', user.id, 'transactions');
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
      const rawTransactionsRef = collection(db, 'users', user.id, 'rawBankTransactions');
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
      const connectionsRef = collection(db, 'users', user.id, 'bankConnections');
      const connectionsSnapshot = await getDocs(connectionsRef);

      for (const connectionDoc of connectionsSnapshot.docs) {
        await updateDoc(doc(db, 'users', user.id, 'bankConnections', connectionDoc.id), {
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

/**
 * Re-run auto-categorization on all non-manually categorized transactions.
 */
export function useRecategorizeTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await recategorizeTransactions();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate transactions to reflect new categories
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
