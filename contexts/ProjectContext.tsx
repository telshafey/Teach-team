import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Project, Task, ProjectFormData, TaskFormData, TaskStatus, ApprovalStatus, TaskComment, TaskAttachment, BillingProposalFormData, ContractStatus } from '../types';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useAppDataContext } from './DataContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  handleAddProject: (projectData: ProjectFormData) => Promise<Project>;
  handleUpdateProject: (project: Project) => Promise<void>;
  handleAddTask: (taskData: TaskFormData) => Promise<void>;
  handleUpdateTask: (task: Task) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  handleBulkUpdateTaskApproval: (taskIds: string[], status: ApprovalStatus) => Promise<void>;
  handleUpdateTaskApproval: (taskId: string, status: ApprovalStatus, notes?: string) => Promise<void>;
  handleAddTaskComment: (taskId: string, commentText: string) => Promise<void>;
  handleAddTaskAttachment: (taskId: string, file: File) => Promise<void>;
  handleProposeBilling: (projectId: string, proposal: BillingProposalFormData) => Promise<void>;
  handleResolveBilling: (projectId: string, status: ContractStatus, notes: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { addNotification, teamMembers } = useAppDataContext();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadProjectData = async () => {
        setIsLoading(true);
        try {
            const [fetchedProjects, fetchedTasks] = await Promise.all([
                api.fetchProjects(),
                api.fetchTasks()
            ]);
            setProjects(fetchedProjects);
            setTasks(fetchedTasks);
        } catch (error) {
            console.error("Failed to load project data", error);
            addToast('فشل تحميل بيانات المشاريع', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    loadProjectData();
  }, [addToast]);


  const handleAddProject = useCallback(async (projectData: ProjectFormData): Promise<Project> => {
    const newProject = await api.addProject(projectData);
    setProjects(prev => [...prev, newProject]);
    addToast('تمت إضافة المشروع بنجاح', 'success');
    return newProject;
  }, [addToast]);

  const handleUpdateProject = useCallback(async (project: Project) => {
    await api.updateProject(project);
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    addToast('تم تحديث المشروع بنجاح', 'success');
  }, [addToast]);

  const handleAddTask = useCallback(async (taskData: TaskFormData) => {
    const newTask = await api.addTask(taskData);
    setTasks(prev => [...prev, newTask]);
    
    if (newTask.assignedTo && currentUser) {
        addNotification({
            type: 'task_assigned',
            recipientId: newTask.assignedTo,
            taskId: newTask.id,
            taskTitle: newTask.title,
            projectId: newTask.projectId,
            assignerName: currentUser.name
        });
    }
  }, [addNotification, currentUser]);
  
  const handleUpdateTask = useCallback(async (task: Task) => {
    const oldTask = tasks.find(t => t.id === task.id);
    const updatedTask = await api.updateTask(task);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    addToast('تم تحديث المهمة بنجاح', 'success');
    
    if (oldTask && updatedTask.assignedTo && oldTask.assignedTo !== updatedTask.assignedTo && currentUser) {
        addNotification({
            type: 'task_assigned',
            recipientId: updatedTask.assignedTo,
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            projectId: updatedTask.projectId,
            assignerName: currentUser.name
        });
    }
  }, [tasks, addToast, addNotification, currentUser]);

  const handleUpdateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    const updatedTask = await api.updateTaskStatus(taskId, status);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    
    if (status === 'done' && updatedTask.assignedTo) {
        const assignee = teamMembers.find(m => m.id === updatedTask!.assignedTo);
        if (assignee?.reportsTo) {
            addNotification({
                type: 'task_approval',
                recipientId: assignee.reportsTo,
                taskId: updatedTask.id,
                taskTitle: updatedTask.title,
                projectId: updatedTask.projectId,
                assigneeName: assignee.name,
            });
        }
    }
  }, [teamMembers, addNotification]);

  const handleUpdateTaskApproval = useCallback(async (taskId: string, status: ApprovalStatus, notes?: string) => {
    const updatedTask = await api.updateTaskApproval(taskId, status, notes);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    addToast('تم تحديث حالة موافقة المهمة', 'info');
  }, [addToast]);

  const handleBulkUpdateTaskApproval = useCallback(async (taskIds: string[], status: ApprovalStatus) => {
    const updatedTasks = await api.bulkUpdateTaskApproval(taskIds, status);
    setTasks(prev => prev.map(t => updatedTasks.find(u => u.id === t.id) || t));
    addToast(`تم تحديث حالة ${taskIds.length} مهام بنجاح`, 'success');
  }, [addToast]);

  const handleAddTaskComment = useCallback(async (taskId: string, commentText: string) => {
    if (!currentUser) return;
    const updatedTask = await api.addTaskComment(taskId, {
        authorId: currentUser.id,
        timestamp: new Date().toISOString(),
        text: commentText
    });
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    if (updatedTask.assignedTo && updatedTask.assignedTo !== currentUser.id) {
        addNotification({
            type: 'new_comment',
            recipientId: updatedTask.assignedTo,
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            projectId: updatedTask.projectId,
            commenterName: currentUser.name
        });
    }
  }, [currentUser, addNotification]);

  const handleAddTaskAttachment = useCallback(async (taskId: string, file: File) => {
    if (!currentUser) return;
    const updatedTask = await api.addTaskAttachment(taskId, {
        uploaderId: currentUser.id,
        fileName: file.name,
        fileUrl: URL.createObjectURL(file) 
    });
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    addToast('تم رفع المرفق بنجاح', 'success');
  }, [currentUser, addToast]);
  
  const handleProposeBilling = useCallback(async (projectId: string, proposal: BillingProposalFormData) => {
    if (!currentUser) return;
    const updatedProject = await api.proposeBilling(projectId, proposal, currentUser.id);
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    addToast('تم إرسال اقتراح الدفع للمراجعة', 'success');
  }, [currentUser, addToast]);

  const handleResolveBilling = useCallback(async (projectId: string, status: ContractStatus, notes: string) => {
    const updatedProject = await api.resolveBilling(projectId, status, notes);
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    addToast('تم تحديث حالة العقد', 'info');
  }, [addToast]);
  
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 dark:text-slate-300">
        <LoadingSpinner className="w-10 h-10" />
        <p className="mt-4">جارٍ تحميل المشاريع والمهام...</p>
      </div>
    );
  }


  const value = {
    projects,
    tasks,
    handleAddProject,
    handleUpdateProject,
    handleAddTask,
    handleUpdateTask,
    handleUpdateTaskStatus,
    handleBulkUpdateTaskApproval,
    handleUpdateTaskApproval,
    handleAddTaskComment,
    handleAddTaskAttachment,
    handleProposeBilling,
    handleResolveBilling,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};