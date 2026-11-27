import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Event, RsvpSummary, RsvpStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { format, parseISO } from 'date-fns';
import {
  Users,
  Download,
  Filter,
  Search,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const RsvpListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [summary, setSummary] = useState<RsvpSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Attendee self RSVP state
  const [participantName, setParticipantName] = useState(user?.name || '');
  const [selectedStatus, setSelectedStatus] = useState<RsvpStatus>('going');
  const [submittingRsvp, setSubmittingRsvp] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const [ev, sum] = await Promise.all([api.getEvent(id), api.getRsvpSummary(id)]);
      setEvent(ev);
      setSummary(sum);
      if (sum.current_status) {
        setSelectedStatus(sum.current_status);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading RSVP list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !participantName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    setSubmittingRsvp(true);
    try {
      const updated = await api.submitRsvp(id, participantName.trim(), selectedStatus);
      if (updated.status === 'waitlisted') {
        showToast(`Event capacity reached. You are on the waitlist at position #${updated.waitlist_position}`, 'info');
      } else {
        showToast(`RSVP recorded as ${updated.status}!`, 'success');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit RSVP', 'error');
    } finally {
      setSubmittingRsvp(false);
    }
  };

  if (loading || !event || !summary) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">Loading attendance roster...</div>;
  }

  // Filtered roster
  const filteredRsvps = summary.rsvps.filter((r) => {
    const matchesSearch = r.participant_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to event</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">RSVP Review List</h1>
          <p className="text-xs text-slate-400 mt-0.5">{event.title}</p>
        </div>

        <a
          href={`/api/events/${event.id}/rsvp/export.csv`}
          download
          className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-cosmic-cyan" />
          <span>Export CSV</span>
        </a>
      </div>

      {/* Stats Counter Bar (matches Wireframe p. 46) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-white/10 text-center">
          <div className="text-2xl font-extrabold text-emerald-400">{summary.count_going}</div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mt-1">Going</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 text-center">
          <div className="text-2xl font-extrabold text-amber-300">{summary.count_maybe}</div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mt-1">Maybe</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 text-center">
          <div className="text-2xl font-extrabold text-red-400">{summary.count_not_going}</div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mt-1">Not Going</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-zinc-800 text-center">
          <div className="text-2xl font-extrabold text-white">{summary.count_waitlisted}</div>
          <div className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider mt-1">Waitlist</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-zinc-800 text-center col-span-2 sm:col-span-1">
          <div className="text-2xl font-extrabold text-zinc-400">{summary.count_no_response}</div>
          <div className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider mt-1">No Response</div>
        </div>
      </div>

      {/* Submit / Update My RSVP Box */}
      <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
        <div className="text-xs font-bold text-white uppercase tracking-wider">
          {summary.current_status ? 'Update Your RSVP' : 'Submit Your RSVP'}
        </div>

        <form onSubmit={handleRsvpSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Will you attend?</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedStatus('going')}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  selectedStatus === 'going'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-lg'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Going</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('maybe')}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  selectedStatus === 'maybe'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-lg'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Maybe</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('not_going')}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  selectedStatus === 'not_going'
                    ? 'border-red-400 bg-red-400/20 text-red-300 shadow-lg'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Not Going</span>
              </button>
            </div>
          </div>

          {summary.current_waitlist_position && (
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
              You are currently on the waitlist at <strong>Position #{summary.current_waitlist_position}</strong>.
              If a spot opens up, you will be automatically promoted to Going.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingRsvp}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submittingRsvp ? 'Saving...' : 'Save Response'}
            </button>
          </div>
        </form>
      </div>

      {/* Roster Search & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-white"
            />
          </div>

          <div className="flex items-center space-x-1.5 self-start sm:self-auto text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {['all', 'going', 'maybe', 'not_going', 'waitlisted'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl uppercase text-[10px] font-bold tracking-wider transition-colors ${
                  statusFilter === st
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Attendee List Table */}
        <div className="overflow-hidden rounded-3xl border border-white/10 glass-panel">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Attendee</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRsvps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No attendees match this filter.
                  </td>
                </tr>
              ) : (
                filteredRsvps.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">
                      {r.participant_name}
                      {r.waitlist_position && (
                        <span className="ml-2 text-[10px] font-mono font-bold text-zinc-400">
                          (Waitlist #{r.waitlist_position})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'going'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : r.status === 'maybe'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : r.status === 'waitlisted'
                            ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            : 'bg-red-400/20 text-red-300 border border-red-400/30'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                      {format(parseISO(r.updated_at), 'MMM d, h:mm a')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
