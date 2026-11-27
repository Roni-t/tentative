import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Event, RecurrenceInfo } from '../types';
import { dateKeyInZone, timeRangeInZone } from '../utils/zoned';
import { Repeat, ArrowLeft, Calendar, Clock, Check } from 'lucide-react';

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fromDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const RecurrencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [frequency, setFrequency] = useState<'weekly' | 'biweekly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [endDate, setEndDate] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [saved, setSaved] = useState<RecurrenceInfo | null>(null);
  const [saving, setSaving] = useState(false);

  // The series starts from the event's finalized day, or its first candidate day
  useEffect(() => {
    if (!id) return;
    api
      .getEvent(id)
      .then((ev) => {
        setEvent(ev);
        const first = ev.finalized_start_time
          ? dateKeyInZone(ev.finalized_start_time, ev.timezone)
          : ev.candidate_dates[0];
        const start = fromDateKey(first);
        setSelectedDays([DAY_CODES[start.getDay()]]);
        const end = new Date(start);
        end.setDate(end.getDate() + 56);
        setEndDate(toDateKey(end));
        // UC-11 (Aaron): if a pattern was already saved, show it instead of the defaults
        return api.getRecurrence(id).then((rec) => {
          setSaved(rec);
          if (rec.is_recurring && rec.frequency && rec.end_date) {
            setFrequency(rec.frequency);
            setSelectedDays(rec.days_of_week);
            setEndDate(rec.end_date);
          }
        });
      })
      .catch(() => {});
  }, [id]);

  const days = [
    { label: 'S', code: 'SU' },
    { label: 'M', code: 'MO' },
    { label: 'T', code: 'TU' },
    { label: 'W', code: 'WE' },
    { label: 'T', code: 'TH' },
    { label: 'F', code: 'FR' },
    { label: 'S', code: 'SA' },
  ];

  const toggleDay = (code: string) => {
    if (selectedDays.includes(code)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== code));
      }
    } else {
      setSelectedDays([...selectedDays, code]);
    }
  };

  // UC-11 (Aaron): save the pattern to the backend; it validates and returns every date in the series
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const rec = await api.setRecurrence(id, frequency, selectedDays, endDate);
      setSaved(rec);
      showToast(`Saved: ${rec.occurrences.length} meetings until ${rec.end_date}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not save the recurrence.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!id) return;
    try {
      setSaved(await api.removeRecurrence(id));
      showToast('This event no longer repeats.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not remove the recurrence.', 'error');
    }
  };

  // Preview: the next dates that match the chosen days, every week or every other week
  const buildOccurrences = () => {
    if (!event || !endDate) return [];
    const first = event.finalized_start_time
      ? dateKeyInZone(event.finalized_start_time, event.timezone)
      : event.candidate_dates[0];
    const start = fromDateKey(first);
    const end = fromDateKey(endDate);
    const time = event.finalized_start_time && event.finalized_end_time
      ? timeRangeInZone(event.finalized_start_time, event.finalized_end_time, event.timezone)
      : `${event.daily_start_time} - ${event.daily_end_time}`;

    const found: { date: string; time: string }[] = [];
    for (let d = new Date(start), n = 0; d <= end && found.length < 4; d.setDate(d.getDate() + 1), n++) {
      const weekNumber = Math.floor(n / 7);
      if (frequency === 'biweekly' && weekNumber % 2 === 1) continue;
      if (selectedDays.includes(DAY_CODES[d.getDay()])) {
        found.push({ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), time });
      }
    }
    return found;
  };
  const occurrences = buildOccurrences();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to event</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Set Event Recurrence</h1>
        <p className="text-xs text-slate-400 mt-0.5">Automate recurring team syncs or office hours</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recurrence Form (Wireframe p. 48) */}
        <form onSubmit={handleSave} className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Repeat Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-2xl bg-space-900 border border-white/10 text-white text-xs"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 Weeks (Bi-weekly)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Repeat on</label>
            <div className="flex items-center space-x-2">
              {days.map((d) => {
                const active = selectedDays.includes(d.code);
                return (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => toggleDay(d.code)}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                      active
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Ends On Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-400">
              {saved?.is_recurring
                ? `Saved: repeats ${saved.frequency} on ${saved.days_of_week.join(', ')} until ${saved.end_date} (${saved.occurrences.length} meetings)`
                : 'Not saved yet: this event does not repeat.'}
            </span>
            {saved?.is_recurring && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2.5 rounded-full text-xs font-bold border border-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                Stop repeating
              </button>
            )}
            <button
              type="submit"
              disabled={saving || selectedDays.length === 0 || !endDate}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 text-black" />
              <span>{saving ? 'Saving...' : 'Save Recurrence'}</span>
            </button>
          </div>
        </form>

        {/* Schedule Preview (Wireframe p. 48) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            Schedule Preview
          </div>
          <p className="text-xs text-zinc-300">
            Next predicted occurrences based on this pattern:
          </p>

          <div className="space-y-2.5 pt-2">
            {occurrences.map((occ, idx) => (
              <div
                key={occ.date}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{occ.date}</div>
                    <div className="text-[11px] font-mono text-slate-400">{occ.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
