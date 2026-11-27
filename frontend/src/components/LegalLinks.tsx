import React from 'react';
import { Link } from 'react-router-dom';

// Small, quiet links to the policy pages. They open in a new tab so a half-filled form isn't lost.
const linkClass = 'underline decoration-zinc-600 underline-offset-2 hover:text-zinc-300 hover:decoration-zinc-400 transition-colors';

export const PrivacyLink: React.FC<{ children?: React.ReactNode }> = ({ children = 'Privacy policy' }) => (
  <Link to="/privacy" target="_blank" rel="noopener" className={linkClass}>
    {children}
  </Link>
);

export const TermsLink: React.FC<{ children?: React.ReactNode }> = ({ children = 'Terms' }) => (
  <Link to="/terms" target="_blank" rel="noopener" className={linkClass}>
    {children}
  </Link>
);

export const LegalNote: React.FC<{ id?: string; className?: string; children: React.ReactNode }> = ({ id, className = '', children }) => (
  <p id={id} className={`text-[11px] leading-relaxed text-zinc-500 ${className}`}>
    {children}
  </p>
);
