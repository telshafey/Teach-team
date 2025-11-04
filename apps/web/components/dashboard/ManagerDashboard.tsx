import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useTimeLogContext } from '@shared/contexts/TimeLogContext';
import { useAuth } from '@shared/contexts/AuthContext';
import { Card } from '../ui/Card';
import { Meeting, Task, Project } from '@shared/types';
import { EmptyState } from '../ui/EmptyState';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '../../contexts/NavigationContext';
import { UnassignedTasksCard } from './UnassignedTasksCard';
import { UsersIcon, ClockIcon, ExclamationTriangleIcon, ClipboardDocumentListIcon, BellIcon, WrenchScrewdriverIcon, CheckIcon } from '../ui/Icons';
import { usePendingApprovals } from '../../hooks/usePendingApprovals';
import { isToday, parseISO, isPast, isSameDay } from 'date-fns';
import { ApprovalItemCard } from '../approvals/ApprovalItemCard';
import { StatCard } from './StatCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useToast } from '@shared/contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { useProjectContext } from '@shared/contexts/ProjectContext';

const ResponsiveGridLayout = WidthProvider(Responsive);

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
        <div className="space-y-3">
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
    <Card title="موافقات بانتظارك" headerActions={<a onClick={() => onNavigate('approvals')} className="text-sm font-semibold text-sky-600 cursor-pointer">عرض الكل</a>}>
        <div className="space-y-2">
            {items.slice(0, 5).map((item, i) => <ApprovalItemCard key={(item as any).id || i} item={item} onReview={() => onNavigate('approvals')} />)}
            {items.length === 0 && <EmptyState icon={<ClipboardDocumentListIcon className="w-8 h-8" />} title="لا توجد موافقات" message="كل شيء على ما يرام." />}
        </div>
    </Card>
);

const UpcomingMeetingsWidget: React.FC<{ meetings: Meeting[]; onJoin: (m: Meeting) => void; }> = ({ meetings, onJoin }) => (
    <UpcomingMeetingsCard title="اجتماعات الفريق القادمة" meetings={meetings} onJoinMeeting={onJoin} />
);

// Main Dashboard Component
export const ManagerDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { teamMembers, visibleMemberIds } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { handleUpdateTask } = useProjectContext();
    const { pendingItems } = usePendingApprovals();
    const { supabaseClient } = useSupabase();

    const [isEditing, setIsEditing] = useState(false);
    const [taskToAssign, setTaskToAssign] = useState<Task | null>(null);


    const { data: meetings = [] } = useQuery<Meeting[]>({ queryKey: ['meetings'], queryFn: () => api.getAll(supabaseClient!, 'meetings'), enabled: !!supabaseClient });
    const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => api.getAll(supabaseClient!, 'projects'), enabled: !!supabaseClient });
    const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks'], queryFn: () => api.getAll(supabaseClient!, 'tasks'), enabled: !!supabaseClient });

    const defaultLayouts = {
        lg: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 1 },
            { i: 'teamActivity', x: 0, y: 1, w: 8, h: 5 },
            { i: 'approvals', x: 8, y: 1, w: 4, h: 5 },
            { i: 'unassigned', x: 0, y: 6, w: 8, h: 4 },
            { i: 'meetings', x: 8, y: 6, w: 4, h: 4 },
        ],
        md: [
            { i: 'stats', x: 0, y: 0, w: 12, h: 1 },
            { i: 'teamActivity', x: 0, y: 1, w: 12, h: 5 },
            { i: 'approvals', x: 0, y: 6, w: 6, h: 5 },
            { i: 'unassigned', x: 0, y: 11, w: 12, h: 4 },
            { i: 'meetings', x: 6, y: 6, w: 6, h: 5 },
        ],
        sm: [
             { i: 'stats', x: 0, y: 0, w: 6, h: 2 },
             { i: 'teamActivity', x: 0, y: 2, w: 6, h: 5 },
             { i: 'approvals', x: 0, y: 7, w: 6, h: 5 },
             { i: 'unassigned', x: 0, y: 12, w: 6, h: 4 },
             { i: 'meetings', x: 0, y: 16, w: 6, h: 4 },
        ]
    };
    const [layouts, setLayouts] = useState(defaultLayouts);

    const { data: savedLayouts } = useQuery({
        queryKey: ['user_preference', 'dashboard_layout_manager'],
        queryFn: () => api.getUserPreference<typeof defaultLayouts>(supabaseClient!, currentUser!.id, 'dashboard_layout_manager'),
        enabled: !!supabaseClient && !!currentUser,
    });

    useEffect(() => {
        if (savedLayouts) {
            const newLayouts: any = {};
            for (const breakpoint of ['lg', 'md', 'sm']) {
                const defaultItems = defaultLayouts[breakpoint as keyof typeof defaultLayouts];
                const savedItems = savedLayouts[breakpoint as keyof typeof savedLayouts] || [];
                const savedItemsMap = new Map(savedItems.map(item => [item.i, item]));
                newLayouts[breakpoint] = defaultItems.map(defaultItem => savedItemsMap.get(defaultItem.i) || defaultItem);
            }
            setLayouts(newLayouts);
        }
    }, [savedLayouts]);
    
    const saveLayoutMutation = useMutation({
        mutationFn: (newLayouts: typeof defaultLayouts) => api.setUserPreference(supabaseClient!, currentUser!.id, 'dashboard_layout_manager', newLayouts),
        onSuccess: () => {
            addToast('تم حفظ تخطيط اللوحة بنجاح.', 'success');
            queryClient.invalidateQueries({ queryKey: ['user_preference', 'dashboard_layout_manager'] });
            setIsEditing(false);
        },
        onError: (error) => {
            addToast(`فشل حفظ التخطيط: ${error.message}`, 'error');
        }
    });

    const dashboardData = useMemo(() => {
        const myTeam = teamMembers.filter(m => m.id !== currentUser?.id && visibleMemberIds.has(m.id));
        const myProjects = projects.filter(p => p.members?.some(m => visibleMemberIds.has(m.teamMemberId)));
        const myProjectIds = new Set(myProjects.map(p => p.id));
        
        const now = new Date();
        const teamLogsToday = dailyLogs.filter(l => visibleMemberIds.has(l.teamMemberId) && isSameDay(parseISO(l.date), now));
        const teamTasks = tasks.filter(t => t.assignedTo && visibleMemberIds.has(t.assignedTo));

        return {
            myTeam,
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

    const widgetMap: { [key: string]: React.ReactNode } = {
        'stats': <StatCardsWidget data={dashboardData.stats} onNavigate={onNavigate} />,
        'teamActivity': <TeamActivityWidget team={dashboardData.myTeam} tasks={tasks} />,
        'unassigned': <UnassignedTasksCard tasks={dashboardData.unassignedTasks} onAssign={setTaskToAssign} />,
        'approvals': <PendingApprovalsWidget items={pendingItems} onNavigate={onNavigate} />,
        'meetings': <UpcomingMeetingsWidget meetings={meetings} onJoin={handleJoinMeeting} />,
    };

    const handleToggleEdit = () => {
        if (isEditing) {
            saveLayoutMutation.mutate(layouts as any);
        } else {
            setIsEditing(true);
        }
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على فريقك.</p>
                </div>
                 <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                    <button onClick={handleToggleEdit} disabled={saveLayoutMutation.isPending} className={`w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${isEditing ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>
                        {saveLayoutMutation.isPending ? <LoadingSpinner /> : isEditing ? <CheckIcon className="w-5 h-5"/> : <WrenchScrewdriverIcon className="w-5 h-5" />}
                        <span>{saveLayoutMutation.isPending ? 'جارٍ الحفظ...' : isEditing ? 'حفظ التخطيط' : 'تخصيص اللوحة'}</span>
                    </button>
                    <button onClick={() => onNavigate('approvals')} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <ClipboardDocumentListIcon className="w-5 h-5" /><span>عرض الموافقات</span>
                    </button>
                </div>
            </div>

            <ResponsiveGridLayout
                className={`layout ${isEditing ? 'rgl-editing' : ''}`}
                layouts={layouts}
                onLayoutChange={(layout, allLayouts) => setLayouts(allLayouts as any)}
                breakpoints={{ lg: 1200, md: 996, sm: 768 }}
                cols={{ lg: 12, md: 12, sm: 6 }}
                rowHeight={60}
                isDraggable={isEditing}
                isResizable={isEditing}
            >
                {layouts.lg.map(item => (
                    <div key={item.i}>
                        {widgetMap[item.i] || <Card title="Widget not found" />}
                    </div>
                ))}
            </ResponsiveGridLayout>

             {taskToAssign && (
                <TaskDetailModal
                    isOpen={!!taskToAssign}
                    onClose={() => setTaskToAssign(null)}
                    task={taskToAssign}
                    onSave={handleSaveTask}
                    initialMode="edit"
                />
            )}
        </div>
    );
};
