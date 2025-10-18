import React, { useMemo, useState } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { BarChart, LineChart } from '../ui/Charts';
import { UsersIcon, FolderIcon, ClipboardDocumentListIcon, ClockIcon, BellIcon, ExclamationTriangleIcon, CurrencyDollarIcon, PlusIcon } from '../ui/Icons';
import { Project, Meeting, Task } from '../../types';
import { isThisWeek, parseISO, isPast, isToday, eachDayOfInterval, subDays, format, startOfWeek, endOfWeek } from 'date-fns';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '../../contexts/NavigationContext';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { usePendingApprovals } from '../../hooks/usePendingApprovals';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { StatusBadge } from '../ui/StatusBadge';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <Card className="!p-4">
        <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg">{icon}</div>
            <div className="mr-4 rtl:mr-0 rtl:ml-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </Card>
);


export const GeneralManagerDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { meetings } = useMeetingContext();
    const { projects, tasks, handleUpdateTask } = useProjectContext();
    const { pendingItems } = usePendingApprovals();
    const { currency } = useSettingsContext();
    
    const [taskForModal, setTaskForModal] = useState<Task | null>(null);

    const { activeProjects, weeklyHours, totalBudget, totalCost } = useMemo(() => {
        const now = new Date();
        const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 0 });
        const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 0 });

        const logsThisWeek = dailyLogs.filter(l => isThisWeek(parseISO(l.date), { weekStartsOn: 0 }));
        
        const totalProjectCost = projects.reduce((sum, p) => sum + (p.budgetAmount || 0), 0);
        
        return {
            activeProjects: projects.filter(p => p.status === 'نشط').length,
            weeklyHours: logsThisWeek.reduce((sum, l) => sum + l.hours, 0),
            totalBudget: projects.reduce((sum,p) => sum + (p.budgetAmount || 0), 0),
            totalCost: 0,
        };
    }, [projects, dailyLogs]);

    const dailyProductivityData = useMemo(() => {
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const rangeDays = eachDayOfInterval({ start: startDate, end: endDate });
        const productivityMap: Record<string, number> = {};
        rangeDays.forEach(day => { productivityMap[format(day, 'yyyy-MM-dd')] = 0; });
        dailyLogs.forEach(log => {
            if (productivityMap.hasOwnProperty(log.date)) productivityMap[log.date] += log.hours;
        });
        return Object.entries(productivityMap).map(([date, hours]) => ({ label: format(new Date(date), 'd MMM'), value: hours }));
    }, [dailyLogs]);
    
    const teamProductivityData = useMemo(() => teamMembers.map(member => ({ 
        label: member.name, 
        value: dailyLogs.filter(log => log.teamMemberId === member.id && isThisWeek(parseISO(log.date))).reduce((sum, log) => sum + log.hours, 0) 
    })).sort((a, b) => b.value - a.value).slice(0, 10), [teamMembers, dailyLogs]);

    const handleJoinMeeting = (meeting: Meeting) => onNavigate('meetingRoom', { meeting });
    const handleSaveTask = async (taskData: Partial<Task>) => {
        if (taskForModal) await handleUpdateTask({ ...taskForModal, ...taskData });
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير العام</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">نظرة عامة على أداء المنظومة.</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                    <button onClick={() => onNavigate('projects', {isModalOpen: true})} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-5 h-5"/><span>مشروع جديد</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <StatCard icon={<FolderIcon className="w-8 h-8 text-sky-500"/>} label="مشاريع نشطة" value={activeProjects} />
                <StatCard icon={<ClockIcon className="w-8 h-8 text-indigo-500"/>} label="ساعات العمل (الأسبوع)" value={weeklyHours.toFixed(1)} />
                <StatCard icon={<BellIcon className="w-8 h-8 text-amber-500"/>} label="موافقات معلقة" value={pendingItems.length} />
                <StatCard icon={<CurrencyDollarIcon className="w-8 h-8 text-green-500"/>} label="إجمالي الميزانيات" value={`${(totalBudget / 1000).toFixed(1)}k`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <Card title="إنتاجية الشركة (آخر 30 يوم)">
                        <LineChart data={dailyProductivityData} />
                    </Card>
                    <Card title="نظرة عامة على المشاريع النشطة">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50"><tr>
                                    <th className="px-4 py-2">المشروع</th><th className="px-4 py-2">الحالة</th><th className="px-4 py-2">تقدم الساعات</th><th className="px-4 py-2">التكلفة</th>
                                </tr></thead>
                                <tbody>
                                    {projects.filter(p => p.status === 'نشط').slice(0,5).map(p => {
                                        const hours = dailyLogs.filter(l=>l.projectId === p.id).reduce((s,l)=>s+l.hours, 0);
                                        const progress = p.budgetHours ? (hours / p.budgetHours) * 100 : 0;
                                        return (
                                        <tr key={p.id} className="border-b dark:border-slate-700">
                                            <td className="px-4 py-2 font-medium">{p.name}</td>
                                            <td className="px-4 py-2"><StatusBadge status={p.status} type="project" /></td>
                                            <td className="px-4 py-2">{hours.toFixed(1)} / {p.budgetHours || '∞'}</td>
                                            <td className="px-4 py-2">{p.budgetAmount?.toLocaleString() || '-'} {currency}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Card title="أداء أفضل 10 موظفين (الأسبوع)">
                        <BarChart title="" data={teamProductivityData} />
                    </Card>
                    <UpcomingMeetingsCard title="الاجتماعات القادمة" meetings={meetings} onJoinMeeting={handleJoinMeeting}/>
                </div>
            </div>
            
            {taskForModal && (
                <TaskDetailModal 
                    isOpen={!!taskForModal} onClose={() => setTaskForModal(null)} task={taskForModal}
                    onSave={handleSaveTask} initialMode={'edit'}
                />
            )}
        </div>
    );
};