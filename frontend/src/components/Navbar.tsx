import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlanetLogo } from './PlanetLogo';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Calendar, Shield, Bug, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-xl bg-space-950/70 border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <PlanetLogo size={34} isSpinning={false} />
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-cosmic-purple group-hover:to-cosmic-cyan transition-all">
            Tentative
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 glass-pill-nav px-3 py-1.5 rounded-full">
          <Link
            to="/events"
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive('/events')
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            My Events
          </Link>
          <Link
            to="/create"
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
              isActive('/create')
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-cosmic-purple" />
            <span>Create Event</span>
          </Link>
          <Link
            to="/share/demo-orbit-2026/heatmap"
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
              location.pathname.includes('demo-orbit-2026')
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-cosmic-cyan" />
            <span>Demo Heatmap</span>
          </Link>
          {user?.is_admin && (
            <Link
              to="/admin"
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                isActive('/admin')
                  ? 'bg-cosmic-purple/20 text-cosmic-purple shadow-sm'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          )}
          <Link
            to="/bug-report"
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive('/bug-report')
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Report a Bug"
          >
            <Bug className="w-3.5 h-3.5" />
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <UserIcon className="w-3.5 h-3.5 text-cosmic-cyan" />
                <span className="font-semibold text-white">{user.name}</span>
                <span className="text-slate-500 font-mono">({user.phone_masked})</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full text-xs font-semibold border border-white/20 text-white hover:border-white/50 hover:bg-white/5 transition-all"
              >
                Sign in
              </Link>
              <Link
                to="/create"
                className="hidden sm:inline-flex px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cosmic-purple to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md transition-all"
              >
                Host an Orbit
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
