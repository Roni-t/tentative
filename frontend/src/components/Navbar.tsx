import React, { useEffect, useState } from 'react';
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
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The bar slides away while reading down the page and comes back when scrolling up,
  // so it never sits on top of page content.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      if (y > lastY && y > 90) setHidden(true);
      else if (y < lastY) setHidden(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 px-4 sm:px-8 max-sm:px-3 py-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: hidden ? 'translateY(-120%)' : 'translateY(0)' }}
    >
      {/* Dark fade behind the bar so page content does not collide with the logo and buttons */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 -z-10 bg-gradient-to-b from-black from-50% via-black/85 to-transparent transition-opacity duration-500"
        style={{ opacity: scrolled ? 1 : 0 }}
      />
      {/* Three columns with equal sides keep the links centered whatever the logo and sign-in widths are */}
      <div className="max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Link
          to="/"
          onClick={() => pathname === '/' && window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="justify-self-start inline-flex items-center space-x-2.5"
          aria-label="Tentative home"
        >
          <PlanetLogo size={26} />
          {/* Phones show the planet only, so the links and sign-in button fit */}
          <span className="max-sm:hidden font-mono text-xs tracking-wide text-zinc-300">tentative</span>
        </Link>

        <nav className="glass-pill-nav flex items-center p-1 rounded-full">
          {LINKS.map(({ to, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative px-4 py-1.5 rounded-full text-sm max-sm:px-2.5 max-sm:text-[13px] max-[359px]:px-2 max-[359px]:text-xs transition-colors duration-300 ${
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

        <div className="justify-self-end flex items-center gap-2">
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
            <Link to="/login" className="pill pill-light !py-2 !px-4 !text-xs max-sm:!px-2.5 whitespace-nowrap">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
