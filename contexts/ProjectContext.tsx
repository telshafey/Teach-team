import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { Project, Task, TaskStatus, ApprovalStatus, TaskComment, TaskAttachment, ProjectFormData, TaskFormData, BillingProposalFormData, ContractStatus, SuggestedTask, FreelancerContract } from '../types';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  isLoading: boolean;
  getProjectById: (projectId: string) => Project | undefined;
  getTasksByProjectId: (projectId: string) => Task[];
  handleUpdateProject: (project: Project) => Promise<void>;
  handleAddProject: (projectData: ProjectFormData) => Promise<Project>;
  handleUpdateTask: (task: Task) => Promise<void>;
  handleAddTask: (taskData: Omit<Task, 'id' | 'approvalStatus' | 'comments' | 'attachments'>) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  handleUpdateTaskApproval: (taskId: string, status: ApprovalStatus, notes?: string) => Promise<void>;
  handleBulkUpdateTaskApproval: (taskIds: string[], status: ApprovalStatus) => Promise<void>;
  handleAddTaskComment: (taskId: string, text: string) => Promise<void>;
  handleAddTaskAttachment: (taskId: string, file: File) => Promise<void>;
  handleSetFreelancerContract: (projectId: string, contractData: Omit<FreelancerContract, 'status' | 'notes'>) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedProjects, fetchedTasks] = await Promise.all([
          api.fetchProjects(),
          api.fetchTasks(),
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
    loadData();
  }, [addToast]);

  const getProjectById = useCallback((projectId: string) => projects.find(p => p.id === projectId), [projects]);
  const getTasksByProjectId = useCallback((projectId: string) => tasks.filter(t => t.projectId === projectId), [tasks]);
  
  const handleUpdateProject = useCallback(async (project: Project) => {
    const updatedProject = await api.updateProject(project);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    addToast('تم تحديث المشروع بنجاح', 'success');
  }, [addToast]);

  const handleAddProject = useCallback(async (projectData: ProjectFormData): Promise<Project> => {
    const newProject = await api.addProject(projectData);
    setProjects(prev => [...prev, newProject]);
    addToast('تمت إضافة المشروع بنجاح', 'success');
    return newProject;
  }, [addToast]);

  const handleUpdateTask = useCallback(async (task: Task) => {
    const updatedTask = await api.updateTask(task);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    addToast('تم تحديث المهمة بنجاح', 'success');
  }, [addToast]);
  
  const handleAddTask = useCallback(async (taskData: Omit<Task, 'id' | 'approvalStatus' | 'comments' | 'attachments'>) => {
    const newTask = await api.addTask(taskData);
    setTasks(prev => [...prev, newTask]);
    addToast('تمت إضافة المهمة بنجاح', 'success');
  }, [addToast]);

  const handleUpdateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = await api.updateTask({ ...task, status });
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    }
  }, [tasks]);

  const handleUpdateTaskApproval = useCallback(async (taskId: string, status: ApprovalStatus, notes?: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const updatedTask = await api.updateTask({ ...task, approvalStatus: status, approvalNotes: notes });
          setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
          addToast(`تم ${status === 'approved' ? 'اعتماد' : 'تحديث'} المهمة.`, 'success');
      }
  }, [tasks, addToast]);
  
  const handleBulkUpdateTaskApproval = useCallback(async (taskIds: string[], status: ApprovalStatus) => {
      setTasks(prev => prev.map(t => taskIds.includes(t.id) ? { ...t, approvalStatus: status } : t));
      addToast(`تم تحديث ${taskIds.length} مهام بنجاح.`, 'success');
  }, [addToast]);

  const handleAddTaskComment = useCallback(async (taskId: string, text: string) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newComment: TaskComment = {
        id: `comment_${Date.now()}`,
        authorId: currentUser.id,
        timestamp: new Date().toISOString(),
        text,
      };
      const updatedTask = { ...task, comments: [...task.comments, newComment] };
      await handleUpdateTask(updatedTask);
    }
  }, [tasks, currentUser, handleUpdateTask]);

  const handleAddTaskAttachment = useCallback(async (taskId: string, file: File) => {
      if (!currentUser) return;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const newAttachment: TaskAttachment = {
              id: `attach_${Date.now()}`,
              uploaderId: currentUser.id,
              fileName: file.name,
              fileUrl: URL.createObjectURL(file), // In a real app, this would be an upload URL
              timestamp: new Date().toISOString(),
          };
          const updatedTask = { ...task, attachments: [...task.attachments, newAttachment] };
          await handleUpdateTask(updatedTask);
          addToast('تم رفع المرفق بنجاح', 'success');
      }
  }, [tasks, currentUser, handleUpdateTask, addToast]);

  const handleSetFreelancerContract = useCallback(async (projectId: string, contractData: Omit<FreelancerContract, 'status' | 'notes'>) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        const isNewAssignment = !project.freelancerContract;
        const updatedProject = {
            ...project,
            freelancerContract: {
                ...project.freelancerContract,
                ...contractData,
                status: 'approved' as ContractStatus,
            }
        };
        await handleUpdateProject(updatedProject);
        addToast(isNewAssignment ? 'تم تعيين المستقل وتفعيل العقد بنجاح.' : 'تم تحديث العقد بنجاح.', 'success');
    }
  }, [projects, handleUpdateProject, addToast]);


  const value = {
    projects,
    tasks,
    isLoading,
    getProjectById,
    getTasksByProjectId,
    handleUpdateProject,
    handleAddProject,
    handleUpdateTask,
    handleAddTask,
    handleUpdateTaskStatus,
    handleUpdateTaskApproval,
    handleBulkUpdateTaskApproval,
    handleAddTaskComment,
    handleAddTaskAttachment,
    handleSetFreelancerContract,
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