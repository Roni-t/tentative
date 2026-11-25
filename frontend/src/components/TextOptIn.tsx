import React, { useState } from 'react';
import { api } from '../api/client';
import { CodeEntry } from './auth/CodeEntry';

interface TextOptInProps {
  editToken: string;
  onDone: () => void;
}

// Shown after someone saves their availability. They can give a phone number to get a text when the time is set.
export const TextOptIn: React.FC<TextOptInProps> = ({ editToken, onDone }) => {
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.requestInviteePhoneCode(editToken, phone);
      setMaskedPhone(res.phone_masked);
      setExpiresAt(Date.now() + res.expires_in_seconds * 1000);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Could not send the code');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.verifyInviteePhone(editToken, phone, code);
      setMessage(res.message);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'That code did not work');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-5">
        {step === 'phone' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-lg font-bold text-white">Your availability is saved</h2>
              <p className="text-xs text-zinc-400 mt-1">Want a text when the time is set?</p>
            </div>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(972) 555-0142"
              className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm"
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <div className="flex items-center justify-between">
              <button type="button" onClick={onDone} className="text-xs text-zinc-400 hover:text-white cursor-pointer">
                No thanks
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
              >
                {busy ? 'Sending...' : 'Text me a code'}
              </button>
            </div>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verify} className="space-y-4">
            <CodeEntry
              code={code}
              onChange={setCode}
              expiresAt={expiresAt}
              maskedPhone={maskedPhone}
              onResend={sendCode}
              resending={busy}
              disabled={busy}
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full px-5 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Checking...' : 'Confirm'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <p className="text-sm text-white">{message}</p>
            <button
              onClick={onDone}
              className="px-5 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 cursor-pointer"
            >
              See the heatmap
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
