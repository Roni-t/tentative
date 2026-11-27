import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const LENGTH = 6;
// After a code is sent, wait this long before offering another one
const RESEND_COOLDOWN_MS = 30_000;

interface CodeEntryProps {
  code: string;
  onChange: (code: string) => void;
  /** Epoch ms when the current code stops working. A new value means a new code was sent. */
  expiresAt: number | null;
  maskedPhone: string;
  onResend: () => void;
  resending: boolean;
  disabled?: boolean;
  /** The last code entered was wrong. Shown in red until the person edits it. */
  invalid?: boolean;
}

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * 6-digit SMS code entry shown as one box per digit (DEV-162).
 *
 * A single real input sits invisibly over the boxes. That keeps phone autofill (autocomplete="one-time-code")
 * and pasting the whole code working, since both fill one field, while the boxes show each digit and
 * move the highlight to the next empty one as you type.
 */
export const CodeEntry: React.FC<CodeEntryProps> = ({
  code,
  onChange,
  expiresAt,
  maskedPhone,
  onResend,
  resending,
  disabled,
  invalid,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const [focused, setFocused] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + RESEND_COOLDOWN_MS);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // A new expiry means a new code went out: restart the resend cooldown and start typing again
  useEffect(() => {
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
    inputRef.current?.focus();
  }, [expiresAt]);

  // After a wrong code, put the cursor back so they can just type the right one
  useEffect(() => {
    if (invalid && !disabled) inputRef.current?.focus();
  }, [invalid, disabled]);

  const remaining = expiresAt ? expiresAt - now : 0;
  const expired = expiresAt !== null && remaining <= 0;
  const cooldown = expired ? 0 : cooldownUntil - now;
  const locked = disabled || expired;
  const activeIndex = Math.min(code.length, LENGTH - 1);

  const boxClass = (i: number) => {
    const base =
      'h-12 sm:h-14 rounded-xl border flex items-center justify-center font-mono text-xl text-white transition-colors';
    if (invalid) return `${base} border-red-400/70 bg-red-500/10`;
    if (focused && !locked && i === activeIndex) return `${base} border-white bg-white/10 ring-1 ring-white`;
    if (code[i]) return `${base} border-white/30 bg-white/5`;
    return `${base} border-white/10 bg-white/[0.03]`;
  };

  return (
    <div>
      <label htmlFor="sms-code" className="block text-xs font-semibold text-zinc-300 mb-2">
        Enter the 6-digit code we texted to <span className="font-mono text-white">{maskedPhone}</span>
      </label>

      <div className={`relative ${locked ? 'opacity-50' : ''}`}>
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2" aria-hidden="true">
          {Array.from({ length: LENGTH }, (_, i) => (
            <div key={i} className={boxClass(i)}>
              {code[i] ??
                (focused && !locked && i === activeIndex ? <span className="w-px h-6 bg-white animate-pulse" /> : '')}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          id="sms-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          value={code}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, LENGTH))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          autoFocus
          disabled={locked}
          aria-invalid={invalid || undefined}
          aria-describedby="sms-code-status"
          // Invisible but still the real field, so autofill, paste and screen readers all use it
          className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-transparent selection:bg-transparent outline-none cursor-text text-base"
        />
      </div>

      <div
        id="sms-code-status"
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-zinc-400 mt-2.5"
        aria-live="polite"
      >
        <span>
          {/* A wrong code turns the boxes red; the page's own message explains it */}
          {expired ? (
            <span className="text-red-300">Code expired. Request a new one.</span>
          ) : (
            <>
              Code expires in <span className="font-mono text-zinc-200">{formatRemaining(remaining)}</span>
            </>
          )}
        </span>
        <span>
          Didn't get it?{' '}
          {cooldown > 0 ? (
            <span className="text-zinc-500">
              Resend in <span className="font-mono">{formatRemaining(cooldown)}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="text-white font-semibold hover:underline inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Sending…' : 'Resend code'}</span>
            </button>
          )}
        </span>
      </div>
    </div>
  );
};
