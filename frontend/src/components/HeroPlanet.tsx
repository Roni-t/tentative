import React from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles, CheckCircle2, Clock } from 'lucide-react';

export const HeroPlanet: React.FC = () => {
  return (
    <div className="relative w-full max-w-2xl h-[420px] flex items-center justify-center mx-auto my-6 select-none">
      {/* Central Celestial Orb */}
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex items-center justify-center"
      >
        {/* Deep ambient glow behind sphere */}
        <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-cosmic-purple/40 via-cosmic-cyan/30 to-cosmic-pink/30 blur-3xl opacity-80" />

        {/* Planet Sphere */}
        <div className="relative w-56 h-56 rounded-full bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 p-[1px] shadow-2xl shadow-cosmic-purple/30 border border-white/20 overflow-hidden">
          {/* Internal planetary texture & atmospheric gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_25%,rgba(168,85,247,0.7),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_75%,rgba(56,189,248,0.4),transparent_65%)]" />
          <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_120%,rgba(236,72,153,0.35),transparent_60%)]" />
          {/* Subtle celestial specular rim light */}
          <div className="absolute top-2 left-6 w-32 h-16 rounded-full bg-white/20 blur-md transform -rotate-12" />
        </div>

        {/* Planetary Ring */}
        <motion.div
          animate={{ rotate: [-24, -20, -24] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[360px] h-[100px] border-[3px] border-transparent rounded-[100%] pointer-events-none"
          style={{
            borderTopColor: 'rgba(56, 189, 248, 0.85)',
            borderRightColor: 'rgba(168, 85, 247, 0.9)',
            borderBottomColor: 'rgba(236, 72, 153, 0.75)',
            borderLeftColor: 'rgba(99, 102, 241, 0.6)',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(56, 189, 248, 0.3)',
            transform: 'rotate(-22deg)',
          }}
        />
      </motion.div>

      {/* Floating Glass Chip 1: 7 of 8 responded */}
      <motion.div
        animate={{ y: [-5, 7, -5], x: [0, 4, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-10 left-4 sm:left-12 glass-chip px-4 py-2.5 rounded-full flex items-center space-x-2.5 shadow-xl border border-white/15"
      >
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
          <Users className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs font-medium">
          <span className="text-white font-bold">7 of 8</span> <span className="text-slate-400">responded</span>
        </div>
      </motion.div>

      {/* Floating Glass Chip 2: Best overlap: Wed 2-3 PM */}
      <motion.div
        animate={{ y: [6, -6, 6], x: [0, -5, 0] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-8 right-2 sm:right-10 glass-chip px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-2xl border border-cosmic-purple/40 bg-space-850/80"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cosmic-purple to-cosmic-pink text-white flex items-center justify-center shadow-lg shadow-cosmic-purple/40">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="text-[10px] tracking-wider uppercase text-cosmic-cyan font-semibold">Best Overlap</div>
          <div className="text-xs font-bold text-white">Wed, Sep 16 · 2:00–3:00 PM</div>
        </div>
      </motion.div>

      {/* Floating Glass Chip 3: Orbit Locked */}
      <motion.div
        animate={{ y: [-4, 6, -4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-12 left-6 sm:left-16 glass-chip px-3.5 py-2 rounded-full flex items-center space-x-2 border border-white/10"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-cosmic-cyan" />
        <span className="text-xs font-medium text-slate-300">Orbit Lock Ready</span>
      </motion.div>

      {/* Floating Glass Chip 4: Micro slot pill */}
      <motion.div
        animate={{ y: [5, -5, 5] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute top-12 right-6 sm:right-16 glass-chip px-3 py-1.5 rounded-full flex items-center space-x-1.5 border border-white/10 text-[11px] text-slate-400"
      >
        <Clock className="w-3 h-3 text-cosmic-pink" />
        <span>30-min slots</span>
      </motion.div>
    </div>
  );
};
