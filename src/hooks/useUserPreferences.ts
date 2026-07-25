import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

export type DefaultTab =
  | 'home'
  | 'transactions'
  | 'budgets'
  | 'reimbursements'
  | 'expenses';

export interface UserPreferences {
  display: {
    /** Tab opened on app launch. Phase 11 wires it into the post-login
     *  redirect; persistence here so the preference is durable. */
    defaultTab: DefaultTab;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  display: { defaultTab: 'home' },
};

function mergeDefaults(
  partial: Partial<UserPreferences> | undefined
): UserPreferences {
  const p = partial ?? {};
  return {
    display: { ...DEFAULT_PREFERENCES.display, ...(p.display ?? {}) },
  };
}

/**
 * Preferences live on the user doc itself (`users/{uid}`) under a single
 * `preferences` field. Storing them at a sub-path like `meta/preferences`
 * would need a new Firestore rules entry — out of scope for Phase 10
 * per the brief — so we piggy-back on the existing user-doc rule which
 * already allows `read, write: if isOwner(userId)`.
 */
const USER_DOC_PATH = (uid: string) => ['users', uid] as const;

export const DEFAULT_TAB_PATHS: Record<DefaultTab, string> = {
  home: '/',
  transactions: '/transactions',
  budgets: '/budgets',
  reimbursements: '/reimbursements',
  expenses: '/expenses',
};

/**
 * One-shot read used right after sign-in, before the React Query cache is
 * warm. Returns the path the user wants to land on, or `/` on any failure
 * (network, missing pref, permission). Never throws.
 */
export async function resolvePostLoginPath(uid: string): Promise<string> {
  try {
    const ref = doc(db, ...USER_DOC_PATH(uid));
    const snap = await getDoc(ref);
    if (!snap.exists()) return '/';
    const data = snap.data() as { preferences?: Partial<UserPreferences> };
    const tab = mergeDefaults(data.preferences).display.defaultTab;
    // A stored defaultTab from a newer/older client may not be a known tab at
    // runtime, so treat the lookup as fallible despite the narrow static type.
    const path = (DEFAULT_TAB_PATHS as Record<string, string | undefined>)[tab];
    return path ?? '/';
  } catch {
    return '/';
  }
}

export function useUserPreferences() {
  const { user } = useAuth();
  const uid = user?.id;

  return useQuery({
    queryKey: queryKeys.userPreferences.forUser(uid ?? ''),
    queryFn: async (): Promise<UserPreferences> => {
      if (!uid) return DEFAULT_PREFERENCES;
      const ref = doc(db, ...USER_DOC_PATH(uid));
      const snap = await getDoc(ref);
      if (!snap.exists()) return DEFAULT_PREFERENCES;
      const data = snap.data() as { preferences?: Partial<UserPreferences> };
      return mergeDefaults(data.preferences);
    },
    enabled: !!uid,
    staleTime: 1000 * 60 * 5,
  });
}

type Patch = {
  [K in keyof UserPreferences]?: Partial<UserPreferences[K]>;
};

export function useUpdateUserPreferences() {
  const { user } = useAuth();
  const uid = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Patch) => {
      if (!uid) throw new Error('Not authenticated');
      const ref = doc(db, ...USER_DOC_PATH(uid));
      await setDoc(ref, { preferences: patch }, { merge: true });
    },
    onMutate: async (patch) => {
      if (!uid) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.userPreferences.forUser(uid) });
      const prev = queryClient.getQueryData<UserPreferences>(['userPreferences', uid]);
      const next = mergeDefaults({
        ...(prev ?? DEFAULT_PREFERENCES),
        ...Object.fromEntries(
          Object.entries(patch).map(([k, v]) => [
            k,
            { ...(prev?.[k as keyof UserPreferences] ?? {}), ...v },
          ])
        ),
      } as Partial<UserPreferences>);
      queryClient.setQueryData(['userPreferences', uid], next);
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (uid && ctx?.prev) {
        queryClient.setQueryData(['userPreferences', uid], ctx.prev);
      }
    },
    onSettled: () => {
      if (uid) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.userPreferences.forUser(uid) });
      }
    },
  });
}
