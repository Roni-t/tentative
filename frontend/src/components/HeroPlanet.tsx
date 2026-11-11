import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const HeroPlanet: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth mouse coordinates for subtle 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 100, damping: 24 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 24 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-14, 14]);

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
      className="relative w-full max-w-lg h-[380px] sm:h-[420px] flex items-center justify-center mx-auto select-none perspective-[1000px]"
    >
      {/* Central Celestial Orb with 3D Parallax */}
      <motion.div
        style={{ rotateX, rotateY }}
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex items-center justify-center transform-gpu"
      >
        {/* Pure white radiant ambient glow */}
        <div className="absolute w-72 h-72 rounded-full bg-white/20 blur-3xl opacity-60 animate-pulse-glow" />

        {/* Planet Sphere (Pure White Luminous Celestial Body) */}
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full p-[1.5px] shadow-[0_0_45px_rgba(255,255,255,0.4)] border border-white/50 overflow-hidden bg-gradient-to-br from-white via-zinc-200 to-zinc-950">
          {/* Internal volumetric white-to-charcoal gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,#FFFFFF_0%,#F4F4F5_30%,#D4D4D8_55%,#52525B_80%,#09090B_100%)]" />

          {/* Crisp specular white rim highlight */}
          <div className="absolute top-2 left-6 w-32 h-16 rounded-full bg-white/60 blur-sm transform -rotate-12 pointer-events-none" />

          {/* Subtle lunar crater / atmospheric micro-texture */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_45%_40%,rgba(0,0,0,0.5)_4px,transparent_6px),radial-gradient(circle_at_60%_65%,rgba(0,0,0,0.4)_6px,transparent_8px),radial-gradient(circle_at_25%_60%,rgba(0,0,0,0.3)_3px,transparent_5px)]" />

          {/* Slow rotating orbital shadow */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,0,0,0.85)_25%,transparent_65%)] pointer-events-none"
          />
        </div>

        {/* Tilted Planetary Ring (Luminous Pure White & Platinum) */}
        <motion.div
          animate={{ rotate: [-24, -20, -24] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[360px] sm:w-[390px] h-[100px] sm:h-[110px] border-[3.5px] border-transparent rounded-[100%] pointer-events-none"
          style={{
            borderTopColor: 'rgba(255, 255, 255, 0.95)',
            borderRightColor: 'rgba(255, 255, 255, 0.85)',
            borderBottomColor: 'rgba(161, 161, 170, 0.4)',
            borderLeftColor: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 0 35px rgba(255, 255, 255, 0.65), inset 0 0 20px rgba(255, 255, 255, 0.45)',
            transform: 'rotate(-22deg)',
          }}
        />
      </motion.div>
    </div>
  );
};
