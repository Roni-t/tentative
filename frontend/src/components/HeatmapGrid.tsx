import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeatmapResponse, HeatmapSlot } from '../types';
import { formatDateHeading, formatSlotTime, formatSlotRange } from '../utils/format';
import { Sparkles, Users, UserCheck, UserX, List, Grid as GridIcon, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface HeatmapGridProps {
  heatmap: HeatmapResponse;
  candidateDates: string[];
  isHostOrCohost?: boolean;
  onSelectSlot?: (slot: HeatmapSlot) => void;
  selectedSlot?: HeatmapSlot | null;
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  heatmap,
  candidateDates,
  isHostOrCohost = false,
  onSelectSlot,
  selectedSlot: propSelectedSlot,
}) => {
  const [activeSlot, setActiveSlot] = useState<HeatmapSlot | null>(
    propSelectedSlot || heatmap.best_slots[0] || null
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Group slots by date string YYYY-MM-DD
  const slotsByDate: Record<string, HeatmapSlot[]> = {};
  heatmap.slots.forEach((slot) => {
    const dStr = format(parseISO(slot.start_time), 'yyyy-MM-dd');
    if (!slotsByDate[dStr]) {
      slotsByDate[dStr] = [];
    }
    slotsByDate[dStr].push(slot);
  });

  // Extract unique time labels from the first populated day
  const sampleDay = Object.values(slotsByDate)[0] || [];
  const timeLabels = sampleDay.map((s) => ({
    label: formatSlotTime(s.start_time),
    start_time: s.start_time,
  }));

  // Helper for glow color intensity
  const getCellIntensityStyle = (ratio: number) => {
    if (ratio === 0) {
      return {
        bg: 'bg-white/[0.02]',
        border: 'border-white/[0.05]',
        text: 'text-slate-600',
        shadow: 'none',
      };
    } else if (ratio < 0.3) {
      return {
        bg: 'bg-indigo-950/45',
        border: 'border-indigo-800/35',
        text: 'text-indigo-300',
        shadow: 'none',
      };
    } else if (ratio < 0.6) {
      return {
        bg: 'bg-purple-900/65',
        border: 'border-purple-600/45',
        text: 'text-purple-200',
        shadow: '0 0 12px rgba(168, 85, 247, 0.25)',
      };
    } else if (ratio < 0.9) {
      return {
        bg: 'bg-gradient-to-br from-purple-600/85 to-indigo-600/85',
        border: 'border-purple-400/60',
        text: 'text-white font-semibold',
        shadow: '0 0 18px rgba(168, 85, 247, 0.45)',
      };
    } else {
      // 90%+ Overlap (Hero glow!)
      return {
        bg: 'bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink',
        border: 'border-white/90',
        text: 'text-white font-bold',
        shadow: '0 0 28px rgba(56, 189, 248, 0.65), inset 0 0 12px rgba(255, 255, 255, 0.5)',
      };
    }
  };

  const handleCellClick = (slot: HeatmapSlot) => {
    setActiveSlot(slot);
    if (onSelectSlot) {
      onSelectSlot(slot);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Top Bar: Overview & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl glass-panel">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cosmic-purple/20 text-cosmic-purple flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Participants</div>
              <div className="text-sm font-bold text-white">
                {heatmap.total_respondents}{' '}
                <span className="text-xs font-normal text-slate-400">
                  {heatmap.total_respondents === 1 ? 'response' : 'responses'}
                </span>
              </div>
            </div>
          </div>

          {heatmap.best_slots.length > 0 && (
            <div className="hidden sm:flex items-center space-x-2.5 pl-6 border-l border-white/10">
              <div className="w-9 h-9 rounded-2xl bg-cosmic-cyan/20 text-cosmic-cyan flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-cosmic-cyan">Top Overlap</div>
                <div className="text-xs font-semibold text-white">
                  {formatDateHeading(format(parseISO(heatmap.best_slots[0].start_time), 'yyyy-MM-dd'))} ·{' '}
                  {formatSlotRange(heatmap.best_slots[0].start_time, heatmap.best_slots[0].end_time)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle with animated sliding pill */}
        <div className="flex items-center space-x-1 glass-card p-1 rounded-2xl border border-white/10 relative">
          <button
            onClick={() => setViewMode('grid')}
            className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors z-10 ${
              viewMode === 'grid' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {viewMode === 'grid' && (
              <motion.div
                layoutId="viewmode-pill"
                className="absolute inset-0 bg-white/15 rounded-xl border border-white/20 shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <GridIcon className="w-3.5 h-3.5" />
            <span>Heatmap Grid</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors z-10 ${
              viewMode === 'list' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {viewMode === 'list' && (
              <motion.div
                layoutId="viewmode-pill"
                className="absolute inset-0 bg-white/15 rounded-xl border border-white/20 shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <List className="w-3.5 h-3.5" />
            <span>Ranked List</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Heatmap Matrix */}
          <div className="lg:col-span-8 overflow-x-auto custom-scrollbar rounded-3xl border border-white/10 bg-space-900/60 p-4 backdrop-blur-md">
            <div className="min-w-max">
              {/* Header dates */}
              <div className="flex items-center mb-3">
                <div className="w-20 shrink-0 text-right pr-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Time
                </div>
                {candidateDates.map((dStr) => (
                  <div key={dStr} className="w-28 sm:w-32 shrink-0 px-2 text-center">
                    <div className="text-xs font-bold text-white">{formatDateHeading(dStr)}</div>
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="flex flex-col space-y-1.5">
                {timeLabels.map((tItem, rowIndex) => (
                  <div key={tItem.label} className="flex items-center">
                    <div className="w-20 shrink-0 text-right pr-3 text-[11px] font-mono text-slate-400">
                      {tItem.label}
                    </div>

                    {candidateDates.map((dStr) => {
                      const daySlots = slotsByDate[dStr] || [];
                      const slot = daySlots[rowIndex];
                      if (!slot) {
                        return <div key={dStr} className="w-28 sm:w-32 h-10 mx-1 opacity-0" />;
                      }

                      const style = getCellIntensityStyle(slot.ratio);
                      const isSelected =
                        activeSlot &&
                        activeSlot.start_time === slot.start_time &&
                        activeSlot.end_time === slot.end_time;

                      return (
                        <motion.button
                          key={slot.start_time}
                          type="button"
                          onClick={() => handleCellClick(slot)}
                          whileHover={{ scale: 1.05, y: -1.5 }}
                          whileTap={{ scale: 0.96 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                          className={`w-28 sm:w-32 h-10 mx-1 rounded-xl flex items-center justify-center text-xs border relative group cursor-pointer ${
                            style.bg
                          } ${style.border} ${style.text} ${
                            isSelected ? 'ring-2 ring-cosmic-cyan scale-[1.03] z-10' : ''
                          }`}
                          style={{
                            boxShadow: isSelected
                              ? '0 0 22px rgba(56, 189, 248, 0.6)'
                              : style.shadow,
                          }}
                        >
                          <span className="font-mono text-xs">
                            {slot.count}/{slot.total_participants}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Darker = fewer free · Brighter glow = highest alignment</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-500">0%</span>
                  <div className="w-3.5 h-3.5 rounded bg-white/[0.04] border border-white/10" />
                  <div className="w-3.5 h-3.5 rounded bg-indigo-950 border border-indigo-800/40" />
                  <div className="w-3.5 h-3.5 rounded bg-purple-900 border border-purple-600/40" />
                  <div className="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-400" />
                  <div className="w-3.5 h-3.5 rounded bg-gradient-to-r from-cosmic-purple to-cosmic-cyan border border-white" />
                  <span className="text-[10px] text-cosmic-cyan font-bold">100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slot Inspector Sidebar with Smooth Spring Transition */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="p-5 rounded-3xl glass-panel border border-white/15 sticky top-24">
              <div className="text-[10px] uppercase font-bold tracking-wider text-cosmic-cyan mb-2">
                Selected Slot Details
              </div>

              <AnimatePresence mode="wait">
                {activeSlot ? (
                  <motion.div
                    key={activeSlot.start_time}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-white">
                        {format(parseISO(activeSlot.start_time), 'EEEE, MMM d')}
                      </h4>
                      <p className="text-xs font-mono text-cosmic-purple">
                        {formatSlotRange(activeSlot.start_time, activeSlot.end_time)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <span className="text-xs text-slate-300">Availability Overlap</span>
                      <span className="text-sm font-bold font-mono text-white">
                        {activeSlot.count} of {activeSlot.total_participants} free (
                        {Math.round(activeSlot.ratio * 100)}%)
                      </span>
                    </div>

                    {/* Available List */}
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 mb-2">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Available ({activeSlot.available_participants.length})</span>
                      </div>
                      {activeSlot.available_participants.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlot.available_participants.map((name) => (
                            <span
                              key={name}
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs font-medium"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic">No one marked available</div>
                      )}
                    </div>

                    {/* Unavailable List */}
                    {activeSlot.unavailable_participants.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 mb-2">
                          <UserX className="w-3.5 h-3.5" />
                          <span>Unavailable ({activeSlot.unavailable_participants.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlot.unavailable_participants.map((name) => (
                            <span
                              key={name}
                              className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-medium"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Host action shortcut */}
                    {isHostOrCohost && onSelectSlot && (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectSlot(activeSlot)}
                        className="w-full mt-4 py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-cosmic-purple via-cosmic-cyan to-cosmic-pink text-white shadow-glow-sm hover:shadow-glow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Lock In & Finalize This Time</span>
                      </motion.button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 text-center text-xs text-slate-500"
                  >
                    Select any cell in the heatmap to view who is free.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Ranked List View */
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cosmic-cyan" />
            <span>Ranked Schedule Alignment (Screen Reader Accessible)</span>
          </h3>

          <div className="divide-y divide-white/10">
            {heatmap.best_slots.map((slot, idx) => (
              <motion.div
                key={slot.start_time}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-xl bg-cosmic-purple/20 text-cosmic-purple font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {format(parseISO(slot.start_time), 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-xs font-mono text-cosmic-cyan">
                      {formatSlotRange(slot.start_time, slot.end_time)}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      <span className="font-semibold text-emerald-400">
                        {slot.count} of {slot.total_participants} free
                      </span>{' '}
                      ({Math.round(slot.ratio * 100)}% overlap): {slot.available_participants.join(', ')}
                    </div>
                  </div>
                </div>

                {isHostOrCohost && onSelectSlot && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSelectSlot(slot)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
                  >
                    Select this time
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
