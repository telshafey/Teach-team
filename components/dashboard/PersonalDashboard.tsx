import React, { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { Card } from '../ui/Card';
import { Calendar } from '../ui/Calendar';
import { DailyLog, DailyLogFormData, Task, Meeting } from '../../types';
import { format, isSameDay, isFuture, differenceInCalendarDays, parseISO, isThisWeek } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { DailyLogDetailModal } from '../modals/DailyLogDetailModal';
import { LogFormModal } from '../modals/LogFormModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { EmptyState } from '../ui/EmptyState';
import { FolderIcon, PlusIcon, ClockIcon, CalendarDaysIcon, ClipboardDocumentListIcon, BellIcon } from '../ui/Icons';
import { useNavigation } from '../../contexts/NavigationContext';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <Card className="!p-4">
        <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg">
                {icon}
            </div>
            <div className="mr-4 rtl:mr-0 rtl:ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </Card>
);


export const PersonalDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { currentUser } = useAuth();
    const { dailyLogs, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog } = useTimeLogContext();
    const { tasks, isLoading: isTasksLoading, projects } = useProjectContext();
    const { siteSettings } = useSettingsContext();
    const { meetings } = useMeetingContext();
    
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [isLogFormOpen, setIsLogFormOpen] = useState(false);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);

    const myLogs = useMemo(() => dailyLogs.filter(log => log.teamMemberId === currentUser?.id), [dailyLogs, currentUser]);
    const myTasks = useMemo(() => tasks.filter(task => task.assignedTo === currentUser?.id), [tasks, currentUser]);
    const myOpenTasks = useMemo(() => myTasks.filter(task => task.status !== 'done'), [myTasks]);

    const isDateEditableForLogging = useCallback((date: Date): boolean => {
        if (isFuture(date)) return false;
        const limit = siteSettings?.logEditingDaysLimit ?? 3;
        return differenceInCalendarDays(new Date(), date) <= limit;
    }, [siteSettings]);

    const { todayHours, thisWeekHours, dueSoonCount } = useMemo(() => {
        const now = new Date();
        return {
            todayHours: myLogs.filter(l => isSameDay(new Date(l.date), now)).reduce((sum, l) => sum + l.hours, 0),
            thisWeekHours: myLogs.filter(l => isThisWeek(new Date(l.date), { weekStartsOn: 0 })).reduce((sum, l) => sum + l.hours, 0),
            dueSoonCount: myOpenTasks.filter(t => t.dueDate && differenceInCalendarDays(parseISO(t.dueDate), now) >= 0 && differenceInCalendarDays(parseISO(t.dueDate), now) <= 3).length
        };
    }, [myLogs, myOpenTasks]);
    
    const myMeetings = useMemo(() => {
        if (!currentUser) return [];
        return meetings.filter(m => m.members?.includes(currentUser.id));
    }, [meetings, currentUser]);


    const calendarEvents = useMemo(() => {
        const events: { date: Date; hasLog?: boolean; isDueDate?: boolean; isMeeting?: boolean }[] = [];
        const dateMap: { [key: string]: { hasLog?: boolean; isDueDate?: boolean; isMeeting?: boolean } } = {};

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

        myMeetings.forEach(meeting => {
            if (meeting.startTime) {
                const dateStr = format(new Date(meeting.startTime), 'yyyy-MM-dd');
                if (!dateMap[dateStr]) dateMap[dateStr] = {};
                dateMap[dateStr].isMeeting = true;
            }
        });

        for (const dateStr in dateMap) {
            events.push({ date: new Date(dateStr), ...dateMap[dateStr] });
        }
        return events;
    }, [myLogs, myTasks, myMeetings]);

    const handleDateClick = (date: Date) => setSelectedDate(format(date, 'yyyy-MM-dd'));

    const handleSaveLog = async (logData: DailyLogFormData) => {
        if (!currentUser) return;
        const dateToSave = editingLog?.date || selectedDate || format(new Date(), 'yyyy-MM-dd');
        if (editingLog) await handleUpdateDailyLog({ ...editingLog, ...logData });
        else await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: dateToSave });
        setIsLogFormOpen(false);
        setEditingLog(null);
    };

    const handleOpenLogForm = (logToEdit: DailyLog | null) => {
        setEditingLog(logToEdit);
        setIsLogFormOpen(true);
        if(selectedDate) setSelectedDate(null);
    };
    
    const handleJoinMeeting = (meeting: Meeting) => onNavigate('meetingRoom', { meeting });

    const logsForSelectedDate = selectedDate ? myLogs.filter(log => isSameDay(new Date(log.date), new Date(selectedDate))) : [];

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة التحكم الشخصية</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على يومك.</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                    <button onClick={() => handleOpenLogForm(null)} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>إضافة سجل عمل</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <StatCard icon={<ClockIcon className="w-8 h-8 text-sky-500"/>} label="ساعات اليوم" value={todayHours.toFixed(1)} />
                <StatCard icon={<CalendarDaysIcon className="w-8 h-8 text-indigo-500"/>} label="ساعات الأسبوع" value={thisWeekHours.toFixed(1)} />
                <StatCard icon={<ClipboardDocumentListIcon className="w-8 h-8 text-green-500"/>} label="مهام مفتوحة" value={myOpenTasks.length} />
                <StatCard icon={<BellIcon className="w-8 h-8 text-amber-500"/>} label="مهام قريبة" value={dueSoonCount} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card 
                        title="مهامي المفتوحة" 
                        headerActions={ <button onClick={() => onNavigate('myTasks')} className="text-sm font-semibold text-sky-600">عرض الكل</button> }
                     >
                        {isTasksLoading ? ( <div className="space-y-3"><div className="h-16 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-md"></div><div className="h-16 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-md"></div></div>
                        ) : myOpenTasks.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {myOpenTasks.slice(0, 10).map(task => (
                                    <div key={task.id} onClick={() => setViewingTask(task)} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{task.title}</p>
                                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <span>{task.projectId ? projects.find(p=>p.id === task.projectId)?.name : 'مهمة خاصة'}</span>
                                            <span>{task.dueDate ? `تستحق في: ${format(parseISO(task.dueDate), 'd MMM', {locale: arSA})}` : 'بدون تاريخ'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon={<FolderIcon className="w-8 h-8"/>} title="لا توجد مهام" message="لا توجد لديك مهام مفتوحة حاليًا." />
                        )}
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <UpcomingMeetingsCard title="اجتماعاتي القادمة" meetings={myMeetings} onJoinMeeting={handleJoinMeeting} />
                    <Card title="تقويمي">
                        <Calendar events={calendarEvents} onDateClick={handleDateClick} highlightedDate={selectedDate ? new Date(selectedDate) : null} />
                    </Card>
                </div>
            </div>

            {selectedDate && (
                <DailyLogDetailModal 
                    isOpen={!!selectedDate} onClose={() => setSelectedDate(null)} date={selectedDate} logs={logsForSelectedDate}
                    onAdd={() => handleOpenLogForm(null)} onEdit={(log) => handleOpenLogForm(log)} onDelete={handleDeleteDailyLog}
                    isEditable={selectedDate ? isDateEditableForLogging(new Date(selectedDate)) : false}
                />
            )}
            
            {isLogFormOpen && currentUser && (
                <LogFormModal 
                    isOpen={isLogFormOpen} onClose={() => { setIsLogFormOpen(false); setEditingLog(null); }}
                    onSave={handleSaveLog} log={editingLog} date={editingLog?.date || selectedDate || format(new Date(), 'yyyy-MM-dd')}
                    memberId={currentUser.id}
                />
            )}

            {viewingTask && ( <TaskDetailModal isOpen={!!viewingTask} onClose={() => setViewingTask(null)} task={viewingTask}/> )}
        </div>
    );
};