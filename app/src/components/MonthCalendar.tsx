import React, { useMemo, useState } from 'react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarEvent {
  id: number | string;
  date: string; // yyyy-MM-dd
  label: string;
  status?: string;
}

interface MonthCalendarProps {
  events: CalendarEvent[];
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  statusColorMap?: Record<string, string>;
}

// Explicit hex values (not theme tokens) — this keeps the calendar's status
// colors real (blue/green/red) independent of the app-wide monochrome
// theme in tailwind.config.js, so this is the only place that shows color.
const DEFAULT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-[#3b82f6]', // blue
  completed: 'bg-[#10b981]', // green
  cancelled: 'bg-[#ef4444]', // red
  no_show: 'bg-[#9ca3af]', // gray
  default: 'bg-[#3b82f6]',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MonthCalendar: React.FC<MonthCalendarProps> = ({ events, selectedDate, onSelectDate, statusColorMap }) => {
  const [cursor, setCursor] = useState(selectedDate || new Date());
  const colors = statusColorMap || DEFAULT_STATUS_COLORS;

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="card-flat">
      <div className="flex items-center justify-between mb-5">
        <h3 className="section-title">{format(cursor, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(subMonths(cursor, 1))}
            className="p-2 rounded-xl text-gray-400 hover:text-skyglow-600 hover:bg-skyglow-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="px-2.5 py-1 text-xs font-semibold rounded-xl text-gray-500 hover:text-skyglow-600 hover:bg-skyglow-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="p-2 rounded-xl text-gray-400 hover:text-skyglow-600 hover:bg-skyglow-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay[key] || [];
          const inMonth = isSameMonth(day, cursor);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={key}
              onClick={() => onSelectDate?.(day)}
              style={{ animationDelay: `${Math.min(i, 20) * 12}ms` }}
              className={`
                animate-pop-in relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm
                transition-all duration-200 ease-out
                ${!inMonth ? 'text-gray-300' : 'text-gray-700'}
                ${selected
                  ? 'bg-gray-900 text-white shadow-depth-2 scale-105'
                  : 'hover:bg-skyglow-50 hover:scale-110 hover:shadow-depth-1 hover:-translate-y-0.5 active:scale-95'
                }
                ${today && !selected ? 'ring-2 ring-skyglow-400 ring-inset font-bold' : ''}
              `}
            >
              <span className="font-mono">{format(day, 'd')}</span>
              {dayEvents.length > 0 && (
                <span className="flex items-center gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : colors[e.status || 'default'] || colors.default}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={`text-[9px] leading-none ${selected ? 'text-white' : 'text-gray-400'}`}>+{dayEvents.length - 3}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-gray-100">
        {Object.entries(colors).filter(([k]) => k !== 'default').map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${cls}`} />
            <span className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthCalendar;
