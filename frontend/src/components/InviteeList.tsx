import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Event, Invitee } from '../types';
import { useToast } from '../context/ToastContext';

interface InviteeListProps {
  event: Event;
  groupLink: string;
}

export const InviteeList: React.FC<InviteeListProps> = ({ event, groupLink }) => {
  const { showToast } = useToast();
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [name, setName] = useState('');
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const load = async () => {
    try {
      setInvitees(await api.listInvitees(event.id));
    } catch (err: any) {
      showToast(err.message || 'Could not load invitees', 'error');
    }
  };

  useEffect(() => {
    load();
  }, [event.id]);

  const inviteMessage = (invitee: Invitee) =>
    `${event.creator_name || 'Someone'} would like to know when you can meet for ${event.title}! ${invitee.link}`;

  const reminderMessage = (invitee: Invitee) =>
    `Reminder: please share your availability for ${event.title}. ${invitee.link}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied', 'success');
    } catch {
      showToast('Could not copy. Copy it by hand instead.', 'error');
    }
  };

  const share = async (invitee: Invitee) => {
    try {
      await navigator.share({ text: inviteMessage(invitee) });
    } catch {
      // The person closed the share sheet, nothing to do
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.addInvitee(event.id, name.trim());
      setName('');
      load();
    } catch (err: any) {
      showToast(err.message || 'Could not add invitee', 'error');
    }
  };

  const handleNewLink = async (invitee: Invitee) => {
    try {
      await api.newInviteeLink(event.id, invitee.id);
      showToast(`New link made for ${invitee.name}. The old one no longer works.`, 'info');
      load();
    } catch (err: any) {
      showToast(err.message || 'Could not make a new link', 'error');
    }
  };

  const textStatus = (invitee: Invitee) => {
    if (invitee.can_text) {
      return invitee.reminder_sent_at ? 'Gets texts, reminder sent' : 'Gets texts';
    }
    return invitee.sms_opted_out ? 'Opted out of texts' : 'No texts';
  };

  const buttonClass =
    'px-3 py-1.5 rounded-lg text-xs border border-white/15 text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer';

  return (
    <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Invitees</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Send each person their own link from your phone. Phone numbers are never shown here.
          </p>
        </div>
        <button onClick={() => copy(groupLink)} className={buttonClass}>
          Copy group link
        </button>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Invitee name"
          className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 cursor-pointer"
        >
          Add
        </button>
      </form>

      {invitees.length === 0 ? (
        <p className="text-xs text-zinc-500">No invitees yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {invitees.map((invitee) => (
            <li key={invitee.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm text-white">
                  {invitee.name}
                  {invitee.joined_via_link && <span className="text-xs text-zinc-500"> (joined via link)</span>}
                </div>
                <div className="text-xs text-zinc-400">
                  {invitee.responded_at ? 'Responded' : 'Not responded'} &middot; {textStatus(invitee)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!invitee.joined_via_link && canShare && (
                  <button onClick={() => share(invitee)} className={buttonClass}>
                    Share
                  </button>
                )}
                {!invitee.joined_via_link && (
                  <button onClick={() => copy(inviteMessage(invitee))} className={buttonClass}>
                    Copy
                  </button>
                )}
                {!invitee.responded_at && !invitee.can_text && (
                  <button onClick={() => copy(reminderMessage(invitee))} className={buttonClass}>
                    Copy reminder
                  </button>
                )}
                {!invitee.joined_via_link && (
                  <button onClick={() => handleNewLink(invitee)} className={buttonClass}>
                    New link
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
