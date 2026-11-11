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
        {/* Soft, minimal ambient glow */}
        <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-cosmic-purple/35 via-cosmic-cyan/25 to-cosmic-pink/25 blur-3xl opacity-75" />

        {/* Planet Sphere */}
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-[1.5px] shadow-2xl shadow-cosmic-purple/30 border border-white/20 overflow-hidden">
          {/* Subtle atmospheric gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_25%,rgba(168,85,247,0.65),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_75%,rgba(56,189,248,0.35),transparent_65%)]" />

          {/* Gentle specular rim light */}
          <div className="absolute top-2 left-6 w-32 h-16 rounded-full bg-white/20 blur-md transform -rotate-12" />

          {/* Slow rotating surface shadow */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,transparent_40%,rgba(5,6,10,0.85)_100%)]"
          />
        </div>

        {/* Tilted Planetary Ring */}
        <motion.div
          animate={{ rotate: [-24, -20, -24] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[360px] sm:w-[390px] h-[100px] sm:h-[110px] border-[3px] border-transparent rounded-[100%] pointer-events-none"
          style={{
            borderTopColor: 'rgba(56, 189, 248, 0.85)',
            borderRightColor: 'rgba(168, 85, 247, 0.9)',
            borderBottomColor: 'rgba(236, 72, 153, 0.75)',
            borderLeftColor: 'rgba(99, 102, 241, 0.55)',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.35), inset 0 0 20px rgba(56, 189, 248, 0.25)',
            transform: 'rotate(-22deg)',
          }}
        />
      </motion.div>
    </div>
  );
};
