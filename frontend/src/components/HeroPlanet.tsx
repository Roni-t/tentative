import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Users, Sparkles, CheckCircle2, Clock } from 'lucide-react';

export const HeroPlanet: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse coordinates for 3D parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for fluid, physics-based movement
  const springX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 20 });

  // 3D rotation transforms
  const rotateX = useTransform(springY, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-16, 16]);

  // Parallax offsets for chips (different depths for spatial separation)
  const chip1X = useTransform(springX, [-0.5, 0.5], [-22, 22]);
  const chip1Y = useTransform(springY, [-0.5, 0.5], [-18, 18]);

  const chip2X = useTransform(springX, [-0.5, 0.5], [26, -26]);
  const chip2Y = useTransform(springY, [-0.5, 0.5], [22, -22]);

  const chip3X = useTransform(springX, [-0.5, 0.5], [-16, 16]);
  const chip3Y = useTransform(springY, [-0.5, 0.5], [14, -14]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-2xl h-[460px] flex items-center justify-center mx-auto my-4 select-none perspective-[1000px]"
    >
      {/* Central Celestial Orb with 3D Parallax */}
      <motion.div
        style={{ rotateX, rotateY }}
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex items-center justify-center transform-gpu"
      >
        {/* Deep ambient glow behind sphere */}
        <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-cosmic-purple/45 via-cosmic-cyan/35 to-cosmic-pink/35 blur-3xl opacity-85 animate-pulse-glow" />

        {/* Planet Sphere */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative w-60 h-60 rounded-full bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 p-[1.5px] shadow-2xl shadow-cosmic-purple/40 border border-white/20 overflow-hidden cursor-pointer"
        >
          {/* Internal atmospheric nebulas & volumetric gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_25%,rgba(168,85,247,0.75),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_75%,rgba(56,189,248,0.45),transparent_65%)]" />
          <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_120%,rgba(236,72,153,0.4),transparent_60%)]" />

          {/* Celestial specular rim light */}
          <div className="absolute top-2 left-6 w-36 h-20 rounded-full bg-white/25 blur-md transform -rotate-12" />

          {/* Internal atmospheric texture */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,transparent_40%,rgba(5,6,10,0.85)_100%)]"
          />
        </motion.div>

        {/* Planetary Orbital Ring */}
        <motion.div
          animate={{ rotate: [-24, -20, -24] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[400px] h-[110px] border-[3.5px] border-transparent rounded-[100%] pointer-events-none"
          style={{
            borderTopColor: 'rgba(56, 189, 248, 0.9)',
            borderRightColor: 'rgba(168, 85, 247, 0.95)',
            borderBottomColor: 'rgba(236, 72, 153, 0.85)',
            borderLeftColor: 'rgba(99, 102, 241, 0.7)',
            boxShadow: '0 0 35px rgba(168, 85, 247, 0.5), inset 0 0 25px rgba(56, 189, 248, 0.4)',
            transform: 'rotate(-22deg)',
          }}
        />
      </motion.div>

      {/* Floating Glass Chip 1: 7 of 8 responded */}
      <motion.div
        style={{ x: chip1X, y: chip1Y }}
        whileHover={{ scale: 1.08, y: -4 }}
        animate={{ y: [-5, 7, -5] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-8 left-4 sm:left-12 glass-chip px-4 py-2.5 rounded-full flex items-center space-x-2.5 shadow-xl border border-white/20 hover:border-cosmic-purple/50 transition-colors cursor-default backdrop-blur-xl"
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
        style={{ x: chip2X, y: chip2Y }}
        whileHover={{ scale: 1.08, y: -4 }}
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-6 right-2 sm:right-10 glass-chip px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-2xl border border-cosmic-purple/40 bg-space-850/85 hover:border-cosmic-cyan/60 transition-colors cursor-default backdrop-blur-xl"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cosmic-purple to-cosmic-pink text-white flex items-center justify-center shadow-lg shadow-cosmic-purple/40">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="text-[10px] tracking-wider uppercase text-cosmic-cyan font-bold">Best Overlap</div>
          <div className="text-xs font-bold text-white">Wed, Sep 16 · 2:00–3:00 PM</div>
        </div>
      </motion.div>

      {/* Floating Glass Chip 3: Orbit Locked */}
      <motion.div
        style={{ x: chip3X, y: chip3Y }}
        whileHover={{ scale: 1.08, y: -4 }}
        animate={{ y: [-4, 6, -4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-10 left-6 sm:left-16 glass-chip px-3.5 py-2 rounded-full flex items-center space-x-2 border border-white/15 hover:border-cosmic-cyan/50 transition-colors cursor-default backdrop-blur-xl"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-cosmic-cyan" />
        <span className="text-xs font-semibold text-slate-200">Orbit Lock Ready</span>
      </motion.div>

      {/* Floating Glass Chip 4: Micro slot pill */}
      <motion.div
        whileHover={{ scale: 1.08, y: -4 }}
        animate={{ y: [5, -5, 5] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute top-10 right-6 sm:right-16 glass-chip px-3 py-1.5 rounded-full flex items-center space-x-1.5 border border-white/15 hover:border-cosmic-pink/50 text-[11px] text-slate-300 transition-colors cursor-default backdrop-blur-xl"
      >
        <Clock className="w-3 h-3 text-cosmic-pink" />
        <span>30-min slots</span>
      </motion.div>
    </div>
  );
};
