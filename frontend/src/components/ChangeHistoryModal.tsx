import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import { ChangeLog } from '../types';
import { History, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ChangeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
}

export const ChangeHistoryModal: React.FC<ChangeHistoryModalProps> = ({ isOpen, onClose, eventId }) => {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .getChangelog(eventId)
        .then(setLogs)
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, eventId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Event Change History">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading audit history...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No recorded changes yet.</div>
        ) : (
          <div className="relative border-l border-white/10 ml-3 space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-6">
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-black" />
                <div className="text-xs font-bold text-white capitalize">{log.action.replace('_', ' ')}</div>
                <div className="text-xs text-zinc-300 mt-0.5">{log.details}</div>
                <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mt-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{format(parseISO(log.timestamp), 'MMM d, yyyy · h:mm a')}</span>
                  <span>·</span>
                  <span>{log.user_name || 'System'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
