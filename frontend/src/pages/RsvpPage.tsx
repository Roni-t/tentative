import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarClock, MapPin } from 'lucide-react';
import { api } from '../api/client';
import { RsvpPage as RsvpInfo, RsvpStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { longDateInZone, timeInZone, zoneName } from '../utils/zoned';

// Same colors as the invitee table's RSVP pills: going green, maybe white, not going red
const CHOICES: { status: RsvpStatus; label: string; idle: string; picked: string }[] = [
  {
    status: 'going',
    label: 'Going',
    idle: 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10',
    picked: 'border-emerald-400 bg-emerald-400/15 text-emerald-200',
  },
  {
    status: 'maybe',
    label: 'Maybe',
    idle: 'border-white/30 text-zinc-200 hover:bg-white/10',
    picked: 'border-white bg-white/15 text-white',
  },
  {
    status: 'not_going',
    label: "Can't make it",
    idle: 'border-red-400/40 text-red-300 hover:bg-red-400/10',
    picked: 'border-red-400 bg-red-400/15 text-red-200',
  },
];

const CONFIRM: Record<RsvpStatus, string> = {
  going: "You're going.",
  maybe: 'Saved as maybe.',
  not_going: "Saved. You can't make it.",
};

/** An invitee's RSVP link (/rsvp/:token). The token identifies them, so no login is needed. */
export const RsvpPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const { showToast } = useToast();
  const [info, setInfo] = useState<RsvpInfo | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<RsvpStatus | null>(null);

  useEffect(() => {
    api
      .getRsvp(token)
      .then(setInfo)
      .catch((err: any) => setError(err.message || 'This link is not valid.'));
  }, [token]);

  const choose = async (status: RsvpStatus) => {
    setSaving(status);
    try {
      const updated = await api.submitRsvp(token, status);
      setInfo(updated);
      showToast(CONFIRM[status], 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not save your RSVP', 'error');
      api.getRsvp(token).then(setInfo).catch(() => {});
    } finally {
      setSaving(null);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-2">
        <h1 className="text-xl font-bold text-white">This RSVP link doesn&apos;t work</h1>
        <p className="text-sm text-zinc-400">{error} Ask the host to send it again.</p>
      </div>
    );
  }

  if (!info) {
    return <div className="max-w-md mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">Loading...</div>;
  }

  const start = info.finalized_start_time;
  const end = info.finalized_end_time;
  const full = info.spots_left === 0;

  return (
    <div className="max-w-md w-full mx-auto px-4 py-12 sm:py-16">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">Hi {info.name}</p>
          <h1 className="text-2xl font-bold text-white leading-tight">{info.title}</h1>
          {start && (
            <p className="flex items-start gap-2 text-sm text-zinc-200">
              <CalendarClock className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span>
                {longDateInZone(start, info.timezone)}
                <br />
                {timeInZone(start, info.timezone)}
                {end ? ` to ${timeInZone(end, info.timezone)}` : ''} {zoneName(start, info.timezone)}
              </span>
            </p>
          )}
          {info.location && (
            <p className="flex items-start gap-2 text-sm text-zinc-200">
              <MapPin className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
              <span>{info.location}</span>
            </p>
          )}
        </div>

        <div className="h-px bg-white/10" />

        {info.open ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-white">Are you coming?</h2>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Your RSVP">
              {CHOICES.map((c) => {
                const picked = info.rsvp_status === c.status;
                const blocked = c.status === 'going' && full && !picked;
                return (
                  <button
                    key={c.status}
                    type="button"
                    onClick={() => choose(c.status)}
                    disabled={saving !== null || blocked}
                    aria-pressed={picked}
                    className={`px-2 py-2.5 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                      picked ? c.picked : c.idle
                    }`}
                  >
                    {saving === c.status ? 'Saving...' : c.label}
                  </button>
                );
              })}
            </div>
            {info.capacity_limit != null && (
              <p className="text-xs text-zinc-500">
                {full
                  ? info.rsvp_status === 'going'
                    ? 'The event is full, and your spot is saved.'
                    : 'The event is full, so you can only answer maybe or not going.'
                  : `${info.spots_left} of ${info.capacity_limit} spots left.`}
              </p>
            )}
            <p className="text-xs text-zinc-500">You can change your answer with this link until the event starts.</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-zinc-200">{info.closed_reason}</p>
            {info.rsvp_status && (
              <p className="text-xs text-zinc-500">
                Your answer: {CHOICES.find((c) => c.status === info.rsvp_status)?.label}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
