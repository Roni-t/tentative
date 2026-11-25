// FR-24 Shareable URLs for groups of events (owner: Daniel; implemented by Divyam).
// GroupsPage: a host bundles events into one link. GroupSharePage: what people see when they open it.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Layers, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Event, GroupInfo } from '../types';

const fullLink = (token: string | null) => (token ? `${window.location.origin}/groups/${token}` : '');

export const GroupsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    api.listEvents().then((list: Event[]) => setEvents(list.filter((e) => e.status !== 'canceled'))).catch(() => {});
    api.listGroups().then(setGroups).catch(() => {});
  }, [user, authLoading, navigate]);

  const toggle = (eventId: number) =>
    setPicked((cur) => (cur.includes(eventId) ? cur.filter((x) => x !== eventId) : [...cur, eventId]));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const group = await api.createGroup(name, picked);
      setGroups((cur) => [group, ...cur]);
      setPicked([]);
      setName('');
      showToast(`Group link created for ${group.events.length} events.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not create the group link.', 'error');
    }
  };

  const rotate = async (groupId: number) => {
    try {
      const updated = await api.rotateGroupLink(groupId);
      setGroups((cur) => cur.map((g) => (g.id === groupId ? updated : g)));
      showToast('New link made. The old link no longer works.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not rotate the link.', 'error');
    }
  };

  const copy = (token: string | null) => {
    navigator.clipboard?.writeText(fullLink(token));
    showToast('Link copied.', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link to="/events" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to my events</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Group links</h1>
        <p className="text-xs text-slate-400 mt-0.5">Share several events with one link</p>
      </div>

      <form onSubmit={create} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div>
          <label htmlFor="group-name" className="block text-xs font-semibold text-slate-300 mb-1.5">Group name</label>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CS 3354 team meetings"
            className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs"
          />
        </div>
        <fieldset>
          <legend className="block text-xs font-semibold text-slate-300 mb-2">Events to include</legend>
          {events.length === 0 && <p className="text-xs text-zinc-500">You have no active events yet.</p>}
          <div className="space-y-2">
            {events.map((ev) => (
              <label key={ev.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-white cursor-pointer">
                <input type="checkbox" checked={picked.includes(ev.id)} onChange={() => toggle(ev.id)} />
                <span className="font-semibold">{ev.title}</span>
                <span className="text-zinc-500">{ev.status}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!name.trim() || picked.length === 0}
            className="px-6 py-2.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-40 cursor-pointer"
          >
            Create group link
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="glass-panel p-5 rounded-3xl border border-zinc-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Layers className="w-4 h-4" />
                {g.name} <span className="text-xs font-normal text-zinc-400">({g.events.length} events)</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copy(g.share_token)} className="pill pill-dark !py-2 !px-4 !text-xs">
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy link</span>
                </button>
                <button onClick={() => rotate(g.id)} className="pill pill-dark !py-2 !px-4 !text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>New link</span>
                </button>
              </div>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 break-all">{fullLink(g.share_token)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GroupSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.openGroupLink(token).then(setGroup).catch((err: any) => setError(err.message || 'This link does not work.'));
  }, [token]);

  if (error) {
    return <div className="max-w-xl mx-auto px-4 py-16 text-center text-sm text-zinc-300">{error}</div>;
  }
  if (!group) {
    return <div className="max-w-xl mx-auto px-4 py-16 text-center text-xs text-zinc-500">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Group</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{group.name}</h1>
        <p className="text-xs text-slate-400 mt-0.5">Pick an event to add your availability</p>
      </div>
      <div className="space-y-3">
        {group.events.map((ev) => (
          <div key={ev.id} className="glass-panel p-5 rounded-3xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white">{ev.title}</div>
              <div className="text-xs text-zinc-400">
                {ev.status === 'finalized' ? 'Time finalized' : `${ev.candidate_dates.length} possible dates`}
                {ev.location ? ` · ${ev.location}` : ''}
              </div>
            </div>
            {ev.share_token && (
              <Link to={`/share/${ev.share_token}`} className="px-5 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200">
                Open
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
