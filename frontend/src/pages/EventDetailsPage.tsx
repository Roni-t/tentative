import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTimeLong } from '../utils/format';
import { Modal } from '../components/Modal';
import { ChangeHistoryModal } from '../components/ChangeHistoryModal';
import { InviteeList } from '../components/InviteeList';
import { AaronPollsPanel } from '../components/AaronPollsPanel';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  Share2,
  MessageSquare,
  Repeat,
  History,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  ShieldAlert,
  Trash2,
  Download,
  ExternalLink,
} from 'lucide-react';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCohostModalOpen, setIsCohostModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [cohostInput, setCohostInput] = useState('');
  const [blockInput, setBlockInput] = useState('');
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState('');

  const downloadBackup = async () => {
    if (!id) return;
    try {
      const blob = await api.downloadAaronBackup(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tentative-event-${id}-backup.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Event backup downloaded.', 'success');
    } catch (err: any) { showToast(err.message || 'Could not download backup.', 'error'); }
  };

  const fetchEvent = async () => {
    if (!id) return;
    try {
      const data = await api.getEvent(id);
      setEvent(data);
      if (data.status === 'finalized') {
        api.getGoogleCalendarUrl(id).then((res) => setGoogleCalendarUrl(res.url)).catch(() => {});
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading event', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handleCancelEvent = async () => {
    if (!id) return;
    try {
      await api.cancelEvent(id);
      showToast('Event canceled. Participants notified.', 'info');
      setIsCancelModalOpen(false);
      fetchEvent();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel event', 'error');
    }
  };

  const handleDeleteEvent = async () => {
    if (!id) return;
    try {
      await api.deleteEvent(id);
      showToast('Event permanently deleted.', 'info');
      navigate('/events');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete event', 'error');
    }
  };

  const handleAddCohost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !cohostInput.trim()) return;
    try {
      const res = await api.addCoHost(id, cohostInput.trim());
      showToast(res.message, 'success');
      setCohostInput('');
      setIsCohostModalOpen(false);
      fetchEvent();
    } catch (err: any) {
      showToast(err.message || 'Failed to add co-host', 'error');
    }
  };

  const handleBlockUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !blockInput.trim()) return;
    try {
      const res = await api.blockUser(id, blockInput.trim());
      showToast(res.message, 'info');
      setBlockInput('');
      setIsBlockModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to block user', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">
        Loading event...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <Link to="/events" className="text-xs text-cosmic-cyan hover:underline">
          Return to My Events
        </Link>
      </div>
    );
  }

  const isHost = event.is_host;
  const isCohost = event.is_cohost;
  const canManage = isHost || isCohost;
  const shareToken = event.active_token || 'demo-orbit-2026';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Event Header Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                event.status === 'finalized'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : event.status === 'canceled'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-cosmic-purple/20 text-zinc-200 border border-zinc-400/30'
              }`}
            >
              {event.status === 'collecting' ? 'Collecting Responses' : event.status}
            </span>
            {event.capacity_limit && (
              <span className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-slate-300 font-mono">
                Cap: {event.capacity_limit} attendees
              </span>
            )}
            {event.is_hidden_details && event.status !== 'finalized' && (
              <span className="px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Surprise Party Mode
              </span>
            )}
          </div>

          {/* Quick Host Actions */}
          {canManage && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                title="Change History"
              >
                <History className="w-4 h-4" />
              </button>
              {isHost && (
                <button
                  onClick={() => setIsCohostModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white border border-white/10 flex items-center space-x-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-cosmic-cyan" />
                  <span>Co-Hosts</span>
                </button>
              )}
              {event.status !== 'canceled' && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 border border-red-500/20 transition-colors"
                >
                  Cancel Event
                </button>
              )}
              {isHost && (
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                  title="Permanently Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={downloadBackup} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white border border-white/10 transition-colors">
                <Download className="w-3.5 h-3.5 inline mr-1.5" />JSON Backup
              </button>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{event.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {event.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-3 border-t border-white/10 text-xs text-slate-400">
          {event.location && (
            <div className="flex items-center space-x-1.5 text-slate-300">
              <MapPin className="w-4 h-4 text-cosmic-purple" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-cosmic-cyan" />
            <span>Timezone: {event.timezone}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-cosmic-pink" />
            <span>
              Host: <strong className="text-white">{event.creator_name || 'Host'}</strong>
              {event.co_hosts.length > 0 && ` (Co-hosts: ${event.co_hosts.join(', ')})`}
            </span>
          </div>
        </div>
      </div>

      {/* Finalized Banner if event is finalized */}
      {event.status === 'finalized' && event.finalized_start_time && (
        <div className="p-6 rounded-3xl glass-panel border border-emerald-500/30 bg-emerald-950/20 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Time finalized
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                {formatDateTimeLong(event.finalized_start_time, event.timezone)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Location: {event.location || 'Online'}
              </div>
            </div>
          </div>

          {/* Add the finalized time to a calendar */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/events/${event.id}/export.ics`}
              download
              className="pill pill-dark !py-2 !px-4 !text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .ics</span>
            </a>
            {googleCalendarUrl && (
              <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="pill pill-dark !py-2 !px-4 !text-xs">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Calendar</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* FR-13 (Trinity): a canceled event that had a time can be removed from calendars */}
      {event.status === 'canceled' && event.finalized_start_time && (
        <div className="p-5 rounded-3xl glass-panel border border-red-500/30 bg-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-300">
            This event was canceled. If you added it to your calendar, open this file to remove it.
          </div>
          <a href={`/api/events/${event.id}/export.ics`} download className="pill pill-dark !py-2 !px-4 !text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>Remove from calendar (.ics)</span>
          </a>
        </div>
      )}

      {/* A short guide for hosts, so it is clear what to do next */}
      {canManage && event.status === 'collecting' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['1', 'Add your invitees', 'Add each person below and send them their own link.'],
            ['2', 'Wait for responses', 'People paint when they are free. Check the heatmap any time.'],
            ['3', 'Pick the best time', 'Choose a time on the heatmap and finalize it.'],
          ].map(([number, title, text]) => (
            <div key={number} className="flex items-start space-x-3 px-1 py-1">
              <span className="font-mono text-xs text-zinc-500 pt-0.5">{number}</span>
              <div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AaronPollsPanel eventId={event.id} canManage={canManage} />

      {/* Primary Action Matrix Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Heatmap Card */}
        <Link
          to={`/events/${event.id}/heatmap`}
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cosmic-purple/50 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cosmic-purple/20 text-cosmic-purple flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cosmic-cyan transition-colors">
              Availability Heatmap
            </h3>
            <p className="text-xs text-slate-400">
              View everyone's overlaid schedules with ranked overlap recommendations.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-cosmic-purple font-semibold flex items-center space-x-1">
            <span>See the heatmap</span>
            
          </div>
        </Link>

        {/* Paint Availability */}
        <Link
          to={`/events/${event.id}/respond`}
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cosmic-cyan/50 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cosmic-cyan/20 text-cosmic-cyan flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cosmic-cyan transition-colors">
              Submit My Availability
            </h3>
            <p className="text-xs text-slate-400">
              Paint your free time slots on the interactive drag-and-drop grid.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-cosmic-cyan font-semibold flex items-center space-x-1">
            <span>Add my times</span>
            
          </div>
        </Link>

        {/* RSVP List & Waitlist */}
        <Link
          to={`/events/${event.id}/rsvps`}
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-cosmic-pink/50 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cosmic-pink/20 text-cosmic-pink flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cosmic-pink transition-colors">
              RSVP List & Waitlist
            </h3>
            <p className="text-xs text-slate-400">
              Monitor going/maybe/declined responses, view FIFO waitlist, and export CSV.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-cosmic-pink font-semibold flex items-center space-x-1">
            <span>See who's coming</span>
            
          </div>
        </Link>

        {/* Discussion */}
        <Link
          to={`/events/${event.id}/discussion`}
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-400/20 text-zinc-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-zinc-200 transition-colors">
              Discussion & Inquiries
            </h3>
            <p className="text-xs text-slate-400">
              Public inquiries, questions, and host responses for attendees.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-zinc-200 font-semibold flex items-center space-x-1">
            <span>Open discussion</span>
            
          </div>
        </Link>

        {/* Share & Expiry */}
        <Link
          to={`/events/${event.id}/share`}
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-white transition-colors">
              Share & Expiry Link
            </h3>
            <p className="text-xs text-slate-400">
              Copy the group link, replace it if it leaks, or change when it expires.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-slate-300 font-semibold flex items-center space-x-1">
            <span>Manage link</span>
            
          </div>
        </Link>

        {/* Recurrence */}
        <Link
          to={`/events/${event.id}/recurrence`}
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <Repeat className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-white transition-colors">
              Repeat this event
            </h3>
            <p className="text-xs text-slate-400">
              Configure weekly or biweekly repeats with calendar recurrence preview.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-slate-300 font-semibold flex items-center space-x-1">
            <span>Set up repeats</span>
            
          </div>
        </Link>
      </div>

      {canManage && event.status === 'collecting' && (
        <InviteeList event={event} groupLink={`${window.location.origin}/share/${shareToken}/respond`} />
      )}

      {/* Modals */}
      {/* Cancel Confirmation Modal (UC-4) */}
      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Cancel Event">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Are you sure you want to cancel this event? An alert will be sent to all participants, and the
            event status will be marked as canceled.
          </p>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5 border border-white/10"
            >
              Keep Event
            </button>
            <button
              onClick={handleCancelEvent}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Permanently Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Event Permanently">
        <div className="space-y-4">
          <p className="text-xs text-red-300">
            Warning: This action cannot be undone. All responses, heatmap data, comments, and shareable links
            will be permanently removed.
          </p>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5 border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteEvent}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Co-Host Modal (UC-12) */}
      <Modal isOpen={isCohostModalOpen} onClose={() => setIsCohostModalOpen(false)} title="Assign Co-Host">
        <form onSubmit={handleAddCohost} className="space-y-4">
          <p className="text-xs text-slate-400">
            Co-hosts can edit the event, finalize times, and reply to comments, but cannot permanently delete the event.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              User Phone Number or Full Name
            </label>
            <input
              type="text"
              required
              value={cohostInput}
              onChange={(e) => setCohostInput(e.target.value)}
              placeholder="e.g. +19725550100 or Aaron Hines"
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCohostModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm"
            >
              Add Co-Host
            </button>
          </div>
        </form>
      </Modal>

      {/* Change History Modal (UC-5 audit) */}
      <ChangeHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        eventId={event.id}
      />
    </div>
  );
};
