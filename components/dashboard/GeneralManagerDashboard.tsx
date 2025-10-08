import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { Card } from '../ui/Card';
import { BarChart, PieChart, PieChartData } from '../ui/Charts';
import { UsersIcon, FolderIcon, ClipboardDocumentListIcon, ClockIcon } from '../ui/Icons';
import { ProjectStatus, TeamMember, Task, Project, OvertimeRequest, LeaveRequest, Meeting, WorkContractChangeRequest } from '../../types';
import { DecisionDetailModal } from '../modals/DecisionDetailModal';
import { EmptyState } from '../ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { isThisWeek, parseISO } from 'date-fns';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';

// Local Type Guards
function isTask(item: any): item is Task {
  return item && typeof item.title === 'string' && typeof item.projectId === 'string';
}
function isProject(item: any): item is Project {
  return item && typeof item.name === 'string' && 'freelancerContract' in item;
}
function isOvertimeRequest(item: any): item is OvertimeRequest {
    return item && typeof item.requestedHours === 'number' && typeof item.weekStartDate === 'string';
}
function isLeaveRequest(item: any): item is LeaveRequest {
    return item && typeof item.reason === 'string' && typeof item.startDate === 'string';
}
function isWorkContractChangeRequest(item: any): item is WorkContractChangeRequest {
    return item && typeof item.requestedWeeklyHours === 'number' && typeof item.requestedSalary === 'number' && 'reason' in item;
}


interface GeneralManagerDashboardProps {
    onNavigate: (view: string, state?: any) => void;
}

export const GeneralManagerDashboard: React.FC<GeneralManagerDashboardProps> = ({ onNavigate }) => {
    const { teamMembers, dailyLogs, overtimeRequests, leaveRequests, meetings, workContractChangeRequests } = useAppDataContext();
    const { projects, tasks } = useProjectContext();
    const { hasPermission } = useAuth();
    const [reviewingItem, setReviewingItem] = useState<TeamMember | Task | Project | OvertimeRequest | LeaveRequest | WorkContractChangeRequest | null>(null);

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

    // --- Approvals Logic ---
    const pendingTasks = useMemo(() => tasks.filter(t => t.approvalStatus === 'pending'), [tasks]);
    const pendingPlans = useMemo(() => teamMembers.filter(m => m.weeklyPlan.status === 'pending'), [teamMembers]);
    const pendingContracts = useMemo(() => projects.filter(p => p.freelancerContract?.status === 'pending'), [projects]);
    const pendingOvertime = useMemo(() => overtimeRequests.filter(r => r.status === 'pending'), [overtimeRequests]);
    const pendingLeaveRequests = useMemo(() => leaveRequests.filter(r => r.status === 'pending'), [leaveRequests]);
    const pendingContractChanges = useMemo(() => workContractChangeRequests.filter(r => r.status === 'pending'), [workContractChangeRequests]);


    const allPendingItems = useMemo(() => [...pendingTasks, ...pendingPlans, ...pendingContracts, ...pendingOvertime, ...pendingLeaveRequests, ...pendingContractChanges], [pendingTasks, pendingPlans, pendingContracts, pendingOvertime, pendingLeaveRequests, pendingContractChanges]);

    const approvalCounts = useMemo(() => ({
        tasks: pendingTasks.length,
        plans: pendingPlans.length,
        contracts: pendingContracts.length,
        overtime: pendingOvertime.length,
        leave: pendingLeaveRequests.length,
        contractChanges: pendingContractChanges.length,
    }), [pendingTasks, pendingPlans, pendingContracts, pendingOvertime, pendingLeaveRequests, pendingContractChanges]);

    const canReview = (item: any) => {
        if (isTask(item)) return hasPermission('approve_task_submissions');
        if (isProject(item)) return hasPermission('approve_freelancer_contracts');
        if (isOvertimeRequest(item)) return hasPermission('approve_overtime');
        if (isLeaveRequest(item)) return hasPermission('approve_leave_requests');
        if (isWorkContractChangeRequest(item)) return hasPermission('approve_work_contract_changes');
        return hasPermission('approve_weekly_plans');
    };
    // --- End Approvals Logic ---


    const handlePieItemClick = (item: PieChartData) => {
        onNavigate('projects', { initialState: { statusFilter: item.label as ProjectStatus } });
    };
    
    const handleJoinMeeting = (meeting: Meeting) => {
        onNavigate('meetingRoom', { meeting });
    };

    return (
        <>
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
                        <Card title="حالة المشاريع" icon={<FolderIcon className="w-5 h-5"/>}>
                            <div className="flex justify-center"> <PieChart data={projectStatusData} onItemClick={handlePieItemClick} /> </div>
                        </Card>
                         <Card title="حمل العمل (هذا الأسبوع)" icon={<ClockIcon className="w-5 h-5"/>}>
                            <BarChart title="" data={weeklyProductivityData} />
                        </Card>
                         <Card title="الموافقات المعلقة" icon={<ClipboardDocumentListIcon className="w-5 h-5"/>}>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {approvalCounts.contractChanges > 0 && <span className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{approvalCounts.contractChanges} تعديل عقد</span>}
                                {approvalCounts.leave > 0 && <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-800 rounded-full">{approvalCounts.leave} إجازات</span>}
                                {approvalCounts.overtime > 0 && <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-800 rounded-full">{approvalCounts.overtime} ساعات إضافية</span>}
                                {approvalCounts.contracts > 0 && <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">{approvalCounts.contracts} عقود</span>}
                                {approvalCounts.tasks > 0 && <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{approvalCounts.tasks} مهام</span>}
                                {approvalCounts.plans > 0 && <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-800 rounded-full">{approvalCounts.plans} خطط عمل</span>}
                            </div>
                            {allPendingItems.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {allPendingItems.map((item, index) => {
                                        let text = '';
                                        const member = teamMembers.find(m => m.id === (item as any).teamMemberId);
                                        if (isTask(item)) text = `مهمة: ${item.title}`;
                                        else if (isProject(item)) text = `عقد: ${item.name}`;
                                        else if (isOvertimeRequest(item)) text = `ساعات إضافية: ${item.requestedHours.toFixed(1)} لـ ${member?.name}`;
                                        else if (isLeaveRequest(item)) text = `طلب إجازة: ${member?.name}`;
                                        else if (isWorkContractChangeRequest(item)) text = `تعديل عقد: ${member?.name}`;
                                        else text = `خطة عمل: ${(item as TeamMember).name}`;

                                        return (
                                            <div key={index} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{text}</p>
                                                {canReview(item) && (
                                                    <button onClick={() => setReviewingItem(item)} className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex-shrink-0">مراجعة</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState icon={<ClipboardDocumentListIcon className="w-8 h-8"/>} title="لا توجد موافقات" message="لا توجد طلبات معلقة للمراجعة حاليًا." />
                            )}
                        </Card>
                    </div>
                </div>
            </div>
            {reviewingItem && (
                <DecisionDetailModal 
                    isOpen={!!reviewingItem}
                    onClose={() => setReviewingItem(null)}
                    item={reviewingItem}
                />
            )}
        </>
    );
};
