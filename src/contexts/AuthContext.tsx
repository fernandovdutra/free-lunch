import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { acceptInvitationFn, createDefaultCategoriesFn } from '@/lib/bankingFunctions';
import type { MemberRole, User, UserSettings } from '@/types';

// Firestore document shape
interface UserDocument extends DocumentData {
  displayName?: string | null;
  createdAt?: Timestamp;
  settings?: UserSettings;
  bankConnections?: User['bankConnections'];
  members?: Record<string, MemberRole>;
}

interface MembershipDocument extends DocumentData {
  ownerIds?: string[];
  primaryOwnerId?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  /**
   * UID of the account whose data the app is currently displaying. Equal to
   * `user.id` for the owner; equal to `primaryOwnerId` for a member viewing
   * someone else's data.
   */
  dataOwnerId: string | null;
  /** Role of the signed-in user on `dataOwnerId`'s account. */
  currentRole: MemberRole | null;
  /** True when role is `viewer` — UI mutations should be disabled. */
  isReadOnly: boolean;
  /** Email/displayName of the data owner when the signed-in user is not the owner. */
  ownerProfile: { email: string; displayName: string | null } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Manually re-runs the invitation claim. Used as a fallback when an invite
   * was issued after the member's first sign-in.
   */
  checkForInvitations: () => Promise<{ accepted: boolean }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  currency: 'EUR',
  defaultDateRange: 'month',
};

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<MemberRole | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<{ email: string; displayName: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const membershipUnsubRef = useRef<(() => void) | null>(null);

  // Fetch or create user document in Firestore
  const fetchOrCreateUser = async (fbUser: FirebaseUser): Promise<User> => {
    const userRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserDocument;
      return {
        id: fbUser.uid,
        email: fbUser.email ?? '',
        displayName: data.displayName ?? fbUser.displayName,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        settings: data.settings ?? DEFAULT_SETTINGS,
        bankConnections: data.bankConnections ?? [],
      };
    }

    // Create new user document
    const newUser: Omit<User, 'id'> = {
      email: fbUser.email ?? '',
      displayName: fbUser.displayName,
      createdAt: new Date(),
      settings: DEFAULT_SETTINGS,
      bankConnections: [],
    };

    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
    });

    // Create default categories for new user via Cloud Function
    await createDefaultCategoriesFn();

    return { id: fbUser.uid, ...newUser };
  };

  /**
   * Resolves which account's data the user is looking at and what role they
   * have on it. Loads the owner's email/name into `ownerProfile` for the UI
   * banner. Subscribes to `memberships/{uid}` so role changes (promotion,
   * removal) propagate without needing a re-login.
   */
  const resolveAccess = async (selfUid: string) => {
    const membershipRef = doc(db, 'memberships', selfUid);
    const membershipSnap = await getDoc(membershipRef);

    if (!membershipSnap.exists()) {
      setDataOwnerId(selfUid);
      setCurrentRole('owner');
      setOwnerProfile(null);
      return;
    }

    const membership = membershipSnap.data() as MembershipDocument;
    const primaryId = membership.primaryOwnerId;

    if (!primaryId || primaryId === selfUid) {
      setDataOwnerId(selfUid);
      setCurrentRole('owner');
      setOwnerProfile(null);
      return;
    }

    const ownerRef = doc(db, 'users', primaryId);
    const ownerSnap = await getDoc(ownerRef);
    if (!ownerSnap.exists()) {
      // Owner doc gone — fall back to standalone view.
      setDataOwnerId(selfUid);
      setCurrentRole('owner');
      setOwnerProfile(null);
      return;
    }

    const ownerData = ownerSnap.data() as UserDocument;
    const role = ownerData.members?.[selfUid] ?? null;
    if (!role) {
      setDataOwnerId(selfUid);
      setCurrentRole('owner');
      setOwnerProfile(null);
      return;
    }

    setDataOwnerId(primaryId);
    setCurrentRole(role);
    setOwnerProfile({
      email: (ownerData as { email?: string }).email ?? '',
      displayName: ownerData.displayName ?? null,
    });
  };

  const subscribeMembership = (selfUid: string) => {
    membershipUnsubRef.current?.();
    const membershipRef = doc(db, 'memberships', selfUid);
    membershipUnsubRef.current = onSnapshot(membershipRef, () => {
      // Re-resolve from scratch when the membership doc changes (added,
      // removed, or primaryOwnerId flipped). Errors are swallowed so a
      // transient permission/network blip doesn't crash the app.
      resolveAccess(selfUid).catch((err: unknown) => {
        console.error('Failed to refresh membership:', err);
      });
    });
  };

  const checkForInvitations = async (): Promise<{ accepted: boolean }> => {
    try {
      const result = await acceptInvitationFn();
      const accepted = !!result.data.acceptedFor;
      if (accepted && firebaseUser) {
        await resolveAccess(firebaseUser.uid);
      }
      return { accepted };
    } catch (err) {
      console.error('Failed to check for invitations:', err);
      return { accepted: false };
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    let cancelled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const clearWatchdog = () => {
      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      clearWatchdog();

      if (fbUser) {
        setFirebaseUser(fbUser);
        // Safety net: never let the loading spinner hang past 8s, even if
        // a Firestore read or Cloud Function call stalls indefinitely.
        watchdog = setTimeout(() => {
          if (!cancelled) setIsLoading(false);
        }, 8000);

        fetchOrCreateUser(fbUser)
          .then(async (userData) => {
            if (cancelled) return;
            setUser(userData);
            await resolveAccess(fbUser.uid);
            subscribeMembership(fbUser.uid);
            // Fire-and-forget: idempotent invite claim. Must not block the
            // spinner — `subscribeMembership` picks up any role change.
            acceptInvitationFn().catch((err) => {
              console.error('acceptInvitation failed:', err);
            });
          })
          .catch((error: unknown) => {
            console.error('Error fetching user data:', error);
            setUser(null);
            setDataOwnerId(null);
            setCurrentRole(null);
            setOwnerProfile(null);
          })
          .finally(() => {
            clearWatchdog();
            if (!cancelled) setIsLoading(false);
          });
      } else {
        membershipUnsubRef.current?.();
        membershipUnsubRef.current = null;
        setFirebaseUser(null);
        setUser(null);
        setDataOwnerId(null);
        setCurrentRole(null);
        setOwnerProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearWatchdog();
      unsubscribe();
      membershipUnsubRef.current?.();
      membershipUnsubRef.current = null;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setDataOwnerId(null);
    setCurrentRole(null);
    setOwnerProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        dataOwnerId,
        currentRole,
        isReadOnly: currentRole === 'viewer',
        ownerProfile,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        logout,
        checkForInvitations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
