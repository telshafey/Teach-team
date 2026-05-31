import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { DailyLog, DailyLogFormData, Task } from '@shared/types';
import { Calendar } from '../ui/Calendar';
import { DailyLogDetailModal } from '../modals/DailyLogDetailModal';
import { LogFormModal } from '../modals/LogFormModal';
import { format, isSameDay, isToday, isThisWeek as isWithinThisWeek, startOfMonth, endOfMonth, isWithinInterval, isFuture, differenceInCalendarDays } from 'date-fns';
import { Card } from '../ui/Card';
import { PlusIcon } from '../ui/Icons';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';

interface TimeSheetPageProps {
  openLogModal?: boolean;
}

export const TimeSheetPage: React.FC<TimeSheetPageProps> = ({ openLogModal }) => {
    const { currentUser } = useAuth();
    const { dailyLogs, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog } = useTimeLogContext();
    const { siteSettings } = useSettingsContext();
    const { supabaseClient } = useSupabase();
    
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [isLogFormOpen, setIsLogFormOpen] = useState(false);

    const { data: tasks = [] } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient,
    });

    const handleAddClick = () => {
        setEditingLog(null);
        setIsLogFormOpen(true);
        if(selectedDate) setSelectedDate(null);
    };

    useEffect(() => {
        if (openLogModal) {
            handleAddClick();
        }
    }, [openLogModal]);

    const myLogs = useMemo(() => dailyLogs.filter(log => log.teamMemberId === currentUser?.id), [dailyLogs, currentUser]);
    const myTasks = useMemo(() => tasks.filter(task => task.assignedTo === currentUser?.id), [tasks, currentUser]);

    const calendarEvents = useMemo(() => {
        const events: { date: Date; hasLog?: boolean; isDueDate?: boolean }[] = [];
        const dateMap: { [key: string]: { hasLog?: boolean; isDueDate?: boolean } } = {};

        myLogs.forEach(log => {
            const dateStr = format(new Date(log.date), 'yyyy-MM-dd');
            if (!dateMap[dateStr]) dateMap[dateStr] = {};
            dateMap[dateStr].hasLog = true;
        });
        myTasks.forEach(task => {
            if (task.dueDate) {
                const dateStr = format(new Date(task.dueDate), 'yyyy-MM-dd');
                if (!dateMap[dateStr]) dateMap[dateStr] = {};
                dateMap[dateStr].isDueDate = true;
            }
        });
        for (const dateStr in dateMap) {
            events.push({ date: new Date(dateStr), ...dateMap[dateStr] });
        }
        return events;
    }, [myLogs, myTasks]);

    const timeSheetSummary = useMemo(() => {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);

        const todayHours = myLogs
            .filter(log => isToday(new Date(log.date)))
            .reduce((sum, log) => sum + log.hours, 0);

        const thisWeekHours = myLogs
            .filter(log => isWithinThisWeek(new Date(log.date), { weekStartsOn: 0 }))
            .reduce((sum, log) => sum + log.hours, 0);

        const thisMonthHours = myLogs
            .filter(log => isWithinInterval(new Date(log.date), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
            .reduce((sum, log) => sum + log.hours, 0);

        return { todayHours, thisWeekHours, thisMonthHours };
    }, [myLogs]);

    const handleDateClick = (date: Date) => {
        setSelectedDate(format(date, 'yyyy-MM-dd'));
    };

    const handleSaveLog = async (logData: DailyLogFormData) => {
        if (!currentUser) return;
        const dateToSave = editingLog?.date || selectedDate || format(new Date(), 'yyyy-MM-dd');
        if (editingLog) {
            await handleUpdateDailyLog({ ...editingLog, ...logData });
        } else {
            await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: dateToSave });
        }
        setIsLogFormOpen(false);
        setEditingLog(null);
        setSelectedDate(null);
    };
    
    const handleEditClick = (log: DailyLog) => {
        setEditingLog(log);
        setIsLogFormOpen(true);
        if(selectedDate) setSelectedDate(null);
    };

    const logsForSelectedDate = selectedDate ? myLogs.filter(log => isSameDay(new Date(log.date), new Date(selectedDate))) : [];
    
    const isDateSelectableForViewing = (date: Date) => !isFuture(date);
    
    const isDateEditableForLogging = (date: Date): boolean => {
        if (isFuture(date)) {
            return false;
        }
        const limit = siteSettings?.logEditingDaysLimit ?? 3; // Use setting, fallback to 3
        const diff = differenceInCalendarDays(new Date(), date);
        return diff <= limit;
    };


    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">سجل أوقاتي</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">تتبع ساعات عملك اليومية والأسبوعية.</p>
                </div>
                 <button onClick={handleAddClick} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 w-full md:w-auto">
                    <PlusIcon className="w-5 h-5"/><span>إضافة سجل جديد</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <Card className="text-center">
                    <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{timeSheetSummary.todayHours.toFixed(1)}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">ساعات اليوم</p>
                </Card>
                <Card className="text-center">
                    <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{timeSheetSummary.thisWeekHours.toFixed(1)}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">ساعات هذا الأسبوع</p>
                </Card>
                <Card className="text-center">
                    <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{timeSheetSummary.thisMonthHours.toFixed(1)}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">ساعات هذا الشهر</p>
                </Card>
            </div>

            <Card>
                <Calendar
                    events={calendarEvents}
                    onDateClick={handleDateClick}
                    highlightedDate={selectedDate ? new Date(selectedDate) : null}
                    isDateSelectable={isDateSelectableForViewing}
                />
            </Card>

            {selectedDate && (
                <DailyLogDetailModal 
                    isOpen={!!selectedDate}
                    onClose={() => setSelectedDate(null)}
                    date={selectedDate}
                    logs={logsForSelectedDate}
                    onAdd={handleAddClick}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteDailyLog}
                    isEditable={isDateEditableForLogging(new Date(selectedDate))}
                />
            )}
            
            {isLogFormOpen && currentUser && (
                <LogFormModal 
                    isOpen={isLogFormOpen}
                    onClose={() => { setIsLogFormOpen(false); setEditingLog(null); }}
                    onSave={handleSaveLog}
                    log={editingLog}
                    date={editingLog?.date || selectedDate || format(new Date(), 'yyyy-MM-dd')}
                    memberId={currentUser.id}
                />
            )}
        </div>
    );
};

export default TimeSheetPage;