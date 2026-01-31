import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Initialize Firebase auth listener
    // For now, simulate checking auth state
    const checkAuth = () => {
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (_email: string, _password: string) => {
    // TODO: Implement Firebase email/password login
    setIsLoading(true);
    try {
      // Placeholder - will be replaced with Firebase auth
      const mockUser: User = {
        id: '1',
        email: _email,
        displayName: 'Test User',
        createdAt: new Date(),
        settings: {
          language: 'en',
          currency: 'EUR',
          defaultDateRange: 'month',
          theme: 'system',
        },
        bankConnections: [],
      };
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    // TODO: Implement Firebase Google login
    setIsLoading(true);
    try {
      // Placeholder
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (_email: string, _password: string, _displayName: string) => {
    // TODO: Implement Firebase registration
    setIsLoading(true);
    try {
      // Placeholder
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // TODO: Implement Firebase logout
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
