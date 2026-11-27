import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 mt-auto px-4 sm:px-8 pb-8">
      <div className="hairline mb-6" />
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="eyebrow">tentative / group scheduling</span>
        <div className="flex items-center space-x-6 text-xs text-zinc-500">
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
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
