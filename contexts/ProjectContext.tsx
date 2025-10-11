import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Project, Task, ProjectFormData, TaskFormData, ApprovalStatus, TaskStatus, SuggestedTask, BillingProposalFormData, TaskAttachment, TaskComment } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { createNotification } from '../services/notificationService';
import { parseMentions } from '../utils/mentions';
import { useTeamContext } from './TeamContext';

export interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  taskAttachments: TaskAttachment[];
  taskComments: TaskComment[];
  isLoading: boolean;
  handleAddProject: (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => Promise<void>;
  handleUpdateProject: (project: Project) => Promise<void>;
  handleAddTask: (taskData: TaskFormData) => Promise<void>;
  handleUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  handleUpdateTaskApproval: (taskId: string, status: ApprovalStatus, notes: string) => Promise<void>;
  handleFreelancerProposal: (projectId: string, proposalData: BillingProposalFormData) => Promise<void>;
  handleAddTaskComment: (taskId: string, text: string) => Promise<void>;
  handleDeleteTaskComment: (commentId: string) => Promise<void>;
  handleAddTaskAttachment: (attachmentData: Omit<TaskAttachment, 'id'>) => Promise<void>;
  handleDeleteTaskAttachment: (attachmentId: string) => Promise<void>;
  fetchData: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const { teamMembers } = useTeamContext(); // For mention notifications
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabaseClient) return;
    setIsLoading(true);
    try {
      const [projectsData, tasksData, attachmentsData, commentsData] = await Promise.all([
        api.fetchAll<Project>(supabaseClient, 'projects'),
        api.fetchAll<Task>(supabaseClient, 'tasks'),
        api.fetchAll<TaskAttachment>(supabaseClient, 'task_attachments'),
        api.fetchAll<TaskComment>(supabaseClient, 'task_comments'),
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
      setTaskAttachments(attachmentsData);
      setTaskComments(commentsData);
    } catch (error: any) {
      console.error('Error fetching project data:', error);
      addToast('فشل تحميل بيانات المشاريع والمهام.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, addToast]);

  useEffect(() => {
    if (supabaseClient) {
      fetchData();
      const projectsChannel = supabaseClient.channel('public:projects').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData()).subscribe();
      const tasksChannel = supabaseClient.channel('public:tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData()).subscribe();
      const attachmentsChannel = supabaseClient.channel('public:task_attachments').on('postgres_changes', { event: '*', schema: 'public', table: 'task_attachments' }, () => fetchData()).subscribe();
      const commentsChannel = supabaseClient.channel('public:task_comments').on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, () => fetchData()).subscribe();
      return () => {
        supabaseClient.removeChannel(projectsChannel);
        supabaseClient.removeChannel(tasksChannel);
        supabaseClient.removeChannel(attachmentsChannel);
        supabaseClient.removeChannel(commentsChannel);
      };
    }
  }, [supabaseClient, fetchData]);
  
  const handleAddProject = async (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => {
    if (!supabaseClient) return;
    try {
        const newProject = await api.insert<Project>(supabaseClient, 'projects', { ...projectData, freelancerContract: null });
        if (suggestedTasks && suggestedTasks.length > 0) {
            const newTasks = suggestedTasks.map(st => ({
                title: st.title,
                projectId: newProject.id,
                status: 'todo' as TaskStatus,
                approvalStatus: 'approved' as ApprovalStatus,
            }));
            await api.insertMany(supabaseClient, 'tasks', newTasks);
        }
        addToast('تمت إضافة المشروع بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل إضافة المشروع: ${e.message}`, 'error'); throw e;
    }
  };

  const handleUpdateProject = async (project: Project) => {
    if (!supabaseClient) return;
    try {
        const { id, ...updates } = project;
        await api.update<Project>(supabaseClient, 'projects', id, updates);
        addToast('تم تحديث المشروع بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل تحديث المشروع: ${e.message}`, 'error'); throw e;
    }
  };

  const handleAddTask = async (taskData: TaskFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        await api.insert(supabaseClient, 'tasks', { ...taskData, approvalStatus: 'approved' });
        if (taskData.assignedTo) {
            await createNotification(supabaseClient, {
                recipientId: taskData.assignedTo,
                type: 'task_assigned',
                taskTitle: taskData.title,
                assignerName: currentUser.name,
                projectId: taskData.projectId,
            });
        }
        addToast('تمت إضافة المهمة بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل إضافة المهمة: ${e.message}`, 'error'); throw e;
    }
  };

  const handleUpdateTask = async (task: Partial<Task> & { id: string }) => {
    if (!supabaseClient) return;
    try {
        const { id, ...updates } = task;
        await api.update<Task>(supabaseClient, 'tasks', id, updates);
        addToast('تم تحديث المهمة بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل تحديث المهمة: ${e.message}`, 'error'); throw e;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!supabaseClient) return;
     try {
        await api.deleteById(supabaseClient, 'tasks', taskId);
        addToast('تم حذف المهمة بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل حذف المهمة: ${e.message}`, 'error'); throw e;
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!supabaseClient || !currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const requiresApproval = status === 'done';
    const approvalStatus = requiresApproval ? 'pending' : 'approved';
    
    try {
        await api.update<Task>(supabaseClient, 'tasks', taskId, { status, approvalStatus });
        if (requiresApproval && task.assignedTo) {
            const member = teamMembers.find(m => m.id === task.assignedTo);
            if (member?.reportsTo) {
                await createNotification(supabaseClient, {
                    recipientId: member.reportsTo,
                    type: 'task_approval',
                    taskTitle: task.title,
                    assigneeName: member.name,
                    projectId: task.projectId,
                    taskId: task.id,
                });
            }
        }
        addToast('تم تحديث حالة المهمة.', 'success');
    } catch(e: any) {
        addToast(`فشل تحديث الحالة: ${e.message}`, 'error');
    }
  };
  
  const handleUpdateTaskApproval = async (taskId: string, status: ApprovalStatus, notes: string) => {
    if (!supabaseClient) return;
    await api.update<Task>(supabaseClient, 'tasks', taskId, { approvalStatus: status, approvalNotes: notes });
  };
  
  const handleFreelancerProposal = async (projectId: string, proposalData: BillingProposalFormData) => {
    if (!supabaseClient || !currentUser) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const contract = { ...proposalData, freelancerId: currentUser.id, status: 'pending' as const };
    await handleUpdateProject({ ...project, freelancerContract: contract });
  };

  const handleAddTaskComment = async (taskId: string, text: string) => {
    if (!supabaseClient || !currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newComment: Omit<TaskComment, 'id'> = { taskId: task.id, authorId: currentUser.id, text, timestamp: new Date().toISOString() };
    await api.insert<TaskComment>(supabaseClient, 'task_comments', newComment);
    
    const mentionedUsers = parseMentions(text, teamMembers);
    for (const user of mentionedUsers) {
        if (user.id !== currentUser.id) {
            await createNotification(supabaseClient, {
                recipientId: user.id,
                type: 'comment_mention',
                taskTitle: task.title,
                commentAuthorName: currentUser.name,
                projectId: task.projectId,
                taskId: task.id,
            });
        }
    }
  };
  
  const handleDeleteTaskComment = async (commentId: string) => {
    if (!supabaseClient) return;
    await api.deleteById(supabaseClient, 'task_comments', commentId);
  };

  const handleAddTaskAttachment = async (attachmentData: Omit<TaskAttachment, 'id'>) => {
    if (!supabaseClient) return;
    await api.insert<TaskAttachment>(supabaseClient, 'task_attachments', attachmentData);
  };
  
  const handleDeleteTaskAttachment = async (attachmentId: string) => {
    if (!supabaseClient) return;
    // Note: The file in storage is deleted from the UI component for simplicity,
    // this only handles the database record.
    await api.deleteById(supabaseClient, 'task_attachments', attachmentId);
  };


  const value = { projects, tasks, taskAttachments, taskComments, isLoading, handleAddProject, handleUpdateProject, handleAddTask, handleUpdateTask, handleDeleteTask, handleUpdateTaskStatus, handleUpdateTaskApproval, handleFreelancerProposal, handleAddTaskComment, handleDeleteTaskComment, handleAddTaskAttachment, handleDeleteTaskAttachment, fetchData };

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