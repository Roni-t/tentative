import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { User, DevSmsNotice } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  devNotice: DevSmsNotice | null;
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

  const register = async (name: string, phone: string, code: string) => {
    const res = await api.registerVerify(name, phone, code);
    setUser(res.user);
    setDevNotice(null);
    return res.user;
  };

  const login = async (phone: string, code: string, keepSignedIn: boolean) => {
    const res = await api.loginVerify(phone, code, keepSignedIn);
    setUser(res.user);
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
      value={{ user, loading, devNotice, register, login, logout, refreshUser, pollDevCode, clearDevNotice }}
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
