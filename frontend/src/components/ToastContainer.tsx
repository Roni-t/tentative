import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto p-3.5 rounded-2xl glass-panel shadow-2xl border flex items-center space-x-3 ${
              toast.type === 'success'
                ? 'border-emerald-500/40 bg-zinc-900/95 text-emerald-200'
                : toast.type === 'error'
                ? 'border-red-500/40 bg-zinc-900/95 text-red-200'
                : 'border-zinc-700 bg-zinc-900/95 text-zinc-200'
            }`}
          >
            <div className="shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-white" />}
            </div>
            <div className="text-xs font-medium flex-1">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
