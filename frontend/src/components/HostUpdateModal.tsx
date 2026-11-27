import React, { useState } from 'react';
import { api } from '../api/client';
import { Event, HostUpdateResult } from '../types';
import { useToast } from '../context/ToastContext';
import { Modal } from './Modal';

// Matches HOST_UPDATE_MAX_LENGTH on the server
const MAX_LENGTH = 320;

interface HostUpdateModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

/** FR-19: write a short update, see exactly what will be texted and to how many people, then send. */
export const HostUpdateModal: React.FC<HostUpdateModalProps> = ({ event, isOpen, onClose }) => {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<HostUpdateResult | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPreview(null);
    onClose();
  };

  const run = async (send: boolean) => {
    setBusy(true);
    try {
      const res = await api.sendHostUpdate(event.id, message, !send);
      if (send) {
        showToast(res.message, 'success');
        setMessage('');
        close();
      } else {
        setPreview(res);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not send the update', 'error');
    } finally {
      setBusy(false);
    }
  };

  const primary =
    'px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';
  const secondary = 'px-4 py-2 rounded-xl text-xs text-zinc-300 hover:bg-white/5 border border-white/10 cursor-pointer';

  return (
    <Modal isOpen={isOpen} onClose={close} title="Text an update">
      {!preview ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(false);
          }}
          className="space-y-3"
        >
          <p className="text-xs text-zinc-400">
            Everyone on the invitee list who gets texts will receive this. Use it for changes like a new room.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_LENGTH}
            rows={4}
            autoFocus
            aria-label="Update"
            placeholder="We moved to room 2.410."
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm focus:border-white resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 tabular-nums">
              {message.length}/{MAX_LENGTH}
            </span>
            <button type="submit" disabled={busy || !message.trim()} className={primary}>
              {busy ? 'Checking...' : 'Preview'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-100">{preview.preview}</div>
          {preview.recipients_count > 0 ? (
            <p className="text-xs text-zinc-300">{preview.confirm_text}</p>
          ) : (
            <p className="text-xs text-zinc-400">
              Nobody on the invitee list gets texts yet, so there is no one to send this to. Invitees turn texts on after
              they respond.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPreview(null)} className={secondary}>
              Edit
            </button>
            {preview.recipients_count > 0 && (
              <button type="button" onClick={() => run(true)} disabled={busy} className={primary}>
                {busy ? 'Sending...' : 'Send'}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
