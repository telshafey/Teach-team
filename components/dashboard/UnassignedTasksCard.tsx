import React from 'react';
import { Task } from '../../types';
import { Card } from '../ui/Card';
import { ClipboardDocumentListIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { useProjectContext } from '../../contexts/ProjectContext';

interface UnassignedTasksCardProps {
    tasks: Task[];
    onAssign: (task: Task) => void;
}

export const UnassignedTasksCard: React.FC<UnassignedTasksCardProps> = ({ tasks, onAssign }) => {
    const { projects } = useProjectContext();
    const projectsMap = React.useMemo(() => 
        projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>), 
        [projects]
    );

    return (
        <Card title="مهام غير مسندة" icon={<ClipboardDocumentListIcon className="w-5 h-5" />}>
            {tasks.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {tasks.map(task => (
                        <div key={task.id} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {task.projectId ? `مشروع: ${projectsMap[task.projectId]}` : 'مهمة عامة'}
                                </p>
                            </div>
                            <button onClick={() => onAssign(task)} className="text-xs font-semibold text-sky-600 hover:text-sky-800 px-3 py-1 bg-sky-100 dark:bg-sky-900/50 rounded-full">
                                تعيين
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={<ClipboardDocumentListIcon className="w-8 h-8" />} 
                    title="لا توجد مهام" 
                    message="كل المهام مسندة حاليًا." 
                />
            )}
        </Card>
    );
};
