import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, User } from './api';

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};
const AuthContext = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api<User>('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    setToken(r.token); setUser(r.user);
  }
  async function register(name: string, email: string, password: string) {
    const r = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: { name, email, password } });
    setToken(r.token); setUser(r.user);
  }
  function logout() { setToken(null); setUser(null); }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
