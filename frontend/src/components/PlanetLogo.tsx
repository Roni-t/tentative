import React from 'react';

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
        className={`w-full h-full ${isSpinning ? 'animate-spin-slow' : ''}`}
      >
        <defs>
          <linearGradient id="planetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="40%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
          <filter id="planetGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Back of the tilted ring */}
        <path
          d="M 6 32 C 6 22, 58 14, 58 24"
          stroke="url(#ringGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.5"
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

        {/* Atmosphere highlight */}
        <path
          d="M 20 24 A 14 14 0 0 1 42 20"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Front of the tilted ring */}
        <path
          d="M 58 24 C 58 38, 6 42, 6 32"
          stroke="url(#ringGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          transform="rotate(-20 32 32)"
        />
      </svg>
    </div>
  );
};
