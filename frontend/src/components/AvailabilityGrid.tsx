import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TimeSlot } from '../types';
import { formatDateHeading, formatDayName, formatDateSub } from '../utils/format';
import { Clock, CheckSquare, XSquare, Sparkles, Calendar, Sun, Briefcase } from 'lucide-react';

interface AvailabilityGridProps {
  candidateDates: string[];
  dailyStartTime: string;
  dailyEndTime: string;
  slotDurationMinutes: number;
  initialSlots?: TimeSlot[];
  onSlotsChange: (slots: TimeSlot[]) => void;
  timezone?: string;
}

export const AvailabilityGrid: React.FC<AvailabilityGridProps> = ({
  candidateDates,
  dailyStartTime,
  dailyEndTime,
  slotDurationMinutes,
  initialSlots = [],
  onSlotsChange,
  timezone,
}) => {
  // Selected slot start timestamps stored as ISO string keys
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const isMouseDownRef = useRef(false);
  const dragModeRef = useRef<'add' | 'remove'>('add');

  // Parse hours
  const [startHour, startMin] = dailyStartTime.split(':').map(Number);
  const [endHour, endMin] = dailyEndTime.split(':').map(Number);

  // Generate grid matrix: dates x timeslots
  const timeIncrements: { hour: number; minute: number; label: string; isTopHour: boolean }[] = [];
  let curHour = startHour;
  let curMin = startMin;
  const endMinutesTotal = endHour * 60 + endMin;

  while (curHour * 60 + curMin < endMinutesTotal) {
    const d = new Date(2026, 0, 1, curHour, curMin);
    const label = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    timeIncrements.push({
      hour: curHour,
      minute: curMin,
      label,
      isTopHour: curMin === 0,
    });

    curMin += slotDurationMinutes;
    if (curMin >= 60) {
      curHour += Math.floor(curMin / 60);
      curMin = curMin % 60;
    }
  }

  // Initialize selected set from props
  useEffect(() => {
    const s = new Set<string>();
    initialSlots.forEach((slot) => {
      s.add(new Date(slot.start_time).toISOString());
    });
    setSelectedSet(s);
  }, [initialSlots]);

  const getSlotIso = (dateStr: string, hour: number, minute: number): { startIso: string; endIso: string } => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const startDt = new Date(Date.UTC(y, m - 1, d, hour, minute));
    const endDt = new Date(startDt.getTime() + slotDurationMinutes * 60 * 1000);
    return {
      startIso: startDt.toISOString(),
      endIso: endDt.toISOString(),
    };
  };

  const notifyChange = (newSet: Set<string>) => {
    const result: TimeSlot[] = [];
    newSet.forEach((startIso) => {
      const s = new Date(startIso);
      const e = new Date(s.getTime() + slotDurationMinutes * 60 * 1000);
      result.push({
        start_time: s.toISOString(),
        end_time: e.toISOString(),
      });
    });
    onSlotsChange(result);
  };

  // Mouse drag handlers
  const handleSlotMouseDown = (slotIso: string) => {
    isMouseDownRef.current = true;
    const isCurrentlySelected = selectedSet.has(slotIso);
    dragModeRef.current = isCurrentlySelected ? 'remove' : 'add';

    const next = new Set(selectedSet);
    if (dragModeRef.current === 'add') {
      next.add(slotIso);
    } else {
      next.delete(slotIso);
    }
    setSelectedSet(next);
    notifyChange(next);
  };

  const handleSlotMouseEnter = (slotIso: string) => {
    if (!isMouseDownRef.current) return;
    const next = new Set(selectedSet);
    if (dragModeRef.current === 'add') {
      next.add(slotIso);
    } else {
      next.delete(slotIso);
    }
    setSelectedSet(next);
    notifyChange(next);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Touch drag support
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elem && elem.getAttribute('data-slot-iso')) {
      const slotIso = elem.getAttribute('data-slot-iso')!;
      if (dragModeRef.current === 'add' && !selectedSet.has(slotIso)) {
        const next = new Set(selectedSet).add(slotIso);
        setSelectedSet(next);
        notifyChange(next);
      } else if (dragModeRef.current === 'remove' && selectedSet.has(slotIso)) {
        const next = new Set(selectedSet);
        next.delete(slotIso);
        setSelectedSet(next);
        notifyChange(next);
      }
    }
  };

  // Quick Preset Handlers
  const selectAll = () => {
    const next = new Set<string>();
    candidateDates.forEach((dateStr) => {
      timeIncrements.forEach(({ hour, minute }) => {
        const { startIso } = getSlotIso(dateStr, hour, minute);
        next.add(startIso);
      });
    });
    setSelectedSet(next);
    notifyChange(next);
  };

  const clearAll = () => {
    const next = new Set<string>();
    setSelectedSet(next);
    notifyChange(next);
  };

  const applyPresetHours = (startH: number, endH: number) => {
    const next = new Set(selectedSet);
    candidateDates.forEach((dateStr) => {
      timeIncrements.forEach(({ hour, minute }) => {
        if (hour >= startH && hour < endH) {
          const { startIso } = getSlotIso(dateStr, hour, minute);
          next.add(startIso);
        }
      });
    });
    setSelectedSet(next);
    notifyChange(next);
  };

  const totalHours = (selectedSet.size * (slotDurationMinutes / 60)).toFixed(1);

  return (
    <div className="w-full flex flex-col space-y-4 select-none">
      {/* Schedule Planner Header & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs glass-panel px-4 py-3 rounded-2xl border border-zinc-800 bg-zinc-950/80">
        <div className="flex items-center space-x-2.5 text-zinc-300">
          <Calendar className="w-4 h-4 text-white" />
          <span className="font-semibold text-white">Weekly Schedule Grid</span>
          <span className="text-zinc-500 hidden sm:inline">· Click & drag to paint free blocks</span>
        </div>

        {/* Quick Paint Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPresetHours(9, 17)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 flex items-center space-x-1.5 transition-colors cursor-pointer text-[11px]"
            title="Mark 9:00 AM – 5:00 PM as free across all days"
          >
            <Briefcase className="w-3 h-3 text-white" />
            <span>9am–5pm</span>
          </button>

          <button
            type="button"
            onClick={() => applyPresetHours(8, 12)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 flex items-center space-x-1.5 transition-colors cursor-pointer text-[11px]"
            title="Mark 8:00 AM – 12:00 PM as free across all days"
          >
            <Sun className="w-3 h-3 text-white" />
            <span>Mornings</span>
          </button>

          <button
            type="button"
            onClick={selectAll}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 flex items-center space-x-1.5 transition-colors cursor-pointer text-[11px]"
          >
            <CheckSquare className="w-3 h-3 text-white" />
            <span>All</span>
          </button>

          <button
            type="button"
            onClick={clearAll}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800 flex items-center space-x-1.5 transition-colors cursor-pointer text-[11px]"
          >
            <XSquare className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* University Timetable Grid Style (Course Planner layout) */}
      <div className="overflow-x-auto pb-4 custom-scrollbar rounded-2xl border border-zinc-800 bg-black shadow-2xl">
        <div
          className="min-w-max"
          onTouchMove={handleTouchMove}
          onTouchEnd={() => (isMouseDownRef.current = false)}
        >
          {/* Header Bar Across All Days (Matches Collegiate Schedule Banner) */}
          <div className="flex items-stretch bg-zinc-900/90 border-b border-zinc-700/80 sticky top-0 z-20">
            {/* Corner time header */}
            <div className="w-20 sm:w-24 shrink-0 p-3 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-r border-zinc-800 flex items-center justify-end">
              Time
            </div>

            {/* Day columns headers */}
            {candidateDates.map((dateStr) => {
              const dayName = formatDayName(dateStr);
              const dateSub = formatDateSub(dateStr);

              return (
                <div
                  key={dateStr}
                  className="w-32 sm:w-40 md:w-44 shrink-0 py-3 px-3 text-center border-r border-zinc-800 last:border-r-0 flex flex-col items-center justify-center"
                >
                  <span className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                    {dayName}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {dateSub}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Rows Matrix */}
          <div className="flex flex-col">
            {timeIncrements.map(({ hour, minute, label, isTopHour }, index) => {
              const hourLabel = label.split(' ')[0];
              const ampm = label.split(' ')[1] || '';

              return (
                <div
                  key={`${hour}:${minute}`}
                  className={`flex items-stretch ${
                    isTopHour
                      ? 'border-t border-zinc-800 bg-zinc-950/40'
                      : 'border-t border-zinc-900/70 bg-black'
                  }`}
                >
                  {/* Left-hand Time Gutter (Hours & Sub-intervals) */}
                  <div className="w-20 sm:w-24 shrink-0 pr-3 py-1.5 text-right border-r border-zinc-800/80 flex items-center justify-end">
                    <span
                      className={`font-mono text-[11px] ${
                        isTopHour ? 'font-bold text-white' : 'font-normal text-zinc-500'
                      }`}
                    >
                      {isTopHour ? `${hourLabel} ${ampm}` : `${minute}m`}
                    </span>
                  </div>

                  {/* Day Slots (Course Block Card Style) */}
                  {candidateDates.map((dateStr) => {
                    const { startIso } = getSlotIso(dateStr, hour, minute);
                    const isSelected = selectedSet.has(startIso);

                    return (
                      <div
                        key={startIso}
                        data-slot-iso={startIso}
                        onMouseDown={() => handleSlotMouseDown(startIso)}
                        onMouseEnter={() => handleSlotMouseEnter(startIso)}
                        onTouchStart={() => {
                          isMouseDownRef.current = true;
                          dragModeRef.current = isSelected ? 'remove' : 'add';
                          const next = new Set(selectedSet);
                          if (dragModeRef.current === 'add') next.add(startIso);
                          else next.delete(startIso);
                          setSelectedSet(next);
                          notifyChange(next);
                        }}
                        className={`w-32 sm:w-40 md:w-44 h-8 sm:h-9 px-1.5 py-0.5 border-r border-zinc-800/80 last:border-r-0 cursor-pointer transition-colors duration-100 flex items-center ${
                          isSelected
                            ? 'bg-zinc-800/90 text-white'
                            : 'hover:bg-zinc-900/60 text-zinc-600'
                        }`}
                      >
                        {isSelected ? (
                          <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            className="w-full h-full rounded-md bg-white text-black font-semibold text-[11px] flex items-center justify-between px-2 border-l-4 border-black"
                          >
                            <span className="tracking-tight">Available</span>
                            <span className="text-[10px] font-mono opacity-70">on</span>
                          </motion.div>
                        ) : (
                          <div className="w-full h-full rounded border border-transparent hover:border-zinc-700/40" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Status & Time Window Information */}
      <div className="flex flex-wrap items-center justify-between px-2 text-xs text-zinc-400 gap-2">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>Active Window: {dailyStartTime} – {dailyEndTime} {timezone ? `(${timezone})` : ''}</span>
        </div>

        <motion.div
          animate={{ scale: selectedSet.size > 0 ? [1, 1.04, 1] : 1 }}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white text-black font-mono font-bold text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-black" />
          <span>{selectedSet.size} slots selected ({totalHours} hrs)</span>
        </motion.div>
      </div>
    </div>
  );
};
