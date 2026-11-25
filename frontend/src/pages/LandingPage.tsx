import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { CometTrail } from '../components/CometTrail';
import { HeroPlanet } from '../components/HeroPlanet';
import { Reveal } from '../components/Reveal';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    number: '01',
    title: 'Make an event',
    text: 'Pick the days you might meet and the hours that work. It takes about a minute.',
  },
  {
    number: '02',
    title: 'Send each person a link',
    text: 'Every invitee gets their own link. They paint when they are free. No account needed.',
  },
  {
    number: '03',
    title: 'Pick the best time',
    text: 'One heatmap shows when the most people are free. Lock it in and everyone is told.',
  },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  // The planet drifts up and softens as you scroll past the first screen
  const { scrollYProgress } = useScroll();
  const planetY = useTransform(scrollYProgress, [0, 0.25], [0, -70]);
  const planetScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.9]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="w-full">
      <CometTrail />
      <section className="relative min-h-[calc(100vh-4.5rem)] flex flex-col items-center justify-center text-center px-4">
        <motion.div style={{ y: planetY, scale: planetScale }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroPlanet />
          </motion.div>
        </motion.div>

        <motion.div style={{ opacity: heroOpacity }} className="flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl sm:text-8xl lg:text-9xl font-semibold text-white tracking-[-0.05em] leading-none mt-4"
          >
            Tentative
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="eyebrow mt-6 !text-xs sm:!text-sm"
          >
            Group scheduling in perfect orbit
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center justify-center gap-3 mt-10"
          >
            <Link to={user ? '/create' : '/login'} className="pill pill-light">
              <span>{user ? 'Create an event' : 'Get started'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/share/demo-orbit-2026/heatmap" className="pill pill-dark">
              View demo heatmap
            </Link>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-8 eyebrow">Scroll</div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-28">
        <Reveal>
          <div className="flex items-center gap-4">
            <span className="eyebrow !text-emerald-300/80">01</span>
            <span className="hairline w-10" />
            <span className="eyebrow">How it works</span>
          </div>
          <h2 className="display-serif text-5xl sm:text-6xl text-white mt-6 max-w-2xl leading-[1.05]">
            Find a time without the group chat.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.12}>
              <div className="glass-card rounded-3xl p-7 h-full">
                <span className="font-mono text-xs text-zinc-500">{step.number}</span>
                <h3 className="text-xl font-semibold text-white mt-10">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mt-3">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-28">
        <div className="hairline mb-28" />
        <Reveal>
          <div className="flex items-center gap-4">
            <span className="eyebrow !text-emerald-300/80">02</span>
            <span className="hairline w-10" />
            <span className="eyebrow">Private by default</span>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-6">
          <Reveal>
            <h2 className="display-serif text-5xl sm:text-6xl text-white leading-[1.05]">
              Your guests never need an account.
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="space-y-6 text-zinc-400 leading-relaxed md:pt-3">
              <p>
                Invitees respond from their personal link and can come back to edit it. If they want a text when the
                time is set, they can add a phone number and verify it.
              </p>
              <p>
                Phone numbers are encrypted. As the host you see who can be texted, never the numbers themselves.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-32 text-center">
        <Reveal>
          <h2 className="text-4xl sm:text-6xl font-semibold text-white tracking-[-0.04em]">Ready when you are.</h2>
          <div className="flex justify-center gap-3 mt-10">
            <Link to={user ? '/create' : '/login'} className="pill pill-light">
              <span>{user ? 'Create an event' : 'Get started'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
