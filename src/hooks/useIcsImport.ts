import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  importIcsStatementFn,
  type ImportIcsRequest,
  type ImportIcsResponse,
} from '@/lib/bankingFunctions';

export function useIcsImport() {
  const queryClient = useQueryClient();

  return useMutation<ImportIcsResponse, Error, ImportIcsRequest>({
    mutationFn: async (data) => {
      const result = await importIcsStatementFn(data);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
