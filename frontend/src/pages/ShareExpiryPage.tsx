import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format, parseISO } from 'date-fns';
import { Share2, Copy, RefreshCw, Clock, ArrowLeft, Check, ShieldAlert } from 'lucide-react';

export const ShareExpiryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [expiryOption, setExpiryOption] = useState<'1_week' | '1_month' | 'semester' | 'custom' | 'expire_now'>('semester');
  const [customDate, setCustomDate] = useState('');
  const [rotating, setRotating] = useState(false);
  const [updatingExpiry, setUpdatingExpiry] = useState(false);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      const data = await api.getEvent(id);
      setEvent(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading event', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const shareUrl = event?.active_token
    ? `${window.location.origin}/share/${event.active_token}`
    : '';

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast('Shareable link copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRotate = async () => {
    if (!id) return;
    if (!window.confirm('Rotating this URL will immediately invalidate the previous link. Continue?')) {
      return;
    }
    setRotating(true);
    try {
      const res = await api.rotateShareUrl(id);
      showToast('Shareable link rotated! Old link is now dead.', 'success');
      fetchEvent();
    } catch (err: any) {
      showToast(err.message || 'Failed to rotate URL', 'error');
    } finally {
      setRotating(false);
    }
  };

  const handleUpdateExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setUpdatingExpiry(true);
    try {
      const dateVal = expiryOption === 'custom' && customDate ? new Date(customDate).toISOString() : undefined;
      await api.updateShareExpiry(id, expiryOption, dateVal);
      showToast('Link expiry updated!', 'success');
      fetchEvent();
    } catch (err: any) {
      showToast(err.message || 'Failed to update expiry', 'error');
    } finally {
      setUpdatingExpiry(false);
    }
  };

  if (loading || !event) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">Loading share configuration...</div>;
  }

  const isHost = event.is_host;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <Link
          to={`/events/${event.id}`}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to event</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Shareable Link & Expiry Controls
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{event.title}</p>
      </div>

      {/* Shareable Link Box */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Share2 className="w-4 h-4 text-white" />
            <span>Active Cryptographic Share Link</span>
          </div>
          {event.expires_at && (
            <span className="text-[11px] font-mono text-slate-400">
              Expires: {format(parseISO(event.expires_at), 'MMM d, yyyy · h:mm a')}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-xs select-all focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Anyone with this link can view candidate times and paint their availability anonymously without creating an account.
        </p>

        {/* Rotate Button (Creator Only) */}
        {isHost && (
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Rotate URL</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Immediately terminates the current link and generates a new token. Old link shows "This orbit has ended".
              </p>
            </div>
            <button
              onClick={handleRotate}
              disabled={rotating}
              className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 shrink-0 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
              <span>Rotate Token</span>
            </button>
          </div>
        )}
      </div>

      {/* Modify Expiry Policy */}
      {isHost && (
        <form onSubmit={handleUpdateExpiry} className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-white" />
            <span>Update Link Lifetime</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Expiration Duration
              </label>
              <select
                value={expiryOption}
                onChange={(e) => setExpiryOption(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-2xl bg-space-900 border border-white/10 text-white text-xs"
              >
                <option value="semester">End of Semester (Dec 18, 2026)</option>
                <option value="1_week">Extend by 1 Week</option>
                <option value="1_month">Extend by 1 Month</option>
                <option value="custom">Custom Date</option>
                <option value="expire_now">Expire Link Immediately</option>
              </select>
            </div>

            {expiryOption === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom Expiry Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updatingExpiry}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-colors cursor-pointer"
            >
              {updatingExpiry ? 'Saving...' : 'Apply Expiry Setting'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
