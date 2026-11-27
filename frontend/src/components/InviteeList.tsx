import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Share } from 'lucide-react';
import { api } from '../api/client';
import { Event, Invitee } from '../types';
import { useToast } from '../context/ToastContext';

interface InviteeListProps {
  event: Event;
  groupLink: string;
}

// Status pills are outlines: colored border and text, no fill
const pill = 'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 max-sm:px-2 py-0.5 text-[11px] font-medium';
const RESPONSE_PILL = {
  responded: `${pill} border-emerald-400/60 text-emerald-300`,
  waiting: `${pill} border-zinc-600 text-zinc-400`,
};

const iconButton =
  'w-8 h-8 inline-flex items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer';

export const InviteeList: React.FC<InviteeListProps> = ({ event, groupLink }) => {
  const { showToast } = useToast();
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [name, setName] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copiedTimer = useRef<number>();
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

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const inviteMessage = (invitee: Invitee) =>
    `${event.creator_name || 'Someone'} would like to know when you can meet for ${event.title}! ${invitee.link}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Link copied', 'success');
      return true;
    } catch {
      showToast('Could not copy. Copy it by hand instead.', 'error');
      return false;
    }
  };

  // Copy is the link only; the message is for the share sheet
  const copyLink = async (invitee: Invitee) => {
    if (!(await copy(invitee.link))) return;
    setCopiedId(invitee.id);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopiedId(null), 1500);
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

  const textStatus = (invitee: Invitee) => {
    if (invitee.can_text) {
      return invitee.reminder_sent_at ? 'Gets texts, reminder sent' : 'Gets texts';
    }
    return invitee.sms_opted_out ? 'Opted out of texts' : 'No texts';
  };

  return (
    <section className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Invitees</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Send each person their own link from your phone. Phone numbers are never shown here.
          </p>
        </div>
        <button
          onClick={() => copy(groupLink)}
          className="px-3 py-1.5 rounded-lg text-xs border border-white/15 text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
        >
          Copy group link
        </button>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Invitee name"
          aria-label="Invitee name"
          className="flex-1 min-w-0 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs"
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
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-500">
              <tr className="border-b border-white/10">
                <th scope="col" className="py-2 px-2 max-sm:px-1.5 font-medium sm:w-[55%]">Name</th>
                <th scope="col" className="py-2 px-2 max-sm:px-1.5 font-medium sm:w-[17%]">Response</th>
                <th scope="col" className="py-2 px-2 max-sm:px-1.5 font-medium">Updates</th>
                <th scope="col" className="py-2 px-2 max-sm:px-1.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invitees.map((invitee) => (
                <tr key={invitee.id}>
                  <td className="py-3 px-2 max-sm:px-1.5 text-sm max-sm:text-xs text-white break-words">
                    {invitee.name}
                    {invitee.joined_via_link && (
                      <span className="block text-[11px] text-zinc-500">joined via link</span>
                    )}
                  </td>
                  <td className="py-3 px-2 max-sm:px-1.5">
                    <span className={invitee.responded_at ? RESPONSE_PILL.responded : RESPONSE_PILL.waiting}>
                      {invitee.responded_at ? 'Responded' : 'Not responded'}
                    </span>
                  </td>
                  <td className={`py-3 px-2 max-sm:px-1.5 ${invitee.can_text ? 'text-emerald-300' : 'text-zinc-500'}`}>
                    {textStatus(invitee)}
                  </td>
                  <td className="py-3 px-2 max-sm:px-1.5">
                    {!invitee.joined_via_link && (
                      <div className="flex max-sm:flex-col items-end justify-end gap-1.5">
                        {canShare && (
                          <button
                            onClick={() => share(invitee)}
                            aria-label={`Share ${invitee.name}'s link`}
                            title="Share"
                            className={iconButton}
                          >
                            <Share className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => copyLink(invitee)}
                          aria-label={`Copy ${invitee.name}'s link`}
                          title="Copy link"
                          className={iconButton}
                        >
                          {copiedId === invitee.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
