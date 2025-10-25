import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '@lib/apiClient';

type Role = 'admin' | 'seller' | 'reseller' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  code11: string;
  teamId?: string | null;
  resellerTeamId?: string | null;
  fullName?: string | null;
  referralId?: string | null;
  referralCode?: string | null;
  referralLink?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { code11: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'aycl.seller.token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(token));

  const isAuthenticated = Boolean(token && user);

  const loadProfile = useCallback(
    async (nextToken?: string | null) => {
      const authToken = nextToken ?? token;
      if (!authToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const profile = await apiClient<AuthUser>('auth/me', { token: authToken });
        setUser(profile);
      } catch (error) {
        console.error('Failed to load profile', error);
        toast.error('Sessione scaduta, effettua di nuovo il login.');
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    },
    [navigate, token]
  );

  useEffect(() => {
    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token, loadProfile]);

  const login = useCallback(
    async ({ code11, password }: { code11: string; password: string }) => {
      setLoading(true);
      try {
        const response = await apiClient<{ accessToken: string; refreshToken: string; role: string; userId: string }>(
          'auth/login',
          {
            method: 'POST',
            body: { code11, password }
          }
        );
        localStorage.setItem(TOKEN_KEY, response.accessToken);
        setToken(response.accessToken);
        await loadProfile(response.accessToken);
        toast.success('Accesso eseguito con successo.');
        const redirect = (location.state as { from?: string } | undefined)?.from ?? '/';
        navigate(redirect, { replace: true });
      } catch (error: any) {
        console.error('Login failed', error);
        toast.error(error?.message ?? 'Credenziali non valide.');
        setLoading(false);
      }
    },
    [loadProfile, navigate, location.state]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,
      login,
      logout,
      refreshProfile
    }),
    [user, token, loading, isAuthenticated, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
