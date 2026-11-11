import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquareCode, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface DevSmsBannerProps {
  onFillCode?: (code: string) => void;
}

export const DevSmsBanner: React.FC<DevSmsBannerProps> = ({ onFillCode }) => {
  const { devNotice } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!devNotice) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(devNotice.code);
    setCopied(true);
    showToast(`Verification code ${devNotice.code} copied!`, 'info');
    if (onFillCode) {
      onFillCode(devNotice.code);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm glass-panel p-3.5 rounded-2xl border border-cosmic-purple/50 bg-space-850/90 shadow-2xl backdrop-blur-xl animate-float">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-xl bg-cosmic-purple/20 text-cosmic-purple flex items-center justify-center shrink-0">
          <MessageSquareCode className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-cosmic-cyan">Dev SMS Dispatch</span>
            <span className="text-[10px] text-slate-400 font-mono">{devNotice.remaining_seconds}s</span>
          </div>
          <div className="text-xs text-slate-300 mt-0.5 truncate">
            Code for <span className="font-mono text-white">{devNotice.phone_masked}</span>:
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-base font-extrabold tracking-widest font-mono text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
              {devNotice.code}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs px-2.5 py-1 rounded-lg bg-cosmic-purple/30 hover:bg-cosmic-purple/50 text-white flex items-center space-x-1 border border-cosmic-purple/40 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{onFillCode ? 'Use code' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
