import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAvailableBanks,
  getBankStatus,
  initBankConnection,
  syncTransactions,
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
