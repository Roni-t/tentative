import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlanetLogo } from './PlanetLogo';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const LINKS = [
  { to: '/events', label: 'Events' },
  { to: '/create', label: 'Create' },
  { to: '/share/demo-orbit-2026/heatmap', label: 'Demo' },
];

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex items-center space-x-2.5"
        >
          <PlanetLogo size={26} />
          <span className="font-mono text-xs tracking-wide text-zinc-300">tentative</span>
        </Link>

        <nav className="glass-pill-nav flex items-center p-1 rounded-full">
          {LINKS.map(({ to, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative px-4 py-1.5 rounded-full text-sm transition-colors duration-300 ${
                  active ? 'text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-zinc-100"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-2">
          {user ? (
            <>
              <span className="hidden sm:block text-sm text-zinc-300 px-3">{user.name}</span>
              <button
                onClick={logout}
                title="Sign out"
                className="w-9 h-9 flex items-center justify-center rounded-full glass-pill-nav text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <Link to="/login" className="pill pill-light !py-2 !px-4 !text-xs">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
