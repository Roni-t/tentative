import React from 'react';
import { Link } from 'react-router-dom';
import { HeroPlanet } from '../components/HeroPlanet';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Clock, Lock, Users } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'No account needed to respond',
    text: 'Invitees open their personal link and paint when they are free. They can add a phone number afterward if they want a text.',
  },
  {
    icon: Clock,
    title: 'See the best time right away',
    text: 'Every response goes into one heatmap that shows when the most people are free.',
  },
  {
    icon: Lock,
    title: 'Private by default',
    text: 'Phone numbers are encrypted, and hosts only see who can be texted, never the numbers.',
  },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="w-full">
      <section className="flex flex-col items-center text-center px-4 pt-10 pb-16 sm:pt-16">
        <HeroPlanet />
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mt-6">Tentative</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-3 max-w-md">
          Find a time that works for everyone. Share a link, collect availability, pick the best slot.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link
            to={user ? '/create' : '/login'}
            className="px-6 py-3 rounded-full text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center space-x-2"
          >
            <span>{user ? 'Create an event' : 'Get started'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/share/demo-orbit-2026/heatmap"
            className="px-6 py-3 rounded-full text-sm font-semibold text-zinc-200 border border-white/20 hover:bg-white/10 transition-colors"
          >
            View demo heatmap
          </Link>
          {user && (
            <Link
              to="/events"
              className="px-6 py-3 rounded-full text-sm font-semibold text-zinc-200 border border-white/20 hover:bg-white/10 transition-colors"
            >
              My events
            </Link>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-20 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass-card p-6 rounded-2xl space-y-3">
            <Icon className="w-5 h-5 text-white" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
