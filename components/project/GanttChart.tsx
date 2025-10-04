import React, { useMemo } from 'react';
// FIX: Corrected import path.
import { Task, Project } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { parseISO, differenceInDays, addDays, format, startOfDay, subDays, eachMonthOfInterval, getDaysInMonth, startOfMonth } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ChartBarIcon } from '../ui/Icons';

interface GanttChartProps {
  project: Project;
  tasks: Task[];
}

const TaskBar: React.FC<{
    task: any;
    chartStartDate: Date;
    totalDays: number;
    assigneeName?: string;
}> = ({ task, chartStartDate, totalDays, assigneeName }) => {
    const offsetDays = differenceInDays(task.startDate, chartStartDate);
    const durationDays = differenceInDays(task.dueDate, task.startDate) + 1;

    const left = (offsetDays / totalDays) * 100;
    const width = (durationDays / totalDays) * 100;

    const statusColors: Record<string, string> = {
        todo: 'bg-slate-400',
        inprogress: 'bg-sky-500',
        done: 'bg-green-500',
    };

    return (
        <div 
            className="absolute h-6 top-1/2 -translate-y-1/2 rounded group flex items-center pr-2"
            style={{ right: `${left}%`, width: `${width}%` }}
        >
            <div className={`w-full h-full ${statusColors[task.status]} opacity-80 rounded`}></div>
            <div className="absolute left-full ml-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 p-2 text-xs bg-slate-800 text-white rounded-md shadow-lg">
                <p className="font-bold">{task.title}</p>
                <p>{format(task.startDate, 'd MMM')} - {format(task.dueDate, 'd MMM')}</p>
                {assigneeName && <p>المسؤول: {assigneeName}</p>}
            </div>
        </div>
    );
};


export const GanttChart: React.FC<GanttChartProps> = ({ project, tasks }) => {
    const { teamMembers, dailyLogs } = useAppDataContext();

    const chartData = useMemo(() => {
        const plottableTasks = tasks
            .map(task => {
                if (!task.dueDate) return null;

                const taskLogs = dailyLogs.filter(log => log.taskId === task.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                let startDate = taskLogs.length > 0 ? parseISO(taskLogs[0].date) : subDays(parseISO(task.dueDate), 7);
                const dueDate = parseISO(task.dueDate);

                if (startDate > dueDate) {
                    startDate = dueDate;
                }

                return { ...task, startDate: startOfDay(startDate), dueDate: startOfDay(dueDate) };
            })
            .filter((t): t is (Task & { startDate: Date; dueDate: Date }) => t !== null)
            .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());

        if (plottableTasks.length === 0) {
            return { tasks: [], chartStartDate: new Date(), chartEndDate: new Date(), totalDays: 0 };
        }

        const allDates = plottableTasks.flatMap(t => [t.startDate, t.dueDate]);
        const chartStartDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const chartEndDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        const totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;

        return { tasks: plottableTasks, chartStartDate, chartEndDate, totalDays };
    }, [tasks, dailyLogs]);

    const { tasks: ganttTasks, chartStartDate, chartEndDate, totalDays } = chartData;

    const timelineHeader = useMemo(() => {
        if (totalDays <= 0) return { months: [], days: [] };
        
        const months = eachMonthOfInterval({ start: chartStartDate, end: chartEndDate });
        
        const monthData = months.map(monthStart => {
            const monthName = format(monthStart, 'MMMM yyyy', { locale: arSA });
            
            const start = startOfMonth(monthStart) > chartStartDate ? startOfMonth(monthStart) : chartStartDate;
            const end = addDays(startOfMonth(monthStart), getDaysInMonth(monthStart) - 1) < chartEndDate ? addDays(startOfMonth(monthStart), getDaysInMonth(monthStart) - 1) : chartEndDate;
            
            const daysInMonth = differenceInDays(end, start) + 1;
            const width = (daysInMonth / totalDays) * 100;
            return { name: monthName, width };
        });

        const dayData = [];
        for (let i = 0; i < totalDays; i++) {
            dayData.push(addDays(chartStartDate, i));
        }

        return { months: monthData, days: dayData };

    }, [chartStartDate, chartEndDate, totalDays]);
    
    if (ganttTasks.length === 0) {
         return (
             <Card>
                <EmptyState
                    icon={<ChartBarIcon className="w-10 h-10"/>}
                    title="لا توجد مهام قابلة للعرض"
                    message="أضف تواريخ استحقاق للمهام لعرضها في المخطط الزمني."
                />
            </Card>
        );
    }

    return (
        <Card>
            <div className="overflow-x-auto">
                <div className="min-w-[800px] text-sm" style={{ direction: 'rtl' }}>
                    {/* Header */}
                    <div className="relative border-b-2 border-slate-300 dark:border-slate-600">
                         {/* Months */}
                        <div className="flex">
                            {timelineHeader.months.map((month, index) => (
                                <div key={index} className="flex-shrink-0 text-center font-semibold text-slate-600 dark:text-slate-300 py-1 border-l border-slate-200 dark:border-slate-700" style={{ width: `${month.width}%` }}>
                                    {month.name}
                                </div>
                            ))}
                        </div>
                         {/* Days */}
                        <div className="flex">
                            {timelineHeader.days.map((day, index) => (
                                <div key={index} className="flex-shrink-0 text-center text-xs text-slate-500 dark:text-slate-400 py-1 border-r border-slate-200 dark:border-slate-700" style={{ width: `${(1 / totalDays) * 100}%` }}>
                                    {format(day, 'd')}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Rows */}
                    <div className="relative">
                        {ganttTasks.map((task, index) => {
                             const assignee = teamMembers.find(m => m.id === task.assignedTo);
                            return (
                                <div key={task.id} className="h-12 border-b border-slate-200 dark:border-slate-700 flex items-center">
                                    <div className="w-48 flex-shrink-0 px-2 truncate font-medium text-slate-700 dark:text-slate-200" title={task.title}>{task.title}</div>
                                    <div className="flex-grow h-full relative border-r border-slate-200 dark:border-slate-700">
                                         {/* Grid lines */}
                                        <div className="absolute inset-0 flex">
                                            {timelineHeader.days.map((_, i) => (
                                                <div key={i} className="flex-shrink-0 border-r border-slate-200 dark:border-slate-700" style={{ width: `${(1/totalDays)*100}%`}}></div>
                                            ))}
                                        </div>
                                        <TaskBar task={task} chartStartDate={chartStartDate} totalDays={totalDays} assigneeName={assignee?.name} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Card>
    );
};
