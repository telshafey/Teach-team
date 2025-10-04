import React, { useMemo, useState, useCallback } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Task, TaskStatus, FreelancerContract } from '../../types';
import { TaskCard } from './TaskCard';
import { TaskFormModal } from '../modals/TaskFormModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { PlusIcon, UsersIcon, ClockIcon, ExclamationTriangleIcon, UserPlusIcon, PencilIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { GanttChart } from './GanttChart';
import { FreelancerContractModal } from '../modals/AssignFreelancerModal';
import { calculateProjectCostBreakdown } from '../../utils/costs';

const TaskColumn: React.FC<{
  title: string;
  tasks: Task[];
  status: TaskStatus;
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  draggingTaskId: string | null;
}> = ({ title, tasks, status, onEditTask, onViewTask, onDragStart, onDragEnd, onDrop, onDragOver, draggingTaskId }) => {
  return (
    <div
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
      className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 w-full"
    >
      <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-center pb-2 mb-3 border-b-2 border-slate-200 dark:border-slate-700">
        {title} ({tasks.length})
      </h3>
      <div className="space-y-3 min-h-[300px]">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onEdit={onEditTask} 
            onCardClick={onViewTask}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingTaskId === task.id}
          />
        ))}
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
  const { getProjectById, getTasksByProjectId, handleAddTask, handleUpdateTask, handleUpdateTaskStatus, handleSetFreelancerContract } = useProjectContext();
  const { teamMembers, dailyLogs, currency, addNotification, expenseClaims } = useAppDataContext();
  const { hasPermission, currentUser } = useAuth();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'gantt'>('board');
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const project = useMemo(() => getProjectById(projectId), [projectId, getProjectById]);
  const tasks = useMemo(() => getTasksByProjectId(projectId), [projectId, getTasksByProjectId]);
  
  useState(() => {
    if(initialTaskId) {
      const task = tasks.find(t => t.id === initialTaskId);
      if(task) setViewingTask(task);
    }
  });

  const handleOpenTaskModal = (task: Task | null) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: any) => {
    if (editingTask) {
      await handleUpdateTask({ ...editingTask, ...taskData });
    } else {
      await handleAddTask({ ...taskData, projectId });
    }
  };

  const handleSaveContract = async (contractData: Omit<FreelancerContract, 'status' | 'notes'>) => {
      await handleSetFreelancerContract(projectId, contractData);
      if (currentUser) {
          addNotification({
              recipientId: contractData.freelancerId,
              type: 'freelancer_assigned',
              projectId: projectId,
              taskId: '',
              taskTitle: `تم تعيينك في مشروع "${project?.name}"`,
              assignerName: currentUser.name,
          });
      }
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData("taskId", taskId);
  };
  
  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find(t => t.id === taskId);
    if(task && task.status !== newStatus){
        handleUpdateTaskStatus(taskId, newStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const projectStats = useMemo(() => {
    if (!project) return { loggedHours: 0, totalCost: 0 };
    
    const loggedHours = dailyLogs.filter(l => l.projectId === project.id).reduce((sum, l) => sum + l.hours, 0);
    
    const { totalCost } = calculateProjectCostBreakdown(project, teamMembers, dailyLogs, expenseClaims);

    return { loggedHours, totalCost };
  }, [project, dailyLogs, teamMembers, expenseClaims]);
  
  const isOverBudget = project?.budgetAmount && projectStats.totalCost > project.budgetAmount;

  if (!project) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm font-semibold text-sky-600 mb-2">&larr; العودة للمشاريع</button>
        <p>لم يتم العثور على المشروع.</p>
      </div>
    );
  }
  
  const renderFreelancerContractInfo = () => {
    const contract = project.freelancerContract;
    const freelancer = contract ? teamMembers.find(m => m.id === contract.freelancerId) : null;

    if (!hasPermission('manage_freelancer_contracts') && currentUser?.id !== contract?.freelancerId) {
        return null;
    }

    return (
        <Card>
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">إدارة المستقلين</h4>
                    {contract && freelancer ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 space-y-1">
                           <p><strong>المستقل:</strong> {freelancer.name}</p>
                           <p>
                                <strong>العقد:</strong> 
                                {contract.type === 'fixed' ? ` سعر ثابت ${contract.amount} ${currency}` : ` بالساعة ${contract.hourlyRate} ${currency}/ساعة`}
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 mr-2">معتمد</span>
                           </p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">لم يتم تعيين مستقل لهذا المشروع بعد.</p>
                    )}
                </div>
                {hasPermission('manage_freelancer_contracts') && (
                     <button onClick={() => setIsContractModalOpen(true)} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                        {project.freelancerContract ? <PencilIcon className="w-4 h-4" /> : <UserPlusIcon className="w-4 h-4" />}
                        <span>{project.freelancerContract ? 'تعديل العقد' : 'تعيين وإدارة العقد'}</span>
                    </button>
                )}
            </div>
        </Card>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button onClick={onBack} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 mb-2">&larr; العودة للمشاريع</button>
        <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h2>
              <p className="text-md text-slate-500 dark:text-slate-400 mt-1">{project.description}</p>
            </div>
             <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {hasPermission('manage_projects') && (
                    <button onClick={() => handleOpenTaskModal(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                        <PlusIcon className="w-4 h-4"/><span>إضافة مهمة</span>
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card icon={<UsersIcon className="w-5 h-5"/>} title="أعضاء الفريق" className="md:col-span-1">
            <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden p-2">
                {[...new Set(tasks.map(t => t.assignedTo))].filter(Boolean).map(memberId => {
                    const member = teamMembers.find(m => m.id === memberId);
                    if (!member) return null;
                    return <img key={member.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-slate-800" src={member.avatarUrl} alt={member.name} title={member.name} />
                })}
            </div>
          </Card>
          <Card icon={<ClockIcon className="w-5 h-5"/>} title="الساعات" className="md:col-span-1">
            <p className="text-xl font-bold">{projectStats.loggedHours.toFixed(1)} <span className="text-sm font-normal">/ {project.budgetHours || 'N/A'} ساعة</span></p>
          </Card>
           <Card icon={<ClockIcon className="w-5 h-5"/>} title="التكلفة" className="md:col-span-1">
             <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <p className="text-xl font-bold">{projectStats.totalCost.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm font-normal">/ {project.budgetAmount?.toLocaleString() || 'N/A'} {currency}</span></p>
                {isOverBudget && <ExclamationTriangleIcon className="w-5 h-5 text-red-500" title="تم تجاوز الميزانية"/>}
             </div>
          </Card>
      </div>

      {renderFreelancerContractInfo()}
      
      <div className="mb-4 mt-6">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setViewMode('board')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'board' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>لوحة المهام</button>
            <button onClick={() => setViewMode('gantt')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'gantt' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>المخطط الزمني</button>
        </div>
      </div>

      {viewMode === 'board' ? (
        tasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <TaskColumn title="لم تبدأ" status="todo" tasks={tasks.filter(t => t.status === 'todo')} onEditTask={handleOpenTaskModal} onViewTask={setViewingTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} onDragOver={handleDragOver} draggingTaskId={draggingTaskId} />
            <TaskColumn title="قيد التنفيذ" status="inprogress" tasks={tasks.filter(t => t.status === 'inprogress')} onEditTask={handleOpenTaskModal} onViewTask={setViewingTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} onDragOver={handleDragOver} draggingTaskId={draggingTaskId} />
            <TaskColumn title="مكتملة" status="done" tasks={tasks.filter(t => t.status === 'done')} onEditTask={handleOpenTaskModal} onViewTask={setViewingTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} onDragOver={handleDragOver} draggingTaskId={draggingTaskId} />
          </div>
        ) : (
            <Card>
                <EmptyState title="لا توجد مهام في هذا المشروع" message="أضف مهمتك الأولى لبدء العمل."/>
            </Card>
        )
      ) : (
          <GanttChart project={project} tasks={tasks} />
      )}

      {isTaskModalOpen && (
        <TaskFormModal 
          isOpen={isTaskModalOpen} 
          onClose={() => setIsTaskModalOpen(false)}
          onSave={handleSaveTask}
          task={editingTask}
          projects={[project]}
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
       {isContractModalOpen && (
        <FreelancerContractModal
            isOpen={isContractModalOpen}
            onClose={() => setIsContractModalOpen(false)}
            onSave={handleSaveContract}
            project={project}
        />
       )}
    </div>
  );
};
