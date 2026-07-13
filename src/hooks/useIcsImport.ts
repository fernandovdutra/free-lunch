import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateFinancialData, queryKeys } from '@/lib/queryKeys';
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
      // Import writes transactions → refresh every money surface, plus the
      // statement list itself.
      invalidateFinancialData(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.icsStatements.root });
    },
  });
}
