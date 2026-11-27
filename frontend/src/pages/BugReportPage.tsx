import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LegalNote, PrivacyLink } from '../components/LegalLinks';
import { Bug, Send, CheckCircle2 } from 'lucide-react';

export const BugReportPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [contact, setContact] = useState('');
  const [pageUrl, setPageUrl] = useState(window.location.href);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      await api.submitBugReport(name.trim(), contact.trim(), pageUrl.trim(), description.trim());
      setSubmitted(true);
      showToast('Bug report filed. Thank you for helping improve Tentative!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to file bug report', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Report an Issue</h1>
            <p className="text-xs text-slate-400">Found a problem? Let us know.</p>
          </div>
        </div>

        {submitted ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Report Received</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Our engineering team has logged your report and is investigating. Thank you!
            </p>
            <button
              onClick={() => {
                setDescription('');
                setSubmitted(false);
              }}
              className="mt-4 px-5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Reese Asher"
                  className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-cosmic-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone (optional)</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. (972) 555-0142"
                  aria-describedby="contact-privacy"
                  className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-cosmic-purple"
                />
                <LegalNote id="contact-privacy" className="mt-2.5">
                  <PrivacyLink />
                </LegalNote>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Page URL</label>
              <input
                type="text"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bug Description & Reproduction Steps *
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened and what you expected to see..."
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:border-cosmic-purple transition-all custom-scrollbar"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-black" />
                <span>{loading ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
