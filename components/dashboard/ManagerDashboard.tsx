import React, { useMemo, useState, useCallback } from 'react';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { Card } from '../ui/Card';
import { Meeting, Task, Project } from '@shared/types';
import { EmptyState } from '../ui/EmptyState';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '@shared/contexts/NavigationContext';
import { UnassignedTasksCard } from './UnassignedTasksCard';
import { UsersIcon, ClockIcon, ExclamationTriangleIcon, ClipboardDocumentListIcon, BellIcon } from '../ui/Icons';
import { usePendingApprovals } from '@shared/hooks/usePendingApprovals';
import { isToday, parseISO, isPast, isSameDay } from 'date-fns';
import { ApprovalItemCard } from '../approvals/ApprovalItemCard';
import { StatCard } from './StatCard';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { TaskDetailInline } from '../tasks/TaskDetailInline';
import { useProjectContext } from '@shared/contexts/ProjectContext';
import { AnalyticsChart } from '../ui/AnalyticsChart';
import { ManagerAIInsights } from './ManagerAIInsights';

// Widget Components
const StatCardsWidget: React.FC<{ data: { pending: number; hours: number; overdue: number; unassigned: number; }; onNavigate: (view: any, props?: any) => void; }> = ({ data, onNavigate }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 h-full">
        <StatCard onClick={() => onNavigate('approvals')} icon={<BellIcon className="w-8 h-8 text-sky-500" />} label="موافقات معلقة" value={data.pending} />
        <StatCard onClick={() => onNavigate('reports')} icon={<ClockIcon className="w-8 h-8 text-indigo-500" />} label="ساعات الفريق اليوم" value={data.hours.toFixed(1)} />
        <StatCard icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />} label="مهام متأخرة" value={data.overdue} />
        <StatCard icon={<ClipboardDocumentListIcon className="w-8 h-8 text-green-500" />} label="مهام غير مسندة" value={data.unassigned} />
    </div>
);

const TeamActivityWidget: React.FC<{ team: any[]; tasks: Task[]; }> = ({ team, tasks }) => (
    <Card title="نشاط الفريق الحالي" icon={<UsersIcon className="w-5 h-5" />}>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 pb-2">
            {team.map(member => {
                const memberTasks = tasks.filter(t => t.assignedTo === member.id && t.status === 'inprogress');
                return (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full" />
                            <div>
                                <p className="font-semibold text-sm">{member.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{memberTasks.length > 0 ? `يعمل على: ${memberTasks[0].title}` : 'لا توجد مهام نشطة'}</p>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    </Card>
);

const PendingApprovalsWidget: React.FC<{ items: any[]; onNavigate: (v: any) => void; }> = ({ items, onNavigate }) => (
    <Card title="موافقات بانتظارك" headerActions={<a onClick={() => onNavigate('approvals')} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">عرض الكل</a>}>
        <div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-2">
            {items.slice(0, 5).map((item, i) => <ApprovalItemCard key={(item as any).id || i} item={item} onReview={() => onNavigate('approvals')} />)}
            {items.length === 0 && <EmptyState icon={<ClipboardDocumentListIcon className="w-8 h-8" />} title="لا توجد موافقات" message="كل شيء على ما يرام." />}
        </div>
    </Card>
);

const UpcomingMeetingsWidget: React.FC<{ meetings: Meeting[]; onJoin: (m: Meeting) => void; }> = ({ meetings, onJoin }) => (
    <UpcomingMeetingsCard title="اجتماعات الفريق القادمة" meetings={meetings} onJoinMeeting={onJoin} />
);

const TasksStatusWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const data = useMemo(() => {
        const statuses = { 'todo': 'قيد الانتظار', 'in_progress': 'قيد التنفيذ', 'done': 'مكتملة', 'cancelled': 'ملغاة' };
        const counts = { 'todo': 0, 'in_progress': 0, 'done': 0, 'cancelled': 0 };
        tasks.forEach(t => {
            if (counts[t.status] !== undefined) {
                counts[t.status]++;
            }
        });
        return Object.entries(counts).map(([key, value]) => ({
            name: statuses[key as keyof typeof statuses],
            value
        }));
    }, [tasks]);

    return (
        <Card title="حالة مهام الفريق">
            <div className="h-full w-full relative min-h-[200px]">
                <AnalyticsChart data={data} color="#8b5cf6" />
            </div>
        </Card>
    );
};

// Main Dashboard Component
export const ManagerDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { currentUser } = useAuth();
    const { teamMembers, visibleMemberIds } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { handleUpdateTask } = useProjectContext();
    const { pendingItems } = usePendingApprovals();
    const { supabaseClient } = useSupabase();

    const [taskToAssign, setTaskToAssign] = useState<Task | null>(null);


    const { data: meetings = [] } = useQuery<Meeting[]>({ queryKey: ['meetings'], queryFn: () => api.getAll(supabaseClient!, 'meetings'), enabled: !!supabaseClient });
    const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => api.getAll(supabaseClient!, 'projects'), enabled: !!supabaseClient });
    const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks'], queryFn: () => api.getAll(supabaseClient!, 'tasks'), enabled: !!supabaseClient });

    const dashboardData = useMemo(() => {
        const myTeam = teamMembers.filter(m => m.id !== currentUser?.id && visibleMemberIds.has(m.id));
        const myProjects = projects.filter(p => p.members?.some(m => visibleMemberIds.has(m.teamMemberId)));
        const myProjectIds = new Set(myProjects.map(p => p.id));
        
        const now = new Date();
        const teamLogsToday = dailyLogs.filter(l => visibleMemberIds.has(l.teamMemberId) && isSameDay(parseISO(l.date), now));
        const teamTasks = tasks.filter(t => t.assignedTo && visibleMemberIds.has(t.assignedTo));

        return {
            myTeam,
            teamTasks,
            stats: {
                pending: pendingItems.length,
                hours: teamLogsToday.reduce((sum, l) => sum + l.hours, 0),
                overdue: teamTasks.filter(t => t.status !== 'done' && t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length,
                unassigned: tasks.filter(t => !t.assignedTo && t.projectId && myProjectIds.has(t.projectId)).length,
            },
            unassignedTasks: tasks.filter(t => !t.assignedTo && t.projectId && myProjectIds.has(t.projectId)),
        };
    }, [teamMembers, currentUser, visibleMemberIds, projects, dailyLogs, tasks, pendingItems]);

    const handleJoinMeeting = (meeting: Meeting) => onNavigate('meetingRoom', { meeting });

    const handleSaveTask = useCallback(async (taskData: Partial<Task>, isNew: boolean) => {
        if (!isNew && taskToAssign) {
            await handleUpdateTask({ ...taskData, id: taskToAssign.id });
        }
        setTaskToAssign(null);
    }, [taskToAssign, handleUpdateTask]);

    if (taskToAssign) {
        return (
            <div className="p-6 max-w-4xl mx-auto flex-1 h-full">
                <TaskDetailInline
                    onClose={() => setTaskToAssign(null)}
                    task={taskToAssign}
                    onSave={handleSaveTask}
                    initialMode="edit"
                />
            </div>
        );
    }

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على فريقك.</p>
                </div>
                 <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                    <button onClick={() => onNavigate('approvals')} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <ClipboardDocumentListIcon className="w-5 h-5" /><span>عرض الموافقات</span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <StatCardsWidget data={dashboardData.stats} onNavigate={onNavigate} />
            </div>

            <div className="mb-6 h-[350px]">
                <ManagerAIInsights
                    projects={projects}
                    teamMembers={dashboardData.myTeam}
                    tasks={tasks}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="h-[400px]">
                    <TasksStatusWidget tasks={dashboardData.teamTasks} />
                </div>
                <div className="h-[400px]">
                    <TeamActivityWidget team={dashboardData.myTeam} tasks={tasks} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="h-[400px]">
                    <PendingApprovalsWidget items={pendingItems} onNavigate={onNavigate} />
                </div>
                <div className="h-[400px]">
                    <UnassignedTasksCard tasks={dashboardData.unassignedTasks} onAssign={setTaskToAssign} />
                </div>
                <div className="h-[400px]">
                    <UpcomingMeetingsWidget meetings={meetings} onJoin={handleJoinMeeting} />
                </div>
            </div>
        </div>
    );
};