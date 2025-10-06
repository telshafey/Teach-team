import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { useToast } from './ToastContext';
import { Project, Task, ProjectFormData, TaskFormData, SuggestedTask, TaskStatus, BillingProposalFormData, FreelancerContract, TeamMember, TaskComment } from '../types';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';
import { parseMentions } from '../utils/mentions';

interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  isLoading: boolean;
  
  handleAddProject: (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => Promise<void>;
  handleUpdateProject: (project: Project) => Promise<void>;
  
  handleAddTask: (taskData: TaskFormData) => Promise<void>;
  handleUpdateTask: (task: Task) => Promise<void>;
  handleAddTaskComment: (taskId: string, commentText: string, allMembers: TeamMember[]) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  handleUpdateTaskApproval: (taskId: string, status: Task['approvalStatus'], notes?: string) => Promise<void>;

  handleFreelancerProposal: (projectId: string, proposal: BillingProposalFormData) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    if (!currentUser || !supabaseClient) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [projectsData, tasksData] = await Promise.all([
        api.fetchProjects(supabaseClient),
        api.fetchTasks(supabaseClient),
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
    } catch (error) {
      console.error("Failed to fetch project data:", error);
      addToast("فشل تحميل بيانات المشاريع.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, supabaseClient, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Project Handlers
  const handleAddProject = async (projectData: ProjectFormData, suggestedTasks: SuggestedTask[] = []) => {
    if (!supabaseClient) return;
    try {
      const newProject = await api.insert(supabaseClient, 'projects', projectData);
      setProjects(prev => [...prev, newProject]);
      addToast('تمت إضافة المشروع بنجاح.', 'success');

      if (suggestedTasks.length > 0) {
        const taskPromises = suggestedTasks.map(st => 
          api.insert(supabaseClient, 'tasks', {
            title: st.title,
            projectId: newProject.id,
            status: 'todo',
            approvalStatus: 'pending',
            comments: [],
            attachments: [],
          })
        );
        const newTasksData = await Promise.all(taskPromises);
        const newTasks = newTasksData.map(item => item as Task);
        setTasks(prev => [...prev, ...newTasks]);
        addToast(`تمت إضافة ${newTasks.length} مهام مقترحة للمشروع.`, 'info');
      }

    } catch (error) {
      addToast('فشل إضافة المشروع.', 'error');
      throw error;
    }
  };
  
  const handleUpdateProject = async (project: Project) => {
    if (!supabaseClient) return;
    try {
      const updatedProject = await api.update(supabaseClient, 'projects', project.id, project);
      setProjects(prev => prev.map(p => p.id === project.id ? updatedProject[0] : p));
      addToast('تم تحديث المشروع بنجاح.', 'success');
    } catch (error) {
      addToast('فشل تحديث المشروع.', 'error');
      throw error;
    }
  };

  // Task Handlers
  const handleAddTask = async (taskData: TaskFormData) => {
    if (!supabaseClient) return;
    try {
      const newTaskData = { ...taskData, approvalStatus: 'pending', comments: [], attachments: [] };
      const newTask = await api.insert(supabaseClient, 'tasks', newTaskData);
      setTasks(prev => [...prev, newTask]);
      addToast('تمت إضافة المهمة بنجاح.', 'success');
    } catch (error) {
      addToast('فشل إضافة المهمة.', 'error');
      throw error;
    }
  };

  const handleUpdateTask = async (task: Task) => {
    if (!supabaseClient) return;
    try {
      const updatedTask = await api.update(supabaseClient, 'tasks', task.id, task);
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask[0] : t));
      addToast('تم تحديث المهمة بنجاح.', 'success');
    } catch (error) {
      addToast('فشل تحديث المهمة.', 'error');
      throw error;
    }
  };
  
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!supabaseClient) return;
    const originalTasks = [...tasks];
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;
    
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    try {
      await api.update(supabaseClient, 'tasks', taskId, { status: newStatus });
    } catch (error) {
      addToast('فشل تحديث حالة المهمة.', 'error');
      setTasks(originalTasks);
    }
  };

  const handleUpdateTaskApproval = async (taskId: string, status: Task['approvalStatus'], notes?: string) => {
    if (!supabaseClient) return;
    try {
      const updatedTask = await api.update(supabaseClient, 'tasks', taskId, { approval_status: status, approval_notes: notes });
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask[0] : t));
      addToast('تم تحديث حالة الموافقة.', 'success');
    } catch (error) {
      addToast('فشل تحديث حالة الموافقة.', 'error');
      throw error;
    }
  };

  const handleAddTaskComment = async (taskId: string, commentText: string, allMembers: TeamMember[]) => {
    if (!currentUser || !supabaseClient) return;
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;
    
    const newComment: Omit<TaskComment, 'id'> = {
      authorId: currentUser.id,
      text: commentText,
      timestamp: new Date().toISOString(),
    };
    
    const mentionedUsers = parseMentions(commentText, allMembers);
    const notificationsToCreate = mentionedUsers
      .filter(user => user.id !== currentUser.id)
      .map(user => ({
        recipientId: user.id,
        type: 'comment_mention' as const,
        timestamp: new Date().toISOString(),
        read: false,
        projectId: taskToUpdate.projectId,
        taskId: taskToUpdate.id,
        taskTitle: taskToUpdate.title,
        commentAuthorName: currentUser.name,
      }));

    if (notificationsToCreate.length > 0) {
        try {
            await api.insertMany(supabaseClient, 'notifications', notificationsToCreate);
        } catch (error) {
            console.error("Failed to create mention notifications", error);
        }
    }
    
    const createdComment = await api.insert(supabaseClient, 'task_comments', { ...newComment, task_id: taskId });
    const updatedTask = { ...taskToUpdate, comments: [...(taskToUpdate.comments || []), createdComment] };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  const handleFreelancerProposal = async (projectId: string, proposal: BillingProposalFormData) => {
      if (!currentUser) return;
      const projectToUpdate = projects.find(p => p.id === projectId);
      if (!projectToUpdate) return;

      const contract: FreelancerContract = {
          freelancerId: currentUser.id,
          type: proposal.type,
          amount: proposal.amount,
          hourlyRate: proposal.hourlyRate,
          status: 'pending'
      };

      await handleUpdateProject({ ...projectToUpdate, freelancerContract: contract });
  };
  

  const value = {
    projects,
    tasks,
    isLoading,
    handleAddProject,
    handleUpdateProject,
    handleAddTask,
    handleUpdateTask,
    handleAddTaskComment,
    handleUpdateTaskStatus,
    handleUpdateTaskApproval,
    handleFreelancerProposal
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
