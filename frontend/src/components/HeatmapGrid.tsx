import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeatmapResponse, HeatmapSlot } from '../types';
import { formatSlotRange, formatDayName, formatDateSub, formatDateInZone } from '../utils/format';
import { buildHeatmapTimeRows, getDateKeyInTimeZone } from '../utils/timezone';
import { Sparkles, Users, UserCheck, UserX, List, Grid as GridIcon, CheckCircle, Calendar, Clock, Info } from 'lucide-react';

interface HeatmapGridProps {
  heatmap: HeatmapResponse;
  candidateDates: string[];
  timezone?: string;
  isHostOrCohost?: boolean;
  onSelectSlot?: (slot: HeatmapSlot) => void;
  selectedSlot?: HeatmapSlot | null;
}

export const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  heatmap,
  candidateDates,
  timezone,
  isHostOrCohost = false,
  onSelectSlot,
  selectedSlot: propSelectedSlot,
}) => {
  const [activeSlot, setActiveSlot] = useState<HeatmapSlot | null>(
    propSelectedSlot || heatmap.best_slots[0] || null
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Group slots by their calendar date in the event's timezone
  const slotsByDate: Record<string, HeatmapSlot[]> = {};
  heatmap.slots.forEach((slot) => {
    const dStr = getDateKeyInTimeZone(slot.start_time, timezone);
    if (!slotsByDate[dStr]) {
      slotsByDate[dStr] = [];
    }
    slotsByDate[dStr].push(slot);
  });

  const { rows: timeRows, slotKeysByDate } = buildHeatmapTimeRows(slotsByDate, timezone);
  const slotsByRowKey: Record<string, Record<string, HeatmapSlot>> = {};
  Object.entries(slotsByDate).forEach(([dateKey, slots]) => {
    slotsByRowKey[dateKey] = {};
    slots.forEach((slot, index) => {
      slotsByRowKey[dateKey][slotKeysByDate[dateKey][index]] = slot;
    });
  });

  // Monochrome / Black & White heatmap intensity scale
  const getMonochromeIntensityStyle = (ratio: number) => {
    if (ratio === 0) {
      return {
        bg: 'bg-black/60',
        border: 'border-zinc-900',
        text: 'text-zinc-600',
        shadow: 'none',
      };
    } else if (ratio < 0.3) {
      return {
        bg: 'bg-zinc-900/90',
        border: 'border-zinc-800',
        text: 'text-zinc-400',
        shadow: 'none',
      };
    } else if (ratio < 0.6) {
      return {
        bg: 'bg-zinc-700/80',
        border: 'border-zinc-600',
        text: 'text-zinc-100',
        shadow: 'none',
      };
    } else if (ratio < 0.9) {
      return {
        bg: 'bg-zinc-300',
        border: 'border-white/80',
        text: 'text-black font-semibold',
        shadow: '0 0 12px rgba(255, 255, 255, 0.25)',
      };
    } else {
      // 90%+ Overlap (Max White Glow)
      return {
        bg: 'bg-white',
        border: 'border-white',
        text: 'text-black font-extrabold',
        shadow: '0 0 20px rgba(255, 255, 255, 0.75), inset 0 0 8px rgba(0, 0, 0, 0.1)',
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
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-zinc-800 bg-zinc-950/80">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Participants</div>
              <div className="text-sm font-bold text-white">
                {heatmap.total_respondents}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  {heatmap.total_respondents === 1 ? 'response' : 'responses'}
                </span>
              </div>
            </div>
          </div>

          {heatmap.best_slots.length > 0 && (
            <div className="hidden sm:flex items-center space-x-2.5 pl-6 border-l border-zinc-800">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Top Overlap</div>
                <div className="text-xs font-semibold text-white">
                  {formatDayName(getDateKeyInTimeZone(heatmap.best_slots[0].start_time, timezone))} ·{' '}
                  {formatSlotRange(heatmap.best_slots[0].start_time, heatmap.best_slots[0].end_time, timezone)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle with animated sliding pill */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 relative">
          <button
            onClick={() => setViewMode('grid')}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors z-10 ${
              viewMode === 'grid' ? 'text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {viewMode === 'grid' && (
              <motion.div
                layoutId="viewmode-pill"
                className="absolute inset-0 bg-white rounded-lg -z-10 shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
            <GridIcon className="w-3.5 h-3.5" />
            <span>Schedule Grid</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors z-10 ${
              viewMode === 'list' ? 'text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {viewMode === 'list' && (
              <motion.div
                layoutId="viewmode-pill"
                className="absolute inset-0 bg-white rounded-lg -z-10 shadow-sm"
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
          {/* Heatmap Matrix (University Timetable Schedule Layout) */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-zinc-800 bg-black shadow-2xl">
              <div className="min-w-max">
                {/* Header Bar Across All Days (Collegiate Schedule Banner) */}
                <div className="flex items-stretch bg-zinc-900/90 border-b border-zinc-700/80 sticky top-0 z-20">
                  <div className="w-20 sm:w-24 shrink-0 p-3 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-800 flex items-center justify-end">
                    Time
                  </div>
                  {candidateDates.map((dStr) => (
                    <div
                      key={dStr}
                      className="w-32 sm:w-40 md:w-44 shrink-0 py-3 px-3 text-center border-r border-zinc-800 last:border-r-0 flex flex-col items-center justify-center"
                    >
                      <span className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                        {formatDayName(dStr)}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {formatDateSub(dStr)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Rows with Time Gutter and Schedule Cells */}
                <div className="flex flex-col">
                  {timeRows.map((tItem) => (
                    <div
                      key={tItem.key}
                      className={`flex items-stretch ${
                        tItem.isTopHour
                          ? 'border-t border-zinc-800 bg-zinc-950/40'
                          : 'border-t border-zinc-900/70 bg-black'
                      }`}
                    >
                      {/* Left time label */}
                      <div className="w-20 sm:w-24 shrink-0 pr-3 py-1.5 text-right border-r border-zinc-800/80 flex items-center justify-end">
                        <span
                          className={`font-mono text-[11px] ${
                            tItem.isTopHour ? 'font-bold text-white' : 'font-normal text-zinc-500'
                          }`}
                        >
                          {tItem.label}
                        </span>
                      </div>

                      {/* Day Columns */}
                      {candidateDates.map((dStr) => {
                        const slot = slotsByRowKey[dStr]?.[tItem.key];
                        if (!slot) {
                          return (
                            <div
                              key={dStr}
                              className="w-32 sm:w-40 md:w-44 h-9 border-r border-zinc-800/80 last:border-r-0 opacity-0"
                            />
                          );
                        }

                        const style = getMonochromeIntensityStyle(slot.ratio);
                        const isSelected =
                          activeSlot &&
                          activeSlot.start_time === slot.start_time &&
                          activeSlot.end_time === slot.end_time;

                        return (
                          <div
                            key={slot.start_time}
                            className="w-32 sm:w-40 md:w-44 h-8 sm:h-9 px-1.5 py-0.5 border-r border-zinc-800/80 last:border-r-0 flex items-center"
                          >
                            <motion.button
                              type="button"
                              onClick={() => handleCellClick(slot)}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className={`w-full h-full rounded-md flex items-center justify-between px-2 text-xs border cursor-pointer transition-all duration-100 ${
                                style.bg
                              } ${style.border} ${style.text} ${
                                isSelected ? 'ring-2 ring-white scale-[1.02] z-10' : ''
                              }`}
                              style={{
                                boxShadow: isSelected
                                  ? '0 0 16px rgba(255, 255, 255, 0.8)'
                                  : style.shadow,
                              }}
                            >
                              <span className="font-mono text-[11px]">
                                {slot.count}/{slot.total_participants}
                              </span>
                              {slot.ratio >= 0.9 && (
                                <span className="text-[10px] font-bold">★</span>
                              )}
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Monochrome Legend */}
              <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center justify-between text-xs text-zinc-400">
                <span className="text-[11px]">Darker = fewer free · Pure white = unanimous group alignment</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-zinc-500">0%</span>
                  <div className="w-3 h-3 rounded bg-black border border-zinc-800" title="0%" />
                  <div className="w-3 h-3 rounded bg-zinc-900 border border-zinc-700" title="25%" />
                  <div className="w-3 h-3 rounded bg-zinc-700 border border-zinc-500" title="50%" />
                  <div className="w-3 h-3 rounded bg-zinc-300 border border-zinc-200" title="75%" />
                  <div className="w-3 h-3 rounded bg-white border border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" title="100%" />
                  <span className="text-[10px] text-white font-bold">100%</span>
                </div>
              </div>
            </div>

            {/* University Schedule Block Cards (Matches Course Schedule Cards from Screenshot) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Calendar className="w-4 h-4 text-white" />
                  <span>Identified Consensus Blocks</span>
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  {heatmap.best_slots.length} top options found
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {heatmap.best_slots.slice(0, 4).map((slot, idx) => {
                  const slotDateKey = getDateKeyInTimeZone(slot.start_time, timezone);
                  const dayName = formatDayName(slotDateKey);
                  const dateSub = formatDateSub(slotDateKey);
                  const isSelected =
                    activeSlot &&
                    activeSlot.start_time === slot.start_time &&
                    activeSlot.end_time === slot.end_time;

                  return (
                    <motion.div
                      key={slot.start_time}
                      whileHover={{ y: -2 }}
                      onClick={() => handleCellClick(slot)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-zinc-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                          : 'bg-zinc-950/80 hover:bg-zinc-900/90 border-zinc-800'
                      }`}
                      style={{ borderLeftWidth: '5px', borderLeftColor: idx === 0 ? '#FFFFFF' : '#A1A1AA' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-xs font-bold text-white">
                            {idx === 0 ? 'Top Orbit Window' : `Option #${idx + 1}`}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-black font-bold">
                          {slot.count}/{slot.total_participants} Free
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-zinc-200 font-semibold">
                        {dayName}, {dateSub}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        {formatSlotRange(slot.start_time, slot.end_time, timezone)}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                          {slot.available_participants.slice(0, 3).join(', ')}
                          {slot.available_participants.length > 3 ? ` +${slot.available_participants.length - 3}` : ''}
                        </span>
                        {isHostOrCohost && onSelectSlot && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSlot(slot);
                            }}
                            className="px-2.5 py-1 rounded bg-white hover:bg-zinc-200 text-black font-semibold text-[10px] transition-colors"
                          >
                            Finalize
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Slot Inspector Sidebar */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="p-5 rounded-2xl glass-panel border border-zinc-800 bg-zinc-950/90 sticky top-24 shadow-2xl">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-white" />
                <span>Slot Overlap Inspector</span>
              </div>

              <AnimatePresence mode="wait">
                {activeSlot ? (
                  <motion.div
                    key={activeSlot.start_time}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {formatDateInZone(activeSlot.start_time, timezone)}
                      </h4>
                      <p className="text-xs font-mono text-zinc-300">
                        {formatSlotRange(activeSlot.start_time, activeSlot.end_time, timezone)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Attendance Alignment</span>
                      <span className="text-sm font-bold font-mono text-white">
                        {activeSlot.count} of {activeSlot.total_participants} free (
                        {Math.round(activeSlot.ratio * 100)}%)
                      </span>
                    </div>

                    {/* Available List */}
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-white mb-2">
                        <UserCheck className="w-3.5 h-3.5 text-white" />
                        <span>Available ({activeSlot.available_participants.length})</span>
                      </div>
                      {activeSlot.available_participants.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlot.available_participants.map((name) => (
                            <span
                              key={name}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs font-medium"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500 italic">No one marked available</div>
                      )}
                    </div>

                    {/* Unavailable List */}
                    {activeSlot.unavailable_participants.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-400 mb-2">
                          <UserX className="w-3.5 h-3.5" />
                          <span>Unavailable ({activeSlot.unavailable_participants.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeSlot.unavailable_participants.map((name) => (
                            <span
                              key={name}
                              className="px-2.5 py-1 rounded-lg bg-black/60 border border-zinc-800 text-zinc-400 text-xs font-medium"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Host Action Button */}
                    {isHostOrCohost && onSelectSlot && (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectSlot(activeSlot)}
                        className="w-full mt-4 py-3 rounded-xl font-bold text-xs bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4 text-black" />
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
                    className="py-8 text-center text-xs text-zinc-500"
                  >
                    Select any cell in the schedule grid to inspect respondents.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Ranked List View */
        <div className="p-6 rounded-2xl glass-panel border border-zinc-800 bg-zinc-950/80 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>Ranked Schedule Alignment (Screen Reader Accessible)</span>
          </h3>

          <div className="divide-y divide-zinc-800">
            {heatmap.best_slots.map((slot, idx) => (
              <motion.div
                key={slot.start_time}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-700">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {formatDateInZone(slot.start_time, timezone, true)}
                    </div>
                    <div className="text-xs font-mono text-zinc-300">
                      {formatSlotRange(slot.start_time, slot.end_time, timezone)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      <span className="font-semibold text-white">
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
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-colors shrink-0 cursor-pointer shadow-sm"
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
