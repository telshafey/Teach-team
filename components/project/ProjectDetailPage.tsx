import React, { useState, useMemo, useEffect } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Project, Task, TaskStatus, TaskFormData, BillingProposalFormData } from '../../types';
import { TaskCard } from './TaskCard';
import { TaskFormModal } from '../modals/TaskFormModal';
import { PlusIcon, PencilIcon, ListBulletIcon, ChartBarIcon } from '../ui/Icons';
import { ProjectFormModal } from '../modals/ProjectFormModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { GanttChart } from './GanttChart';
import { FreelancerBillingModal } from '../modals/FreelancerBillingModal';


interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  initialTaskIdToOpen?: string;
}

const TaskColumn: React.FC<{
    title: string;
    tasks: Task[];
    status: TaskStatus;
    onEdit: (task: Task) => void;
    onCardClick: (task: Task) => void;
    onDrop: (status: TaskStatus) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    draggingTaskId: string | null;
}> = ({ title, tasks, status, onEdit, onCardClick, onDrop, onDragStart, onDragEnd, draggingTaskId }) => {
  const [isOver, setIsOver] = useState(false);
  
  return (
    <div 
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={() => { onDrop(status); setIsOver(false); }}
        className={`bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg flex-1 transition-colors ${isOver ? 'bg-sky-100 dark:bg-sky-900/50' : ''}`}
    >
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 px-1">{title} ({tasks.length})</h3>
        <div className="space-y-3 min-h-[60vh]">
            {tasks.map(task => (
                <TaskCard 
                    key={task.id} 
                    task={task} 
                    onEdit={onEdit} 
                    onCardClick={onCardClick}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggingTaskId === task.id}
                />
            ))}
        </div>
    </div>
  );
};

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, onBack, initialTaskIdToOpen }) => {
    const { projects, tasks, handleAddTask, handleUpdateTask, handleUpdateProject, handleUpdateTaskStatus, handleFreelancerProposal } = useProjectContext();
    const { teamMembers } = useAppDataContext();
    const { currentUser, hasPermission } = useAuth();
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');

    const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
    const projectTasks = useMemo(() => tasks.filter(t => t.projectId === projectId), [tasks, projectId]);

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

    if (!project) {
        return (
            <div className="p-6">
                <button onClick={onBack} className="text-sm font-semibold text-sky-600 mb-4">&larr; العودة للمشاريع</button>
                <p>لم يتم العثور على المشروع.</p>
            </div>
        );
    }

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

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div>
                    <button onClick={onBack} className="text-sm font-semibold text-sky-600 mb-2">&larr; العودة للمشاريع</button>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h2>
                         {hasPermission('manage_projects') && (
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
                    {hasPermission('manage_projects') && (
                        <button onClick={() => openTaskModal(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                            <PlusIcon className="w-5 h-5"/><span>إضافة مهمة</span>
                        </button>
                    )}
                    {canPropose && (
                        <button onClick={() => setIsBillingModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                            <span>تقديم اقتراح للمشروع</span>
                        </button>
                    )}
                </div>
            </div>
            
            {viewMode === 'kanban' ? (
                <div className="flex flex-col md:flex-row gap-4">
                    <TaskColumn 
                        title="مهام لم تبدأ" 
                        tasks={tasksByStatus.todo}
                        status="todo"
                        onEdit={openTaskModal}
                        onCardClick={setViewingTask}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggingTaskId(null)}
                        draggingTaskId={draggingTaskId}
                    />
                    <TaskColumn 
                        title="قيد التنفيذ" 
                        tasks={tasksByStatus.inprogress}
                        status="inprogress"
                        onEdit={openTaskModal}
                        onCardClick={setViewingTask}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggingTaskId(null)}
                        draggingTaskId={draggingTaskId}
                    />
                    <TaskColumn 
                        title="مكتملة" 
                        tasks={tasksByStatus.done}
                        status="done"
                        onEdit={openTaskModal}
                        onCardClick={setViewingTask}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggingTaskId(null)}
                        draggingTaskId={draggingTaskId}
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
                    members={teamMembers}
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
        </div>
    );
};