import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Repeat, ArrowLeft, Calendar, Clock, Check } from 'lucide-react';

export const RecurrencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [frequency, setFrequency] = useState<'weekly' | 'biweekly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['WE']);
  const [endDate, setEndDate] = useState('2026-12-16');

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Recurring series pattern configured and saved!', 'success');
  };

  // Preview occurrences
  const occurrences = [
    { date: 'Sep 16, 2026', time: '2:00 PM - 3:00 PM' },
    { date: frequency === 'weekly' ? 'Sep 23, 2026' : 'Sep 30, 2026', time: '2:00 PM - 3:00 PM' },
    { date: frequency === 'weekly' ? 'Sep 30, 2026' : 'Oct 14, 2026', time: '2:00 PM - 3:00 PM' },
    { date: frequency === 'weekly' ? 'Oct 7, 2026' : 'Oct 28, 2026', time: '2:00 PM - 3:00 PM' },
  ];

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
                        ? 'bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.4)]'
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

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 text-black" />
              <span>Save Recurrence</span>
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
