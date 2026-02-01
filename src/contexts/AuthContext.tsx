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

    // Create default categories for new user
    await createDefaultCategories(fbUser.uid);

    return { id: fbUser.uid, ...newUser };
  };

  // Create default categories for a new user
  const createDefaultCategories = async (userId: string) => {
    const defaultCategories = [
      // Income
      {
        id: 'income',
        name: 'Income',
        icon: '💰',
        color: '#10B981',
        parentId: null,
        order: 0,
        isSystem: true,
      },
      {
        id: 'income-salary',
        name: 'Salary',
        icon: '💵',
        color: '#10B981',
        parentId: 'income',
        order: 0,
        isSystem: true,
      },
      {
        id: 'income-gifts',
        name: 'Gifts',
        icon: '🎁',
        color: '#10B981',
        parentId: 'income',
        order: 1,
        isSystem: true,
      },
      {
        id: 'income-other',
        name: 'Other Income',
        icon: '💸',
        color: '#10B981',
        parentId: 'income',
        order: 2,
        isSystem: true,
      },

      // Housing
      {
        id: 'housing',
        name: 'Housing',
        icon: '🏠',
        color: '#6366F1',
        parentId: null,
        order: 1,
        isSystem: true,
      },
      {
        id: 'housing-rent',
        name: 'Rent/Mortgage',
        icon: '🏡',
        color: '#6366F1',
        parentId: 'housing',
        order: 0,
        isSystem: true,
      },
      {
        id: 'housing-utilities',
        name: 'Utilities',
        icon: '⚡',
        color: '#6366F1',
        parentId: 'housing',
        order: 1,
        isSystem: true,
      },
      {
        id: 'housing-insurance',
        name: 'Insurance',
        icon: '🛡️',
        color: '#6366F1',
        parentId: 'housing',
        order: 2,
        isSystem: true,
      },

      // Transport
      {
        id: 'transport',
        name: 'Transport',
        icon: '🚗',
        color: '#3B82F6',
        parentId: null,
        order: 2,
        isSystem: true,
      },
      {
        id: 'transport-fuel',
        name: 'Fuel',
        icon: '⛽',
        color: '#3B82F6',
        parentId: 'transport',
        order: 0,
        isSystem: true,
      },
      {
        id: 'transport-public',
        name: 'Public Transit',
        icon: '🚇',
        color: '#3B82F6',
        parentId: 'transport',
        order: 1,
        isSystem: true,
      },
      {
        id: 'transport-car',
        name: 'Car Expenses',
        icon: '🔧',
        color: '#3B82F6',
        parentId: 'transport',
        order: 2,
        isSystem: true,
      },

      // Food & Drink
      {
        id: 'food',
        name: 'Food & Drink',
        icon: '🍽️',
        color: '#F59E0B',
        parentId: null,
        order: 3,
        isSystem: true,
      },
      {
        id: 'food-groceries',
        name: 'Groceries',
        icon: '🛒',
        color: '#F59E0B',
        parentId: 'food',
        order: 0,
        isSystem: true,
      },
      {
        id: 'food-restaurants',
        name: 'Restaurants',
        icon: '🍴',
        color: '#F59E0B',
        parentId: 'food',
        order: 1,
        isSystem: true,
      },
      {
        id: 'food-coffee',
        name: 'Coffee & Snacks',
        icon: '☕',
        color: '#F59E0B',
        parentId: 'food',
        order: 2,
        isSystem: true,
      },

      // Shopping
      {
        id: 'shopping',
        name: 'Shopping',
        icon: '🛍️',
        color: '#EC4899',
        parentId: null,
        order: 4,
        isSystem: true,
      },
      {
        id: 'shopping-clothing',
        name: 'Clothing',
        icon: '👕',
        color: '#EC4899',
        parentId: 'shopping',
        order: 0,
        isSystem: true,
      },
      {
        id: 'shopping-electronics',
        name: 'Electronics',
        icon: '🖥️',
        color: '#EC4899',
        parentId: 'shopping',
        order: 1,
        isSystem: true,
      },
      {
        id: 'shopping-general',
        name: 'General',
        icon: '📦',
        color: '#EC4899',
        parentId: 'shopping',
        order: 2,
        isSystem: true,
      },

      // Entertainment
      {
        id: 'entertainment',
        name: 'Entertainment',
        icon: '🎬',
        color: '#8B5CF6',
        parentId: null,
        order: 5,
        isSystem: true,
      },
      {
        id: 'entertainment-movies',
        name: 'Movies & Shows',
        icon: '🎥',
        color: '#8B5CF6',
        parentId: 'entertainment',
        order: 0,
        isSystem: true,
      },
      {
        id: 'entertainment-games',
        name: 'Games',
        icon: '🎮',
        color: '#8B5CF6',
        parentId: 'entertainment',
        order: 1,
        isSystem: true,
      },
      {
        id: 'entertainment-books',
        name: 'Books',
        icon: '📚',
        color: '#8B5CF6',
        parentId: 'entertainment',
        order: 2,
        isSystem: true,
      },

      // Health
      {
        id: 'health',
        name: 'Health',
        icon: '❤️',
        color: '#14B8A6',
        parentId: null,
        order: 6,
        isSystem: true,
      },
      {
        id: 'health-pharmacy',
        name: 'Pharmacy',
        icon: '💊',
        color: '#14B8A6',
        parentId: 'health',
        order: 0,
        isSystem: true,
      },
      {
        id: 'health-medical',
        name: 'Medical',
        icon: '🏥',
        color: '#14B8A6',
        parentId: 'health',
        order: 1,
        isSystem: true,
      },
      {
        id: 'health-fitness',
        name: 'Fitness',
        icon: '🏋️',
        color: '#14B8A6',
        parentId: 'health',
        order: 2,
        isSystem: true,
      },

      // Personal
      {
        id: 'personal',
        name: 'Personal',
        icon: '👤',
        color: '#F97316',
        parentId: null,
        order: 7,
        isSystem: true,
      },
      {
        id: 'personal-selfcare',
        name: 'Self Care',
        icon: '💇',
        color: '#F97316',
        parentId: 'personal',
        order: 0,
        isSystem: true,
      },
      {
        id: 'personal-education',
        name: 'Education',
        icon: '🎓',
        color: '#F97316',
        parentId: 'personal',
        order: 1,
        isSystem: true,
      },

      // Other
      {
        id: 'other',
        name: 'Other',
        icon: '📋',
        color: '#9CA3AF',
        parentId: null,
        order: 8,
        isSystem: true,
      },
      {
        id: 'uncategorized',
        name: 'Uncategorized',
        icon: '❓',
        color: '#9CA3AF',
        parentId: 'other',
        order: 0,
        isSystem: true,
      },
    ];

    const batch = defaultCategories.map(async (category) => {
      const categoryRef = doc(db, 'users', userId, 'categories', category.id);
      await setDoc(categoryRef, {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await Promise.all(batch);
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
