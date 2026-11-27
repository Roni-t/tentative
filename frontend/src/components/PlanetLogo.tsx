import React from 'react';
import { motion } from 'framer-motion';

interface PlanetLogoProps {
  size?: number;
  className?: string;
  isSpinning?: boolean;
}

// Small version of the hero planet: shaded sphere with a ring that passes in front and behind
export const PlanetLogo: React.FC<PlanetLogoProps> = ({ size = 32, className = '', isSpinning = false }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="pl-body" cx="34%" cy="28%" r="85%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#d4d4d8" />
            <stop offset="70%" stopColor="#6b6b74" />
            <stop offset="100%" stopColor="#141417" />
          </radialGradient>
          <linearGradient id="pl-ring" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="35%" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <g transform="rotate(-17 32 32)">
          <path d="M 4 32 A 28 8 0 0 1 60 32" stroke="url(#pl-ring)" strokeWidth="2" opacity="0.4" />
        </g>
        <circle cx="32" cy="32" r="15" fill="url(#pl-body)" />
        <motion.g
          animate={isSpinning ? { rotate: [0, 360] } : undefined}
          transition={isSpinning ? { duration: 3, repeat: Infinity, ease: 'linear' } : undefined}
          style={{ originX: '32px', originY: '32px' }}
        >
          <g transform="rotate(-17 32 32)">
            <path d="M 4 32 A 28 8 0 0 0 60 32" stroke="url(#pl-ring)" strokeWidth="2.2" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
};
