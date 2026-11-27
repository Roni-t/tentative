import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { PlanetLogo } from '../components/PlanetLogo';
import { afterAuthPath } from '../utils/createDraft';
import { DevSmsBanner } from '../components/DevSmsBanner';
import { CodeEntry } from '../components/auth/CodeEntry';
import { AuthOutcome, Outcome } from '../components/auth/AuthOutcome';
import { LegalNote, PrivacyLink } from '../components/LegalLinks';
import { Phone, ArrowRight, Lock } from 'lucide-react';

const inputClass =
  'w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:border-white focus:ring-1 focus:ring-white transition-all';
const primaryButton =
  'w-full py-3 rounded-2xl text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer';

/** UC-2: Login — phone number lookup, verify via SMS code, then a session is started. */
export const LoginPage: React.FC = () => {
  const location = useLocation();
  const prefillPhone = (location.state as { phone?: string } | null)?.phone ?? '';
  // Keeps ?next= when switching between log in and create account
  const next = new URLSearchParams(location.search).get('next');
  const keepNext = location.search;

  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState(prefillPhone);
  const [code, setCode] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [codeRejected, setCodeRejected] = useState(false);

  const { login, pollDevCode, clearDevNotice, sessionEnded } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const noAccount = (message: string): Outcome => ({
    title: "We couldn't find that number",
    message,
    action: { label: 'Create an account', onClick: () => navigate(`/register${keepNext}`, { state: { phone } }) },
  });

  const sendCode = async () => {
    const res = await api.loginRequestCode(phone);
    setMaskedPhone(res.phone_masked);
    setExpiresAt(Date.now() + res.expires_in_seconds * 1000);
    setCode('');
    await pollDevCode(phone);
  };

  const handleSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutcome(null);
    setLoading(true);
    try {
      await sendCode();
      setStep('verify');
    } catch (err: any) {
      setOutcome(
        err.status === 404
          ? noAccount(err.message)
          : { title: "We couldn't send a code", message: err.message || 'Please check the number and try again.' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOutcome(null);
    setResending(true);
    try {
      await sendCode();
      showToast('A new code is on its way.', 'info');
    } catch (err: any) {
      setOutcome(err.status === 404 ? noAccount(err.message) : { title: "We couldn't send a code", message: err.message });
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutcome(null);
    setLoading(true);
    try {
      const user = await login(phone, code, keepSignedIn);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate(afterAuthPath(next));
    } catch (err: any) {
      setCode('');
      setCodeRejected(err.status !== 404 && err.status !== 409);
      setOutcome(
        err.status === 404
          ? noAccount(err.message)
          : {
              title: "That code didn't work",
              message: err.message || 'The code doesn’t match or has expired.',
              action: { label: 'Request new code', onClick: handleResend },
            }
      );
    } finally {
      setLoading(false);
    }
  };

  const backToPhone = () => {
    setStep('phone');
    setCode('');
    setOutcome(null);
    clearDevNotice();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          >
            <PlanetLogo size={52} className="mx-auto" isSpinning={loading} />
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Log in</h2>
          <p className="text-xs text-zinc-400">
            {step === 'phone' ? 'Step 1 of 2: Sign in with your phone number' : 'Step 2 of 2: Enter code'}
          </p>
        </div>

        {sessionEnded && (
          <p role="status" className="text-xs text-center text-zinc-300 glass-card rounded-2xl px-4 py-3">
            Your session ended. Log in again to continue.
          </p>
        )}

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden space-y-4">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleSubmitPhone}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Phone number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(972) 555-0142"
                      required
                      autoFocus
                      aria-describedby="phone-privacy"
                      className={inputClass}
                    />
                  </div>
                  <LegalNote id="phone-privacy" className="mt-2.5">
                    <PrivacyLink />
                  </LegalNote>
                </div>

                <button type="submit" disabled={loading} className={primaryButton}>
                  <span>{loading ? 'Sending code…' : 'Text me a code'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="verify"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleVerify}
                className="space-y-4"
              >
                <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-white">Account found</p>
                    <p className="text-zinc-400 font-mono">{maskedPhone}</p>
                  </div>
                  <button type="button" onClick={backToPhone} className="text-white font-semibold hover:underline cursor-pointer">
                    Use a different number
                  </button>
                </div>

                <CodeEntry
                  code={code}
                  onChange={(value) => {
                    setCode(value);
                    setCodeRejected(false);
                  }}
                  invalid={codeRejected}
                  expiresAt={expiresAt}
                  maskedPhone={maskedPhone}
                  onResend={handleResend}
                  resending={resending}
                  disabled={loading}
                />

                <label className="flex items-start space-x-2.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="mt-0.5 accent-white"
                  />
                  <span>
                    Keep me signed in
                    <span className="block text-[11px] text-zinc-500">
                      {keepSignedIn ? 'Your session stays active on this device for 7 days.' : 'You’ll be signed out after 12 hours or when you close the browser.'}
                    </span>
                  </span>
                </label>

                <p className="flex items-start space-x-2 text-[11px] text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-px" />
                  <span>No password needed. Never share this code with anyone. After 3 incorrect attempts you'll need to request a new code.</span>
                </p>

                <button type="submit" disabled={loading || code.length < 6} className={primaryButton}>
                  <span>{loading ? 'Logging in…' : 'Log in'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {outcome && <AuthOutcome outcome={outcome} />}

          <div className="pt-4 border-t border-white/10 text-center text-xs text-zinc-400">
            New to Tentative?{' '}
            <Link to={`/register${keepNext}`} state={{ phone }} className="text-white hover:underline font-semibold transition-colors">
              Create an account
            </Link>
          </div>
        </div>

        {step === 'verify' && <DevSmsBanner onFillCode={setCode} />}
      </div>
    </div>
  );
};
