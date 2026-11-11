import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { HeroPlanet } from '../components/HeroPlanet';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  ChevronDown,
  Sparkles,
  Zap,
  Lock,
  Share2,
  Calendar,
  Clock,
  CheckCircle,
  Users,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const trackRef = useRef<HTMLDivElement>(null);

  // Guarantee scroll to top when landing page loads
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Track scroll progress through the Apple sticky container (0.0 to 1.0)
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  // Apple-smooth physics spring interpolation
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });

  // ==========================================
  // STAGE 1: Opening Fold Transforms
  // ==========================================
  // Title & Subtitle fade out gently as you scroll
  const titleOpacity = useTransform(smoothProgress, [0, 0.25], [1, 0]);
  const titleY = useTransform(smoothProgress, [0, 0.25], [0, -35]);
  const titleScale = useTransform(smoothProgress, [0, 0.25], [1, 0.92]);

  // Scroll cue prompt at the bottom
  const scrollPromptOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);

  // Planet dynamic scaling & depth shift (The Apple centerpiece effect)
  const planetScale = useTransform(smoothProgress, [0.08, 0.55], [1, 1.35]);
  const planetY = useTransform(smoothProgress, [0.08, 0.55], [0, -65]);
  const planetOpacity = useTransform(smoothProgress, [0.35, 0.65], [1, 0.4]);

  // ==========================================
  // STAGE 2: Main Menu Hub Reveal Transforms
  // ==========================================
  // Menu emerges from depth, locks into crystal clear focus in the center
  const menuOpacity = useTransform(smoothProgress, [0.3, 0.6], [0, 1]);
  const menuY = useTransform(smoothProgress, [0.3, 0.6], [50, 0]);
  const menuScale = useTransform(smoothProgress, [0.3, 0.6], [0.92, 1]);

  const scrollToMenu = () => {
    const track = trackRef.current;
    if (track) {
      const targetY = track.offsetTop + track.offsetHeight * 0.58;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full">
      {/* ========================================================
          APPLE STICKY SCROLL SECTION (220vh Pinning Track)
          ======================================================== */}
      <div ref={trackRef} className="relative h-[220vh] w-full">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
          {/* Centered Celestial Sphere (Scales & transforms with Apple inertia) */}
          <motion.div
            style={{
              scale: planetScale,
              y: planetY,
              opacity: planetOpacity,
            }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
          >
            <HeroPlanet />
          </motion.div>

          {/* STAGE 1: Opening Fold (Title & Program Identity) */}
          <motion.div
            style={{
              opacity: titleOpacity,
              y: titleY,
              scale: titleScale,
            }}
            className="relative z-10 flex flex-col items-center justify-center text-center select-none px-4 max-w-2xl mt-48 sm:mt-56"
          >
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">
              Tentative
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono tracking-widest uppercase mt-3">
              Group Scheduling in Perfect Orbit
            </p>
          </motion.div>

          {/* Minimal Scroll Cue Button */}
          <motion.button
            onClick={scrollToMenu}
            style={{ opacity: scrollPromptOpacity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center space-y-1.5 text-xs font-mono text-zinc-500 hover:text-white transition-colors cursor-pointer group"
          >
            <span className="text-[11px] tracking-wider uppercase text-zinc-500 group-hover:text-zinc-300">
              Scroll to explore
            </span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            </motion.div>
          </motion.button>

          {/* STAGE 2: Main Menu Hub (Revealed smoothly on Apple scroll) */}
          <motion.div
            style={{
              opacity: menuOpacity,
              y: menuY,
              scale: menuScale,
            }}
            className="absolute z-20 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-3xl mx-auto space-y-8 pointer-events-auto"
          >
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]">
                Schedule meetings without the back-and-forth.
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal max-w-xl mx-auto">
                Create an event, share an unguessable link, and overlay everyone’s availability into an instant weekly timetable heatmap.
              </p>
            </div>

            {/* High-Contrast Monochrome CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to={user ? '/create' : '/login'}
                  className="px-8 py-3.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.45)] flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <span>{user ? 'Host a New Orbit' : 'Host an Orbit'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/share/demo-orbit-2026/heatmap"
                  className="px-7 py-3.5 rounded-full text-xs font-semibold glass-card text-white hover:bg-white/10 border border-zinc-700 flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>View Weekly Schedule Demo</span>
                </Link>
              </motion.div>

              {user && (
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/events"
                    className="px-6 py-3.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    My Events
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ========================================================
          POST-SCROLL SECTIONS (Natural Document Flow)
          ======================================================== */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
        {/* Apple Vision Pro Glass Feature Trio */}
        <section className="space-y-8 text-center">
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-xs uppercase tracking-widest font-mono text-zinc-400 font-bold">
              Precision Coordination
            </h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Engineered for seamless group alignment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="glass-card p-6 rounded-2xl border border-zinc-800 space-y-3"
            >
              <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">
                <Zap className="w-4 h-4 text-black" />
              </div>
              <h4 className="text-base font-bold text-white">Timetable Heatmap</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Collegiate weekly schedule layout overlays responses into an instant monochrome alignment matrix with zero calendar leakage.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-card p-6 rounded-2xl border border-zinc-800 space-y-3"
            >
              <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">
                <Lock className="w-4 h-4 text-black" />
              </div>
              <h4 className="text-base font-bold text-white">Zero-Password Auth</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hosts log in seamlessly via 6-digit SMS codes with Fernet 256-bit phone encryption. Invitees respond in seconds without accounts.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-card p-6 rounded-2xl border border-zinc-800 space-y-3"
            >
              <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">
                <Share2 className="w-4 h-4 text-black" />
              </div>
              <h4 className="text-base font-bold text-white">Cryptographic URLs</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Unguessable 16-byte tokens with automatic semester expiry. Rotate links with one click if shared outside your group.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Live Weekly Timetable Schedule Preview (Direct Reference to User's Uploaded Schedule) */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="glass-panel p-6 sm:p-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Weekly Course-Style Schedule Preview</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Collegiate calendar layout with continuous meeting block cards</p>
              </div>
            </div>

            <Link
              to="/share/demo-orbit-2026/heatmap"
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <span>Explore Live Demo</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </Link>
          </div>

          {/* Mini Interactive Timetable Schedule Grid */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-black">
            <div className="min-w-[620px]">
              {/* Header Bar Across All Days */}
              <div className="flex items-stretch bg-zinc-900 border-b border-zinc-800">
                <div className="w-20 shrink-0 p-2.5 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-800">
                  Time
                </div>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                  <div
                    key={day}
                    className="flex-1 py-2.5 px-2 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-zinc-800 last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Sample Timetable Rows */}
              <div className="flex flex-col">
                {/* 9:00 AM Row */}
                <div className="flex items-stretch border-t border-zinc-800/80 bg-zinc-950/40">
                  <div className="w-20 shrink-0 pr-3 py-2 text-right border-r border-zinc-800/80 text-[11px] font-mono font-bold text-white">
                    9:00 am
                  </div>
                  <div className="flex-1 p-1 border-r border-zinc-800/80">
                    <div className="h-full py-1.5 px-2 rounded bg-zinc-900 border-l-4 border-white text-[11px] font-semibold text-white flex items-center justify-between">
                      <span>CS 3354 Sync</span>
                      <span className="text-[10px] text-zinc-400 font-mono">7/8</span>
                    </div>
                  </div>
                  <div className="flex-1 p-1 border-r border-zinc-800/80" />
                  <div className="flex-1 p-1 border-r border-zinc-800/80">
                    <div className="h-full py-1.5 px-2 rounded bg-zinc-900 border-l-4 border-white text-[11px] font-semibold text-white flex items-center justify-between">
                      <span>CS 3354 Sync</span>
                      <span className="text-[10px] text-zinc-400 font-mono">7/8</span>
                    </div>
                  </div>
                  <div className="flex-1 p-1 border-r border-zinc-800/80" />
                  <div className="flex-1 p-1">
                    <div className="h-full py-1.5 px-2 rounded bg-zinc-900 border-l-4 border-white text-[11px] font-semibold text-white flex items-center justify-between">
                      <span>CS 3354 Sync</span>
                      <span className="text-[10px] text-zinc-400 font-mono">7/8</span>
                    </div>
                  </div>
                </div>

                {/* 11:00 AM Row */}
                <div className="flex items-stretch border-t border-zinc-800/80 bg-black">
                  <div className="w-20 shrink-0 pr-3 py-2 text-right border-r border-zinc-800/80 text-[11px] font-mono text-zinc-400">
                    11:00 am
                  </div>
                  <div className="flex-1 p-1 border-r border-zinc-800/80" />
                  <div className="flex-1 p-1 border-r border-zinc-800/80">
                    <div className="h-full py-1.5 px-2 rounded bg-zinc-800/80 border-l-4 border-zinc-400 text-[11px] font-semibold text-zinc-200 flex items-center justify-between">
                      <span>Study Group</span>
                      <span className="text-[10px] text-zinc-400 font-mono">5/8</span>
                    </div>
                  </div>
                  <div className="flex-1 p-1 border-r border-zinc-800/80" />
                  <div className="flex-1 p-1 border-r border-zinc-800/80">
                    <div className="h-full py-1.5 px-2 rounded bg-zinc-800/80 border-l-4 border-zinc-400 text-[11px] font-semibold text-zinc-200 flex items-center justify-between">
                      <span>Study Group</span>
                      <span className="text-[10px] text-zinc-400 font-mono">5/8</span>
                    </div>
                  </div>
                  <div className="flex-1 p-1" />
                </div>

                {/* 2:00 PM Row (Peak Consensus - Star Overlap) */}
                <div className="flex items-stretch border-t border-zinc-800/80 bg-zinc-950/60">
                  <div className="w-20 shrink-0 pr-3 py-2 text-right border-r border-zinc-800/80 text-[11px] font-mono font-bold text-white">
                    2:00 pm
                  </div>
                  <div className="flex-1 p-1 border-r border-zinc-800/80" />
                  <div className="flex-1 p-1 border-r border-zinc-800/80" />
                  <div className="flex-1 p-1 border-r border-zinc-800/80">
                    <div className="h-full py-2 px-2.5 rounded bg-white text-black text-xs font-bold shadow-[0_0_15px_rgba(255,255,255,0.7)] flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-black" />
                        <span>Best Window</span>
                      </div>
                      <span className="font-mono text-[11px] font-extrabold">8/8 ★</span>
                    </div>
                  </div>
                  <div className="flex-1 p-1 border-r border-zinc-800/80" />
                  <div className="flex-1 p-1" />
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};
