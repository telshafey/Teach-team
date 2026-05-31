import React from 'react';
import { Task, Project } from '@shared/types';
import { Card } from '../ui/Card';
import { ClipboardDocumentListIcon, FolderIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';

interface UnassignedTasksCardProps {
    tasks: Task[];
    onAssign: (task: Task) => void;
}

export const UnassignedTasksCard: React.FC<UnassignedTasksCardProps> = ({ tasks, onAssign }) => {
    const { supabaseClient } = useSupabase();
    
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.getAll<Project>(supabaseClient!, 'projects'),
        enabled: !!supabaseClient,
    });
    
    const projectsMap = React.useMemo(() => projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>), [projects]);
    
    return (
        <Card title="مهام غير مسندة" icon={<ClipboardDocumentListIcon className="w-5 h-5"/>}>
            {tasks.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tasks.map(task => (
                        <div key={task.id} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
                                {task.projectId && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                                        <FolderIcon className="w-3 h-3 ml-1"/> {projectsMap[task.projectId] || 'مشروع غير معروف'}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => onAssign(task)} className="text-xs font-semibold text-sky-600 hover:text-sky-800">
                                إسناد
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={<ClipboardDocumentListIcon className="w-8 h-8"/>}
                    title="لا توجد مهام"
                    message="لا توجد مهام غير مسندة في مشاريعك حاليًا."
                />
            )}
        </Card>
    );
};
