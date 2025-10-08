import React, { useMemo, useState } from 'react';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { BarChart } from '../ui/Charts';
import { UsersIcon, ClipboardDocumentListIcon, FolderIcon } from '../ui/Icons';
import { TeamMember, Task, Project, OvertimeRequest, LeaveRequest, Meeting, WorkContractChangeRequest } from '../../types';
import { DecisionDetailModal } from '../modals/DecisionDetailModal';
import { EmptyState } from '../ui/EmptyState';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';

// Type guards
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


export const ManagerDashboard: React.FC<{ onNavigate: (view: string, state?: any) => void; }> = ({ onNavigate }) => {
    const { currentUser, hasPermission } = useAuth();
    const { teamMembers, dailyLogs, overtimeRequests, leaveRequests, meetings, workContractChangeRequests } = useAppDataContext();
    const { projects, tasks } = useProjectContext();

    const [reviewingItem, setReviewingItem] = useState<TeamMember | Task | Project | OvertimeRequest | LeaveRequest | WorkContractChangeRequest | null>(null);

    const myTeam = useMemo(() => {
        if (!currentUser) return [];
        return teamMembers.filter(m => m.reportsTo === currentUser.id);
    }, [teamMembers, currentUser]);

    const myTeamIds = useMemo(() => myTeam.map(m => m.id), [myTeam]);

    const myTeamTasks = useMemo(() => {
        return tasks.filter(t => t.assignedTo && myTeamIds.includes(t.assignedTo));
    }, [tasks, myTeamIds]);
    
    const myProjects = useMemo(() => {
        const projectIds = new Set(myTeamTasks.map(t => t.projectId));
        return projects.filter(p => projectIds.has(p.id));
    }, [projects, myTeamTasks]);

    const meetingsForMyTeam = useMemo(() => {
        if (!currentUser) return [];
        const allMyTeamIds = [...myTeamIds, currentUser.id];
        return meetings.filter(m => m.members.some(memberId => allMyTeamIds.includes(memberId)));
    }, [meetings, myTeamIds, currentUser]);

    const pendingTasks = useMemo(() => myTeamTasks.filter(t => t.approvalStatus === 'pending'), [myTeamTasks]);
    const pendingPlans = useMemo(() => myTeam.filter(m => m.weeklyPlan.status === 'pending'), [myTeam]);
    const pendingContracts = useMemo(() => 
        projects.filter(p => p.freelancerContract?.status === 'pending' && myProjects.some(mp => mp.id === p.id)), 
        [projects, myProjects]
    );
    const pendingOvertime = useMemo(() => 
        overtimeRequests.filter(r => r.status === 'pending' && myTeamIds.includes(r.teamMemberId)),
        [overtimeRequests, myTeamIds]
    );
    const pendingLeaveRequests = useMemo(() =>
        leaveRequests.filter(r => r.status === 'pending' && myTeamIds.includes(r.teamMemberId)),
        [leaveRequests, myTeamIds]
    );
    const pendingContractChanges = useMemo(() =>
        workContractChangeRequests.filter(r => r.status === 'pending' && myTeamIds.includes(r.teamMemberId)),
        [workContractChangeRequests, myTeamIds]
    );


    const allPendingItems = useMemo(() => [...pendingTasks, ...pendingPlans, ...pendingContracts, ...pendingOvertime, ...pendingLeaveRequests, ...pendingContractChanges], [pendingTasks, pendingPlans, pendingContracts, pendingOvertime, pendingLeaveRequests, pendingContractChanges]);

    const teamProductivityData = useMemo(() => {
        return myTeam.map(member => ({
            label: member.name,
            value: dailyLogs.filter(log => log.teamMemberId === member.id).reduce((sum, log) => sum + log.hours, 0)
        })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [myTeam, dailyLogs]);

    const canReview = (item: any) => {
        if (isTask(item)) return hasPermission('approve_task_submissions');
        if (isProject(item)) return hasPermission('approve_freelancer_contracts');
        if (isOvertimeRequest(item)) return hasPermission('approve_overtime');
        if (isLeaveRequest(item)) return hasPermission('approve_leave_requests');
        if (isWorkContractChangeRequest(item)) return hasPermission('approve_work_contract_changes');
        return hasPermission('approve_weekly_plans');
    };
    
    const handleJoinMeeting = (meeting: Meeting) => {
        onNavigate('meetingRoom', { meeting });
    };


    return (
        <>
            <div className="p-6" dir="rtl">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على فريقك والموافقات المعلقة.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="مشاريع فريقي" icon={<FolderIcon className="w-5 h-5"/>}>
                             {myProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myProjects.map(p => (
                                        <div key={p.id} onClick={() => onNavigate('projectDetail', { projectId: p.id })} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{p.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">الحالة: {p.status}</p>
                                        </div>
                                    ))}
                                </div>
                             ) : (
                                 <EmptyState icon={<FolderIcon className="w-8 h-8"/>} title="لا توجد مشاريع" message="لم يتم إسناد مهام لأعضاء فريقك في أي مشروع بعد." />
                             )}
                        </Card>
                        <Card title="إنتاجية الفريق" icon={<UsersIcon className="w-5 h-5"/>}>
                            <BarChart title="" data={teamProductivityData} />
                        </Card>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                         <UpcomingMeetingsCard title="اجتماعات الفريق القادمة" meetings={meetingsForMyTeam} onJoinMeeting={handleJoinMeeting} />
                        <Card title="الموافقات المعلقة" icon={<ClipboardDocumentListIcon className="w-5 h-5"/>} headerActions={<span className="font-bold text-sky-600 dark:text-sky-400">{allPendingItems.length}</span>}>
                            {allPendingItems.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
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
                                                <p className="text-sm text-slate-700 dark:text-slate-300">{text}</p>
                                                {canReview(item) && (
                                                    <button onClick={() => setReviewingItem(item)} className="text-xs font-semibold text-sky-600 hover:text-sky-800">مراجعة</button>
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
