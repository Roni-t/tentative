import React from 'react';
import { Link } from 'react-router-dom';
import { PlanetLogo } from '../components/PlanetLogo';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 text-center space-y-6">
        <PlanetLogo size={56} className="mx-auto" />
        <div className="space-y-2">
          <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cosmic-purple to-cosmic-pink">
            404
          </div>
          <h1 className="text-2xl font-bold text-white">Lost in Deep Space</h1>
          <p className="text-xs text-slate-400">
            The page or celestial orbit you are looking for does not exist or has drifted away.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Safety</span>
        </Link>
      </div>
    </div>
  );
};
