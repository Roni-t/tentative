import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

interface RocketLaunchProps {
  dateText: string;
  timeText: string;
}

// Total time the animation needs. The page waits this long before it leaves.
export const ROCKET_LAUNCH_MS = 5200;

const COUNTDOWN = ['3', '2', '1'];
const SMOKE = [-70, -40, -15, 10, 35, 60, -55, 50];
const SPEED_LINES = [8, 17, 26, 34, 43, 52, 61, 69, 78, 86, 93];

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const RocketLaunch: React.FC<RocketLaunchProps> = ({ dateText, timeText }) =>
  createPortal(
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
    className="fixed inset-0 z-[60] overflow-hidden bg-space-950"
  >
    {/* Speed lines rush downward once the rocket lifts off */}
    {SPEED_LINES.map((left, i) => (
      <motion.span
        key={left}
        className="absolute top-0 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent"
        style={{ left: `${left}%`, height: `${120 + (i % 4) * 40}px` }}
        initial={{ y: '-30vh', opacity: 0 }}
        animate={{ y: '130vh', opacity: [0, 0.8, 0.8, 0] }}
        transition={{
          delay: 1.8 + (i % 5) * 0.15,
          duration: 0.9,
          repeat: 2,
          repeatDelay: (i % 3) * 0.1,
          ease: 'easeIn',
        }}
      />
    ))}

    {/* Countdown */}
    <div className="absolute top-[22%] inset-x-0 flex justify-center">
      {COUNTDOWN.map((n, i) => (
        <motion.span
          key={n}
          className="absolute font-mono text-7xl font-semibold text-white"
          initial={{ opacity: 0, scale: 1.4 }}
          animate={{ opacity: [0, 1, 0], scale: [1.4, 1, 0.9] }}
          transition={{ delay: 0.3 + i * 0.7, duration: 0.7, ease: 'easeOut' }}
        >
          {n}
        </motion.span>
      ))}
    </div>

    {/* Launch pad glow and smoke */}
    <div className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 w-0">
      {SMOKE.map((x, i) => (
        <motion.span
          key={i}
          className="absolute -bottom-3 w-16 h-16 rounded-full bg-zinc-300/40 blur-xl"
          style={{ left: x - 32 }}
          initial={{ scale: 0.3, opacity: 0, y: 0 }}
          animate={{ scale: [0.3, 2.6], opacity: [0, 0.55, 0], y: [0, 20], x: [0, x * 1.4] }}
          transition={{ delay: 0.9 + (i % 4) * 0.2, duration: 2.2, ease: 'easeOut' }}
        />
      ))}
    </div>

    {/* The rocket. It waits on the pad, shakes, then accelerates away. */}
    <motion.div
      className="absolute bottom-[10vh] left-1/2 -ml-[30px]"
      initial={{ y: 0 }}
      animate={{ y: [0, 0, -1300] }}
      transition={{ duration: 3.6, times: [0, 0.35, 1], ease: ['linear', [0.5, 0, 0.9, 0.4]] as any, delay: 0.2 }}
    >
      <motion.div
        animate={{ x: [0, -1.5, 1.5, -1.5, 1.5, 0] }}
        transition={{ duration: 0.18, repeat: 8, delay: 0.5 }}
      >
        {/* A plain, flat white rocket: one body, two fins, one flame */}
        <svg width="60" height="190" viewBox="0 0 60 190" fill="none" aria-hidden="true">
          <path d="M30 0 C42 20 46 50 44 108 L16 108 C14 50 18 20 30 0 Z" fill="#ffffff" />
          <path d="M16 84 L2 116 L16 108 Z" fill="#ffffff" />
          <path d="M44 84 L58 116 L44 108 Z" fill="#ffffff" />

          {/* Flame, flickers while the engine is on */}
          <motion.g
            style={{ originX: '30px', originY: '112px' }}
            initial={{ scaleY: 0.2, opacity: 0 }}
            animate={{ scaleY: [0.2, 1, 1.5, 1.2, 1.7, 1.3], opacity: [0, 1, 1, 1, 1, 1] }}
            transition={{ delay: 0.7, duration: 2.8, ease: 'easeOut' }}
          >
            <path d="M22 112 C22 140 30 184 30 184 C30 184 38 140 38 112 Z" fill="#fcd34d" />
          </motion.g>
        </svg>
      </motion.div>
    </motion.div>

    {/* Confirmation, shown after the rocket has gone */}
    <motion.div
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center text-center px-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.2, duration: 1, ease: EASE_OUT }}
    >
      <span className="eyebrow">Launched</span>
      <h3 className="display-serif text-5xl sm:text-6xl text-white mt-4">Time locked in.</h3>
      <p className="font-mono text-sm text-zinc-300 mt-6">{dateText}</p>
      <p className="font-mono text-sm text-zinc-400 mt-1">{timeText}</p>
    </motion.div>
  </motion.div>,
  document.body
);
