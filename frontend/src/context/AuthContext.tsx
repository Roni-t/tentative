import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { User, DevSmsNotice } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  devNotice: DevSmsNotice | null;
  /** True after a session expires or is revoked while someone was logged in. */
  sessionEnded: boolean;
  /** UC-1: verify the texted code and create the account. */
  register: (name: string, phone: string, code: string) => Promise<User>;
  /** UC-2: verify the texted code and start a session. */
  login: (phone: string, code: string, keepSignedIn: boolean) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Dev only: fetch the pending code for this phone so the banner can show it. */
  pollDevCode: (phone: string) => Promise<void>;
  clearDevNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devNotice, setDevNotice] = useState<DevSmsNotice | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const refreshUser = useCallback(async () => {
    try {
      setUser(await api.getMe());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const pollDevCode = useCallback(async (phone: string) => {
    try {
      setDevNotice(await api.getDevBannerCode(phone));
    } catch {
      setDevNotice(null); // endpoint is disabled when real SMS is configured
    }
  }, []);

  const clearDevNotice = useCallback(() => setDevNotice(null), []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Any request rejected with 401 while logged in means the session is over. Clearing the user
  // sends host pages to login (RequireAuth) and updates the navbar everywhere else.
  useEffect(() => {
    api.onUnauthorized(() => {
      if (!userRef.current) return;
      setUser(null);
      setSessionEnded(true);
    });
    return () => api.onUnauthorized(null);
  }, []);

  // Check again when the tab comes back into view, so an expired session is noticed before the next click
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        api.getMe().then(setUser).catch(() => {}); // a 401 is handled above; ignore network errors
      }
    };
    document.addEventListener('visibilitychange', recheck);
    return () => document.removeEventListener('visibilitychange', recheck);
  }, []);

  const register = async (name: string, phone: string, code: string) => {
    const res = await api.registerVerify(name, phone, code);
    setUser(res.user);
    setSessionEnded(false);
    setDevNotice(null);
    return res.user;
  };

  const login = async (phone: string, code: string, keepSignedIn: boolean) => {
    const res = await api.loginVerify(phone, code, keepSignedIn);
    setUser(res.user);
    setSessionEnded(false);
    setDevNotice(null);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, devNotice, sessionEnded, register, login, logout, refreshUser, pollDevCode, clearDevNotice }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
