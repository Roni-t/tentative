import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-white/10 py-6 px-4 sm:px-8 text-xs text-zinc-500">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>Tentative, group scheduling</span>
        <div className="flex items-center space-x-5">
          <Link to="/bug-report" className="hover:text-white transition-colors">
            Report a bug
          </Link>
          <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            API docs
          </a>
        </div>
      </div>
    </footer>
  );
};
