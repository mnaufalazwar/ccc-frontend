import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    englishLevelType?: string;
    englishLevelValue?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  }, []);

  // Listen for auth:expired events from the API client
  useEffect(() => {
    const handler = () => clearAuth();
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [clearAuth]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        clearAuth();
      })
      .finally(() => setLoading(false));
  }, [token, clearAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('refreshToken', res.refreshToken);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (data: {
      fullName: string;
      email: string;
      password: string;
      englishLevelType?: string;
      englishLevelValue?: string;
    }) => {
      await api.register(data);
    },
    []
  );

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.logout(refreshToken).catch(() => {});
    }
    clearAuth();
  }, [clearAuth]);

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // ignore
    }
  }, []);

  const isAdmin =
    user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isModerator =
    user?.role === 'MODERATOR' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        isModerator,
        isSuperAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
