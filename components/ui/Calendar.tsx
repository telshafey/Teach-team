import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { DAYS_OF_WEEK } from '../../constants';

interface CalendarEvent {
  date: Date;
  hasLog?: boolean;
  isDueDate?: boolean;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  highlightedDate?: Date | null;
  isDateSelectable?: (date: Date) => boolean;
}

export const Calendar: React.FC<CalendarProps> = ({ events, onDateClick, highlightedDate, isDateSelectable }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center py-2 px-1">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <ChevronRightIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">
          {format(currentMonth, 'MMMM yyyy', { locale: arSA })}
        </h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <ChevronLeftIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    return (
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="py-2">{day.substring(0, 3)}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: arSA });
    const endDate = endOfWeek(monthEnd, { locale: arSA });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const rows = [];
    let cells: React.ReactNode[] = [];

    days.forEach((day, i) => {
      const event = events.find(e => isSameDay(e.date, day));
      const isSelectable = isDateSelectable ? isDateSelectable(day) : true;

      cells.push(
        <div
          key={day.toString()}
          className={`h-12 flex items-center justify-center relative transition-colors ${
            !isSameMonth(day, monthStart) 
                ? 'text-slate-300 dark:text-slate-600' 
                : isSelectable 
                    ? 'text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700'
                    : 'text-slate-400 dark:text-slate-500 cursor-pointer'
          } ${isSameDay(day, new Date()) ? 'font-bold' : ''} ${highlightedDate && isSameDay(day, highlightedDate) ? 'bg-sky-100 dark:bg-sky-900/50 rounded-lg' : ''}`}
          onClick={() => onDateClick(day)}
        >
          <span>{format(day, 'd')}</span>
          {event?.hasLog && <div className="absolute bottom-2 w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
          {event?.isDueDate && <div className="absolute top-2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
        </div>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(<div className="grid grid-cols-7" key={day.toString()}>{cells}</div>);
        cells = [];
      }
    });

    return <div>{rows}</div>;
  };

  return (
    <div>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      <div className="flex justify-center space-x-4 rtl:space-x-reverse text-xs mt-2 p-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-1 rtl:space-x-reverse"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>يوم مسجل</span></div>
          <div className="flex items-center space-x-1 rtl:space-x-reverse"><div className="w-2 h-2 bg-red-500 rounded-full"></div><span>تاريخ استحقاق</span></div>
      </div>
    </div>
  );
};
