import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { HeroPlanet } from './HeroPlanet';

interface IntroSplashProps {
  // The spot in the page where the planet ends up
  targetRef: React.RefObject<HTMLElement>;
  onDone: () => void;
}

const ZOOM = 3.2;
const TOTAL_SECONDS = 3;

// A short intro for the first visit. The planet starts zoomed in on a black screen,
// then zooms out into its place in the hero while the black fades away.
export const IntroSplash: React.FC<IntroSplashProps> = ({ targetRef, onDone }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
  }, [targetRef]);

  useEffect(() => {
    const timer = setTimeout(onDone, TOTAL_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [onDone]);

  // How far the planet has to travel from the middle of the screen to its final spot
  const dx = rect ? window.innerWidth / 2 - (rect.left + rect.width / 2) : 0;
  const dy = rect ? window.innerHeight / 2 - (rect.top + rect.height / 2) : 0;

  const zoomOut = { duration: TOTAL_SECONDS, times: [0, 0.34, 1], ease: ['linear', [0.76, 0, 0.24, 1]] as any };

  // Rendered on the document body so it sits above the top bar too
  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Black screen that fades away while the planet zooms out */}
      <motion.div
        className="absolute inset-0 bg-space-950"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0] }}
        transition={{ duration: TOTAL_SECONDS, times: [0, 0.45, 1], ease: 'easeInOut' }}
      />

      {rect && (
        <motion.div
          className="absolute"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          initial={{ scale: ZOOM, x: dx, y: dy, opacity: 0 }}
          animate={{ scale: [ZOOM, ZOOM, 1], x: [dx, dx, 0], y: [dy, dy, 0], opacity: [0, 1, 1] }}
          transition={{ scale: zoomOut, x: zoomOut, y: zoomOut, opacity: { duration: TOTAL_SECONDS, times: [0, 0.2, 1] } }}
        >
          <HeroPlanet />
        </motion.div>
      )}

      {/* Small label under the zoomed-in planet */}
      <motion.span
        className="eyebrow absolute inset-x-0 bottom-[14vh] text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: TOTAL_SECONDS * 0.5, times: [0, 0.3, 0.7, 1] }}
      >
        tentative
      </motion.span>
    </div>,
    document.body
  );
};
