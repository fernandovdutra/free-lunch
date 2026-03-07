import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createDefaultCategoriesFn } from '@/lib/bankingFunctions';
import type { User, UserSettings, BankConnection } from '@/types';

// Firestore document shape
interface UserDocument extends DocumentData {
  displayName?: string | null;
  createdAt?: Timestamp;
  settings?: UserSettings;
  bankConnections?: BankConnection[];
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
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
  theme: 'system',
};

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        fetchOrCreateUser(fbUser)
          .then((userData) => {
            setUser(userData);
          })
          .catch((error: unknown) => {
            console.error('Error fetching user data:', error);
            setUser(null);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
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
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(fbUser, { displayName });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
