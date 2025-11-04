import React, { useMemo, useState } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { Card } from '../ui/Card';
import { BarChart, PieChart, LineChart } from '../ui/Charts';
import { FolderIcon, ClockIcon, UsersIcon } from '../ui/Icons';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';
import { Project, Task } from '../../types';

export const AnalyticsPage: React.FC = () => {
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { supabaseClient } = useSupabase();

    const { data: projects = [] } = useQuery<Project[]>({
      queryKey: ['projects'],
      queryFn: () => api.getAll(supabaseClient!, 'projects'),
      enabled: !!supabaseClient,
    });
    
    const { data: tasks = [] } = useQuery<Task[]>({
      queryKey: ['tasks'],
      queryFn: () => api.getAll(supabaseClient!, 'tasks'),
      enabled: !!supabaseClient,
    });
    
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    const filteredDailyLogs = useMemo(() => {
        if (!dateRange.from && !dateRange.to) return dailyLogs;
        return dailyLogs.filter(log => {
            const logDate = new Date(log.date);
            const isAfterFrom = !dateRange.from || logDate >= new Date(dateRange.from);
            const isBeforeTo = !dateRange.to || logDate <= new Date(dateRange.to);
            return isAfterFrom && isBeforeTo;
        });
    }, [dailyLogs, dateRange]);


    const projectHoursData = useMemo(() => {
        return projects.map(project => ({
            label: project.name,
            value: filteredDailyLogs.filter(l => l.projectId === project.id).reduce((sum, l) => sum + l.hours, 0)
        })).filter(item => item.value > 0);
    }, [projects, filteredDailyLogs]);

    const memberHoursData = useMemo(() => {
        return teamMembers.map(member => ({
            label: member.name,
            value: filteredDailyLogs.filter(l => l.teamMemberId === member.id).reduce((sum, l) => sum + l.hours, 0)
        })).filter(item => item.value > 0);
    }, [teamMembers, filteredDailyLogs]);

    const taskStatusData = useMemo(() => {
        // Note: Task status is not date-filtered as tasks don't have creation/completion timestamps in this model
        const statusCounts = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return [
            { label: 'لم تبدأ', value: statusCounts.todo || 0, color: '#737373' },
            { label: 'قيد التنفيذ', value: statusCounts.inprogress || 0, color: '#38bdf8' },
            { label: 'مكتملة', value: statusCounts.done || 0, color: '#22c55e' },
        ];
    }, [tasks]);

    const dailyProductivityData = useMemo(() => {
        const hasDateFilter = dateRange.from || dateRange.to;
        const endDate = dateRange.to ? new Date(dateRange.to) : new Date();
        const startDate = dateRange.from ? new Date(dateRange.from) : subDays(endDate, 29);

        const rangeDays = eachDayOfInterval({ start: startDate, end: endDate });
        const productivityMap: Record<string, number> = {};

        rangeDays.forEach(day => {
            productivityMap[format(day, 'yyyy-MM-dd')] = 0;
        });
        
        const logsToProcess = hasDateFilter ? filteredDailyLogs : dailyLogs;

        logsToProcess.forEach(log => {
            if (productivityMap.hasOwnProperty(log.date)) {
                productivityMap[log.date] += log.hours;
            }
        });

        return Object.entries(productivityMap).map(([date, hours]: [string, number]) => ({
            label: format(new Date(date), 'd MMM'),
            value: hours
        }));
    }, [dailyLogs, filteredDailyLogs, dateRange]);
    
    const handleReset = () => {
        setDateRange({ from: '', to: '' });
    };


    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">التحليلات</h2>
                <p className="text-md text-slate-500">نظرة عميقة على بيانات الأداء والإنتاجية.</p>
            </div>
            
            <Card className="mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">من تاريخ</label>
                        <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))} className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"/>
                    </div>
                     <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">إلى تاريخ</label>
                        <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))} className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700"/>
                    </div>
                    <button onClick={handleReset} className="mt-6 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">إعادة تعيين</button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="توزيع ساعات العمل على المشاريع" icon={<FolderIcon className="w-5 h-5"/>}>
                    <BarChart title="" data={projectHoursData} />
                </Card>
                <Card title="توزيع ساعات العمل على أعضاء الفريق" icon={<UsersIcon className="w-5 h-5"/>}>
                    <BarChart title="" data={memberHoursData} />
                </Card>
                 <Card title="حالة المهام" icon={<FolderIcon className="w-5 h-5"/>}>
                    <PieChart data={taskStatusData} />
                </Card>
                <Card title="إجمالي الساعات المسجلة" icon={<ClockIcon className="w-5 h-5"/>}>
                    <LineChart data={dailyProductivityData} />
                </Card>
            </div>
        </div>
    );
};