import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

type Poll = { id: number; question: string; category: string; options: string[]; tally: Record<string, number> };

type Props = { eventId: number; canManage: boolean };

export const AaronPollsPanel: React.FC<Props> = ({ eventId, canManage }) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('General');
  const [optionsText, setOptionsText] = useState('');
  const [voterName, setVoterName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => setPolls(await api.listAaronPolls(eventId));
  useEffect(() => { reload().catch((err) => setError(err.message || 'Could not load polls.')); }, [eventId]);

  const createPoll = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await api.createAaronPoll(eventId, question, category, optionsText.split('\n').map((item) => item.trim()).filter(Boolean));
      setQuestion(''); setOptionsText(''); await reload();
    } catch (err: any) { setError(err.message || 'Could not create poll.'); }
    finally { setBusy(false); }
  };

  const vote = async (poll: Poll, option: string) => {
    if (!voterName.trim()) { setError('Enter your name before voting.'); return; }
    setBusy(true); setError('');
    try { await api.voteAaronPoll(eventId, poll.id, voterName.trim(), option); await reload(); }
    catch (err: any) { setError(err.message || 'Could not submit vote.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5" aria-labelledby="event-polls-heading">
      <div>
        <h2 id="event-polls-heading" className="text-lg font-bold text-white">Event Polls</h2>
        <p className="text-xs text-slate-400 mt-1">Vote on choices for this event.</p>
      </div>
      <label className="block text-xs text-slate-300">Your name
        <input value={voterName} onChange={(e) => setVoterName(e.target.value)} maxLength={100} autoComplete="name" className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cosmic-cyan" />
      </label>
      {polls.map((poll) => (
        <article key={poll.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div><span className="text-[10px] uppercase tracking-wider text-cosmic-cyan">{poll.category}</span><h3 className="text-sm font-semibold text-white">{poll.question}</h3></div>
          <div className="flex flex-wrap gap-2">
            {poll.options.map((option) => (
              <button key={option} type="button" disabled={busy} onClick={() => vote(poll, option)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cosmic-cyan disabled:opacity-50">
                {option} <span className="text-slate-400">({poll.tally?.[option] ?? 0})</span>
              </button>
            ))}
          </div>
        </article>
      ))}
      {polls.length === 0 && <p className="text-xs text-slate-500">No polls yet.</p>}
      {canManage && <form onSubmit={createPoll} className="grid gap-3 border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white">Create a poll</h3>
        <label className="text-xs text-slate-300">Question
          <input required value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cosmic-cyan" />
        </label>
        <label className="text-xs text-slate-300">Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={100} className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cosmic-cyan" />
        </label>
        <label className="text-xs text-slate-300">Options (one per line)
          <textarea required value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cosmic-cyan" />
        </label>
        <button disabled={busy} className="justify-self-start px-4 py-2 rounded-xl bg-white text-slate-950 text-xs font-bold disabled:opacity-50">Create poll</button>
      </form>}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </section>
  );
};
