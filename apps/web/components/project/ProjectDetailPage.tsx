import React, { useState, useCallback, useEffect } from 'react';
import { Project, Task, TaskStatus } from '@shared/types';
import { useProjectContext } from '@shared/contexts/ProjectContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { Card } from '../ui/Card';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { ProjectMembers } from './ProjectMembers';
import { ProjectFormModal } from '../modals/ProjectFormModal';
import { GanttChart } from './GanttChart';
import { PencilIcon, TrashIcon, ArrowLeftIcon, PlusIcon } from '../ui/Icons';
import { StatusBadge } from '../ui/StatusBadge';
import { useNavigation } from '../../contexts/NavigationContext';
import { useProjectPermissions } from '@shared/hooks/useProjectPermissions';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';

interface ProjectDetailPageProps {
    projectId: string;
    initialTaskIdToOpen?: string;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, initialTaskIdToOpen }) => {
    // --- HOOKS (ALL AT THE TOP) ---
    const { onNavigate } = useNavigation();
    const { handleAddTask, handleUpdateTask, handleDeleteTask, handleUpdateProject, handleDeleteProject } = useProjectContext();
    const { hasPermission } = useTeamContext();
    const { supabaseClient } = useSupabase();
    
    // State hooks
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Data fetching with react-query
    const { data: project, isLoading: isProjectLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => api.getById<Project>(supabaseClient!, 'projects', projectId),
        enabled: !!supabaseClient && !!projectId,
    });

    const { data: tasksForProject = [], isLoading: areTasksLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: async () => {
          if (!supabaseClient) return [];
          const { data, error } = await supabaseClient.from('tasks').select('*').eq('project_id', projectId);
          if (error) throw error;
          return api.keysToCamel(data) as Task[];
        },
        enabled: !!supabaseClient && !!projectId,
    });
    
    const { canEditProjectSettings, canManageTasks, canManageMembers } = useProjectPermissions(projectId);

    // Effect hooks
    useEffect(() => {
        if (initialTaskIdToOpen && tasksForProject.length > 0) {
            const taskToOpen = tasksForProject.find(t => t.id === initialTaskIdToOpen);
            if (taskToOpen) {
                setSelectedTask(taskToOpen);
            }
        }
    }, [initialTaskIdToOpen, tasksForProject]);
    
    // Callback hooks
    const handleUpdateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
        await handleUpdateTask({ id: taskId, status: newStatus });
    }, [handleUpdateTask]);
    
    const handleSaveTask = useCallback(async (taskData: Partial<Task>, isNew: boolean) => {
        if (!project) return;
        if (isNew) {
            await handleAddTask(taskData as Omit<Task, 'id' | 'approvalStatus' | 'creatorId'>, project.id);
        } else if (selectedTask) {
            await handleUpdateTask({ ...selectedTask, ...taskData });
        }
        setSelectedTask(null);
        setIsNewTaskModalOpen(false);
    }, [project, selectedTask, handleAddTask, handleUpdateTask]);
    
    const handleQuickAddTask = useCallback(async (title: string, status: TaskStatus) => {
        if (!project) return;
        await handleAddTask({ title, status }, project.id);
    }, [project, handleAddTask]);
    
    const isLoading = isProjectLoading || areTasksLoading;

    // --- CONDITIONAL RENDERING (AFTER ALL HOOKS) ---
    if (isLoading) {
        return <div className="p-6 flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    if (!project) {
        return <div className="p-6 text-center">لم يتم العثور على المشروع.</div>;
    }
    
    // --- RENDER ---
    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <button onClick={() => onNavigate('projects')} className="flex items-center space-x-2 rtl:space-x-reverse text-sm font-semibold text-slate-500 hover:text-slate-800 mb-2">
                        <ArrowLeftIcon className="w-4 h-4 transform rotate-180" /><span>العودة للمشاريع</span>
                    </button>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h2>
                        <StatusBadge status={project.status} type="project" />
                    </div>
                    <p className="text-md text-slate-600 dark:text-slate-400 mt-1">{project.description}</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    {canManageTasks && <button onClick={() => setIsNewTaskModalOpen(true)} className="p-2 text-white bg-sky-600 hover:bg-sky-700 rounded-full" title="مهمة جديدة"><PlusIcon className="w-5 h-5"/></button>}
                    {canEditProjectSettings && <button onClick={() => setIsProjectFormOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><PencilIcon className="w-5 h-5"/></button>}
                    {hasPermission('manage_projects') && <button onClick={() => setIsDeleteConfirmOpen(true)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5"/></button>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                    <Card title="مخطط جانت للمشروع">
                        <GanttChart project={project} tasks={tasksForProject} />
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <ProjectMembers project={project} canManageMembers={canManageMembers} />
                </div>
            </div>

            <KanbanBoard
                tasks={tasksForProject}
                canManageTasks={canManageTasks}
                onTaskClick={setSelectedTask}
                onDeleteTask={setTaskToDelete}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onQuickAddTask={handleQuickAddTask}
            />

            {(selectedTask || isNewTaskModalOpen) && <TaskDetailModal isOpen={!!selectedTask || isNewTaskModalOpen} onClose={() => {setSelectedTask(null); setIsNewTaskModalOpen(false)}} task={selectedTask} onSave={handleSaveTask} projectId={project.id} isProjectFixed={true} initialMode={isNewTaskModalOpen ? 'edit' : 'view'} />}
            {taskToDelete && <ConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={async () => { if(taskToDelete) {await handleDeleteTask(taskToDelete);} setTaskToDelete(null); }} title="تأكيد حذف المهمة" message={`هل أنت متأكد من رغبتك في حذف مهمة "${taskToDelete.title}"؟`} isDestructive />}
            {isProjectFormOpen && canEditProjectSettings && <ProjectFormModal isOpen={isProjectFormOpen} onClose={() => setIsProjectFormOpen(false)} onSave={async (data, projToUpdate) => await handleUpdateProject({ ...data, id: projToUpdate!.id })} project={project} />}
            {isDeleteConfirmOpen && hasPermission('manage_projects') && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={async () => { await handleDeleteProject(project.id); onNavigate('projects'); }} title="تأكيد حذف المشروع" message={`هل أنت متأكد من حذف مشروع "${project.name}"؟ سيتم حذف جميع المهام والسجلات المتعلقة به.`} isDestructive />}
        </div>
    );
};
