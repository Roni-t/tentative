import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { afterAuthPath } from '../utils/createDraft';
import { PlanetLogo } from '../components/PlanetLogo';
import { DevSmsBanner } from '../components/DevSmsBanner';
import { CodeEntry } from '../components/auth/CodeEntry';
import { AuthOutcome, Outcome } from '../components/auth/AuthOutcome';
import { User, Phone, ArrowRight, Lock } from 'lucide-react';

const inputClass =
  'w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:border-white focus:ring-1 focus:ring-white transition-all';
const primaryButton =
  'w-full py-3 rounded-2xl text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer';

/** UC-1: Account creation — name + phone, verify via SMS code, then the account is stored. */
export const CreateAccountPage: React.FC = () => {
  const location = useLocation();
  const prefillPhone = (location.state as { phone?: string } | null)?.phone ?? '';

  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(prefillPhone);
  const [code, setCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const { register, pollDevCode, clearDevNotice } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const alreadyRegistered = (message: string): Outcome => ({
    title: 'This number already has an account',
    message,
    action: { label: 'Log in instead', onClick: () => navigate('/login', { state: { phone } }) },
  });

  const sendCode = async () => {
    const res = await api.registerRequestCode(name, phone);
    setMaskedPhone(res.phone_masked);
    setExpiresAt(Date.now() + res.expires_in_seconds * 1000);
    setCode('');
    await pollDevCode(phone);
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutcome(null);
    setLoading(true);
    try {
      await sendCode();
      setStep('verify');
    } catch (err: any) {
      setOutcome(
        err.status === 409
          ? alreadyRegistered(err.message)
          : { title: "We couldn't send a code", message: err.message || 'Please check your details and try again.' }
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
      setOutcome({ title: "We couldn't send a code", message: err.message || 'Please try again.' });
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutcome(null);
    setLoading(true);
    try {
      const user = await register(name, phone, code);
      showToast(`You're all set, ${user.name}!`, 'success');
      navigate(afterAuthPath());
    } catch (err: any) {
      setCode('');
      setOutcome(
        err.status === 409
          ? alreadyRegistered(err.message)
          : {
              title: "That code didn't work",
              message: err.message || 'The code doesn’t match or has expired.',
              action: { label: 'Resend code', onClick: handleResend },
            }
      );
    } finally {
      setLoading(false);
    }
  };

  const backToDetails = () => {
    setStep('details');
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
          <h2 className="text-2xl font-bold tracking-tight text-white">Create your account</h2>
          <p className="text-xs text-zinc-400">
            {step === 'details'
              ? 'Step 1 of 2: Your details. Hosts need an account; invitees can respond without one.'
              : 'Step 2 of 2: Verify your phone number'}
          </p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden space-y-4">
          <AnimatePresence mode="wait">
            {step === 'details' ? (
              <motion.form
                key="details"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleSubmitDetails}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="full-name" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="full-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kaelan Nguyen"
                      maxLength={128}
                      required
                      autoFocus={!prefillPhone}
                      className={inputClass}
                    />
                  </div>
                </div>

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
                      className={inputClass}
                    />
                  </div>
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
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{name.trim()}</p>
                    <p className="text-zinc-400 font-mono">{maskedPhone}</p>
                  </div>
                  <button type="button" onClick={backToDetails} className="text-white font-semibold hover:underline cursor-pointer">
                    Edit
                  </button>
                </div>

                <CodeEntry
                  code={code}
                  onChange={setCode}
                  expiresAt={expiresAt}
                  maskedPhone={maskedPhone}
                  onResend={handleResend}
                  resending={resending}
                  disabled={loading}
                />

                <p className="flex items-start space-x-2 text-[11px] text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-px" />
                  <span>
                    Your phone number is encrypted before it's saved. It's only used to sign you in and send event
                    invites. Your account isn't created until you verify.
                  </span>
                </p>

                <button type="submit" disabled={loading || code.length < 6} className={primaryButton}>
                  <span>{loading ? 'Creating account…' : 'Verify & create account'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {outcome && <AuthOutcome outcome={outcome} />}

          <div className="pt-4 border-t border-white/10 text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <Link to="/login" state={{ phone }} className="text-white hover:underline font-semibold transition-colors">
              Log in
            </Link>
          </div>
        </div>

        {step === 'verify' && <DevSmsBanner onFillCode={setCode} />}
      </div>
    </div>
  );
};
