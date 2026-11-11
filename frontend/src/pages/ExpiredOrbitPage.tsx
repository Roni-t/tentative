import React from 'react';
import { Link } from 'react-router-dom';
import { PlanetLogo } from '../components/PlanetLogo';
import { Compass, PlusCircle, ArrowLeft } from 'lucide-react';

export const ExpiredOrbitPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl">
        <PlanetLogo size={64} className="mx-auto opacity-70" />

        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-widest text-cosmic-pink">
            Link Inactive
          </div>
          <h1 className="text-3xl font-extrabold text-white">This orbit has ended</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The shareable link for this event has reached its expiration date or was rotated by the host.
            If you need to view or modify your response, please contact the meeting organizer for an updated link.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold glass-card text-white hover:bg-white/10 flex items-center justify-center space-x-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </Link>
          <Link
            to="/create"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center justify-center space-x-1.5 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-black" />
            <span>Host New Orbit</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
