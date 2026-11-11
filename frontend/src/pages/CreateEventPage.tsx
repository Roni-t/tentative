import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { COMMON_TIMEZONES, getUserTimezone } from '../utils/timezone';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Lock,
  Hourglass,
  Users,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const CreateEventPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState(getUserTimezone());

  // Candidate dates: defaults to next 5 days
  const today = new Date();
  const defaultDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    return d.toISOString().split('T')[0];
  });
  const [candidateDates, setCandidateDates] = useState<string[]>(defaultDates);
  const [dateInput, setDateInput] = useState('');

  const [dailyStartTime, setDailyStartTime] = useState('09:00');
  const [dailyEndTime, setDailyEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [deadline, setDeadline] = useState('');
  const [capacityLimit, setCapacityLimit] = useState<string>('');
  const [isHiddenDetails, setIsHiddenDetails] = useState(false);
  const [expiryOption, setExpiryOption] = useState<'1_week' | '1_month' | 'semester' | 'custom'>('semester');
  const [customExpiry, setCustomExpiry] = useState('');
  const [loading, setLoading] = useState(false);

  const addDate = (dateVal: string) => {
    if (!dateVal) return;
    if (!candidateDates.includes(dateVal)) {
      setCandidateDates([...candidateDates, dateVal].sort());
    }
    setDateInput('');
  };

  const removeDate = (dateVal: string) => {
    setCandidateDates(candidateDates.filter((d) => d !== dateVal));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to host an event', 'error');
      navigate('/login');
      return;
    }
    if (candidateDates.length === 0) {
      showToast('Please select at least one candidate date', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        timezone,
        candidate_dates: candidateDates,
        daily_start_time: dailyStartTime,
        daily_end_time: dailyEndTime,
        slot_duration_minutes: Number(slotDuration),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        capacity_limit: capacityLimit ? parseInt(capacityLimit, 10) : null,
        is_hidden_details: isHiddenDetails,
        expiry_option: expiryOption,
        custom_expiry_date: expiryOption === 'custom' && customExpiry ? new Date(customExpiry).toISOString() : null,
      };

      const event = await api.createEvent(payload);
      showToast('Orbit scheduled successfully!', 'success');
      navigate(`/events/${event.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create event', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Create an Orbit Event</h1>
        <p className="text-xs text-slate-400">
          Propose meeting parameters and generate an expiring cryptographic link for participants.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Info */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-zinc-800 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>Event Essentials</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Software Engineering Team Meeting"
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context, meeting objectives, or instructions..."
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:border-white focus:ring-1 focus:ring-white transition-all custom-scrollbar"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Location or Virtual Meeting Link
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. ECSS 2.410 / Microsoft Teams"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-sm focus:border-white focus:ring-1 focus:ring-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-sm focus:border-white transition-all"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Schedule & Time Window */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cosmic-cyan" />
            <span>Candidate Schedule Matrix</span>
          </h2>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Candidate Dates ({candidateDates.length} selected)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {candidateDates.map((d) => (
                <span
                  key={d}
                  className="px-3 py-1.5 rounded-xl bg-cosmic-purple/20 border border-cosmic-purple/40 text-purple-200 text-xs font-mono flex items-center space-x-2"
                >
                  <span>{d}</span>
                  <button
                    type="button"
                    onClick={() => removeDate(d)}
                    className="hover:text-red-400 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 max-w-sm">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
              />
              <button
                type="button"
                onClick={() => addDate(dateInput)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10 transition-colors"
              >
                Add Date
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Earliest Daily Time
              </label>
              <input
                type="time"
                value={dailyStartTime}
                onChange={(e) => setDailyStartTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Latest Daily Time
              </label>
              <input
                type="time"
                value={dailyEndTime}
                onChange={(e) => setDailyEndTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Slot Length
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-2xl bg-space-900 border border-white/10 text-white text-sm"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes (1 hr)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Controls, Expiry & Waitlist Settings */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Hourglass className="w-4 h-4 text-cosmic-pink" />
            <span>Expiry & Capacity Controls</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Shareable URL Expiry
              </label>
              <select
                value={expiryOption}
                onChange={(e) => setExpiryOption(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-2xl bg-space-900 border border-white/10 text-white text-sm"
              >
                <option value="semester">End of Semester (Default: Dec 18)</option>
                <option value="1_week">1 Week</option>
                <option value="1_month">1 Month</option>
                <option value="custom">Custom Expiry Date</option>
              </select>

              {expiryOption === 'custom' && (
                <input
                  type="datetime-local"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  required
                  className="mt-2 w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Capacity Limit (Optional FIFO Waitlist)
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="number"
                  min="1"
                  value={capacityLimit}
                  onChange={(e) => setCapacityLimit(e.target.value)}
                  placeholder="Unlimited if left blank"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:border-cosmic-purple"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                When full, additional invitees are assigned to a FIFO waitlist with auto-promotion.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Response Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>

            <div className="flex items-start space-x-3 pt-4 sm:pt-6">
              <input
                type="checkbox"
                id="surprise"
                checked={isHiddenDetails}
                onChange={(e) => setIsHiddenDetails(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-cosmic-purple bg-white/10 border-white/20 focus:ring-cosmic-purple"
              />
              <label htmlFor="surprise" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-semibold text-white block">Surprise Party Feature</span>
                Hide event description and location from invitees until finalized time is locked.
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-full text-sm font-bold bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.35)] flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Aligning Orbits...' : 'Schedule Orbit'}</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </form>
    </div>
  );
};
