import React, { useMemo, useState } from 'react';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useRequestsContext } from '../../contexts/RequestsContext';
import { useMeetingContext } from '../../contexts/MeetingContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Meeting, Task } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { useNavigation } from '../../contexts/NavigationContext';
import { UnassignedTasksCard } from './UnassignedTasksCard';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { PlusIcon, UsersIcon, ClockIcon, ExclamationTriangleIcon, ClipboardDocumentListIcon, BellIcon } from '../ui/Icons';
import { usePendingApprovals } from '../../hooks/usePendingApprovals';
import { isToday, parseISO, isPast, isSameDay } from 'date-fns';
import { ApprovalItemCard } from '../approvals/ApprovalItemCard';

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

export const ManagerDashboard: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { currentUser } = useAuth();
    const { teamMembers, visibleMemberIds } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { meetings } = useMeetingContext();
    const { projects, tasks, handleUpdateTask } = useProjectContext();
    const { pendingItems } = usePendingApprovals();

    const [taskForModal, setTaskForModal] = useState<Task | null>(null);
    
    // Manager's team is everyone they are responsible for, excluding themself.
    const myTeam = useMemo(() => teamMembers.filter(m => m.id !== currentUser?.id), [teamMembers, currentUser]);
    const myTeamIds = useMemo(() => myTeam.map(m => m.id), [myTeam]);

    const myProjects = useMemo(() => {
        return projects.filter(p => p.members?.some(m => visibleMemberIds.has(m.teamMemberId)));
    }, [projects, visibleMemberIds]);

    const { teamHoursToday, overdueTasksCount } = useMemo(() => {
        const now = new Date();
        const teamLogsToday = dailyLogs.filter(l => visibleMemberIds.has(l.teamMemberId) && isSameDay(parseISO(l.date), now));
        const teamTasks = tasks.filter(t => t.assignedTo && visibleMemberIds.has(t.assignedTo));
        return {
            teamHoursToday: teamLogsToday.reduce((sum, l) => sum + l.hours, 0),
            overdueTasksCount: teamTasks.filter(t => t.status !== 'done' && t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length
        };
    }, [dailyLogs, tasks, visibleMemberIds]);
    
    const unassignedTasksInMyProjects = useMemo(() => {
        const myProjectIds = new Set(myProjects.map(p => p.id));
        return tasks.filter(t => !t.assignedTo && t.projectId && myProjectIds.has(t.projectId));
    }, [tasks, myProjects]);
    
    const handleJoinMeeting = (meeting: Meeting) => onNavigate('meetingRoom', { meeting });

    const handleSaveTask = async (taskData: Partial<Task>) => {
        if (taskForModal) await handleUpdateTask({ ...taskForModal, ...taskData });
    };

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">لوحة تحكم المدير</h2>
                    <p className="text-md text-slate-500 dark:text-slate-400">مرحباً {currentUser?.name}، إليك نظرة على فريقك.</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse w-full sm:w-auto">
                    <button onClick={() => onNavigate('approvals')} className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <ClipboardDocumentListIcon className="w-5 h-5"/><span>عرض الموافقات</span>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <StatCard icon={<BellIcon className="w-8 h-8 text-sky-500"/>} label="موافقات معلقة" value={pendingItems.length} />
                <StatCard icon={<ClockIcon className="w-8 h-8 text-indigo-500"/>} label="ساعات الفريق اليوم" value={teamHoursToday.toFixed(1)} />
                <StatCard icon={<ExclamationTriangleIcon className="w-8 h-8 text-amber-500"/>} label="مهام متأخرة" value={overdueTasksCount} />
                <StatCard icon={<ClipboardDocumentListIcon className="w-8 h-8 text-green-500"/>} label="مهام غير مسندة" value={unassignedTasksInMyProjects.length} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card title="نشاط الفريق الحالي" icon={<UsersIcon className="w-5 h-5"/>}>
                         <div className="space-y-3">
                             {myTeam.map(member => {
                                const memberTasks = tasks.filter(t => t.assignedTo === member.id && t.status === 'inprogress');
                                return (
                                <div key={member.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                        <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full"/>
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
                     <UnassignedTasksCard tasks={unassignedTasksInMyProjects} onAssign={setTaskForModal} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card title="موافقات بانتظارك" headerActions={<a onClick={() => onNavigate('approvals')} className="text-sm font-semibold text-sky-600 cursor-pointer">عرض الكل</a>}>
                        <div className="space-y-2">
                            {pendingItems.slice(0, 5).map((item, i) => <ApprovalItemCard key={(item as any).id || i} item={item} onReview={() => onNavigate('approvals')} />)}
                            {pendingItems.length === 0 && <EmptyState icon={<ClipboardDocumentListIcon className="w-8 h-8"/>} title="لا توجد موافقات" message="كل شيء على ما يرام." />}
                        </div>
                    </Card>
                    <UpcomingMeetingsCard title="اجتماعات الفريق القادمة" meetings={meetings} onJoinMeeting={handleJoinMeeting} />
                </div>
            </div>

             {taskForModal && (
                <TaskDetailModal 
                    isOpen={!!taskForModal} onClose={() => setTaskForModal(null)} task={taskForModal}
                    onSave={handleSaveTask} initialMode="edit"
                />
            )}
        </div>
    );
};
