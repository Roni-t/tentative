import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight } from 'lucide-react';

export interface Outcome {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

/** Inline alternate-state panel (e.g. "This number already has an account"). */
export const AuthOutcome: React.FC<{ outcome: Outcome }> = ({ outcome }) => (
  <motion.div
    role="alert"
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3.5 text-xs"
  >
    <div className="flex items-start space-x-2.5">
      <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-white">{outcome.title}</p>
        <p className="text-zinc-300 leading-relaxed">{outcome.message}</p>
        {outcome.action && (
          <button
            type="button"
            onClick={outcome.action.onClick}
            className="mt-1.5 inline-flex items-center space-x-1 rounded-xl bg-white px-3 py-1.5 font-bold text-black hover:bg-zinc-200 cursor-pointer"
          >
            <span>{outcome.action.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  </motion.div>
);
