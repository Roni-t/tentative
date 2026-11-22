import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

type AaronPoll = {
  id: number;
  question: string;
  category: string;
  options: string[];
  tally: Record<string, number>;
};

type AaronEvent = {
  id: number;
  title: string;
  start_date: string;
  window_start: string;
  window_end: string;
  capacity: number | null;
  recurrence: null | {
    frequency: string;
    interval: number;
    days_of_week: string[];
    end_date: string | null;
  };
  cohosts: { name: string }[];
  participants: { name: string; response: string }[];
  polls: AaronPoll[];
};

const ACCESS_STORAGE_KEY = 'aaron_event_access';
const WEEKDAYS = [
  { code: 'MO', label: 'Monday' },
  { code: 'TU', label: 'Tuesday' },
  { code: 'WE', label: 'Wednesday' },
  { code: 'TH', label: 'Thursday' },
  { code: 'FR', label: 'Friday' },
  { code: 'SA', label: 'Saturday' },
  { code: 'SU', label: 'Sunday' },
];

export const AaronRequirementsPage: React.FC = () => {
  const [event, setEvent] = useState<AaronEvent | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [eventIdInput, setEventIdInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [windowStart, setWindowStart] = useState('14:00');
  const [windowEnd, setWindowEnd] = useState('15:00');
  const [capacity, setCapacity] = useState('');

  const [cohostName, setCohostName] = useState('');
  const [issuedCohostToken, setIssuedCohostToken] = useState('');

  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY'>('WEEKLY');
  const [interval, setInterval] = useState('1');
  const [selectedDays, setSelectedDays] = useState<string[]>(['WE']);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [previewDates, setPreviewDates] = useState<string[]>([]);

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollCategory, setPollCategory] = useState('General');
  const [pollOptionOne, setPollOptionOne] = useState('');
  const [pollOptionTwo, setPollOptionTwo] = useState('');
  const [voterName, setVoterName] = useState('');

  const [participantName, setParticipantName] = useState('');
  const [participantResponse, setParticipantResponse] = useState('GOING');

  const loadEvent = async (id: string, token = accessToken) => {
    const data = await api.getAaronEvent(id);
    setEvent(data);
    setEventIdInput(String(data.id));
    setTitle(data.title);
    setStartDate(data.start_date);
    setWindowStart(data.window_start);
    setWindowEnd(data.window_end);
    setCapacity(data.capacity == null ? '' : String(data.capacity));
    if (data.recurrence) {
      setFrequency(data.recurrence.frequency as 'WEEKLY' | 'BIWEEKLY');
      setInterval(String(data.recurrence.interval));
      setSelectedDays(data.recurrence.days_of_week);
      setRecurrenceEnd(data.recurrence.end_date || '');
    }
    if (token) setAccessToken(token);
    return data;
  };

  useEffect(() => {
    const saved = localStorage.getItem(ACCESS_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { eventId: number; accessToken: string };
      setAccessToken(parsed.accessToken);
      setEventIdInput(String(parsed.eventId));
      api.getAaronEvent(parsed.eventId).then(setEvent).catch(() => {
        localStorage.removeItem(ACCESS_STORAGE_KEY);
      });
    } catch {
      localStorage.removeItem(ACCESS_STORAGE_KEY);
    }
  }, []);

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The request failed.');
    } finally {
      setBusy(false);
    }
  };

  const requireEventAccess = () => {
    if (!event) throw new Error('Create or load an event first.');
    if (!accessToken.trim()) throw new Error('Enter the host or co-host access token.');
    return event;
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      const created = await api.createAaronEvent({
        title,
        start_date: startDate,
        window_start: windowStart,
        window_end: windowEnd,
        capacity: capacity ? Number(capacity) : null,
      });
      setEvent(created.event);
      setEventIdInput(String(created.event.id));
      setAccessToken(created.access_token);
      localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify({
        eventId: created.event.id,
        accessToken: created.access_token,
      }));
      setMessage(`Event ${created.event.id} created and saved.`);
    });
  };

  const handleLoadEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventIdInput.trim()) return;
    await runAction(async () => {
      await loadEvent(eventIdInput.trim());
      setMessage('Event loaded. Enter an access token to make host or co-host changes.');
    });
  };

  const handleAlterEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      const current = requireEventAccess();
      const updated = await api.alterAaronEvent(current.id, accessToken, {
        window_start: windowStart,
        window_end: windowEnd,
        capacity: capacity ? Number(capacity) : null,
      });
      setEvent(updated);
      setMessage('Event settings saved.');
    });
  };

  const handleAddCohost = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      const current = requireEventAccess();
      const result = await api.addAaronCohost(current.id, accessToken, cohostName);
      setIssuedCohostToken(result.access_token);
      setCohostName('');
      await loadEvent(String(current.id));
      setMessage(`Co-host access created for ${result.name}. Copy the token and share it securely.`);
    });
  };

  const handleSaveRecurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      const current = requireEventAccess();
      const recurrence = await api.setAaronRecurrence(current.id, accessToken, {
        frequency,
        interval: Number(interval),
        days_of_week: selectedDays,
        end_date: recurrenceEnd || null,
      });
      const updated = await loadEvent(String(current.id));
      setPreviewDates([updated.start_date]);
      setMessage(`Saved ${recurrence.frequency.toLowerCase()} recurrence.`);
    });
  };

  const handlePreviewRecurrence = async () => {
    await runAction(async () => {
      const current = requireEventAccess();
      const dates = await api.expandAaronRecurrence(
        current.start_date,
        frequency,
        6,
        Number(interval),
        selectedDays,
      );
      setPreviewDates(dates);
      setMessage('Recurrence preview updated.');
    });
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      const current = requireEventAccess();
      await api.createAaronPoll(current.id, accessToken, {
        question: pollQuestion,
        category: pollCategory,
        options: [pollOptionOne, pollOptionTwo],
      });
      await loadEvent(String(current.id));
      setPollQuestion('');
      setPollOptionOne('');
      setPollOptionTwo('');
      setMessage('Poll saved to the event.');
    });
  };

  const handleVote = async (poll: AaronPoll, option: string) => {
    await runAction(async () => {
      if (!event) throw new Error('Load an event first.');
      await api.voteAaronPoll(event.id, poll.id, voterName, option);
      await loadEvent(String(event.id));
      setMessage('Your vote was saved. A voter may update their vote later.');
    });
  };

  const handleParticipantResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      if (!event) throw new Error('Load an event first.');
      await api.recordAaronParticipant(event.id, participantName, participantResponse);
      await loadEvent(String(event.id));
      setParticipantName('');
      setMessage('Participant response saved.');
    });
  };

  const handleDownloadBackup = async () => {
    await runAction(async () => {
      const current = requireEventAccess();
      const blob = await api.downloadAaronBackup(current.id, accessToken);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `aaron-event-${current.id}-backup.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Event backup downloaded.');
    });
  };

  const copyCohostToken = async () => {
    if (!issuedCohostToken) return;
    await navigator.clipboard.writeText(issuedCohostToken);
    setMessage('Co-host access token copied.');
  };

  const toggleDay = (day: string) => {
    setSelectedDays((current) => current.includes(day)
      ? current.filter((selected) => selected !== day)
      : [...current, day]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-7">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Aaron’s Event Tools</h1>
        <p className="text-sm text-slate-400">
          Create and manage an event with recurring dates, co-host access, polls, responses, and JSON backup.
        </p>
      </header>

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-cosmic-cyan">{message}</p>

      {!event && (
        <section aria-labelledby="aaron-create-event-heading" className="glass-panel rounded-3xl border border-white/10 p-6 space-y-5">
          <h2 id="aaron-create-event-heading" className="text-lg font-bold text-white">Create an event</h2>
          <form onSubmit={handleCreateEvent} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="aaron-event-title" className="block text-sm text-slate-300 mb-1">Event title</label>
              <input id="aaron-event-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
            </div>
            <div>
              <label htmlFor="aaron-event-date" className="block text-sm text-slate-300 mb-1">Start date</label>
              <input id="aaron-event-date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
            </div>
            <div>
              <label htmlFor="aaron-capacity" className="block text-sm text-slate-300 mb-1">Capacity (optional)</label>
              <input id="aaron-capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
            </div>
            <div>
              <label htmlFor="aaron-window-start" className="block text-sm text-slate-300 mb-1">Window starts</label>
              <input id="aaron-window-start" type="time" required value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
            </div>
            <div>
              <label htmlFor="aaron-window-end" className="block text-sm text-slate-300 mb-1">Window ends</label>
              <input id="aaron-window-end" type="time" required value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
            </div>
            <button type="submit" disabled={busy} className="sm:col-span-2 justify-self-start rounded-full bg-white px-5 py-2 text-sm font-bold text-black disabled:opacity-50">
              {busy ? 'Creating…' : 'Create event'}
            </button>
          </form>
        </section>
      )}

      {!event && (
        <form onSubmit={handleLoadEvent} className="glass-panel rounded-3xl border border-white/10 p-6 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="aaron-event-id" className="block text-sm text-slate-300 mb-1">Load an existing event ID</label>
            <input id="aaron-event-id" type="number" min="1" value={eventIdInput} onChange={(e) => setEventIdInput(e.target.value)} className="rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
          </div>
          <button type="submit" disabled={busy} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-50">Load event</button>
        </form>
      )}

      {event && (
        <>
          <section aria-labelledby="aaron-event-heading" className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cosmic-cyan">Event {event.id}</p>
                <h2 id="aaron-event-heading" className="text-2xl font-bold text-white">{event.title}</h2>
                <p className="text-sm text-slate-400">{event.start_date} · {event.window_start}–{event.window_end}</p>
              </div>
              <button type="button" onClick={handleDownloadBackup} disabled={busy} aria-label="Download event and participant backup as JSON" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Download Event Backup (JSON)
              </button>
            </div>
            <div>
              <label htmlFor="aaron-access-token" className="block text-sm text-slate-300 mb-1">Host or co-host access token</label>
              <input id="aaron-access-token" type="password" autoComplete="off" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} aria-label="Host or co-host access token" className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
              <p className="text-xs text-slate-500 mt-1">The host token is kept in this browser. Co-hosts can paste their issued token here.</p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="aaron-alter-heading" className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4">
              <h2 id="aaron-alter-heading" className="text-lg font-bold text-white">Event settings and co-hosts</h2>
              <form onSubmit={handleAlterEvent} className="space-y-3">
                <div>
                  <label htmlFor="aaron-edit-start" className="block text-sm text-slate-300 mb-1">Window starts</label>
                  <input id="aaron-edit-start" type="time" required value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <div>
                  <label htmlFor="aaron-edit-end" className="block text-sm text-slate-300 mb-1">Window ends</label>
                  <input id="aaron-edit-end" type="time" required value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <div>
                  <label htmlFor="aaron-edit-capacity" className="block text-sm text-slate-300 mb-1">Capacity</label>
                  <input id="aaron-edit-capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <button type="submit" disabled={busy} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save event settings</button>
              </form>
              <form onSubmit={handleAddCohost} className="border-t border-white/10 pt-4 space-y-3">
                <label htmlFor="aaron-cohost-name" className="block text-sm text-slate-300">Add co-host</label>
                <div className="flex gap-2">
                  <input id="aaron-cohost-name" required maxLength={100} value={cohostName} onChange={(e) => setCohostName(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                  <button type="submit" disabled={busy} className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white disabled:opacity-50">Add</button>
                </div>
              </form>
              {issuedCohostToken && (
                <div className="rounded-xl border border-cosmic-cyan/30 bg-cosmic-cyan/5 p-3 space-y-2" role="group" aria-label="New co-host access token">
                  <p className="text-xs text-cyan-200">Copy this one-time token for the co-host:</p>
                  <code className="block break-all text-xs text-white">{issuedCohostToken}</code>
                  <button type="button" onClick={copyCohostToken} aria-label="Copy co-host access token" className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white">Copy token</button>
                </div>
              )}
              {event.cohosts.length > 0 && <p className="text-sm text-slate-400">Co-hosts: {event.cohosts.map((cohost) => cohost.name).join(', ')}</p>}
            </section>

            <section aria-labelledby="aaron-recurrence-heading" className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4">
              <h2 id="aaron-recurrence-heading" className="text-lg font-bold text-white">Recurring event</h2>
              <form onSubmit={handleSaveRecurrence} className="space-y-3">
                <div>
                  <label htmlFor="aaron-frequency" className="block text-sm text-slate-300 mb-1">Frequency</label>
                  <select id="aaron-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as 'WEEKLY' | 'BIWEEKLY')} className="w-full rounded-xl bg-zinc-900 border border-white/15 px-3 py-2 text-white">
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Every two weeks</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="aaron-interval" className="block text-sm text-slate-300 mb-1">Repeat every (interval)</label>
                  <input id="aaron-interval" type="number" min="1" max="52" value={interval} onChange={(e) => setInterval(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <fieldset>
                  <legend className="block text-sm text-slate-300 mb-2">Repeat on</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <button key={day.code} type="button" aria-label={day.label} aria-pressed={selectedDays.includes(day.code)} onClick={() => toggleDay(day.code)} className={`rounded-lg border px-3 py-2 text-xs ${selectedDays.includes(day.code) ? 'bg-cosmic-cyan/20 border-cosmic-cyan text-cyan-100' : 'border-white/15 text-slate-300'}`}>
                        {day.code}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="aaron-recurrence-end" className="block text-sm text-slate-300 mb-1">Ends on (optional)</label>
                  <input id="aaron-recurrence-end" type="date" min={event.start_date} value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={busy} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save recurrence</button>
                  <button type="button" disabled={busy} onClick={handlePreviewRecurrence} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-50">Preview six dates</button>
                </div>
              </form>
              {event.recurrence && <p className="text-xs text-slate-400">Saved: {event.recurrence.frequency.toLowerCase()}, {event.recurrence.days_of_week.join(', ')}</p>}
              {previewDates.length > 0 && <ol aria-label="Recurrence date preview" className="list-decimal list-inside space-y-1 text-sm text-cyan-100">{previewDates.map((date) => <li key={date}>{date}</li>)}</ol>}
            </section>

            <section aria-labelledby="aaron-poll-heading" className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4">
              <h2 id="aaron-poll-heading" className="text-lg font-bold text-white">Event polls and categories</h2>
              <form onSubmit={handleCreatePoll} className="space-y-3">
                <div>
                  <label htmlFor="aaron-poll-question" className="block text-sm text-slate-300 mb-1">Question</label>
                  <input id="aaron-poll-question" required maxLength={300} value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <div>
                  <label htmlFor="aaron-poll-category" className="block text-sm text-slate-300 mb-1">Category</label>
                  <input id="aaron-poll-category" maxLength={100} value={pollCategory} onChange={(e) => setPollCategory(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="aaron-poll-option-one" className="block text-sm text-slate-300 mb-1">Option one</label>
                    <input id="aaron-poll-option-one" required value={pollOptionOne} onChange={(e) => setPollOptionOne(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label htmlFor="aaron-poll-option-two" className="block text-sm text-slate-300 mb-1">Option two</label>
                    <input id="aaron-poll-option-two" required value={pollOptionTwo} onChange={(e) => setPollOptionTwo(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                  </div>
                </div>
                <button type="submit" disabled={busy} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create poll</button>
              </form>
              <div>
                <label htmlFor="aaron-voter-name" className="block text-sm text-slate-300 mb-1">Your name to vote</label>
                <input id="aaron-voter-name" required value={voterName} onChange={(e) => setVoterName(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
              </div>
              <div className="space-y-3">
                {event.polls.map((poll) => (
                  <div key={poll.id} className="rounded-2xl border border-white/10 p-4 space-y-2">
                    <p className="font-semibold text-white">{poll.question}</p>
                    <p className="text-xs text-slate-400">{poll.category}</p>
                    {poll.options.map((option) => (
                      <button key={option} type="button" disabled={busy || !voterName.trim()} onClick={() => handleVote(poll, option)} aria-label={`Vote for ${option} in ${poll.question}`} className="flex w-full justify-between rounded-xl border border-white/10 px-3 py-2 text-sm text-white disabled:opacity-50">
                        <span>{option}</span><span>{poll.tally[option] ?? 0}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="aaron-participant-heading" className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4">
              <h2 id="aaron-participant-heading" className="text-lg font-bold text-white">Participant responses</h2>
              <form onSubmit={handleParticipantResponse} className="space-y-3">
                <div>
                  <label htmlFor="aaron-participant-name" className="block text-sm text-slate-300 mb-1">Participant name</label>
                  <input id="aaron-participant-name" required maxLength={100} value={participantName} onChange={(e) => setParticipantName(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white" />
                </div>
                <div>
                  <label htmlFor="aaron-participant-response" className="block text-sm text-slate-300 mb-1">Response</label>
                  <select id="aaron-participant-response" value={participantResponse} onChange={(e) => setParticipantResponse(e.target.value)} className="w-full rounded-xl bg-zinc-900 border border-white/15 px-3 py-2 text-white">
                    <option value="GOING">Going</option>
                    <option value="MAYBE">Maybe</option>
                    <option value="NOT_GOING">Not going</option>
                  </select>
                </div>
                <button type="submit" disabled={busy} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save response</button>
              </form>
              <ul aria-label="Saved participant responses" className="space-y-2 text-sm text-slate-300">
                {event.participants.map((participant) => <li key={participant.name} className="flex justify-between border-b border-white/5 pb-2"><span>{participant.name}</span><span>{participant.response.replace('_', ' ')}</span></li>)}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
