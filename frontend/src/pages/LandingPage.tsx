import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeroPlanet } from '../components/HeroPlanet';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Sparkles,
  Lock,
  Share2,
  Users,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-6">
        {/* Floating Top Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 glass-chip px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 border border-white/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-cosmic-purple" />
          <span>CS 3354 Software Engineering · Fall 2026</span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08]"
        >
          <span className="text-white">Find the time.</span>
          <br />
          <span className="text-cosmic-gradient">Anywhere in the galaxy.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 font-normal leading-relaxed"
        >
          Tentative simplifies group scheduling. Create an orbit, share an expiring unguessable link,
          and watch schedules illuminate into a color-coded heatmap of perfect alignment.
        </motion.p>

        {/* CTA Button Group */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <Link
            to={user ? '/create' : '/login'}
            className="px-8 py-3.5 rounded-full text-sm font-bold bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <span>{user ? 'Host a New Orbit' : 'Host an Orbit'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/share/demo-orbit-2026/heatmap"
            className="px-7 py-3.5 rounded-full text-sm font-semibold glass-card text-white hover:bg-white/10 border border-white/15 transition-all"
          >
            View Demo Heatmap
          </Link>
        </motion.div>
      </div>

      {/* Hero Visual: Centerpiece Floating Planet */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.35 }}
        className="w-full"
      >
        <HeroPlanet />
      </motion.div>

      {/* Feature Grid: Apple-Smooth Cards */}
      <div className="max-w-6xl mx-auto w-full mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Availability Heatmap */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cosmic-purple/40 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-cosmic-purple/20 text-cosmic-purple flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Radiant Heatmap</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Overlays all responses into an instant glowing calendar matrix. Hover any slot to see who is free
            with zero calendar data leakage.
          </p>
        </div>

        {/* Card 2: Passwordless & Anonymous */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cosmic-cyan/40 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-cosmic-cyan/20 text-cosmic-cyan flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Zero-Password Auth</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hosts authenticate via 6-digit SMS code with Fernet phone encryption at rest. Invitees jump straight in
            anonymously with private edit tokens.
          </p>
        </div>

        {/* Card 3: Expiring & Rotating URLs */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cosmic-pink/40 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-cosmic-pink/20 text-cosmic-pink flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Cryptographic Orbits</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every orbit link is cryptographically random and auto-expires at semester end. Rotate compromised links
            in one click without losing responses.
          </p>
        </div>
      </div>
    </div>
  );
};
