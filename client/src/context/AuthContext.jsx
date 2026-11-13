import { createContext, useCallback, useEffect, useState } from 'react';
import { api, setCsrf } from '../lib.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api('/auth/me');
      setIdentity(result);
      setCsrf(result?.csrf);
    } catch {
      setIdentity(null);
      setCsrf('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (body) => {
    const result = await api('/auth/login', { method: 'POST', body });
    setIdentity(result);
    setCsrf(result.csrf);
    return result;
  };

  const register = async (body) => {
    const result = await api('/auth/register', { method: 'POST', body });
    setIdentity(result);
    setCsrf(result.csrf);
    return result;
  };

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); }
    finally { setIdentity(null); setCsrf(''); }
  };

  return (
    <AuthContext.Provider value={{ identity, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
