import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { PlanetLogo } from '../components/PlanetLogo';
import { DevSmsBanner } from '../components/DevSmsBanner';
import { Phone, KeyRound, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('+1 (972) 555-0142');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

  const { login, pollDevCode } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await api.requestCode(phone);
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
      const user = await login(phone, code);
      showToast(`Welcome back, ${user.name}!`, 'success');
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
          <PlanetLogo size={48} className="mx-auto" />
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {step === 1 ? 'Sign in to Tentative' : 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 1
              ? 'Passwordless authentication via 6-digit SMS code'
              : `We sent a code to ${maskedPhone || phone}`}
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
          {step === 1 ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
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
                  <span>Encrypted at rest with Fernet. Used strictly for signing in.</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-cosmic-purple to-cosmic-cyan text-white shadow-glow-sm hover:shadow-glow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Sending code...' : 'Send SMS Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  6-Digit SMS Code
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
                  <span>Expires in 5 minutes</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setCode('');
                    }}
                    className="text-cosmic-cyan hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change phone</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Enter Orbit'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-cosmic-purple hover:text-cosmic-cyan font-semibold transition-colors">
              Create one here
            </Link>
          </div>
        </div>

        <DevSmsBanner onFillCode={(c) => setCode(c)} />
      </div>
    </div>
  );
};
