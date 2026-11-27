import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginPath } from '../utils/authRedirect';

// Host-only pages. Logged-out visitors go to login and come back here afterwards.
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">Loading...</div>;
  }
  if (!user) {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  }
  return <>{children}</>;
};
