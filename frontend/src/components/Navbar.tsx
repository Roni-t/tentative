import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlanetLogo } from './PlanetLogo';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Calendar, Shield, Bug, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-2xl bg-space-950/75 border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand with subtle interactive spring */}
        <Link to="/" className="flex items-center space-x-3 group">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 6 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <PlanetLogo size={36} isSpinning={false} />
          </motion.div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-cosmic-purple group-hover:to-cosmic-cyan transition-all">
            Tentative
          </span>
        </Link>

        {/* Navigation Links with animated sliding pill */}
        <nav className="hidden md:flex items-center space-x-1 glass-pill-nav p-1.5 rounded-full relative">
          <Link
            to="/events"
            className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors z-10 ${
              isActive('/events') ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isActive('/events') && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/15 shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span>My Events</span>
          </Link>

          <Link
            to="/create"
            className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors z-10 flex items-center space-x-1.5 ${
              isActive('/create') ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isActive('/create') && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/15 shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <PlusCircle className="w-3.5 h-3.5 text-cosmic-purple" />
            <span>Create Event</span>
          </Link>

          <Link
            to="/share/demo-orbit-2026/heatmap"
            className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors z-10 flex items-center space-x-1.5 ${
              location.pathname.includes('demo-orbit-2026') ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {location.pathname.includes('demo-orbit-2026') && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/15 shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Calendar className="w-3.5 h-3.5 text-cosmic-cyan" />
            <span>Demo Heatmap</span>
          </Link>

          {user?.is_admin && (
            <Link
              to="/admin"
              className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors z-10 flex items-center space-x-1.5 ${
                isActive('/admin') ? 'text-purple-300' : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              {isActive('/admin') && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-cosmic-purple/20 rounded-full border border-cosmic-purple/30 shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          )}

          <Link
            to="/bug-report"
            className={`relative p-2 rounded-full text-xs font-medium transition-colors z-10 ${
              isActive('/bug-report') ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Report a Bug"
          >
            {isActive('/bug-report') && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/10 rounded-full border border-white/15 shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Bug className="w-3.5 h-3.5" />
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
                <UserIcon className="w-3.5 h-3.5 text-cosmic-cyan" />
                <span className="font-semibold text-white">{user.name}</span>
                <span className="text-slate-500 font-mono">({user.phone_masked})</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/login"
                  className="px-4 py-1.5 rounded-full text-xs font-semibold border border-white/20 text-white hover:border-white/50 hover:bg-white/5 transition-all"
                >
                  Sign in
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/create"
                  className="hidden sm:inline-flex px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md transition-all"
                >
                  Host an Orbit
                </Link>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
