import React, { useState, useMemo, DragEvent, useEffect } from 'react';
import { Project, Task, TaskStatus, TeamMember, BillingProposalFormData } from '../../types';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { PlusIcon, UsersIcon, FolderIcon, ClockIcon, CurrencyDollarIcon } from '../ui/Icons';
import { TaskCard } from './TaskCard';
import { TaskFormModal } from '../modals/TaskFormModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { EmptyState } from '../ui/EmptyState';
import { FreelancerBillingModal } from '../modals/FreelancerBillingModal';

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, status: TaskStatus) => void;
}

const TaskColumn: React.FC<TaskColumnProps> = ({ title, tasks, status, onEditTask, onViewTask, onDragStart, onDragEnd, onDrop }) => {
  const [isOver, setIsOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { onDrop(e, status); setIsOver(false); }}
      className={`bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 w-80 flex-shrink-0 transition-colors ${isOver ? 'bg-sky-100 dark:bg-sky-900/50' : ''}`}
    >
      <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 px-1">{title} ({tasks.length})</h3>
      <div className="space-y-3 h-full overflow-y-auto">
        {tasks.length > 0 ? (
            tasks.map(task => (
                <TaskCard key={task.id} task={task} onEdit={onEditTask} onCardClick={onViewTask} onDragStart={onDragStart} onDragEnd={onDragEnd} />
            ))
        ) : (
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md">
                <p className="text-sm text-slate-500 dark:text-slate-400">اسحب المهام إلى هنا</p>
            </div>
        )}
      </div>
    </div>
  );
};

interface ProjectDetailPageProps {
  projectId: string;
  initialTaskId?: string;
  onBack: () => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, initialTaskId, onBack }) => {
  const { projects, tasks, handleAddTask, handleUpdateTask, handleUpdateTaskStatus, handleProposeBilling } = useProjectContext();
  const { teamMembers } = useAppDataContext();
  const { hasPermission, currentUser } = useAuth();

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === projectId), [tasks, projectId]);

  const showBillingProposalCTA = useMemo(() => {
    if (!project || !currentUser || currentUser.roleId !== 'freelancer') return false;
    const isUserInvolved = projectTasks.some(t => t.assignedTo === currentUser.id);
    return isUserInvolved && !project.freelancerContract;
  }, [project, currentUser, projectTasks]);

  useEffect(() => {
    if (initialTaskId) {
      const taskToView = projectTasks.find(t => t.id === initialTaskId);
      if (taskToView) {
        setViewingTask(taskToView);
      }
    }
  }, [initialTaskId, projectTasks]);

  const columns = useMemo(() => ({
    todo: projectTasks.filter(t => t.status === 'todo'),
    inprogress: projectTasks.filter(t => t.status === 'inprogress'),
    done: projectTasks.filter(t => t.status === 'done'),
  }), [projectTasks]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggedTaskId(null);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    if (draggedTaskId) {
      handleUpdateTaskStatus(draggedTaskId, newStatus);
    }
  };

  const openTaskForm = (task: Task | null) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    if (editingTask) {
      await handleUpdateTask({ ...editingTask, ...taskData });
    } else {
      await handleAddTask({ ...taskData, projectId });
    }
    setIsTaskFormOpen(false);
    setEditingTask(null);
  };
  
  const handleSaveBillingProposal = async (proposal: BillingProposalFormData) => {
    if (!project) return;
    await handleProposeBilling(project.id, proposal);
    setIsBillingModalOpen(false);
  };

  if (!project) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-red-600">المشروع غير موجود</h2>
        <button onClick={onBack} className="text-sm font-semibold text-sky-600 hover:text-sky-800 mt-2">&larr; العودة للمشاريع</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={onBack} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 mb-1">&larr; العودة للمشاريع</button>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h2>
        </div>
        {hasPermission('manage_projects') && (
          <button onClick={() => openTaskForm(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
            <PlusIcon className="w-5 h-5"/><span>إضافة مهمة</span>
          </button>
        )}
      </div>
      
      {showBillingProposalCTA && (
        <Card className="mb-6 bg-sky-50 dark:bg-sky-900/40 border-sky-200 dark:border-sky-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <CurrencyDollarIcon className="w-8 h-8 text-sky-500" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">هل أنت جاهز للبدء؟</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">يرجى تقديم اقتراح لطريقة الدفع لبدء العمل على هذا المشروع.</p>
              </div>
            </div>
            <button onClick={() => setIsBillingModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
              اقترح طريقة الدفع
            </button>
          </div>
        </Card>
      )}

      <div className="flex-1 flex space-x-4 rtl:space-x-reverse overflow-x-auto pb-4">
        <TaskColumn title="لم تبدأ" tasks={columns.todo} status="todo" onEditTask={openTaskForm} onViewTask={setViewingTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} />
        <TaskColumn title="قيد التنفيذ" tasks={columns.inprogress} status="inprogress" onEditTask={openTaskForm} onViewTask={setViewingTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} />
        <TaskColumn title="مكتملة" tasks={columns.done} status="done" onEditTask={openTaskForm} onViewTask={setViewingTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} />
      </div>

      {isTaskFormOpen && (
        <TaskFormModal
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSave={handleSaveTask}
          task={editingTask}
          projects={projects}
          defaultProjectId={projectId}
          members={teamMembers}
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
            onSave={handleSaveBillingProposal}
            project={project}
        />
      )}
    </div>
  );
};
