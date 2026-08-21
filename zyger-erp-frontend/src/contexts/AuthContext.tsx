import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import type { LoginRequest } from '../api/authApi';
import { enableDemo, disableDemo, isDemo } from '../dev/demoMode';

interface User { username: string; role: string; }
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  login: (data: LoginRequest) => Promise<void>;
  loginDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Auto-authenticate: skip login entirely
    setUser({ username: 'admin', role: 'ADMIN' });
  }, []);

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data);
    sessionStorage.setItem('zyger-access-token', res.token);
    sessionStorage.setItem('zyger-user', JSON.stringify({ username: res.username, role: res.role }));
    setUser({ username: res.username, role: res.role });
  };

  const loginDemo = () => {
    enableDemo();
    sessionStorage.setItem('zyger-access-token', 'demo-token');
    const demoUser = { username: 'demo', name: 'Rajesh Kumar', role: 'Store Manager • Plant 01' };
    sessionStorage.setItem('zyger-user', JSON.stringify(demoUser));
    setUser({ username: demoUser.username, role: demoUser.role });
  };

  const logout = () => {
    disableDemo();
    sessionStorage.removeItem('zyger-access-token');
    sessionStorage.removeItem('zyger-user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isDemo: isDemo(), login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
