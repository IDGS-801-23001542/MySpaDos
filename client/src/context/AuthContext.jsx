import { createContext, useCallback, useEffect, useReducer } from 'react';
import { api, setCsrf } from '../lib.js';
import { initialAuthState, authReducer } from '../reducers/authReducer.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const { identity, loading } = state;

  const refresh = useCallback(async () => {
    try {
      const result = await api('/auth/me');
      dispatch({ type: 'IDENTITY_LOADED', identity: result });
      setCsrf(result?.csrf);
    } catch {
      dispatch({ type: 'LOGGED_OUT' });
      setCsrf('');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (body) => {
    const result = await api('/auth/login', { method: 'POST', body });
    dispatch({ type: 'AUTHENTICATED', identity: result });
    setCsrf(result.csrf);
    return result;
  };

  const register = async (body) => {
    const result = await api('/auth/register', { method: 'POST', body });
    dispatch({ type: 'AUTHENTICATED', identity: result });
    setCsrf(result.csrf);
    return result;
  };

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); }
    finally { dispatch({ type: 'LOGGED_OUT' }); setCsrf(''); }
  };

  return (
    <AuthContext.Provider value={{ identity, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
