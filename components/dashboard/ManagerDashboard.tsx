import React, { useMemo, useState } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { BarChart } from '../ui/Charts';
import { UsersIcon, ClipboardDocumentListIcon, FolderIcon } from '../ui/Icons';
import { Meeting, Task, TaskFormData } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '../../contexts/NavigationContext';
import { UnassignedTasksCard } from './UnassignedTasksCard';
import { TaskFormModal } from '../modals/TaskFormModal';


export const ManagerDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { currentUser } = useAuth();
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { overtimeRequests, leaveRequests, workContractChangeRequests, penalties } = useRequestsContext();
    const { meetings } = useMeetingContext();
    const { projects, tasks, handleUpdateTask } = useProjectContext();

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    const myTeam = useMemo(() => {
        if (!currentUser) return [];
        return teamMembers.filter(m => m.reportsTo === currentUser.id);
    }, [teamMembers, currentUser]);

    const myTeamIds = useMemo(() => myTeam.map(m => m.id), [myTeam]);

    const myTeamTasks = useMemo(() => {
        return tasks.filter(t => t.assignedTo && myTeamIds.includes(t.assignedTo));
    }, [tasks, myTeamIds]);
    
    const myProjects = useMemo(() => {
        if (!currentUser) return [];
        // A manager's projects are any project they are a member of, or any project their team members have tasks in.
        const teamProjectIds = new Set(tasks.filter(t => t.assignedTo && myTeamIds.includes(t.assignedTo)).map(t => t.projectId));
        const myProjectIds = new Set(projects.filter(p => p.members.some(m => m.teamMemberId === currentUser.id)).map(p => p.id));
        const allRelevantIds = new Set([...teamProjectIds, ...myProjectIds]);
        return projects.filter(p => allRelevantIds.has(p.id));
    }, [projects, tasks, myTeamIds, currentUser]);

    const meetingsForMyTeam = useMemo(() => {
        if (!currentUser) return [];
        const allMyTeamIds = [...myTeamIds, currentUser.id];
        return meetings.filter(m => m.members.some(memberId => allMyTeamIds.includes(memberId)));
    }, [meetings, myTeamIds, currentUser]);

    const totalPendingApprovals = useMemo(() => {
        const pendingTasks = myTeamTasks.filter(t => t.approvalStatus === 'pending').length;
        const pendingPlans = myTeam.filter(m => m.weeklyPlan.status === 'pending').length;
        const pendingOvertime = overtimeRequests.filter(r => r.status === 'pending' && myTeamIds.includes(r.teamMemberId)).length;
        const pendingLeave = leaveRequests.filter(r => r.status === 'pending' && myTeamIds.includes(r.teamMemberId)).length;
        const pendingContractChanges = workContractChangeRequests.filter(r => r.status === 'pending' && myTeamIds.includes(r.teamMemberId)).length;
        const pendingPenalties = penalties.filter(p => p.status === 'pending' && myTeamIds.includes(p.teamMemberId)).length;
        return pendingTasks + pendingPlans + pendingOvertime + pendingLeave + pendingContractChanges + pendingPenalties;
    }, [myTeamTasks, myTeam, overtimeRequests, leaveRequests, workContractChangeRequests, penalties, myTeamIds]);


    const teamProductivityData = useMemo(() => {
        return myTeam.map(member => ({
            label: member.name,
            value: dailyLogs.filter(log => log.teamMemberId === member.id).reduce((sum, log) => sum + log.hours, 0)
        })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [myTeam, dailyLogs]);
    
    const unassignedTasksInMyProjects = useMemo(() => {
        const myProjectIds = new Set(myProjects.map(p => p.id));
        return tasks.filter(t => !t.assignedTo && t.projectId && myProjectIds.has(t.projectId));
    }, [tasks, myProjects]);
    
    const handleJoinMeeting = (meeting: Meeting) => {
        onNavigate('meetingRoom', { meeting });
    };

    const handleOpenAssignModal = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (taskData: TaskFormData) => {
        if (editingTask) {
            await handleUpdateTask({ ...editingTask, ...taskData });
        }
    };


    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على فريقك والموافقات المعلقة.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <UnassignedTasksCard tasks={unassignedTasksInMyProjects} onAssign={handleOpenAssignModal} />
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
                </div>
            </div>

             {isTaskModalOpen && (
                <TaskFormModal 
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSave={handleSaveTask}
                    task={editingTask}
                    projects={projects}
                    defaultProjectId={editingTask?.projectId}
                />
            )}
        </div>
    );
};
