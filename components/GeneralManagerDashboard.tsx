import React, { useMemo } from 'react';
// FIX: Corrected import paths
import { useAppDataContext } from '../contexts/DataContext';
import { useProjectContext } from '../contexts/ProjectContext';
import { Card } from './ui/Card';
import { BarChart, PieChart, PieChartData } from './ui/Charts';
import { UsersIcon, FolderIcon, ClockIcon } from './ui/Icons';
import { ProjectStatus } from '../types';

interface GeneralManagerDashboardProps {
    onNavigate: (view: string, state?: any) => void;
}

export const GeneralManagerDashboard: React.FC<GeneralManagerDashboardProps> = ({ onNavigate }) => {
    const { teamMembers, dailyLogs } = useAppDataContext();
    const { projects, tasks } = useProjectContext();

    const totalHoursLogged = useMemo(() => dailyLogs.reduce((sum, log) => sum + log.hours, 0), [dailyLogs]);

    const projectStatusData = useMemo((): PieChartData[] => {
        const counts = projects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [
            { label: 'نشط', value: counts['نشط'] || 0, color: '#38bdf8' },
            { label: 'مكتمل', value: counts['مكتمل'] || 0, color: '#22c55e' },
            { label: 'معلق', value: counts['معلق'] || 0, color: '#f59e0b' },
        ];
    }, [projects]);
    
    const teamProductivityData = useMemo(() => {
        return teamMembers.map(member => ({
            label: member.name,
            value: dailyLogs.filter(log => log.teamMemberId === member.id).reduce((sum, log) => sum + log.hours, 0)
        })).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10
    }, [teamMembers, dailyLogs]);

    const handlePieItemClick = (item: PieChartData) => {
        onNavigate('projects', { initialState: { statusFilter: item.label as ProjectStatus } });
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير العام</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">نظرة شاملة على أداء المؤسسة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div onClick={() => onNavigate('projects')} className="cursor-pointer hover:shadow-lg transition-shadow rounded-lg">
                    <Card className="text-center h-full">
                        <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{projects.length}</p>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي المشاريع</p>
                    </Card>
                </div>
                <div onClick={() => onNavigate('team')} className="cursor-pointer hover:shadow-lg transition-shadow rounded-lg">
                    <Card className="text-center h-full">
                        <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{teamMembers.length}</p>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي الأعضاء</p>
                    </Card>
                </div>
                 <Card className="text-center">
                    <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{tasks.length}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي المهام</p>
                </Card>
                 <Card className="text-center">
                    <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{totalHoursLogged.toFixed(1)}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي الساعات المسجلة</p>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="حالة المشاريع" icon={<FolderIcon className="w-5 h-5"/>}>
                    <div className="flex justify-center">
                        <PieChart data={projectStatusData} onItemClick={handlePieItemClick} />
                    </div>
                </Card>
                 <Card title="إنتاجية الفريق (أعلى 10)" icon={<UsersIcon className="w-5 h-5"/>}>
                    <BarChart title="" data={teamProductivityData} />
                </Card>
            </div>
        </div>
    );
};
