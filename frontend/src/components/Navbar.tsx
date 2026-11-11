import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlanetLogo } from './PlanetLogo';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-2xl bg-space-950/70 border-b border-white/[0.06] transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <motion.div
            whileHover={{ scale: 1.06, rotate: 6 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <PlanetLogo size={32} isSpinning={false} />
          </motion.div>
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cosmic-purple transition-all">
            Tentative
          </span>
        </Link>

        {/* Minimal Center Navigation */}
        <nav className="flex items-center space-x-1 glass-pill-nav p-1 rounded-full relative">
          <Link
            to="/events"
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors z-10 ${
              isActive('/events') ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isActive('/events') && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/15 -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span>Events</span>
          </Link>

          <Link
            to="/create"
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors z-10 ${
              isActive('/create') ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isActive('/create') && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/15 -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span>Create</span>
          </Link>

          <Link
            to="/share/demo-orbit-2026/heatmap"
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors z-10 ${
              location.pathname.includes('demo-orbit-2026') ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {location.pathname.includes('demo-orbit-2026') && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/15 -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span>Demo</span>
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <UserIcon className="w-3.5 h-3.5 text-cosmic-cyan" />
                <span className="font-semibold text-white">{user.name}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          ) : (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all"
              >
                Sign in
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
};
