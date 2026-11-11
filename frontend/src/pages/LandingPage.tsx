import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HeroPlanet } from '../components/HeroPlanet';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Lock,
  Share2,
  ArrowRight,
  Zap,
  ChevronDown,
  Calendar,
  PlusCircle,
  Users,
  CheckCircle2,
  Clock,
  Compass,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll-linked animation hooks
  const { scrollY } = useScroll();

  // Intro fold transforms: fades and scales gently upward on scroll
  const introOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const introScale = useTransform(scrollY, [0, 350], [1, 0.9]);
  const introY = useTransform(scrollY, [0, 350], [0, -60]);

  // Main menu fold transforms: slides and fades into view
  const menuOpacity = useTransform(scrollY, [180, 450], [0, 1]);
  const menuY = useTransform(scrollY, [180, 450], [60, 0]);

  const scrollToMenu = () => {
    menuRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* ========================================================
          STAGE 1: Opening Screen (Planet in Center + Program Name)
          ======================================================== */}
      <motion.section
        style={{ opacity: introOpacity, scale: introScale, y: introY }}
        className="min-h-[calc(100vh-4.5rem)] flex flex-col items-center justify-center relative px-4 text-center select-none"
      >
        {/* Floating Top Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center space-x-2 glass-chip px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 border border-white/10 mb-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-cosmic-purple" />
          <span>CS 3354 Software Engineering · Fall 2026</span>
        </motion.div>

        {/* Majestic Centered Planet with 3D Parallax */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl my-2"
        >
          <HeroPlanet />
        </motion.div>

        {/* Program Name Directly Under Planet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2.5 z-10 -mt-2"
        >
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white drop-shadow-[0_0_40px_rgba(168,85,247,0.45)]">
            Tentative
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-400 font-mono tracking-widest uppercase">
            Group Scheduling · Anywhere in the galaxy
          </p>
        </motion.div>

        {/* Bouncing Scroll Indicator at bottom */}
        <motion.button
          onClick={scrollToMenu}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer group z-20"
        >
          <span className="text-[10px] tracking-widest uppercase text-slate-500 group-hover:text-cosmic-cyan transition-colors">
            Scroll to enter orbit
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-cosmic-cyan/50 group-hover:bg-cosmic-cyan/10 transition-all shadow-glow-sm"
          >
            <ChevronDown className="w-4 h-4 text-cosmic-cyan group-hover:translate-y-0.5 transition-transform" />
          </motion.div>
        </motion.button>
      </motion.section>

      {/* ========================================================
          STAGE 2: Main Menu & Dashboard Hub (Revealed on Scroll)
          ======================================================== */}
      <motion.section
        ref={menuRef}
        id="main-menu"
        style={{ opacity: menuOpacity, y: menuY }}
        className="min-h-screen py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col items-center justify-center space-y-16"
      >
        {/* Main Section Header */}
        <div className="text-center space-y-4 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cosmic-cyan">
            <Compass className="w-3.5 h-3.5" />
            <span>Mission Control</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Find the time.
            <br />
            <span className="text-cosmic-gradient">Where schedules align.</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl mx-auto">
            Create an orbit, share an expiring unguessable link, and watch everyone's availability illuminate into a color-coded heatmap of perfect overlap.
          </p>
        </div>

        {/* Main Menu Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* Action 1: Host an Orbit */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 hover:border-cosmic-purple/60 transition-all flex flex-col justify-between group cursor-default relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-cosmic-purple/15 rounded-full blur-2xl group-hover:bg-cosmic-purple/25 transition-all -z-10" />

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cosmic-purple to-cosmic-pink text-white flex items-center justify-center shadow-lg shadow-cosmic-purple/40 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-cosmic-purple transition-colors">
                  Host an Orbit
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Schedule candidate dates, slot duration (15/30/60 min), response deadlines, and capacity limits.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-white/5">
              <Link
                to={user ? '/create' : '/login'}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>{user ? 'Launch New Orbit' : 'Sign In & Host'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Action 2: View Demo Heatmap */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 hover:border-cosmic-cyan/60 transition-all flex flex-col justify-between group cursor-default relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-cosmic-cyan/15 rounded-full blur-2xl group-hover:bg-cosmic-cyan/25 transition-all -z-10" />

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cosmic-cyan to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cosmic-cyan/30 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-cosmic-cyan transition-colors">
                    Demo Heatmap
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    8 Voters
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Explore pre-seeded participant availability with instant overlap calculation, top slot ranking, and color glows.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-white/5">
              <Link
                to="/share/demo-orbit-2026/heatmap"
                className="w-full py-3 rounded-2xl text-xs font-bold glass-card text-white hover:bg-white/15 border border-white/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>View Overlap Heatmap</span>
                <Sparkles className="w-4 h-4 text-cosmic-cyan" />
              </Link>
            </div>
          </motion.div>

          {/* Action 3: My Events / Manage */}
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 hover:border-cosmic-pink/60 transition-all flex flex-col justify-between group cursor-default relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-cosmic-pink/15 rounded-full blur-2xl group-hover:bg-cosmic-pink/25 transition-all -z-10" />

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cosmic-pink to-purple-600 text-white flex items-center justify-center shadow-lg shadow-cosmic-pink/30 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-cosmic-pink transition-colors">
                  My Orbits
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Review responses, FIFO waitlists, export .ics calendars, rotate shareable URLs, and co-host meetings.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-white/5">
              <Link
                to="/events"
                className="w-full py-3 rounded-2xl text-xs font-bold glass-card text-white hover:bg-white/15 border border-white/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span>Access Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Feature Cards: Apple Vision Pro Glass Panels */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Card 1 */}
          <motion.div
            whileHover={{ y: -4, scale: 1.015 }}
            className="glass-card p-6 rounded-3xl border border-white/10 space-y-3 cursor-default"
          >
            <div className="w-10 h-10 rounded-2xl bg-cosmic-purple/20 text-cosmic-purple flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Radiant Heatmap</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Overlays responses into an instant glowing matrix. Hover any slot to see who is free with zero calendar leakage.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileHover={{ y: -4, scale: 1.015 }}
            className="glass-card p-6 rounded-3xl border border-white/10 space-y-3 cursor-default"
          >
            <div className="w-10 h-10 rounded-2xl bg-cosmic-cyan/20 text-cosmic-cyan flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Zero-Password Auth</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hosts log in via 6-digit SMS code with Fernet phone encryption. Invitees join seamlessly without accounts.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileHover={{ y: -4, scale: 1.015 }}
            className="glass-card p-6 rounded-3xl border border-white/10 space-y-3 cursor-default"
          >
            <div className="w-10 h-10 rounded-2xl bg-cosmic-pink/20 text-cosmic-pink flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Cryptographic URLs</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unguessable 16-byte tokens with automatic semester expiry. Rotate links instantly if shared outside your group.
            </p>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};
