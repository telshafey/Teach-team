import React, { useMemo } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { BarChart, PieChart, PieChartData } from '../ui/Charts';
import { UsersIcon, FolderIcon, ClipboardDocumentListIcon, ClockIcon } from '../ui/Icons';
import { ProjectStatus, Meeting } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { isThisWeek, parseISO } from 'date-fns';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '../../contexts/NavigationContext';

export const GeneralManagerDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { overtimeRequests, leaveRequests, workContractChangeRequests, penalties } = useRequestsContext();
    const { meetings } = useMeetingContext();
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
    
    const allTimeProductivityData = useMemo(() => {
        return teamMembers.map(member => ({
            label: member.name,
            value: dailyLogs.filter(log => log.teamMemberId === member.id).reduce((sum, log) => sum + log.hours, 0)
        })).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10 All Time
    }, [teamMembers, dailyLogs]);

    const weeklyProductivityData = useMemo(() => {
        const logsThisWeek = dailyLogs.filter(log => isThisWeek(parseISO(log.date), { weekStartsOn: 0 }));
        const memberHours = logsThisWeek.reduce((acc, log) => {
            acc[log.teamMemberId] = (acc[log.teamMemberId] || 0) + log.hours;
            return acc;
        }, {} as Record<number, number>);

        const membersMap = teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {} as Record<number, string>);

        return Object.entries(memberHours)
            .map(([memberId, hours]: [string, number]) => ({
                label: membersMap[Number(memberId)] || `User ${memberId}`,
                value: hours
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7); // Top 7 for the week
    }, [dailyLogs, teamMembers]);
    
    const projectHoursData = useMemo(() => {
        const hoursByProject = dailyLogs.reduce((acc, log) => {
            if (log.projectId) {
                acc[log.projectId] = (acc[log.projectId] || 0) + log.hours;
            }
            return acc;
        }, {} as Record<string, number>);

        const projectsMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);

        return Object.entries(hoursByProject)
            .map(([projectId, hours]: [string, number]) => ({
                label: projectsMap[projectId] || `Project ${projectId}`,
                value: hours,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7); // Top 7 projects
    }, [dailyLogs, projects]);

    const totalPendingApprovals = useMemo(() => {
        const pendingTasks = tasks.filter(t => t.approvalStatus === 'pending').length;
        const pendingPlans = teamMembers.filter(m => m.weeklyPlan.status === 'pending').length;
        const pendingContracts = projects.filter(p => p.freelancerContract?.status === 'pending').length;
        const pendingOvertime = overtimeRequests.filter(r => r.status === 'pending').length;
        const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;
        const pendingContractChanges = workContractChangeRequests.filter(r => r.status === 'pending').length;
        const pendingPenalties = penalties.filter(p => p.status === 'pending').length;
        return pendingTasks + pendingPlans + pendingContracts + pendingOvertime + pendingLeave + pendingContractChanges + pendingPenalties;
    }, [tasks, teamMembers, projects, overtimeRequests, leaveRequests, workContractChangeRequests, penalties]);


    const handlePieItemClick = (item: PieChartData) => {
        onNavigate('projects', { initialState: { statusFilter: item.label as ProjectStatus } });
    };
    
    const handleJoinMeeting = (meeting: Meeting) => {
        onNavigate('meetingRoom', { meeting });
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير العام</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">نظرة شاملة على أداء المؤسسة.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div onClick={() => onNavigate('projects')} className="cursor-pointer hover:shadow-lg transition-shadow rounded-lg"><Card className="text-center h-full"><p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{projects.length}</p><p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي المشاريع</p></Card></div>
                <div onClick={() => onNavigate('team')} className="cursor-pointer hover:shadow-lg transition-shadow rounded-lg"><Card className="text-center h-full"><p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{teamMembers.length}</p><p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي الأعضاء</p></Card></div>
                <Card className="text-center"><p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{tasks.length}</p><p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي المهام</p></Card>
                <Card className="text-center"><p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{totalHoursLogged.toFixed(1)}</p><p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">إجمالي الساعات</p></Card>
            </div>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="إنتاجية الفريق (إجمالي)" icon={<UsersIcon className="w-5 h-5"/>}>
                        <BarChart title="" data={allTimeProductivityData} />
                    </Card>
                     <Card title="توزيع ساعات المشاريع (الأعلى)" icon={<FolderIcon className="w-5 h-5"/>}>
                        <BarChart title="" data={projectHoursData} />
                    </Card>
                </div>

                {/* Right Column (Side) */}
                <div className="lg:col-span-1 space-y-6">
                    <UpcomingMeetingsCard title="الاجتماعات القادمة" meetings={meetings} onJoinMeeting={handleJoinMeeting} />
                    <Card 
                        title="الموافقات المعلقة" 
                        icon={<ClipboardDocumentListIcon className="w-5 h-5"/>}
                        headerActions={totalPendingApprovals > 0 ? <button onClick={() => onNavigate('approvals')} className="text-sm font-semibold text-sky-600">عرض الكل</button> : null}
                    >
                        {totalPendingApprovals > 0 ? (
                            <div className="text-center py-4 cursor-pointer" onClick={() => onNavigate('approvals')}>
                                <p className="text-4xl font-bold text-sky-600 dark:text-sky-400">{totalPendingApprovals}</p>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">طلبات بانتظار المراجعة</p>
                            </div>
                        ) : (
                            <EmptyState icon={<ClipboardDocumentListIcon className="w-8 h-8"/>} title="لا توجد موافقات" message="لا توجد طلبات معلقة للمراجعة حاليًا." />
                        )}
                    </Card>
                    <Card title="حالة المشاريع" icon={<FolderIcon className="w-5 h-5"/>}>
                        <div className="flex justify-center"> <PieChart data={projectStatusData} onItemClick={handlePieItemClick} /> </div>
                    </Card>
                     <Card title="حمل العمل (هذا الأسبوع)" icon={<ClockIcon className="w-5 h-5"/>}>
                        <BarChart title="" data={weeklyProductivityData} />
                    </Card>
                </div>
            </div>
        </div>
    );
};
