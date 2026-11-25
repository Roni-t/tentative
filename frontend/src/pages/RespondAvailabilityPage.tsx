import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Event, TimeSlot } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { TextOptIn } from '../components/TextOptIn';
import { Calendar, User as UserIcon, Check, ArrowRight, Sparkles, MapPin, Clock } from 'lucide-react';

export const RespondAvailabilityPage: React.FC = () => {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || undefined;
  const { showToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantName, setParticipantName] = useState(user?.name || '');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedToken, setSavedToken] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        let ev: Event;
        if (token) {
          ev = await api.resolveShareToken(token);
        } else if (id) {
          ev = await api.getEvent(id);
        } else {
          return;
        }
        setEvent(ev);

        // Preload any existing slots for this edit token
        const existingSlots = await api.getMyAvailability(ev.id, inviteToken);
        setSelectedSlots(existingSlots);
      } catch (err: any) {
        if (err.status === 410) {
          navigate('/expired');
          return;
        }
        showToast(err.message || 'Error loading event', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token, navigate]);

  useEffect(() => {
    if (user?.name && !participantName) {
      setParticipantName(user.name);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if (!participantName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitAvailability(event.id, participantName.trim(), selectedSlots, inviteToken);
      showToast(`Availability saved (${res.slots_count} slots)`, 'success');
      if (user) {
        // Logged-in people already have a phone number on their account
        navigate(token ? `/share/${token}/heatmap` : `/events/${event.id}/heatmap`);
      } else {
        setSavedToken(res.edit_token);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save availability', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const heatmapUrl = event ? (token ? `/share/${token}/heatmap` : `/events/${event.id}/heatmap`) : '/';

  if (savedToken) {
    return <TextOptIn editToken={savedToken} onDone={() => navigate(heatmapUrl)} />;
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">Loading...</div>;
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Event not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Event Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-zinc-800 space-y-3">
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          Submit Group Availability
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{event.title}</h1>
        {event.description && <p className="text-xs text-zinc-300 max-w-2xl">{event.description}</p>}
        <div className="flex flex-wrap gap-4 pt-2 text-xs text-zinc-400">
          {event.location && (
            <div className="flex items-center space-x-1 text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-white" />
            <span>Timezone: {event.timezone}</span>
          </div>
        </div>
      </div>

      {/* Participant Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:max-w-xs space-y-1">
            <label className="block text-xs font-semibold text-zinc-300">
              Your Name *
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <Link
              to={token ? `/share/${token}/heatmap` : `/events/${event.id}/heatmap`}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white glass-card"
            >
              Skip to Heatmap
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4 text-black" />
              <span>{submitting ? 'Saving...' : 'Save Availability'}</span>
            </button>
          </div>
        </div>

        {/* NF-10 (Reese): pre-fill from a calendar file; free slots get selected, nothing is saved yet */}
        <div className="glass-panel p-4 rounded-3xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-300">
            Import your calendar (.ics from Google, Apple or Outlook) to mark the times you are free.
            <span className="block text-[11px] text-zinc-500">Only start and end times are read. Review the grid, then save.</span>
          </div>
          <label className="pill pill-dark !py-2 !px-4 !text-xs cursor-pointer">
            <span>Import calendar (.ics)</span>
            <input
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file || !event) return;
                try {
                  const res = await api.importCalendar(event.id, await file.text());
                  setSelectedSlots(res.free_slots);
                  showToast(
                    `Found ${res.busy_events_found} busy events; marked ${res.free_slots.length} of ${res.total_slots} slots as free. Review, then save.`,
                    'success',
                  );
                } catch (err: any) {
                  showToast(err.message || 'Could not read that calendar file.', 'error');
                }
              }}
            />
          </label>
        </div>

        {/* Availability Painter Grid */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-zinc-800">
          <AvailabilityGrid
            candidateDates={event.candidate_dates}
            dailyStartTime={event.daily_start_time}
            dailyEndTime={event.daily_end_time}
            slotDurationMinutes={event.slot_duration_minutes}
            initialSlots={selectedSlots}
            onSlotsChange={setSelectedSlots}
            timezone={event.timezone}
          />
        </div>

        {/* Bottom Save Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3.5 rounded-full text-sm font-bold bg-white text-black hover:bg-zinc-200 flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{submitting ? 'Saving...' : 'Confirm & Save Availability'}</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </form>
    </div>
  );
};
