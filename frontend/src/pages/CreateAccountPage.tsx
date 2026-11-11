import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { PlanetLogo } from '../components/PlanetLogo';
import { DevSmsBanner } from '../components/DevSmsBanner';
import { User, Phone, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

export const CreateAccountPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('Ronit Dhaliwal');
  const [phone, setPhone] = useState('+1 (972) 555-0142');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

  const { login, pollDevCode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      const res = await api.requestCode(phone, name);
      setMaskedPhone(res.phone_masked);
      setStep(2);
      showToast('Verification code dispatched via SMS', 'info');
      await pollDevCode(phone);
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch verification code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const user = await login(phone, code, name);
      showToast(`Account created! Welcome, ${user.name}!`, 'success');
      navigate('/events');
    } catch (err: any) {
      showToast(err.message || 'Invalid or expired verification code', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          >
            <PlanetLogo size={52} className="mx-auto" isSpinning={loading} />
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {step === 1 ? 'Create Host Account' : 'Verify Your Phone Number'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 1
              ? 'Required to create and manage events. Invitees do not need an account.'
              : `Step 2 of 2: We sent a 6-digit code to ${maskedPhone || phone}`}
          </p>
        </div>

        {/* Card with step transition */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleRequestCode}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ronit Dhaliwal"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:border-cosmic-purple focus:ring-1 focus:ring-cosmic-purple transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (972) 555-0142"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:border-cosmic-purple focus:ring-1 focus:ring-cosmic-purple transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cosmic-cyan shrink-0" />
                    <span>Phone number is encrypted at rest using 256-bit Fernet cipher.</span>
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.35)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Sending code...' : 'Continue with SMS Code'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleVerifyCode}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-lg font-mono tracking-widest text-center focus:border-cosmic-purple focus:ring-1 focus:ring-cosmic-purple transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>Valid for 5 minutes</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setCode('');
                      }}
                      className="text-cosmic-cyan hover:underline cursor-pointer"
                    >
                      Change phone
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full py-3 rounded-2xl text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.35)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Creating account...' : 'Create Account & Enter'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cosmic-purple hover:text-cosmic-cyan font-semibold transition-colors">
              Sign in
            </Link>
          </div>
        </div>

        <DevSmsBanner onFillCode={(c) => setCode(c)} />
      </div>
    </div>
  );
};
