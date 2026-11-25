import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { Event, HeatmapResponse } from '../types';
import { useToast } from '../context/ToastContext';
import { formatDateHeading } from '../utils/format';
import { longDateInZone, shortDateInZone, timeRangeInZone } from '../utils/zoned';
import { RocketLaunch, ROCKET_LAUNCH_MS } from '../components/RocketLaunch';
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
  const [isLaunching, setIsLaunching] = useState(false);

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
      setIsLaunching(true);
      setTimeout(() => {
        showToast('Meeting time finalized', 'success');
        navigate(`/events/${id}`);
      }, ROCKET_LAUNCH_MS);
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
      <AnimatePresence>
        {isLaunching && (
          <RocketLaunch
            dateText={longDateInZone(selectedStart, event.timezone)}
            timeText={timeRangeInZone(selectedStart, selectedEnd, event.timezone)}
          />
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
              <span>Best times</span>
            </h2>

            {heatmap.best_slots.length === 0 && (
              <p className="text-sm text-zinc-400 leading-relaxed py-6">
                Nobody has responded yet. Send out the invitee links, and the best times will show up here.
              </p>
            )}

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
                            {shortDateInZone(slot.start_time, event.timezone)}
                          </div>
                          <div className="text-xs font-mono text-cosmic-cyan">
                            {timeRangeInZone(slot.start_time, slot.end_time, event.timezone)}
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
            <h3 className="text-sm font-bold text-white">Your selection</h3>

            {selectedStart && selectedEnd ? (
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-bold text-white">
                    {longDateInZone(selectedStart, event.timezone)}
                  </div>
                  <div className="text-sm font-mono text-cosmic-purple font-semibold">
                    {timeRangeInZone(selectedStart, selectedEnd, event.timezone)}
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
                    disabled={submitting || isLaunching}
                    className="w-full py-3 rounded-2xl text-xs font-bold bg-white text-black hover:bg-zinc-200 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>{submitting ? 'Finalizing...' : 'Confirm and finalize'}</span>
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
