import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { Calendar } from '../ui/Calendar';
import { DailyLog, DailyLogFormData, Task } from '../../types';
import { format, isSameDay, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { DailyLogDetailModal } from '../modals/DailyLogDetailModal';
import { LogFormModal } from '../modals/LogFormModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { PerformanceSummaryCard } from './PerformanceSummaryCard';
import { EmptyState } from '../ui/EmptyState';
import { FolderIcon } from '../ui/Icons';
import { TaskCardSkeleton } from '../project/TaskCardSkeleton';
import { View } from './Dashboard';

interface PersonalDashboardProps {
    onNavigate: (view: View, state?: any) => void;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ onNavigate }) => {
    const { currentUser } = useAuth();
    const { dailyLogs, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog } = useAppDataContext();
    const { tasks, isLoading: isTasksLoading } = useProjectContext();
    
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [isLogFormOpen, setIsLogFormOpen] = useState(false);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);

    const myLogs = useMemo(() => dailyLogs.filter(log => log.teamMemberId === currentUser?.id), [dailyLogs, currentUser]);
    const myTasks = useMemo(() => tasks.filter(task => task.assignedTo === currentUser?.id), [tasks, currentUser]);
    const myInProgressTasks = useMemo(() => myTasks.filter(task => task.status === 'inprogress'), [myTasks]);

    const { currentMonthHours, lastMonthHours, currentMonthTasks, lastMonthTasks } = useMemo(() => {
        const now = new Date();
        const startOfThisMonth = startOfMonth(now);
        const endOfThisMonth = endOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));
        
        const currentMonthLogs = myLogs.filter(l => isWithinInterval(new Date(l.date), { start: startOfThisMonth, end: endOfThisMonth }));
        const lastMonthLogs = myLogs.filter(l => isWithinInterval(new Date(l.date), { start: startOfLastMonth, end: endOfLastMonth }));
        
        const currentMonthTasksDone = myTasks.filter(t => t.status === 'done' && t.dueDate && isWithinInterval(new Date(t.dueDate), { start: startOfThisMonth, end: endOfThisMonth })).length;
        const lastMonthTasksDone = myTasks.filter(t => t.status === 'done' && t.dueDate && isWithinInterval(new Date(t.dueDate), { start: startOfLastMonth, end: endOfLastMonth })).length;

        return {
            currentMonthHours: currentMonthLogs.reduce((sum, l) => sum + l.hours, 0),
            lastMonthHours: lastMonthLogs.reduce((sum, l) => sum + l.hours, 0),
            currentMonthTasks: currentMonthTasksDone,
            lastMonthTasks: lastMonthTasksDone,
        };
    }, [myLogs, myTasks]);

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

    const handleDateClick = (date: Date) => {
        setSelectedDate(format(date, 'yyyy-MM-dd'));
    };

    const handleSaveLog = async (logData: DailyLogFormData) => {
        if (!currentUser) return;
        const dateToSave = selectedDate || format(new Date(), 'yyyy-MM-dd');
        if (editingLog) {
            await handleUpdateDailyLog({ ...editingLog, ...logData });
        } else {
            await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: dateToSave });
        }
        setIsLogFormOpen(false);
        setEditingLog(null);
    };

    const logsForSelectedDate = selectedDate ? myLogs.filter(log => isSameDay(new Date(log.date), new Date(selectedDate))) : [];

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة التحكم الشخصية</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على مهامك وأنشطتك.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <PerformanceSummaryCard 
                        currentMonthHours={currentMonthHours}
                        lastMonthHours={lastMonthHours}
                        currentMonthTasks={currentMonthTasks}
                        lastMonthTasks={lastMonthTasks}
                    />
                     <Card 
                        title="مهام قيد التنفيذ" 
                        headerActions={
                            <button onClick={() => onNavigate('myTasks')} className="text-sm font-semibold text-sky-600">عرض الكل</button>
                        }
                    >
                        {isTasksLoading ? (
                           <div className="space-y-3"><TaskCardSkeleton /><TaskCardSkeleton /></div>
                        ) : myInProgressTasks.length > 0 ? (
                            <div className="space-y-3">
                                {myInProgressTasks.slice(0, 5).map(task => (
                                    <div key={task.id} onClick={() => setViewingTask(task)} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{task.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">تاريخ الاستحقاق: {task.dueDate || 'غير محدد'}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon={<FolderIcon className="w-8 h-8"/>} title="لا توجد مهام" message="لا توجد لديك مهام قيد التنفيذ حاليًا." />
                        )}
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card title="تقويمي">
                        <Calendar events={calendarEvents} onDateClick={handleDateClick} highlightedDate={selectedDate ? new Date(selectedDate) : null} />
                    </Card>
                </div>
            </div>

            {selectedDate && (
                <DailyLogDetailModal 
                    isOpen={!!selectedDate}
                    onClose={() => setSelectedDate(null)}
                    date={selectedDate}
                    logs={logsForSelectedDate}
                    onAdd={() => {}}
                    onEdit={() => {}}
                    onDelete={async () => {}}
                    isEditable={false}
                />
            )}
            
            {isLogFormOpen && currentUser && (
                <LogFormModal 
                    isOpen={isLogFormOpen}
                    onClose={() => { setIsLogFormOpen(false); setEditingLog(null); }}
                    onSave={handleSaveLog}
                    log={editingLog}
                    date={selectedDate || format(new Date(), 'yyyy-MM-dd')}
                    memberId={currentUser.id}
                />
            )}

            {viewingTask && (
                <TaskDetailModal
                    isOpen={!!viewingTask}
                    onClose={() => setViewingTask(null)}
                    task={viewingTask}
                />
            )}
        </div>
    );
};
