import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@shared/contexts/AuthContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { Card } from '../ui/Card';
import { Calendar } from '../ui/Calendar';
import { DailyLog, DailyLogFormData, Task, Meeting, Project } from '@shared/types';
import { format, isSameDay, isFuture, differenceInCalendarDays, parseISO, isThisWeek } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { DailyLogDetailModal } from '../modals/DailyLogDetailModal';
import { LogFormModal } from '../modals/LogFormModal';
import { TaskDetailInline } from '../tasks/TaskDetailInline';
import { EmptyState } from '../ui/EmptyState';
import { FolderIcon, PlusIcon, ClockIcon, CalendarDaysIcon, ClipboardDocumentListIcon, BellIcon, WrenchScrewdriverIcon, CheckIcon } from '../ui/Icons';
import { useNavigation } from '@shared/contexts/NavigationContext';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useTimeManagement } from '@shared/contexts/TimeManagementContext';
import { TaskCardSkeleton } from '../project/TaskCardSkeleton';
import { StatCard } from './StatCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useToast } from '@shared/contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AnalyticsChart } from '../ui/AnalyticsChart';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget Components
const PunchClockWidget: React.FC = () => {
    const { activePunchIn, handlePunchIn } = useTimeManagement();
    const isCheckedIn = !!activePunchIn;

    return (
        <Card title="تسجيل الحضور والانصراف" icon={<ClockIcon className="w-5 h-5" />}>
            <div className="text-center p-4 flex flex-col justify-center h-full">
                {isCheckedIn ? (
                    <div>
                        <p className="font-semibold text-green-600 dark:text-green-400">أنت مسجل حضورك حاليًا.</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            بدأ في: {format(new Date(activePunchIn.startTime), 'p', { locale: arSA })}
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="font-semibold text-slate-600 dark:text-slate-300 mb-4">أنت غير مسجل حضورك حاليًا.</p>
                        <button 
                            onClick={handlePunchIn}
                            className="w-full px-4 py-3 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-transform transform hover:scale-105"
                        >
                            تسجيل الحضور
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
};

const MyTasksWidget: React.FC<{ tasks: Task[]; projects: Project[]; onTaskClick: (task: Task) => void; onNavigate: (view: any, props?: any) => void; isLoading: boolean; }> = ({ tasks, projects, onTaskClick, onNavigate, isLoading }) => (
     <Card 
        title="المهام المفتوحة" 
        headerActions={ <button onClick={() => onNavigate('myTasks')} className="text-sm font-semibold text-sky-600">عرض الكل</button> }
     >
        {isLoading ? (
            <div className="space-y-3"><TaskCardSkeleton /><TaskCardSkeleton /><TaskCardSkeleton /></div>
        ) : tasks.length > 0 ? (
            <div className="space-y-3">
                {tasks.slice(0, 10).map(task => (
                    <div key={task.id} onClick={() => onTaskClick(task)} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
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
);

const MeetingsWidget: React.FC<{ meetings: Meeting[]; onJoin: (m: Meeting) => void; }> = ({ meetings, onJoin }) => (
    <UpcomingMeetingsCard title="اجتماعاتي القادمة" meetings={meetings} onJoinMeeting={onJoin} />
);

const CalendarWidget: React.FC<{ events: any[]; onDateClick: (date: Date) => void; highlightedDate: Date | null }> = ({ events, onDateClick, highlightedDate }) => (
    <Card title="تقويمي"><Calendar events={events} onDateClick={onDateClick} highlightedDate={highlightedDate} /></Card>
);

const WeeklyActivityWidget: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
    const data = useMemo(() => {
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - i));
            return date;
        });

        return days.map(day => {
            const dayLogs = logs.filter(log => typeof log.date === 'string' ? log.date.startsWith(format(day, 'yyyy-MM-dd')) : isSameDay(new Date(log.date), day));
            const hours = dayLogs.reduce((sum, log) => sum + (log.hoursLogged || 0), 0);
            return {
                name: format(day, 'EEEE', { locale: arSA }).split(' ')[0],
                value: Number(hours.toFixed(1))
            };
        });
    }, [logs]);

    return (
        <Card title="نشاط الأسبوع">
            <AnalyticsChart data={data} color="#0ea5e9" height={220} />
        </Card>
    );
};


export const PersonalDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { currentUser } = useAuth();
    const { dailyLogs, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog } = useTimeLogContext();
    const { siteSettings } = useSettingsContext();
    const { supabaseClient } = useSupabase();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [isLogFormOpen, setIsLogFormOpen] = useState(false);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [isEditingLayout, setIsEditingLayout] = useState(false);
    
    const isEmployee = currentUser?.employmentType === 'full-time' || currentUser?.employmentType === 'part-time';

    const defaultLayouts = useMemo(() => ({
        lg: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 1 },
            ...(isEmployee ? [{ i: 'punchClock', x: 0, y: 1, w: 4, h: 3 }] : []),
            { i: 'weeklyActivity', x: isEmployee ? 4 : 0, y: 1, w: isEmployee ? 8 : 12, h: 4 },
            { i: 'myTasks', x: 0, y: 5, w: 8, h: 5 },
            { i: 'meetings', x: 8, y: 5, w: 4, h: 4 },
            { i: 'calendar', x: 0, y: 10, w: 12, h: 6 },
        ].filter(Boolean),
        md: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 1 },
            ...(isEmployee ? [{ i: 'punchClock', x: 0, y: 1, w: 6, h: 3 }] : []),
            { i: 'weeklyActivity', x: isEmployee ? 6 : 0, y: 1, w: isEmployee ? 6 : 12, h: 4 },
            { i: 'myTasks', x: 0, y: 5, w: 12, h: 5 },
            { i: 'meetings', x: 0, y: 10, w: 6, h: 4 },
            { i: 'calendar', x: 6, y: 10, w: 6, h: 6 },
        ].filter(Boolean),
        sm: [
            { i: 'stats', x: 0, y: 0, w: 6, h: 2 },
            ...(isEmployee ? [{ i: 'punchClock', x: 0, y: 2, w: 6, h: 3 }] : []),
            { i: 'weeklyActivity', x: 0, y: 5, w: 6, h: 4 },
            { i: 'myTasks', x: 0, y: 9, w: 6, h: 5 },
            { i: 'meetings', x: 0, y: 14, w: 6, h: 4 },
            { i: 'calendar', x: 0, y: 18, w: 6, h: 6 },
        ].filter(Boolean),
    }), [isEmployee]);

    const [layouts, setLayouts] = useState(defaultLayouts);

    const { data: savedLayouts } = useQuery({
        queryKey: ['user_preference', 'dashboard_layout_personal'],
        queryFn: () => api.getUserPreference<typeof defaultLayouts>(supabaseClient!, currentUser!.id, 'dashboard_layout_personal'),
        enabled: !!supabaseClient && !!currentUser,
    });

     useEffect(() => {
        if (savedLayouts) {
            const newLayouts: any = {};
            for (const breakpoint of ['lg', 'md', 'sm']) {
                const defaultItems = defaultLayouts[breakpoint as keyof typeof defaultLayouts];
                const savedItems = savedLayouts[breakpoint as keyof typeof savedLayouts] || [];
                const savedItemsMap = new Map(savedItems.map(item => [item.i, item]));
                newLayouts[breakpoint] = defaultItems.map(defaultItem => savedItemsMap.get(defaultItem.i) || defaultItem);
            }
            setLayouts(newLayouts);
        }
    }, [savedLayouts, defaultLayouts]);

    const saveLayoutMutation = useMutation({
        mutationFn: (newLayouts: typeof defaultLayouts) => api.setUserPreference(supabaseClient!, currentUser!.id, 'dashboard_layout_personal', newLayouts),
        onSuccess: () => {
            addToast('تم حفظ تخطيط اللوحة بنجاح.', 'success');
            queryClient.invalidateQueries({ queryKey: ['user_preference', 'dashboard_layout_personal'] });
            setIsEditingLayout(false);
        },
        onError: (error) => {
            addToast(`فشل حفظ التخطيط: ${error.message}`, 'error');
        }
    });

    const { hasPermission } = useTeamContext();

    const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: () => api.getAll<Meeting>(supabaseClient!, 'meetings'), enabled: !!supabaseClient });
    const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects_list'], queryFn: () => api.getAll(supabaseClient!, 'projects', 'id, name'), enabled: !!supabaseClient });
    const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({ queryKey: ['tasks'], queryFn: () => api.getAll(supabaseClient!, 'tasks'), enabled: !!supabaseClient });

    const myLogs = useMemo(() => dailyLogs.filter(log => log.teamMemberId === currentUser?.id), [dailyLogs, currentUser]);
    
    const canViewAllTasks = hasPermission('manage_team') || hasPermission('view_reports') || hasPermission('manage_projects');
    const myTasks = useMemo(() => {
        if (!currentUser) return [];
        if (canViewAllTasks) return tasks;
        return tasks.filter(task => task.assignedTo === currentUser.id || task.creatorId === currentUser.id);
    }, [tasks, currentUser, canViewAllTasks]);

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
    
    const myMeetings = useMemo(() => meetings.filter(m => m.members?.includes(currentUser!.id)), [meetings, currentUser]);

    const calendarEvents = useMemo(() => {
        const events: { date: Date; hasLog?: boolean; isDueDate?: boolean; isMeeting?: boolean }[] = [];
        const dateMap: { [key: string]: { hasLog?: boolean; isDueDate?: boolean; isMeeting?: boolean } } = {};
        myLogs.forEach(log => { (dateMap[format(new Date(log.date), 'yyyy-MM-dd')] ||= {}).hasLog = true; });
        myTasks.forEach(task => { if (task.dueDate) (dateMap[format(new Date(task.dueDate), 'yyyy-MM-dd')] ||= {}).isDueDate = true; });
        myMeetings.forEach(meeting => { if (meeting.startTime) (dateMap[format(new Date(meeting.startTime), 'yyyy-MM-dd')] ||= {}).isMeeting = true; });
        for (const dateStr in dateMap) events.push({ date: new Date(dateStr), ...dateMap[dateStr] });
        return events;
    }, [myLogs, myTasks, myMeetings]);

    const handleDateClick = (date: Date) => setSelectedDate(format(date, 'yyyy-MM-dd'));
    const handleSaveLog = async (logData: DailyLogFormData) => {
        if (!currentUser) return;
        const dateToSave = editingLog?.date || selectedDate || format(new Date(), 'yyyy-MM-dd');
        if (editingLog) await handleUpdateDailyLog({ ...editingLog, ...logData });
        else await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: dateToSave });
        setIsLogFormOpen(false); setEditingLog(null);
    };
    const handleOpenLogForm = (logToEdit: DailyLog | null) => { setEditingLog(logToEdit); setIsLogFormOpen(true); if(selectedDate) setSelectedDate(null); };
    const handleJoinMeeting = (meeting: Meeting) => onNavigate('meetingRoom', { meeting });
    const logsForSelectedDate = selectedDate ? myLogs.filter(log => isSameDay(new Date(log.date), new Date(selectedDate))) : [];

    const widgetMap = {
        'stats': (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 h-full">
                <StatCard onClick={() => onNavigate('timesheet')} icon={<ClockIcon className="w-8 h-8 text-sky-500"/>} label="ساعات اليوم" value={todayHours.toFixed(1)} />
                <StatCard onClick={() => onNavigate('timesheet')} icon={<CalendarDaysIcon className="w-8 h-8 text-indigo-500"/>} label="ساعات الأسبوع" value={thisWeekHours.toFixed(1)} />
                <StatCard onClick={() => onNavigate('myTasks')} icon={<ClipboardDocumentListIcon className="w-8 h-8 text-green-500"/>} label="مهام مفتوحة" value={myOpenTasks.length} />
                <StatCard onClick={() => onNavigate('myTasks')} icon={<BellIcon className="w-8 h-8 text-amber-500"/>} label="مهام قريبة" value={dueSoonCount} />
            </div>
        ),
        'punchClock': isEmployee ? <PunchClockWidget /> : null,
        'weeklyActivity': <WeeklyActivityWidget logs={myLogs} />,
        'myTasks': <MyTasksWidget tasks={myOpenTasks} projects={projects} onTaskClick={setViewingTask} onNavigate={onNavigate} isLoading={isTasksLoading} />,
        'meetings': <MeetingsWidget meetings={myMeetings} onJoin={handleJoinMeeting} />,
        'calendar': <CalendarWidget events={calendarEvents} onDateClick={handleDateClick} highlightedDate={selectedDate ? new Date(selectedDate) : null} />,
    };

    const handleToggleEditLayout = () => {
        if (isEditingLayout) saveLayoutMutation.mutate(layouts as any);
        else setIsEditingLayout(true);
    };

    if (viewingTask) {
        return (
            <div className="p-6 max-w-4xl mx-auto flex-1 h-full">
                <TaskDetailInline 
                    onClose={() => setViewingTask(null)} 
                    task={viewingTask} 
                />
            </div>
        );
    }

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة التحكم الشخصية</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على يومك.</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                    <button onClick={handleToggleEditLayout} disabled={saveLayoutMutation.isPending} className={`w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${isEditingLayout ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>
                        {saveLayoutMutation.isPending ? <LoadingSpinner /> : isEditingLayout ? <CheckIcon className="w-5 h-5"/> : <WrenchScrewdriverIcon className="w-5 h-5" />}
                        <span>{saveLayoutMutation.isPending ? 'جارٍ الحفظ...' : isEditingLayout ? 'حفظ التخطيط' : 'تخصيص اللوحة'}</span>
                    </button>
                    <button onClick={() => handleOpenLogForm(null)} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>إضافة سجل عمل</span>
                    </button>
                </div>
            </div>

            <ResponsiveGridLayout
                className={`layout ${isEditingLayout ? 'rgl-editing' : ''}`}
                layouts={layouts}
                onLayoutChange={(layout, allLayouts) => setLayouts(allLayouts as any)}
                breakpoints={{ lg: 1200, md: 996, sm: 768 }}
                cols={{ lg: 12, md: 12, sm: 6 }}
                rowHeight={60}
                isDraggable={isEditingLayout}
                isResizable={isEditingLayout}
            >
                {layouts.lg.map(item => (
                    <div key={item.i}>
                        {widgetMap[item.i as keyof typeof widgetMap] || <Card title="Widget not found" />}
                    </div>
                ))}
            </ResponsiveGridLayout>

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
        </div>
    );
};
