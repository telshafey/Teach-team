import React from 'react';
import { Task, TeamMember } from '../../types';
import { Card } from '../ui/Card';
import { ClockIcon, BellIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { useNavigation } from '../../contexts/NavigationContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface TaskItemProps {
    task: Task;
    project?: { id: string; name: string };
    member?: TeamMember;
    onClick: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, project, member, onClick }) => (
    <div 
        onClick={() => onClick(task)} 
        className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
    >
        <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {project ? `مشروع: ${project.name}` : 'مهمة عامة'}
                {task.dueDate && ` • تنتهي في: ${format(parseISO(task.dueDate), 'd MMM', { locale: arSA })}`}
            </p>
        </div>
        {member && (
            <img 
                src={member.avatarUrl} 
                alt={member.name} 
                title={member.name} 
                className="w-8 h-8 rounded-full flex-shrink-0" 
            />
        )}
    </div>
);

interface TodaysFocusCardProps {
    inProgressTasks: Task[];
    dueTodayTasks: Task[];
}

export const TodaysFocusCard: React.FC<TodaysFocusCardProps> = ({ inProgressTasks, dueTodayTasks }) => {
    const { onNavigate } = useNavigation();
    const { projects } = useProjectContext();
    const { teamMembers } = useTeamContext();

    const projectsMap = React.useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, { id: string, name: string }>), [projects]);
    const membersMap = React.useMemo(() => teamMembers.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<string, TeamMember>), [teamMembers]);
    
    const handleTaskClick = (task: Task) => {
        if (task.projectId) {
            onNavigate('projectDetail', { projectId: task.projectId, initialTaskIdToOpen: task.id });
        }
    };

    const hasTasks = inProgressTasks.length > 0 || dueTodayTasks.length > 0;

    return (
        <Card title="تركيز اليوم" icon={<ClockIcon className="w-5 h-5" />}>
            {hasTasks ? (
                <div className="space-y-4">
                    {inProgressTasks.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">قيد التنفيذ حالياً</h4>
                            <div className="space-y-2">
                                {inProgressTasks.map(task => (
                                    <TaskItem 
                                        key={task.id} 
                                        task={task}
                                        project={task.projectId ? projectsMap[task.projectId] : undefined}
                                        member={task.assignedTo ? membersMap[task.assignedTo] : undefined}
                                        onClick={handleTaskClick}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {dueTodayTasks.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 mb-2">تستحق اليوم</h4>
                             <div className="space-y-2">
                                {dueTodayTasks.map(task => (
                                    <TaskItem 
                                        key={task.id} 
                                        task={task}
                                        project={task.projectId ? projectsMap[task.projectId] : undefined}
                                        member={task.assignedTo ? membersMap[task.assignedTo] : undefined}
                                        onClick={handleTaskClick}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <EmptyState 
                    icon={<BellIcon className="w-8 h-8" />}
                    title="لا توجد مهام نشطة"
                    message="لا توجد مهام قيد التنفيذ أو تستحق اليوم."
                />
            )}
        </Card>
    );
};