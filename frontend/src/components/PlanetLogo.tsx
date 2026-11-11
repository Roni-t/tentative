import React from 'react';
import { motion } from 'framer-motion';

interface PlanetLogoProps {
  size?: number;
  className?: string;
  isSpinning?: boolean;
}

export const PlanetLogo: React.FC<PlanetLogoProps> = ({ size = 32, className = '', isSpinning = false }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="planetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E4E4E7" />
            <stop offset="100%" stopColor="#52525B" />
          </linearGradient>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#D4D4D8" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <filter id="planetGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer glowing aura */}
        <circle cx="32" cy="32" r="18" fill="#FFFFFF" opacity="0.22" filter="url(#planetGlow)" />

        {/* Back of the tilted ring */}
        <path
          d="M 6 32 C 6 22, 58 14, 58 24"
          stroke="url(#ringGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.45"
          transform="rotate(-20 32 32)"
        />

        {/* Planet Sphere */}
        <circle
          cx="32"
          cy="32"
          r="16"
          fill="url(#planetGrad)"
          filter="url(#planetGlow)"
        />

        {/* Atmosphere specular highlight */}
        <path
          d="M 20 24 A 14 14 0 0 1 42 20"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Front of the tilted ring with smooth rotation if spinning */}
        <motion.g
          animate={isSpinning ? { rotate: [0, 360] } : undefined}
          transition={isSpinning ? { duration: 3, repeat: Infinity, ease: 'linear' } : undefined}
          style={{ originX: '32px', originY: '32px' }}
        >
          <path
            d="M 58 24 C 58 38, 6 42, 6 32"
            stroke="url(#ringGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            transform="rotate(-20 32 32)"
          />
        </motion.g>
      </svg>
    </div>
  );
};
