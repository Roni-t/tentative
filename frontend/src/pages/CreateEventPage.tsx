import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { COMMON_TIMEZONES, getUserTimezone } from '../utils/timezone';
import { loginPath } from '../utils/authRedirect';
import { clearDraft, loadDraft, saveDraft } from '../utils/createDraft';

// Creating an event is a short survey: one question group per screen.
const STEPS = ['Details', 'Dates', 'Times', 'Options', 'Review'];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Local YYYY-MM-DD. toISOString() would give the UTC date, which can be a day off.
const dateKey = (d: Date) => {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// Seven dates, Monday through Sunday, for the week that is `weeksAhead` weeks from now
const weekDates = (weeksAhead: number) => {
  const today = new Date();
  const sinceMonday = (today.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) =>
    dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - sinceMonday + weeksAhead * 7 + i))
  );
};

const prettyDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const prettyTime = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const inputClass =
  'w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:border-white focus:ring-1 focus:ring-white transition-all';

// Slides left or right depending on whether the person is going forward or back
const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -48 }),
};

export const CreateEventPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Answers typed earlier in this tab (before a refresh or signing in) are put back
  const [draft] = useState(loadDraft);

  const [step, setStep] = useState(draft?.step ?? 0);
  const [direction, setDirection] = useState(1);

  const [title, setTitle] = useState(draft?.title ?? '');
  const [description, setDescription] = useState(draft?.description ?? '');
  const [location, setLocation] = useState(draft?.location ?? '');
  const [timezone, setTimezone] = useState(draft?.timezone ?? getUserTimezone());

  // Candidate dates start as the current week, Monday through Sunday
  const [candidateDates, setCandidateDates] = useState<string[]>(draft?.candidateDates ?? weekDates(0));
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [dailyStartTime, setDailyStartTime] = useState(draft?.dailyStartTime ?? '09:00');
  const [dailyEndTime, setDailyEndTime] = useState(draft?.dailyEndTime ?? '18:00');
  const [slotDuration, setSlotDuration] = useState(draft?.slotDuration ?? 30);

  const [deadline, setDeadline] = useState(draft?.deadline ?? '');
  const [capacityLimit, setCapacityLimit] = useState(draft?.capacityLimit ?? '');
  const [isHiddenDetails, setIsHiddenDetails] = useState(draft?.isHiddenDetails ?? false);
  const [loading, setLoading] = useState(false);

  // Save the answers whenever something changes
  useEffect(() => {
    saveDraft({
      step, title, description, location, timezone, candidateDates, dailyStartTime, dailyEndTime,
      slotDuration, deadline, capacityLimit, isHiddenDetails,
    });
  }, [step, title, description, location, timezone, candidateDates, dailyStartTime, dailyEndTime,
    slotDuration, deadline, capacityLimit, isHiddenDetails]);

  const toldAboutDraft = useRef(false);
  useEffect(() => {
    if (draft && !toldAboutDraft.current) {
      toldAboutDraft.current = true;
      showToast('Picked up where you left off', 'info');
    }
  }, [draft, showToast]);

  const timezones = COMMON_TIMEZONES.includes(timezone) ? COMMON_TIMEZONES : [timezone, ...COMMON_TIMEZONES];

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDate = (key: string) => {
    setCandidateDates((dates) => (dates.includes(key) ? dates.filter((d) => d !== key) : [...dates, key].sort()));
  };

  // Returns a message if this step is not ready to move on from
  const problemWithStep = (index: number): string | null => {
    if (index === 0 && !title.trim()) return 'Give your event a title first.';
    if (index === 1 && candidateDates.length === 0) return 'Pick at least one date.';
    if (index === 2 && dailyEndTime <= dailyStartTime) return 'The latest time has to be after the earliest time.';
    return null;
  };

  const next = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = problemWithStep(step);
    if (problem) {
      showToast(problem, 'error');
      return;
    }
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    await createEvent();
  };

  const createEvent = async () => {
    if (!user) {
      showToast('Sign in to finish. Your answers are saved.', 'info');
      navigate(loginPath('/create'));
      return;
    }
    setLoading(true);
    try {
      const event = await api.createEvent({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        timezone,
        candidate_dates: candidateDates,
        daily_start_time: dailyStartTime,
        daily_end_time: dailyEndTime,
        slot_duration_minutes: slotDuration,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        capacity_limit: capacityLimit ? parseInt(capacityLimit, 10) : null,
        is_hidden_details: isHiddenDetails,
      } as any);
      clearDraft();
      showToast('Event created', 'success');
      navigate(`/events/${event.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create event', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ---- Month calendar for picking dates ----
  const firstOfMonth = new Date(month.year, month.month, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // the grid starts on Monday
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  const moveMonth = (by: number) => {
    const d = new Date(month.year, month.month + by, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">What is the event called?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Study group, Team dinner"
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Anything people should know? <span className="text-zinc-500">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What it is for, what to bring..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Where is it? <span className="text-zinc-500">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="A room, an address, or a meeting link"
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCandidateDates(weekDates(0))} className="pill pill-dark !py-2 !px-4 !text-xs">
              This week
            </button>
            <button type="button" onClick={() => setCandidateDates(weekDates(1))} className="pill pill-dark !py-2 !px-4 !text-xs">
              Next week
            </button>
            <button type="button" onClick={() => setCandidateDates([])} className="pill pill-dark !py-2 !px-4 !text-xs">
              Clear
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-white">
                {firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Next month"
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => (
                <span key={w} className="eyebrow text-center !text-[0.6rem] !tracking-wider py-1">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const key = dateKey(new Date(month.year, month.month, i + 1));
                const selected = candidateDates.includes(key);
                const past = key < todayKey && !selected;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={past}
                    onClick={() => toggleDate(key)}
                    aria-pressed={selected}
                    className={`aspect-square rounded-xl text-sm font-medium transition-all duration-200 ${
                      selected
                        ? 'bg-white text-black'
                        : past
                          ? 'text-zinc-700 cursor-not-allowed'
                          : key === todayKey
                            ? 'text-white border border-white/30 hover:bg-white/10'
                            : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-zinc-400">
            {candidateDates.length === 0
              ? 'Tap the days that could work.'
              : `${candidateDates.length} ${candidateDates.length === 1 ? 'day' : 'days'} selected`}
          </p>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Earliest</label>
              <input type="time" value={dailyStartTime} onChange={(e) => setDailyStartTime(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Latest</label>
              <input type="time" value={dailyEndTime} onChange={(e) => setDailyEndTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">How finely should people pick times?</label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setSlotDuration(minutes)}
                  aria-pressed={slotDuration === minutes}
                  className={`py-3 rounded-2xl text-sm font-medium border transition-all duration-200 ${
                    slotDuration === minutes
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/30'
                  }`}
                >
                  {minutes === 60 ? '1 hour' : `${minutes} min`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Time zone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={`${inputClass} bg-zinc-900`}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-5">
          <p className="text-sm text-zinc-400">All of these are optional. You can skip this screen.</p>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Reply by</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
            <p className="text-xs text-zinc-500 mt-2">
              The group link stops working at this time. Without one, it works for 30 days.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Limit how many people can join</label>
            <input
              type="number"
              min="1"
              value={capacityLimit}
              onChange={(e) => setCapacityLimit(e.target.value)}
              placeholder="No limit"
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 mt-2">Once it's full, nobody else can RSVP going.</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <input
              type="checkbox"
              checked={isHiddenDetails}
              onChange={(e) => setIsHiddenDetails(e.target.checked)}
              className="accent-white mt-1 w-4 h-4"
            />
            <span className="text-sm text-zinc-300">
              <span className="font-medium text-white block">Keep it a surprise</span>
              Hide the description and location until the time is final.
            </span>
          </label>
        </div>
      );
    }

    // Review
    const rows: { label: string; value: string; step: number }[] = [
      { label: 'Event', value: title.trim(), step: 0 },
      ...(location.trim() ? [{ label: 'Where', value: location.trim(), step: 0 }] : []),
      {
        label: 'Dates',
        value:
          candidateDates.length > 3
            ? `${prettyDate(candidateDates[0])} to ${prettyDate(candidateDates[candidateDates.length - 1])} (${candidateDates.length} days)`
            : candidateDates.map(prettyDate).join(', '),
        step: 1,
      },
      {
        label: 'Times',
        value: `${prettyTime(dailyStartTime)} to ${prettyTime(dailyEndTime)}, ${slotDuration} minute slots`,
        step: 2,
      },
      { label: 'Time zone', value: timezone.replace('_', ' '), step: 2 },
      ...(deadline ? [{ label: 'Reply by', value: new Date(deadline).toLocaleString(), step: 3 }] : []),
      ...(capacityLimit ? [{ label: 'Limit', value: `${capacityLimit} people`, step: 3 }] : []),
      ...(isHiddenDetails ? [{ label: 'Surprise', value: 'Details hidden until final', step: 3 }] : []),
    ];

    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">Everything look right? You can change any of it later.</p>
        <div className="rounded-2xl border border-white/10 divide-y divide-white/10">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <span className="eyebrow !text-[0.6rem] block mb-1">{row.label}</span>
                <span className="text-sm text-white break-words">{row.value}</span>
              </div>
              <button
                type="button"
                onClick={() => goTo(row.step)}
                className="text-xs text-zinc-400 hover:text-white transition-colors shrink-0 pt-1"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const headings = [
    'What are we planning?',
    'Which days could work?',
    'What hours work?',
    'A few extras',
    'Ready to go',
  ];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="eyebrow">{STEPS[step]}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((name, i) => (
            <div key={name} className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={false}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.form
          key={step}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onSubmit={next}
          noValidate
        >
          <h1 className="display-serif text-3xl sm:text-4xl text-white mb-6">{headings[step]}</h1>

          <div className="min-h-[18rem]">{renderStep()}</div>

          <div className="flex items-center justify-between gap-3 mt-8">
            {step > 0 ? (
              <button type="button" onClick={() => goTo(step - 1)} className="pill pill-dark">
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={loading} className="pill pill-light disabled:opacity-50">
              <span>{isLast ? (loading ? 'Creating...' : 'Create event') : step === 3 ? 'Review' : 'Continue'}</span>
              {isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </motion.form>
      </AnimatePresence>
    </div>
  );
};
