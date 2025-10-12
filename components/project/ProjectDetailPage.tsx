import React, { useState, useMemo, useEffect } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useTeamContext } from '../../contexts/TeamContext';
import { useTimeLogContext } from '../../contexts/TimeLogContext';
import { useAuth } from '../../contexts/AuthContext';
import { Project, Task, TaskStatus, TaskFormData, BillingProposalFormData } from '../../types';
import { TaskFormModal } from '../modals/TaskFormModal';
import { PlusIcon, PencilIcon, ListBulletIcon, ChartBarIcon, SparklesIcon, TrashIcon } from '../ui/Icons';
import { ProjectFormModal } from '../modals/ProjectFormModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { GanttChart } from './GanttChart';
import { FreelancerBillingModal } from '../modals/FreelancerBillingModal';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { useNavigation } from '../../contexts/NavigationContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { generateProjectSummary } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { TaskColumn } from './TaskColumn';


interface ProjectDetailPageProps {
  projectId: string;
  initialTaskIdToOpen?: string;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, initialTaskIdToOpen }) => {
    const { onNavigate } = useNavigation();
    const { projects, tasks, handleAddTask, handleUpdateTask, handleUpdateProject, handleDeleteProject, handleUpdateTaskStatus, handleDeleteTask, handleFreelancerProposal } = useProjectContext();
    const { teamMembers } = useTeamContext();
    const { dailyLogs } = useTimeLogContext();
    const { currentUser, hasPermission } = useAuth();
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isProjectDeleteConfirmOpen, setIsProjectDeleteConfirmOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');

    // New state for AI summary
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [projectSummary, setProjectSummary] = useState('');
    const { addToast } = useToast();

    const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
    const projectTasks = useMemo(() => tasks.filter(t => t.projectId === projectId), [tasks, projectId]);
    const projectLogs = useMemo(() => dailyLogs.filter(log => log.projectId === projectId), [dailyLogs, projectId]);

    useEffect(() => {
        if (initialTaskIdToOpen) {
            const taskToOpen = projectTasks.find(t => t.id === initialTaskIdToOpen);
            if (taskToOpen) {
                setViewingTask(taskToOpen);
            }
        }
    }, [initialTaskIdToOpen, projectTasks]);

    const tasksByStatus = useMemo(() => {
        return {
            todo: projectTasks.filter(t => t.status === 'todo').sort((a,b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z')),
            inprogress: projectTasks.filter(t => t.status === 'inprogress').sort((a,b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z')),
            done: projectTasks.filter(t => t.status === 'done').sort((a,b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z')),
        };
    }, [projectTasks]);

    const handleGenerateSummary = async () => {
        if (!project) return;
        setIsGeneratingSummary(true);
        setProjectSummary('');
        try {
            const summary = await generateProjectSummary(project, projectTasks, projectLogs, teamMembers);
            setProjectSummary(summary);
        } catch (error: any) {
            addToast(error.message, 'error');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    if (!project) {
        return (
            <div className="p-6">
                <button onClick={() => onNavigate('projects')} className="text-sm font-semibold text-sky-600 mb-4">&larr; العودة للمشاريع</button>
                <p>لم يتم العثور على المشروع.</p>
            </div>
        );
    }

    const canEditProject = hasPermission('edit_projects');
    const canManageProject = hasPermission('manage_projects');
    const canCreateTasks = hasPermission('create_tasks');
    const canEditTasks = hasPermission('edit_tasks');
    const canDeleteTasks = hasPermission('delete_tasks');
    const canPropose = currentUser?.roleId === 'freelancer' && !project.freelancerContract;

    const handleSaveProposal = async (proposalData: BillingProposalFormData) => {
        await handleFreelancerProposal(project.id, proposalData);
    };
    
    const openTaskModal = (task: Task | null) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = async (taskData: TaskFormData) => {
        if (editingTask) {
            await handleUpdateTask({ ...editingTask, ...taskData });
        } else {
            await handleAddTask(taskData);
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        setDraggingTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDrop = async (newStatus: TaskStatus) => {
        if (draggingTaskId) {
            const task = tasks.find(t => t.id === draggingTaskId);
            if (task && task.status !== newStatus) {
                await handleUpdateTaskStatus(draggingTaskId, newStatus);
            }
        }
    };

    const handleDeleteClick = (task: Task) => {
        setTaskToDelete(task);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (taskToDelete) {
            await handleDeleteTask(taskToDelete.id);
            setIsDeleteConfirmOpen(false);
            setTaskToDelete(null);
        }
    };

    const confirmProjectDelete = async () => {
        if (!project) return;
        try {
            await handleDeleteProject(project.id);
            setIsProjectDeleteConfirmOpen(false);
            onNavigate('projects'); // Navigate on success
        } catch (error) {
            // Toast is already handled by the context
            setIsProjectDeleteConfirmOpen(false);
        }
    };


    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div>
                    <button onClick={() => onNavigate('projects')} className="text-sm font-semibold text-sky-600 mb-2">&larr; العودة للمشاريع</button>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h2>
                         {canEditProject && (
                            <button onClick={() => setIsProjectModalOpen(true)} className="p-1 text-slate-500 hover:text-sky-600"><PencilIcon className="w-5 h-5"/></button>
                         )}
                    </div>
                    <p className="text-md text-slate-500 dark:text-slate-400 mt-1">{project.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-sm rounded-md flex items-center space-x-2 rtl:space-x-reverse ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 text-sky-600 shadow-sm' : 'text-slate-500'}`}>
                            <ListBulletIcon className="w-5 h-5" /> <span>كانبان</span>
                        </button>
                        <button onClick={() => setViewMode('gantt')} className={`px-3 py-1.5 text-sm rounded-md flex items-center space-x-2 rtl:space-x-reverse ${viewMode === 'gantt' ? 'bg-white dark:bg-slate-600 text-sky-600 shadow-sm' : 'text-slate-500'}`}>
                            <ChartBarIcon className="w-5 h-5" /> <span>مخطط</span>
                        </button>
                    </div>
                    {canCreateTasks && (
                        <button onClick={() => openTaskModal(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                            <PlusIcon className="w-5 h-5"/><span>إضافة مهمة</span>
                        </button>
                    )}
                    {canPropose && (
                        <button onClick={() => setIsBillingModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                            <span>تقديم اقتراح للمشروع</span>
                        </button>
                    )}
                    {canManageProject && (
                        <button onClick={() => setIsProjectDeleteConfirmOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">
                            <TrashIcon className="w-5 h-5"/><span>حذف المشروع</span>
                        </button>
                    )}
                </div>
            </div>
            
            {hasPermission('use_ai_features') && (
                <Card title="ملخص المشروع الذكي (AI)" icon={<SparklesIcon className="w-5 h-5"/>} className="mb-6">
                    {projectSummary ? (
                         <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{projectSummary}</div>
                    ) : isGeneratingSummary ? (
                        <div className="flex justify-center items-center p-4">
                            <LoadingSpinner className="text-sky-500 w-5 h-5" />
                            <span className="mr-2 rtl:mr-0 rtl:ml-2 text-slate-600 dark:text-slate-300">جارٍ تحليل المشروع...</span>
                        </div>
                    ) : (
                        <div className="text-center p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">احصل على نظرة عامة سريعة على حالة المشروع باستخدام الذكاء الاصطناعي.</p>
                            <button onClick={handleGenerateSummary} className="flex items-center justify-center mx-auto space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                               <SparklesIcon className="w-5 h-5" />
                               <span>إنشاء ملخص ذكي</span>
                            </button>
                        </div>
                    )}
                </Card>
            )}

            {viewMode === 'kanban' ? (
                <div className="flex flex-col md:flex-row gap-4">
                    <TaskColumn 
                        title="مهام لم تبدأ" 
                        tasks={tasksByStatus.todo}
                        status="todo"
                        onEdit={openTaskModal}
                        onDelete={handleDeleteClick}
                        onCardClick={setViewingTask}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggingTaskId(null)}
                        draggingTaskId={draggingTaskId}
                        canEditTasks={canEditTasks}
                        canDeleteTasks={canDeleteTasks}
                    />
                    <TaskColumn 
                        title="قيد التنفيذ" 
                        tasks={tasksByStatus.inprogress}
                        status="inprogress"
                        onEdit={openTaskModal}
                        onDelete={handleDeleteClick}
                        onCardClick={setViewingTask}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggingTaskId(null)}
                        draggingTaskId={draggingTaskId}
                        canEditTasks={canEditTasks}
                        canDeleteTasks={canDeleteTasks}
                    />
                    <TaskColumn 
                        title="مكتملة" 
                        tasks={tasksByStatus.done}
                        status="done"
                        onEdit={openTaskModal}
                        onDelete={handleDeleteClick}
                        onCardClick={setViewingTask}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggingTaskId(null)}
                        draggingTaskId={draggingTaskId}
                        canEditTasks={canEditTasks}
                        canDeleteTasks={canDeleteTasks}
                    />
                </div>
            ) : (
                <GanttChart project={project} tasks={projectTasks} />
            )}
            
            {isTaskModalOpen && (
                <TaskFormModal 
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onSave={handleSaveTask}
                    task={editingTask}
                    projects={[project]}
                    defaultProjectId={project.id}
                />
            )}

            {isProjectModalOpen && (
                <ProjectFormModal 
                    isOpen={isProjectModalOpen}
                    onClose={() => setIsProjectModalOpen(false)}
                    onSave={(data) => handleUpdateProject({...project, ...data})}
                    project={project}
                />
            )}

            {viewingTask && (
                <TaskDetailModal
                    isOpen={!!viewingTask}
                    onClose={() => setViewingTask(null)}
                    task={viewingTask}
                />
            )}

            {isBillingModalOpen && (
                <FreelancerBillingModal
                    isOpen={isBillingModalOpen}
                    onClose={() => setIsBillingModalOpen(false)}
                    onSave={handleSaveProposal}
                    project={project}
                />
            )}
            
            {isDeleteConfirmOpen && (
                 <ConfirmationModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={confirmDelete}
                    title="تأكيد حذف المهمة"
                    message={`هل أنت متأكد من رغبتك في حذف مهمة "${taskToDelete?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                    isDestructive
                />
            )}
            {isProjectDeleteConfirmOpen && project && (
                 <ConfirmationModal
                    isOpen={isProjectDeleteConfirmOpen}
                    onClose={() => setIsProjectDeleteConfirmOpen(false)}
                    onConfirm={confirmProjectDelete}
                    title="تأكيد حذف المشروع"
                    message={`هل أنت متأكد من رغبتك في حذف مشروع "${project.name}"؟ سيتم حذف جميع المهام والمرفقات والتعليقات المرتبطة به بشكل دائم. لا يمكن التراجع عن هذا الإجراء.`}
                    isDestructive
                />
            )}
        </div>
    );
};