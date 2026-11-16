import React, { useEffect, useState } from 'react';
import { KeyRound, RefreshCw } from 'lucide-react';

interface CodeEntryProps {
  code: string;
  onChange: (code: string) => void;
  /** Epoch ms when the current code stops working. */
  expiresAt: number | null;
  maskedPhone: string;
  onResend: () => void;
  resending: boolean;
  disabled?: boolean;
}

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** 6-digit SMS code input with a live expiry countdown and a resend link. */
export const CodeEntry: React.FC<CodeEntryProps> = ({
  code,
  onChange,
  expiresAt,
  maskedPhone,
  onResend,
  resending,
  disabled,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = expiresAt ? expiresAt - now : 0;
  const expired = expiresAt !== null && remaining <= 0;

  return (
    <div>
      <label htmlFor="sms-code" className="block text-xs font-semibold text-zinc-300 mb-1.5">
        Enter the 6-digit code we texted to <span className="font-mono text-white">{maskedPhone}</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
          <KeyRound className="w-4 h-4" />
        </div>
        <input
          id="sms-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          required
          autoFocus
          disabled={disabled || expired}
          aria-describedby="sms-code-status"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 text-lg font-mono tracking-[0.5em] text-center focus:border-white focus:ring-1 focus:ring-white transition-all disabled:opacity-50"
        />
      </div>
      <div id="sms-code-status" className="flex items-center justify-between text-[11px] text-zinc-400 mt-2" aria-live="polite">
        <span>
          {expired ? (
            <span className="text-red-300">Code expired. Request a new one.</span>
          ) : (
            <>Code expires in <span className="font-mono text-zinc-200">{formatRemaining(remaining)}</span></>
          )}
        </span>
        <span>
          Didn't get it?{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="text-white font-semibold hover:underline inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Sending…' : 'Resend code'}</span>
          </button>
        </span>
      </div>
    </div>
  );
};
