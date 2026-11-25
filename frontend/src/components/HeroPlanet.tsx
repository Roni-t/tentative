import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// The ring is drawn in two halves so the planet can sit between them.
const ringBack = (rx: number, ry: number) => `M ${200 - rx} 130 A ${rx} ${ry} 0 0 1 ${200 + rx} 130`;
const ringFront = (rx: number, ry: number) => `M ${200 - rx} 130 A ${rx} ${ry} 0 0 0 ${200 + rx} 130`;

const RINGS = [
  { rx: 178, ry: 38, opacity: 0.9, width: 1.6 },
  { rx: 164, ry: 34.5, opacity: 0.5, width: 1 },
  { rx: 148, ry: 31, opacity: 0.7, width: 2.4 },
];

export const HeroPlanet: React.FC = () => {
  // The planet moves less than the ring when the cursor moves, which gives some depth
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const ringX = useSpring(useTransform(mx, (v) => v * 14), { stiffness: 50, damping: 20 });
  const ringY = useSpring(useTransform(my, (v) => v * 14), { stiffness: 50, damping: 20 });
  const bodyX = useSpring(useTransform(mx, (v) => v * 5), { stiffness: 50, damping: 20 });
  const bodyY = useSpring(useTransform(my, (v) => v * 5), { stiffness: 50, damping: 20 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      className="relative mx-auto w-[340px] sm:w-[520px] select-none pointer-events-none"
    >
      <svg viewBox="0 0 400 260" className="w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="hp-body" cx="34%" cy="28%" r="85%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#dcdce0" />
            <stop offset="58%" stopColor="#8d8d96" />
            <stop offset="82%" stopColor="#2c2c32" />
            <stop offset="100%" stopColor="#0a0a0c" />
          </radialGradient>
          <radialGradient id="hp-shade" cx="30%" cy="26%" r="95%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.75" />
          </radialGradient>
          <radialGradient id="hp-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hp-ring" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="30%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#d4d4d8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.05" />
          </linearGradient>
          <clipPath id="hp-sphere">
            <circle cx="200" cy="130" r="78" />
          </clipPath>
        </defs>

        <circle cx="200" cy="130" r="170" fill="url(#hp-glow)" />

        {/* Back half of the ring, behind the planet */}
        <motion.g style={{ x: ringX, y: ringY }}>
          <g transform="rotate(-17 200 130)">
            {RINGS.map((r) => (
              <path
                key={`back-${r.rx}`}
                d={ringBack(r.rx, r.ry)}
                fill="none"
                stroke="url(#hp-ring)"
                strokeWidth={r.width}
                opacity={r.opacity * 0.45}
              />
            ))}
          </g>
        </motion.g>

        {/* Planet */}
        <motion.g style={{ x: bodyX, y: bodyY }}>
          <circle cx="200" cy="130" r="78" fill="url(#hp-body)" />
          <g clipPath="url(#hp-sphere)">
            <circle cx="200" cy="130" r="78" fill="url(#hp-shade)" />
            {/* Soft bands across the surface */}
            <g transform="rotate(-17 200 130)">
              <ellipse cx="190" cy="112" rx="90" ry="7" fill="#fff" opacity="0.07" />
              <ellipse cx="205" cy="140" rx="90" ry="10" fill="#000" opacity="0.07" />
              <ellipse cx="200" cy="158" rx="90" ry="5" fill="#fff" opacity="0.05" />
            </g>
          </g>
          <circle cx="200" cy="130" r="77.5" fill="none" stroke="#fff" strokeOpacity="0.28" />
        </motion.g>

        {/* Front half of the ring, in front of the planet */}
        <motion.g style={{ x: ringX, y: ringY }}>
          <g transform="rotate(-17 200 130)">
            {RINGS.map((r) => (
              <path
                key={`front-${r.rx}`}
                d={ringFront(r.rx, r.ry)}
                fill="none"
                stroke="url(#hp-ring)"
                strokeWidth={r.width}
                opacity={r.opacity}
              />
            ))}
          </g>
        </motion.g>
      </svg>
    </motion.div>
  );
};
