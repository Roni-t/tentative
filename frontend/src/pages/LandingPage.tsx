import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HeroPlanet } from '../components/HeroPlanet';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  ChevronDown,
  Sparkles,
  Zap,
  Lock,
  Share2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll animations
  const { scrollY } = useScroll();

  // Intro fold transforms: fades gently upward on scroll
  const introOpacity = useTransform(scrollY, [0, 320], [1, 0]);
  const introScale = useTransform(scrollY, [0, 320], [1, 0.94]);
  const introY = useTransform(scrollY, [0, 320], [0, -40]);

  // Main section transforms: slides up softly
  const menuOpacity = useTransform(scrollY, [140, 360], [0, 1]);
  const menuY = useTransform(scrollY, [140, 360], [40, 0]);

  const scrollToMenu = () => {
    menuRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full">
      {/* ========================================================
          STAGE 1: Opening Screen (Minimalist Centered Planet)
          ======================================================== */}
      <motion.section
        style={{ opacity: introOpacity, scale: introScale, y: introY }}
        className="min-h-[calc(100vh-4.5rem)] flex flex-col items-center justify-center relative px-4 text-center select-none"
      >
        {/* Planet Centerpiece */}
        <div className="w-full max-w-lg mb-2">
          <HeroPlanet />
        </div>

        {/* Clean Program Name & Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3 z-10"
        >
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            Tentative
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono tracking-widest uppercase">
            Group Scheduling in Perfect Orbit
          </p>
        </motion.div>

        {/* Minimal Scroll Indicator */}
        <motion.button
          onClick={scrollToMenu}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 text-xs font-mono text-slate-500 hover:text-white transition-colors cursor-pointer group"
        >
          <span className="text-[11px] tracking-wider uppercase text-slate-500 group-hover:text-slate-300">
            Scroll to begin
          </span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </motion.div>
        </motion.button>
      </motion.section>

      {/* ========================================================
          STAGE 2: Simple & Elegant Main Menu
          ======================================================== */}
      <motion.section
        ref={menuRef}
        id="main-menu"
        style={{ opacity: menuOpacity, y: menuY }}
        className="min-h-[85vh] py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col items-center justify-center space-y-12 text-center"
      >
        {/* Main Headline */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Schedule meetings without the back-and-forth.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            Create an event, send an unguessable link, and overlay everyone’s availability into an instant color-coded heatmap.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to={user ? '/create' : '/login'}
              className="px-8 py-3.5 rounded-full text-xs font-bold bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span>{user ? 'Host a New Orbit' : 'Host an Orbit'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/share/demo-orbit-2026/heatmap"
              className="px-7 py-3.5 rounded-full text-xs font-semibold glass-card text-white hover:bg-white/10 border border-white/15 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cosmic-cyan" />
              <span>View Demo Heatmap</span>
            </Link>
          </motion.div>

          {user && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/events"
                className="px-6 py-3.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                My Events
              </Link>
            </motion.div>
          )}
        </div>

        {/* Clean, Simple Feature Trio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8 text-left">
          {/* Feature 1 */}
          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cosmic-purple/20 text-cosmic-purple flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Instant Heatmap</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Color-coded overlap matrix shows when everyone is free with zero calendar privacy leaks.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cosmic-cyan/20 text-cosmic-cyan flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Zero Passwords</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hosts log in via 6-digit SMS code. Invitees paint availability instantly with no account needed.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cosmic-pink/20 text-cosmic-pink flex items-center justify-center mb-3">
              <Share2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Expiring Links</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographically secure links that expire automatically at semester end. Rotate links in one click.
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
