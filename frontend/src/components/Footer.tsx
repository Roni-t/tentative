import React from 'react';
import { Link } from 'react-router-dom';
import { PlanetLogo } from './PlanetLogo';
import { Bug, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-zinc-800 bg-black/90 backdrop-blur-md py-8 px-4 sm:px-8 text-xs text-zinc-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <PlanetLogo size={20} />
          <span className="font-semibold text-white">Tentative</span>
          <span className="text-zinc-600">·</span>
          <span>Fostering Community Anywhere in the Galaxy</span>
        </div>

        <div className="flex items-center space-x-6 text-zinc-400">
          <div className="flex items-center space-x-1.5 text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Orbits Online</span>
          </div>
          <Link to="/bug-report" className="hover:text-white flex items-center space-x-1 transition-colors">
            <Bug className="w-3.5 h-3.5" />
            <span>Report Bug</span>
          </Link>
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white flex items-center space-x-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>OpenAPI Docs</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
