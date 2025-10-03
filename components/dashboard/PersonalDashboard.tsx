import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { Calendar } from '../ui/Calendar';
import { DailyLog, DailyLogFormData, Task } from '../../types';
import { DailyLogDetailModal } from '../modals/DailyLogDetailModal';
import { LogFormModal } from '../modals/LogFormModal';
import { isSameDay, startOfMonth, subMonths, parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { PerformanceSummaryCard } from './PerformanceSummaryCard';
import { TaskCard } from '../project/TaskCard';
import { TaskDetailModal } from '../modals/TaskDetailModal';

export const PersonalDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { dailyLogs, handleAddDailyLog, handleUpdateDailyLog, handleDeleteDailyLog } = useAppDataContext();
    const { tasks } = useProjectContext();
    
    const [selectedDateDetails, setSelectedDateDetails] = useState<{ date: string; isEditable: boolean } | null>(null);
    const [isLogDetailModalOpen, setIsLogDetailModalOpen] = useState(false);
    const [isLogFormModalOpen, setIsLogFormModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);

    const userLogs = useMemo(() => {
        if (!currentUser) return [];
        return dailyLogs.filter(log => log.teamMemberId === currentUser.id);
    }, [dailyLogs, currentUser]);

    const userTasks = useMemo(() => {
        if (!currentUser) return [];
        return tasks.filter(task => task.assignedTo === currentUser.id);
    }, [tasks, currentUser]);

    const isDateEditable = (date: Date): boolean => {
        const today = new Date();
        const sixDaysAgo = subDays(today, 6);
        return isWithinInterval(date, { start: startOfDay(sixDaysAgo), end: endOfDay(today) });
    };
    
    const calendarEvents = useMemo(() => {
        const events: { [key: string]: { date: Date; hasLog?: boolean; isDueDate?: boolean; } } = {};

        userLogs.forEach(log => {
            const dateStr = log.date;
            events[dateStr] = { ...events[dateStr], date: parseISO(dateStr), hasLog: true };
        });

        userTasks.forEach(task => {
            if (task.dueDate) {
                const dateStr = task.dueDate;
                events[dateStr] = { ...events[dateStr], date: parseISO(dateStr), isDueDate: true };
            }
        });

        return Object.values(events);
    }, [userLogs, userTasks]);

    const performanceData = useMemo(() => {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = startOfMonth(now);

        const currentMonthLogs = userLogs.filter(log => parseISO(log.date) >= currentMonthStart);
        const lastMonthLogs = userLogs.filter(log => isWithinInterval(parseISO(log.date), { start: lastMonthStart, end: lastMonthEnd }));
        
        const currentMonthTasks = userTasks.filter(task => task.status === 'done' && task.dueDate && parseISO(task.dueDate) >= currentMonthStart).length;
        const lastMonthTasks = userTasks.filter(task => task.status === 'done' && task.dueDate && isWithinInterval(parseISO(task.dueDate), { start: lastMonthStart, end: lastMonthEnd })).length;

        return {
            currentMonthHours: currentMonthLogs.reduce((sum, log) => sum + log.hours, 0),
            lastMonthHours: lastMonthLogs.reduce((sum, log) => sum + log.hours, 0),
            currentMonthTasks,
            lastMonthTasks
        };
    }, [userLogs, userTasks]);

    const handleDateClick = (date: Date) => {
        setSelectedDateDetails({
            date: date.toISOString().split('T')[0],
            isEditable: isDateEditable(date)
        });
        setIsLogDetailModalOpen(true);
    };
    
    const handleSaveLog = async (logData: DailyLogFormData) => {
        if (!currentUser || !selectedDateDetails) return;
        if (editingLog) {
            await handleUpdateDailyLog({ ...editingLog, ...logData });
        } else {
            await handleAddDailyLog({ ...logData, teamMemberId: currentUser.id, date: selectedDateDetails.date });
        }
        setEditingLog(null);
    };

    const openLogForm = (log: DailyLog | null) => {
        if (selectedDateDetails?.isEditable) {
            setEditingLog(log);
            setIsLogDetailModalOpen(false);
            setIsLogFormModalOpen(true);
        }
    };

    const logsForSelectedDate = useMemo(() => {
        if (!selectedDateDetails) return [];
        return userLogs.filter(log => log.date === selectedDateDetails.date);
    }, [userLogs, selectedDateDetails]);
    
    const todoTasks = userTasks.filter(t => t.status === 'todo');
    const inProgressTasks = userTasks.filter(t => t.status === 'inprogress');

    if (!currentUser) return null;

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">مرحباً, {currentUser.name}!</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">إليك ملخص يومك وأسبوعك.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content: Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="مهامي الحالية">
                        {todoTasks.length === 0 && inProgressTasks.length === 0 ? (
                             <p className="text-center text-slate-400 dark:text-slate-500 py-4">لا توجد لديك مهام حالية. عمل رائع!</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-2 px-1">مهام لم تبدأ ({todoTasks.length})</h3>
                                    <div className="space-y-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg h-64 overflow-y-auto">
                                        {todoTasks.map(task => <TaskCard key={task.id} task={task} onEdit={setViewingTask} onCardClick={setViewingTask} onDragStart={()=>{}} onDragEnd={()=>{}} />)}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm mb-2 px-1">مهام قيد التنفيذ ({inProgressTasks.length})</h3>
                                    <div className="space-y-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg h-64 overflow-y-auto">
                                        {inProgressTasks.map(task => <TaskCard key={task.id} task={task} onEdit={setViewingTask} onCardClick={setViewingTask} onDragStart={()=>{}} onDragEnd={()=>{}} />)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar: Calendar and Performance */}
                <div className="lg:col-span-1 space-y-6">
                    <Card title="سجلاتي اليومية">
                         <p className="text-xs text-center text-slate-500 dark:text-slate-400 px-2 pb-2">
                            يمكنك إضافة أو تعديل السجلات لليوم الحالي وآخر 6 أيام فقط.
                        </p>
                        <Calendar 
                            events={calendarEvents} 
                            onDateClick={handleDateClick} 
                            highlightedDate={selectedDateDetails ? parseISO(selectedDateDetails.date) : null}
                            isDateSelectable={isDateEditable}
                        />
                    </Card>

                    <PerformanceSummaryCard {...performanceData} />
                </div>
            </div>

            {isLogDetailModalOpen && selectedDateDetails && (
                <DailyLogDetailModal 
                    isOpen={isLogDetailModalOpen}
                    onClose={() => setIsLogDetailModalOpen(false)}
                    date={selectedDateDetails.date}
                    logs={logsForSelectedDate}
                    onAdd={() => openLogForm(null)}
                    onEdit={openLogForm}
                    onDelete={handleDeleteDailyLog}
                    isEditable={selectedDateDetails.isEditable}
                />
            )}
            
            {isLogFormModalOpen && selectedDateDetails && (
                <LogFormModal 
                    isOpen={isLogFormModalOpen}
                    onClose={() => setIsLogFormModalOpen(false)}
                    onSave={handleSaveLog}
                    log={editingLog}
                    date={selectedDateDetails.date}
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
