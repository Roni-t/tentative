import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { HeroPlanet } from './HeroPlanet';

interface IntroSplashProps {
  // The spot in the page where the planet ends up
  targetRef: React.RefObject<HTMLElement>;
  onDone: () => void;
}

const ZOOM = 2.8;
const TOTAL_SECONDS = 2.2;
const SKIP_FADE_SECONDS = 0.3;

// An intro for when the main page loads. The planet starts zoomed in on a black screen,
// then zooms out into its place in the hero while the black fades away.
// Clicking, tapping, or pressing a key skips it.
export const IntroSplash: React.FC<IntroSplashProps> = ({ targetRef, onDone }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
  }, [targetRef]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  // Skip: fade the intro out quickly, then hand over to the page
  const skip = useCallback(() => {
    if (finished.current) return;
    setLeaving(true);
    setTimeout(finish, SKIP_FADE_SECONDS * 1000);
  }, [finish]);

  useEffect(() => {
    const timer = setTimeout(finish, TOTAL_SECONDS * 1000);
    const onKey = () => skip();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [finish, skip]);

  // How far the planet has to travel from the middle of the screen to its final spot
  const dx = rect ? window.innerWidth / 2 - (rect.left + rect.width / 2) : 0;
  const dy = rect ? window.innerHeight / 2 - (rect.top + rect.height / 2) : 0;

  // A short hold, then a smooth zoom out (slow start, slow finish)
  const zoomOut = { duration: TOTAL_SECONDS, times: [0, 0.18, 1], ease: ['linear', [0.65, 0, 0.25, 1]] as any };

  // Rendered on the document body so it sits above the top bar too
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] cursor-pointer"
      onPointerDown={skip}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: SKIP_FADE_SECONDS }}
    >
      {/* Black screen that fades away while the planet zooms out */}
      <motion.div
        className="absolute inset-0 bg-space-950"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0] }}
        transition={{ duration: TOTAL_SECONDS, times: [0, 0.3, 0.95], ease: 'easeInOut' }}
      />

      {rect && (
        <motion.div
          className="absolute pointer-events-none"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          initial={{ scale: ZOOM, x: dx, y: dy, opacity: 0 }}
          animate={{ scale: [ZOOM, ZOOM, 1], x: [dx, dx, 0], y: [dy, dy, 0], opacity: [0, 1, 1] }}
          transition={{ scale: zoomOut, x: zoomOut, y: zoomOut, opacity: { duration: TOTAL_SECONDS, times: [0, 0.12, 1] } }}
        >
          <HeroPlanet />
        </motion.div>
      )}

      {/* Small hint */}
      <motion.span
        className="eyebrow absolute inset-x-0 bottom-24 text-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: TOTAL_SECONDS * 0.85, times: [0, 0.25, 0.7, 1] }}
      >
        Click to skip
      </motion.span>
    </motion.div>,
    document.body
  );
};
