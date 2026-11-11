import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TimeSlot } from '../types';
import { formatDateHeading } from '../utils/format';
import { Clock, CheckSquare, XSquare, Sparkles } from 'lucide-react';

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
}) => {
  // Selected slot start timestamps stored as ISO string keys
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const isMouseDownRef = useRef(false);
  const dragModeRef = useRef<'add' | 'remove'>('add');

  // Parse hours
  const [startHour, startMin] = dailyStartTime.split(':').map(Number);
  const [endHour, endMin] = dailyEndTime.split(':').map(Number);

  // Generate grid matrix: dates x timeslots
  const timeIncrements: { hour: number; minute: number; label: string }[] = [];
  let curHour = startHour;
  let curMin = startMin;
  const endMinutesTotal = endHour * 60 + endMin;

  while (curHour * 60 + curMin < endMinutesTotal) {
    const d = new Date(2026, 0, 1, curHour, curMin);
    const label = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    timeIncrements.push({ hour: curHour, minute: curMin, label });

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

  const totalHours = (selectedSet.size * (slotDurationMinutes / 60)).toFixed(1);

  return (
    <div className="w-full flex flex-col space-y-4 select-none">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs glass-panel px-4 py-3 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-2 text-slate-300">
          <Clock className="w-4 h-4 text-cosmic-purple" />
          <span>Click & drag across cells to mark available times</span>
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={selectAll}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cosmic-cyan" />
            <span>Select All</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <XSquare className="w-3.5 h-3.5 text-red-400" />
            <span>Clear</span>
          </motion.button>
        </div>
      </div>

      {/* Grid container with overflow-x */}
      <div className="overflow-x-auto pb-4 custom-scrollbar rounded-2xl border border-white/10 bg-space-900/60 backdrop-blur-md">
        <div
          className="min-w-max p-4"
          onTouchMove={handleTouchMove}
          onTouchEnd={() => (isMouseDownRef.current = false)}
        >
          {/* Header Row: Dates */}
          <div className="flex items-center mb-2">
            <div className="w-20 shrink-0 text-right pr-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Time
            </div>
            {candidateDates.map((dateStr) => (
              <div
                key={dateStr}
                className="w-28 sm:w-32 shrink-0 px-2 text-center text-xs font-semibold text-slate-200"
              >
                {formatDateHeading(dateStr)}
              </div>
            ))}
          </div>

          {/* Time Rows */}
          <div className="flex flex-col space-y-1.5">
            {timeIncrements.map(({ hour, minute, label }) => (
              <div key={`${hour}:${minute}`} className="flex items-center">
                {/* Time Label */}
                <div className="w-20 shrink-0 text-right pr-3 text-[11px] font-mono text-slate-400">
                  {label}
                </div>

                {/* Day Cells */}
                {candidateDates.map((dateStr) => {
                  const { startIso } = getSlotIso(dateStr, hour, minute);
                  const isSelected = selectedSet.has(startIso);

                  return (
                    <motion.div
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
                      animate={{ scale: isSelected ? [0.95, 1] : 1 }}
                      transition={{ duration: 0.15 }}
                      className={`w-28 sm:w-32 h-9 mx-1 rounded-xl cursor-pointer transition-colors duration-150 flex items-center justify-center text-[11px] font-medium border relative group ${
                        isSelected
                          ? 'bg-gradient-to-r from-cosmic-purple/85 to-cosmic-cyan/85 text-white border-white/50 shadow-glow-sm'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-500 border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      {isSelected ? (
                        <span className="flex items-center space-x-1 text-white font-semibold">
                          <span>Free</span>
                        </span>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Selection Counter Chip */}
      <div className="flex items-center justify-between px-2 text-xs">
        <span className="text-slate-400">Time window: {dailyStartTime} – {dailyEndTime}</span>
        <motion.div
          animate={{ scale: selectedSet.size > 0 ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 0.25 }}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cosmic-purple/20 border border-cosmic-purple/30 text-cosmic-cyan font-mono"
        >
          <Sparkles className="w-3 h-3 text-cosmic-purple" />
          <span>{selectedSet.size} slots selected ({totalHours} hrs)</span>
        </motion.div>
      </div>
    </div>
  );
};
