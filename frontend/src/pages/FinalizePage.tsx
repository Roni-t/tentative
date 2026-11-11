import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { Event, HeatmapResponse } from '../types';
import { useToast } from '../context/ToastContext';
import { formatSlotRange, formatDateHeading } from '../utils/format';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, ArrowLeft, Clock, MapPin, Sparkles, Send, Lock } from 'lucide-react';

export const FinalizePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected time slot
  const stateStart = (location.state as any)?.startTime;
  const stateEnd = (location.state as any)?.endTime;

  const [selectedStart, setSelectedStart] = useState<string>(stateStart || '');
  const [selectedEnd, setSelectedEnd] = useState<string>(stateEnd || '');
  const [notifySms, setNotifySms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOrbitLocking, setIsOrbitLocking] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getEvent(id), api.getHeatmap(id)])
      .then(([ev, hm]) => {
        setEvent(ev);
        setHeatmap(hm);
        if (!selectedStart && hm.best_slots.length > 0) {
          setSelectedStart(hm.best_slots[0].start_time);
          setSelectedEnd(hm.best_slots[0].end_time);
        }
      })
      .catch((err) => showToast(err.message || 'Error loading finalize options', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirmFinalize = async () => {
    if (!id || !selectedStart || !selectedEnd) return;
    setSubmitting(true);
    try {
      await api.finalizeEvent(id, selectedStart, selectedEnd, notifySms);
      setIsOrbitLocking(true);
      setTimeout(() => {
        showToast('Orbit successfully locked and finalized!', 'success');
        navigate(`/events/${id}`);
      }, 2300);
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize meeting time', 'error');
      setSubmitting(false);
    }
  };

  if (loading || !event || !heatmap) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 animate-pulse">Loading finalize panel...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 relative">
      {/* Orbit Lock Modal / Full Screen Animation */}
      <AnimatePresence>
        {isOrbitLocking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/90 backdrop-blur-2xl px-4"
          >
            <div className="relative flex flex-col items-center justify-center text-center space-y-6 max-w-md w-full">
              {/* Concentric Rotating Rings Aligning */}
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Outermost Ring */}
                <motion.div
                  initial={{ rotate: 0, scale: 0.8, opacity: 0.4 }}
                  animate={{ rotate: [0, 360, 720], scale: 1, opacity: 0.8 }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-56 h-56 rounded-full border border-cosmic-purple/50 border-dashed"
                />

                {/* Middle Ring */}
                <motion.div
                  initial={{ rotate: 180, scale: 0.85 }}
                  animate={{ rotate: [180, -180, 0], scale: 1 }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-44 h-44 rounded-full border-2 border-cosmic-cyan/60"
                  style={{ borderRightColor: 'transparent', borderLeftColor: 'transparent' }}
                />

                {/* Innermost Ring */}
                <motion.div
                  initial={{ rotate: -90, scale: 0.9 }}
                  animate={{ rotate: [-90, 270, 0], scale: 1 }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-32 h-32 rounded-full border-2 border-cosmic-pink/70"
                  style={{ borderTopColor: 'transparent' }}
                />

                {/* Central Lock Emblem */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.25, 1], opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8, type: 'spring', stiffness: 350, damping: 20 }}
                  className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-cosmic-purple via-cosmic-cyan to-cosmic-pink p-[2px] shadow-glow-lg flex items-center justify-center text-white"
                >
                  <div className="w-full h-full rounded-full bg-space-900 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                  </div>
                </motion.div>

                {/* Flash Burst Shockwave */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 2.4], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1, delay: 1.2, ease: 'easeOut' }}
                  className="absolute w-40 h-40 rounded-full bg-gradient-to-r from-cosmic-cyan via-white to-cosmic-pink blur-xl"
                />
              </div>

              {/* Status Text with spring reveal */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="space-y-2"
              >
                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ORBIT LOCKED</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">Meeting Time Finalized!</h3>
                <p className="text-xs font-mono text-cosmic-cyan">
                  {format(parseISO(selectedStart), 'EEEE, MMMM d, yyyy')} · {formatSlotRange(selectedStart, selectedEnd)}
                </p>
                <p className="text-xs text-slate-400">Aligning all participant calendars...</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        to={`/events/${event.id}/heatmap`}
        className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to heatmap</span>
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Finalize Meeting Time</h1>
        <p className="text-xs text-slate-400 mt-1">
          {event.title} · {heatmap.total_respondents} responses collected
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Slots */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cosmic-purple" />
              <span>Top Time Options from Overlap Matrix</span>
            </h2>

            <div className="space-y-3">
              {heatmap.best_slots.map((slot, index) => {
                const isSelected = selectedStart === slot.start_time;
                return (
                  <motion.div
                    key={slot.start_time}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setSelectedStart(slot.start_time);
                      setSelectedEnd(slot.end_time);
                    }}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'border-cosmic-purple bg-cosmic-purple/15 shadow-glow-sm'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-cosmic-purple bg-cosmic-purple' : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {format(parseISO(slot.start_time), 'EEEE, MMM d')}
                          </div>
                          <div className="text-xs font-mono text-cosmic-cyan">
                            {formatSlotRange(slot.start_time, slot.end_time)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-emerald-400">
                          {slot.count} / {slot.total_participants} free
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {Math.round(slot.ratio * 100)}% overlap
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Confirmation Box */}
        <div className="lg:col-span-5">
          <div className="glass-panel p-6 rounded-3xl border border-white/15 sticky top-24 space-y-4">
            <h3 className="text-sm font-bold text-white">Lock Orbit Selection</h3>

            {selectedStart && selectedEnd ? (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-bold text-white">
                    {format(parseISO(selectedStart), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm font-mono text-cosmic-purple font-semibold">
                    {formatSlotRange(selectedStart, selectedEnd)}
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-cosmic-cyan shrink-0" />
                    <span className="truncate">{event.location || 'Online Meeting'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-cosmic-pink shrink-0" />
                    <span>Timezone: {event.timezone}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      id="notifySms"
                      checked={notifySms}
                      onChange={(e) => setNotifySms(e.target.checked)}
                      className="w-4 h-4 rounded text-cosmic-purple bg-white/10 border-white/20 focus:ring-cosmic-purple cursor-pointer"
                    />
                    <label htmlFor="notifySms" className="text-xs text-slate-300 cursor-pointer flex items-center space-x-1">
                      <Send className="w-3 h-3 text-cosmic-purple" />
                      <span>Notify all participants via SMS alert</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex flex-col space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmFinalize}
                    disabled={submitting || isOrbitLocking}
                    className="w-full py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? 'Locking orbit...' : 'Confirm & Finalize Orbit'}</span>
                  </motion.button>
                  <Link
                    to={`/events/${event.id}`}
                    className="w-full py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white text-center hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Please choose a slot from the left column.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
