import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { User, DevSmsNotice } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  devNotice: DevSmsNotice | null;
  login: (phone: string, code: string, name?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  pollDevCode: (phone?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devNotice, setDevNotice] = useState<DevSmsNotice | null>(null);

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const pollDevCode = async (phone?: string) => {
    try {
      const notice = await api.getDevBannerCode(phone);
      setDevNotice(notice);
    } catch {
      setDevNotice(null);
    }
  };

  useEffect(() => {
    refreshUser();
    pollDevCode();
    const interval = setInterval(() => pollDevCode(), 5000);
    return () => clearInterval(interval);
  }, []);

  const login = async (phone: string, code: string, name?: string) => {
    const res = await api.verifyCode(phone, code, name);
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
    <AuthContext.Provider value={{ user, loading, devNotice, login, logout, refreshUser, pollDevCode }}>
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
