import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAppDataContext } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Project, Task, TaskStatus, TaskFormData, TeamMember, ExpenseClaim } from '../../types';
import { Card } from '../ui/Card';
import { TaskCard } from './TaskCard';
import { TaskFormModal } from '../modals/TaskFormModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { PlusIcon, ClockIcon, ClipboardIcon, ArrowPathIcon, CheckCircleIcon } from '../ui/Icons';
import { BarChart } from '../ui/Charts';

const TaskColumn: React.FC<{
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onViewTask: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => void;
}> = ({ title, icon, tasks, onEditTask, onViewTask, onDragStart, onDragEnd, onDrop }) => {
  const [isOver, setIsOver] = useState(false);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };
  const handleDragLeave = () => setIsOver(false);
  
  const statusMap: Record<string, TaskStatus> = {
    "لم تبدأ": "todo",
    "قيد التنفيذ": "inprogress",
    "مكتملة": "done"
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => { onDrop(e, statusMap[title]); setIsOver(false); }}
      className={`bg-slate-100 dark:bg-slate-800 p-3 rounded-lg transition-colors ${isOver ? 'bg-sky-100 dark:bg-sky-900/50' : ''}`}
    >
      <h3 className="flex items-center space-x-2 rtl:space-x-reverse font-semibold text-slate-700 dark:text-slate-200 mb-4 px-1">
        {icon}
        <span>{title} ({tasks.length})</span>
      </h3>
      <div className="space-y-3 min-h-[200px]">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onEdit={onEditTask} 
            onCardClick={onViewTask}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
};

const FinancialsTab: React.FC<{ project: Project }> = ({ project }) => {
    const { teamMembers, dailyLogs, expenseClaims, currency } = useAppDataContext();

    const { totalCost, laborCost, expenseCost } = useMemo(() => {
        let labor = 0;
        const projectLogs = dailyLogs.filter(l => l.projectId === project.id);
        projectLogs.forEach(log => {
            const member = teamMembers.find(m => m.id === log.teamMemberId);
            if (member) {
                if (member.hourlyRate) {
                    labor += log.hours * member.hourlyRate;
                } else if (member.salary) {
                    const hourlyRate = member.salary / (22 * 8); // Approximation
                    labor += log.hours * hourlyRate;
                }
            }
        });

        const expenses = expenseClaims
            .filter(e => e.projectId === project.id && e.status === 'approved')
            .reduce((sum, e) => sum + e.amount, 0);

        return { totalCost: labor + expenses, laborCost: labor, expenseCost: expenses };
    }, [project.id, dailyLogs, teamMembers, expenseClaims]);

    const budget = project.budgetAmount || 0;
    const budgetUsage = budget > 0 ? (totalCost / budget) * 100 : 0;
    
    const costBreakdownByMember = useMemo(() => {
        const breakdown: { [key: string]: { name: string, hours: number, cost: number } } = {};
        const projectLogs = dailyLogs.filter(l => l.projectId === project.id);
        projectLogs.forEach(log => {
            const member = teamMembers.find(m => m.id === log.teamMemberId);
            if (member) {
                if (!breakdown[member.id]) {
                    breakdown[member.id] = { name: member.name, hours: 0, cost: 0 };
                }
                let cost = 0;
                if (member.hourlyRate) {
                    cost = log.hours * member.hourlyRate;
                } else if (member.salary) {
                    cost = log.hours * (member.salary / (22*8));
                }
                breakdown[member.id].hours += log.hours;
                breakdown[member.id].cost += cost;
            }
        });
        return Object.values(breakdown);
    }, [project.id, dailyLogs, teamMembers]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="الميزانية الإجمالية"><p className="text-2xl font-bold">{budget.toLocaleString()} <span className="text-sm">{currency}</span></p></Card>
                <Card title="التكلفة الفعلية"><p className="text-2xl font-bold">{totalCost.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-sm">{currency}</span></p></Card>
                <Card title="المتبقي من الميزانية"><p className="text-2xl font-bold">{(budget - totalCost).toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-sm">{currency}</span></p></Card>
            </div>
             <Card title="استهلاك الميزانية">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                    <div className="bg-sky-500 h-4 rounded-full text-center text-white text-xs" style={{ width: `${Math.min(budgetUsage, 100)}%` }}>
                        {budgetUsage.toFixed(1)}%
                    </div>
                </div>
            </Card>
            <Card title="تحليل التكاليف">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                         <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                            <tr>
                                <th className="px-4 py-2">العنصر</th>
                                <th className="px-4 py-2">التكلفة ({currency})</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b dark:border-slate-700"><td className="px-4 py-2 font-medium">تكلفة العمالة</td><td className="px-4 py-2">{laborCost.toFixed(2)}</td></tr>
                            <tr className="border-b dark:border-slate-700"><td className="px-4 py-2 font-medium">المصروفات المباشرة</td><td className="px-4 py-2">{expenseCost.toFixed(2)}</td></tr>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 font-bold"><td className="px-4 py-2">الإجمالي</td><td className="px-4 py-2">{totalCost.toFixed(2)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

interface ProjectDetailPageProps {
  projectId: string;
  initialTaskId?: string;
  onBack: () => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, initialTaskId, onBack }) => {
  const { projects, tasks, handleAddTask, handleUpdateTask, handleUpdateTaskStatus } = useProjectContext();
  const { teamMembers, dailyLogs } = useAppDataContext();
  const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState('tasks');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  const projectTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === projectId).sort((a,b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
  }, [tasks, projectId]);

  const loggedHours = useMemo(() => {
    return dailyLogs.filter(l => l.projectId === projectId).reduce((sum, l) => sum + l.hours, 0);
  }, [dailyLogs, projectId]);

  const progress = useMemo(() => {
    const doneTasks = projectTasks.filter(t => t.status === 'done').length;
    return projectTasks.length > 0 ? (doneTasks / projectTasks.length) * 100 : 0;
  }, [projectTasks]);

  const handleSaveTask = async (taskData: TaskFormData) => {
    if (editingTask) {
      await handleUpdateTask({ ...editingTask, ...taskData });
    } else {
      await handleAddTask(taskData);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTaskId) {
      handleUpdateTaskStatus(draggedTaskId, status);
    }
  };

  const openTaskForm = (task: Task | null) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const tasksByStatus = useMemo(() => {
    return projectTasks.reduce((acc, task) => {
      acc[task.status].push(task);
      return acc;
    }, { todo: [], inprogress: [], done: [] } as Record<TaskStatus, Task[]>);
  }, [projectTasks]);

  useEffect(() => {
    if (initialTaskId) {
      const taskToView = tasks.find(t => t.id === initialTaskId);
      if (taskToView) setViewingTask(taskToView);
    }
  }, [initialTaskId, tasks]);

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p>المشروع غير موجود.</p>
        <button onClick={onBack} className="mt-4 text-sky-600 font-semibold">العودة للمشاريع</button>
      </div>
    );
  }

  const columns = [
    { title: 'لم تبدأ', status: 'todo', icon: <ClipboardIcon className="w-5 h-5 text-slate-500" /> },
    { title: 'قيد التنفيذ', status: 'inprogress', icon: <ArrowPathIcon className="w-5 h-5 text-sky-500" /> },
    { title: 'مكتملة', status: 'done', icon: <CheckCircleIcon className="w-5 h-5 text-green-500" /> },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <button onClick={onBack} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 mb-2">&larr; العودة للمشاريع</button>
        <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h2>
                <p className="text-md text-slate-500 dark:text-slate-400">{project.description}</p>
            </div>
            {hasPermission('manage_projects') && (
                <button onClick={() => openTaskForm(null)} className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
                    <PlusIcon className="w-5 h-5"/><span>إضافة مهمة</span>
                </button>
            )}
        </div>
      </div>
      
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
            <button onClick={() => setActiveTab('tasks')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tasks' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                المهام ({projectTasks.length})
            </button>
            <button onClick={() => setActiveTab('financials')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'financials' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                البيانات المالية
            </button>
        </nav>
      </div>

      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(col => (
            <TaskColumn
              key={col.status}
              title={col.title}
              icon={col.icon}
              tasks={tasksByStatus[col.status]}
              onEditTask={openTaskForm}
              onViewTask={setViewingTask}
              onDragStart={handleDragStart}
              onDragEnd={() => setDraggedTaskId(null)}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {activeTab === 'financials' && <FinancialsTab project={project} />}

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
    </div>
  );
};