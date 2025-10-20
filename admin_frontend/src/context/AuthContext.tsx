import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@utils/apiClient';
import { useI18n } from '@i18n/I18nContext';

type Role = 'admin' | 'seller' | 'reseller' | 'customer';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  code11: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (params: { code11: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'aycl.admin.token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { notify } = useI18n();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);

  const isAuthenticated = Boolean(token);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await apiClient('me', { token });
      setUser(me);
    } catch (error) {
      console.error('Failed to fetch /me', error);
      notify('errors.sessionExpired');
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      navigate('/login');
    }
  }, [navigate, notify, token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = useCallback(
    async ({ code11, password }: { code11: string; password: string }) => {
      const { token: nextToken } = await apiClient('auth/login', {
        method: 'POST',
        body: { code11, password },
      });
      setToken(nextToken);
      localStorage.setItem(TOKEN_KEY, nextToken);
      await loadProfile();
      navigate('/dashboard');
    },
    [loadProfile, navigate]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    navigate('/login');
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const value = useMemo(
    () => ({ user, token, isAuthenticated, login, logout, refreshProfile }),
    [user, token, isAuthenticated, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
