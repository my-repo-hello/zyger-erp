import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import type { LoginRequest } from '../api/authApi';
import { getRolePermissions, type PermissionModule, type PermissionAction, type PermissionKey } from '../config/rbac';

interface User { username: string; role: string; }
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  can: (mod: PermissionModule, action: PermissionAction) => boolean;
  canAny: (mod: PermissionModule, actions: PermissionAction[]) => boolean;
  hasModule: (mod: PermissionModule) => boolean;
  login: (data: LoginRequest) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = 'zyger-access-token';
const USER_KEY = 'zyger-user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === 'string' && typeof parsed.role === 'string') {
      return { username: parsed.username, role: parsed.role };
    }
  } catch { /* corrupt storage */ }
  return null;
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (!sessionStorage.getItem(TOKEN_KEY)) return null;
    return readStoredUser();
  });

  const perms = useMemo(() => {
    if (!user?.role) return new Set<PermissionKey>();
    return getRolePermissions(user.role);
  }, [user?.role]);

  const persist = (token: string, u: User) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const can = useCallback(
    (mod: PermissionModule, action: PermissionAction): boolean => {
      return perms.has(`${mod}:${action}` as PermissionKey);
    },
    [perms]
  );

  const canAny = useCallback(
    (mod: PermissionModule, actions: PermissionAction[]): boolean => {
      return actions.some((a) => perms.has(`${mod}:${a}` as PermissionKey));
    },
    [perms]
  );

  const hasModule = useCallback(
    (mod: PermissionModule): boolean => {
      for (const p of perms) {
        if (p.startsWith(`${mod}:`)) return true;
      }
      return false;
    },
    [perms]
  );

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data);
    persist(res.token, { username: res.username, role: res.role });
  };

  const loginDemo = async () => {
    await login({ username: 'demo', password: 'demo123' });
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, can, canAny, hasModule, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
