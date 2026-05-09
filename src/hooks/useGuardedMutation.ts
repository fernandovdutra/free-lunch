import {
  useMutation,
  type MutationFunction,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export class ReadOnlyAccessError extends Error {
  constructor() {
    super('Read-only access — mutations are not permitted');
    this.name = 'ReadOnlyAccessError';
  }
}

interface GuardOptions {
  /** When true, only `'owner'` may run the mutation (e.g. bank sync, sharing). */
  ownerOnly?: boolean;
}

/**
 * Wraps `useMutation` and short-circuits when the signed-in user lacks write
 * access on the data owner's account. Defends against UI guards being missed —
 * the mutation throws synchronously before touching Firestore.
 */
export function useGuardedMutation<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  guard: GuardOptions = {}
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { currentRole } = useAuth();
  const allowed: ReadonlyArray<string> = guard.ownerOnly ? ['owner'] : ['owner', 'editor'];

  const mutationFn = options.mutationFn;
  const guardedFn: MutationFunction<TData, TVariables> | undefined = mutationFn
    ? async (variables, context) => {
        if (!currentRole || !allowed.includes(currentRole)) {
          throw new ReadOnlyAccessError();
        }
        return mutationFn(variables, context);
      }
    : undefined;

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    ...(guardedFn ? { mutationFn: guardedFn } : {}),
  });
}
