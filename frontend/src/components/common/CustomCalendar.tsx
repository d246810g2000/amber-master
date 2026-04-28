import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek,
  parseISO, isToday
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn } from '../../lib/utils';

interface CustomCalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  highlightedDates?: string[] | Set<string>; // YYYY-MM-DD strings
  className?: string;
  variant?: 'light' | 'dark';
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  value,
  onChange,
  highlightedDates = new Set(),
  className,
  variant = 'dark'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? parseISO(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => value ? parseISO(value) : null, [value]);
  const highlightSet = useMemo(() => 
    highlightedDates instanceof Set ? highlightedDates : new Set(highlightedDates)
  , [highlightedDates]);

  // Generate days for the current view month
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate));
    const end = endOfWeek(endOfMonth(viewDate));
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(subMonths(viewDate, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(addMonths(viewDate, 1));
  };

  const handleDateClick = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 cursor-pointer w-full group/trigger"
      >
        <span className={cn(
          "bg-transparent border-0 p-0 text-[11px] font-black outline-none flex-1 text-center sm:pr-4 transition-colors",
          variant === 'light' 
            ? "text-slate-600 group-hover/trigger:text-slate-900" 
            : "text-zinc-300 group-hover/trigger:text-white"
        )}>
          {value || "選擇日期"}
        </span>
      </div>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] sm:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 5, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed inset-x-4 top-[15%] mx-auto sm:absolute sm:inset-auto sm:left-0 sm:top-full z-[100] mt-2 w-[calc(100%-2rem)] max-w-[280px] sm:w-[280px] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-4"
            >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={handlePrevMonth} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>
              <h4 className="text-sm font-black text-white">
                {format(viewDate, 'MMMM yyyy')}
              </h4>
              <button 
                onClick={handleNextMonth} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-zinc-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, i) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(date, viewDate);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const hasMatches = highlightSet.has(dateStr);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={i}
                    onClick={() => handleDateClick(date)}
                    className={cn(
                      "relative h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                      !isCurrentMonth ? "text-zinc-700 pointer-events-none" : "text-zinc-300 hover:bg-white/5",
                      isSelected && "bg-emerald-500 text-white hover:bg-emerald-600",
                      isTodayDate && !isSelected && "border border-emerald-500/30 text-emerald-400"
                    )}
                  >
                    {format(date, 'd')}
                    
                    {/* Activity Marker */}
                    {hasMatches && isCurrentMonth && (
                      <div className={cn(
                        "absolute bottom-1.5 w-1 h-1 rounded-full",
                        isSelected ? "bg-white/50" : "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer / Today shortcut */}
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => handleDateClick(new Date())}
                className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline px-2 py-1"
              >
                Go to Today
              </button>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
