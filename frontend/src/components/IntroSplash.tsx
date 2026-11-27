import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { HeroPlanet } from './HeroPlanet';

interface IntroSplashProps {
  // The spot in the page where the planet ends up
  targetRef: React.RefObject<HTMLElement>;
  // Called when the planet is almost in place. The page starts fading in under the intro.
  onReveal: () => void;
  // Called when the intro is completely gone
  onDone: () => void;
}

const ZOOM = 2.8;
const TOTAL_SECONDS = 2.4;
const REVEAL_AT = 0.78; // share of the time at which the zoom is done and the page starts showing
const SKIP_FADE_SECONDS = 0.35;

// The intro for when the main page loads. The planet starts zoomed in on a black screen, then zooms
// out into its place in the hero. At the end the real page fades in under the intro's planet, which is
// removed once the real planet is fully visible in exactly the same spot, so nothing pops or flashes. Clicking, tapping or pressing a key skips it.
export const IntroSplash: React.FC<IntroSplashProps> = ({ targetRef, onReveal, onDone }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [leaving, setLeaving] = useState(false);
  const revealed = useRef(false);
  const finished = useRef(false);

  // Measure before the first paint, so the planet is in the right place on the very first frame
  useLayoutEffect(() => {
    if (targetRef.current) setRect(targetRef.current.getBoundingClientRect());
  }, [targetRef]);

  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    onReveal();
  }, [onReveal]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    reveal();
    onDone();
  }, [reveal, onDone]);

  // Skip: show the page right away and fade the intro out quickly
  const skip = useCallback(() => {
    if (finished.current) return;
    reveal();
    setLeaving(true);
    setTimeout(finish, SKIP_FADE_SECONDS * 1000);
  }, [reveal, finish]);

  useEffect(() => {
    const revealTimer = setTimeout(reveal, TOTAL_SECONDS * REVEAL_AT * 1000);
    const doneTimer = setTimeout(finish, TOTAL_SECONDS * 1000);
    const onKey = () => skip();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [reveal, finish, skip]);

  // How far the planet has to travel from the middle of the screen to its final spot
  const dx = rect ? window.innerWidth / 2 - (rect.left + rect.width / 2) : 0;
  const dy = rect ? window.innerHeight / 2 - (rect.top + rect.height / 2) : 0;

  // A short hold, a smooth zoom out (slow start, slow finish), then it stays put while it fades out
  const times = [0, 0.16, REVEAL_AT, 1];
  const zoomOut = { duration: TOTAL_SECONDS, times, ease: ['linear', [0.65, 0, 0.25, 1], 'linear'] as any };

  // Rendered on the document body so it sits above the top bar too
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] cursor-pointer"
      onPointerDown={skip}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: SKIP_FADE_SECONDS, ease: 'easeOut' }}
    >
      {/* Black screen that fades away as the planet settles, showing the page behind it */}
      <motion.div
        className="absolute inset-0 bg-space-950"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: TOTAL_SECONDS, times: [0, 0.2, REVEAL_AT, 1], ease: 'easeInOut' }}
      />

      {rect && (
        <motion.div
          className="absolute pointer-events-none"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          initial={{ scale: ZOOM, x: dx, y: dy, opacity: 0 }}
          animate={{
            scale: [ZOOM, ZOOM, 1, 1],
            x: [dx, dx, 0, 0],
            y: [dy, dy, 0, 0],
            opacity: [0, 1, 1, 1],
          }}
          transition={{
            scale: zoomOut,
            x: zoomOut,
            y: zoomOut,
            // Fades in at the start, then stays fully visible. The real planet fades in underneath it,
            // and this one is removed once the real one is fully there, so there is no dim moment.
            opacity: { duration: TOTAL_SECONDS, times: [0, 0.12, REVEAL_AT, 1], ease: 'easeInOut' },
          }}
        >
          <HeroPlanet />
        </motion.div>
      )}

      {/* Small hint */}
      <motion.span
        className="eyebrow absolute inset-x-0 bottom-24 text-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: TOTAL_SECONDS * 0.75, times: [0, 0.25, 0.7, 1] }}
      >
        Click to skip
      </motion.span>
    </motion.div>,
    document.body
  );
};
