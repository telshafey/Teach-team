import React, { useMemo } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { BarChart, PieChart, LineChart } from '../ui/Charts';
import { FolderIcon, ClockIcon, UsersIcon } from '../ui/Icons';
import { format, subDays } from 'date-fns';

export const AnalyticsPage: React.FC = () => {
    const { teamMembers, dailyLogs } = useAppDataContext();
    const { projects, tasks } = useProjectContext();

    const projectHoursData = useMemo(() => {
        return projects.map(project => ({
            label: project.name,
            value: dailyLogs.filter(l => l.projectId === project.id).reduce((sum, l) => sum + l.hours, 0)
        })).filter(item => item.value > 0);
    }, [projects, dailyLogs]);

    const memberHoursData = useMemo(() => {
        return teamMembers.map(member => ({
            label: member.name,
            value: dailyLogs.filter(l => l.teamMemberId === member.id).reduce((sum, l) => sum + l.hours, 0)
        })).filter(item => item.value > 0);
    }, [teamMembers, dailyLogs]);

    const taskStatusData = useMemo(() => {
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
        const last30Days: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
            const date = subDays(new Date(), i);
            last30Days[format(date, 'yyyy-MM-dd')] = 0;
        }
        dailyLogs.forEach(log => {
            if (last30Days.hasOwnProperty(log.date)) {
                last30Days[log.date] += log.hours;
            }
        });
        return Object.entries(last30Days).map(([date, hours]) => ({
            label: format(new Date(date), 'd MMM'),
            value: hours
        }));
    }, [dailyLogs]);


    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">التحليلات</h2>
                <p className="text-md text-slate-500">نظرة عميقة على بيانات الأداء والإنتاجية.</p>
            </div>
            
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
                <Card title="إجمالي الساعات المسجلة (آخر 30 يوم)" icon={<ClockIcon className="w-5 h-5"/>}>
                    <LineChart data={dailyProductivityData} />
                </Card>
            </div>
        </div>
    );
};