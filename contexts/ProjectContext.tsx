import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Project, Task, TaskStatus, TaskFormData, ProjectFormData, ApprovalStatus, BillingProposalFormData, FreelancerContract, SuggestedTask, TaskComment, TaskAttachment, TeamMember } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { createNotification } from '../services/notificationService';
import { useTaskComments } from '../hooks/useTaskComments';
import { useTaskAttachments } from '../hooks/useTaskAttachments';
import { useTeamContext } from './TeamContext';

export interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  taskComments: TaskComment[];
  taskAttachments: TaskAttachment[];
  isLoading: boolean;
  handleAddProject: (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => Promise<void>;
  handleUpdateProject: (project: Partial<Project> & { id: string }) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleAddTask: (taskData: TaskFormData) => Promise<void>;
  handleUpdateTask: (task: Task) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleUpdateTaskApproval: (taskId: string, status: ApprovalStatus, notes: string) => Promise<void>;
  handleFreelancerProposal: (projectId: string, proposalData: BillingProposalFormData) => Promise<void>;
  handleAddTaskComment: (taskId: string, text: string) => Promise<void>;
  handleDeleteTaskComment: (commentId: string) => Promise<void>;
  handleAddTaskAttachment: (attachmentData: Omit<TaskAttachment, 'id'>) => Promise<TaskAttachment>;
  handleDeleteTaskAttachment: (attachment: TaskAttachment) => Promise<void>;
  fetchData: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const { teamMembers } = useTeamContext(); // Needed for notifications and hooks

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use custom hooks for comments and attachments
  const { taskComments, setTaskComments, handleAddTaskComment, handleDeleteTaskComment } = useTaskComments([], supabaseClient, currentUser, tasks, teamMembers, addToast);
  const { taskAttachments, setTaskAttachments, handleAddTaskAttachment, handleDeleteTaskAttachment } = useTaskAttachments([], supabaseClient, addToast);

  const fetchData = useCallback(async () => {
    if (!supabaseClient || !currentUser) {
        setProjects([]);
        setTasks([]);
        setTaskComments([]);
        setTaskAttachments([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [projectsData, tasksData, commentsData, attachmentsData] = await Promise.all([
        api.fetchAll<Project>(supabaseClient, 'projects'),
        api.fetchAll<Task>(supabaseClient, 'tasks'),
        api.fetchAll<TaskComment>(supabaseClient, 'task_comments'),
        api.fetchAll<TaskAttachment>(supabaseClient, 'task_attachments'),
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
      setTaskComments(commentsData);
      setTaskAttachments(attachmentsData);
    } catch (error: any) {
      console.error('Error fetching project data:', error);
      addToast('فشل تحميل بيانات المشاريع والمهام.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, currentUser, addToast, setTaskComments, setTaskAttachments]);

  useEffect(() => {
    if (supabaseClient && currentUser) {
      fetchData();
      
      const createHandler = <T extends {id: any}>(setState: React.Dispatch<React.SetStateAction<T[]>>) => (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const record = api.snakeToCamel(newRecord);
          switch (eventType) {
              case 'INSERT': setState(prev => prev.some(item => item.id === record.id) ? prev : [...prev, record]); break;
              case 'UPDATE': setState(prev => prev.map(item => item.id === record.id ? record : item)); break;
              case 'DELETE': setState(prev => prev.filter(item => item.id !== oldRecord.id)); break;
          }
      };

      const channels = [
        supabaseClient.channel('projects_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, createHandler(setProjects)).subscribe(),
        supabaseClient.channel('tasks_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, createHandler(setTasks)).subscribe(),
        supabaseClient.channel('task_comments_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, createHandler(setTaskComments)).subscribe(),
        supabaseClient.channel('task_attachments_channel', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'task_attachments' }, createHandler(setTaskAttachments)).subscribe(),
      ];

      return () => {
        channels.forEach(channel => supabaseClient.removeChannel(channel));
      };
    } else {
        setProjects([]);
        setTasks([]);
        setTaskComments([]);
        setTaskAttachments([]);
    }
  }, [supabaseClient, currentUser, fetchData, setTaskComments, setTaskAttachments]);

  const handleAddProject = async (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => {
      if (!supabaseClient || !currentUser) return;
      try {
          const newProjectPayload = {
              ...projectData,
              creatorId: currentUser.id,
              members: [{ teamMemberId: currentUser.id, projectRole: 'Manager' }] as Project['members'],
          };
          const createdProject = await api.insert<Project>(supabaseClient, 'projects', newProjectPayload);
          setProjects(prev => [...prev, createdProject]);

          if (suggestedTasks && suggestedTasks.length > 0) {
              const newTasks: Omit<Task, 'id'>[] = suggestedTasks.map(st => ({
                  title: st.title,
                  projectId: createdProject.id,
                  status: 'todo',
                  approvalStatus: 'approved',
                  creatorId: currentUser.id,
              }));
              const createdTasks = await api.insertMany<Task>(supabaseClient, 'tasks', newTasks);
              setTasks(prev => [...prev, ...createdTasks]);
          }

          addToast('تمت إضافة المشروع بنجاح.', 'success');
      } catch (e: any) {
          addToast(`فشل إضافة المشروع: ${e.message}`, 'error');
          throw e;
      }
  };

  const handleUpdateProject = async (project: Partial<Project> & { id: string }) => {
    if (!supabaseClient) return;
    try {
        const { id, ...updates } = project;
        const updatedProject = await api.update<Project>(supabaseClient, 'projects', id, updates);
        setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
        addToast('تم تحديث المشروع بنجاح.', 'success');
    } catch (e: any) {
        addToast(`فشل تحديث المشروع: ${e.message}`, 'error');
        throw e;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!supabaseClient) return;
    try {
        await api.deleteById(supabaseClient, 'projects', projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setTasks(prev => prev.filter(t => t.projectId !== projectId));
        addToast('تم حذف المشروع بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل حذف المشروع: ${e.message}`, 'error'); throw e;
    }
  };

  const handleAddTask = async (taskData: TaskFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const newTaskPayload = {
            ...taskData,
            creatorId: currentUser.id,
            approvalStatus: 'approved' as ApprovalStatus
        };
        const createdTask = await api.insert<Task>(supabaseClient, 'tasks', newTaskPayload);
        setTasks(prev => [...prev, createdTask]);
        addToast('تمت إضافة المهمة بنجاح.', 'success');
        
        if (createdTask.assignedTo && createdTask.assignedTo !== currentUser.id) {
            await createNotification(supabaseClient, {
                recipientId: createdTask.assignedTo,
                type: 'task_assigned',
                taskTitle: createdTask.title,
                assignerName: currentUser.name,
                projectId: createdTask.projectId,
                taskId: createdTask.id,
            });
        }
    } catch(e: any) {
        addToast(`فشل إضافة المهمة: ${e.message}`, 'error'); throw e;
    }
  };

  const handleUpdateTask = async (task: Task) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const { id, ...updates } = task;
        const originalTask = tasks.find(t => t.id === id);
        const updatedTask = await api.update<Task>(supabaseClient, 'tasks', id, updates);
        setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
        addToast('تم تحديث المهمة بنجاح.', 'success');
        
        if (updatedTask.assignedTo && updatedTask.assignedTo !== originalTask?.assignedTo) {
            await createNotification(supabaseClient, {
                recipientId: updatedTask.assignedTo,
                type: 'task_assigned',
                taskTitle: updatedTask.title,
                assignerName: currentUser.name,
                projectId: updatedTask.projectId,
                taskId: updatedTask.id,
            });
        }
    } catch (e: any) {
        addToast(`فشل تحديث المهمة: ${e.message}`, 'error'); throw e;
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!supabaseClient || !currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    let approvalStatus: ApprovalStatus = task.approvalStatus;
    if (newStatus === 'done') {
        const assignee = teamMembers.find(m => m.id === task.assignedTo);
        const manager = teamMembers.find(m => m.id === assignee?.reportsTo);
        if (manager) {
            approvalStatus = 'pending';
            await createNotification(supabaseClient, {
                recipientId: manager.id,
                type: 'task_approval',
                taskTitle: task.title,
                assigneeName: assignee?.name || '?',
                projectId: task.projectId,
                taskId: task.id,
            });
        } else {
             approvalStatus = 'approved';
        }
    }

    try {
      const updatedTask = await api.update<Task>(supabaseClient, 'tasks', taskId, { status: newStatus, approvalStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch(e: any) {
      addToast(`فشل تحديث حالة المهمة: ${e.message}`, 'error'); throw e;
    }
  };
  
  const handleDeleteTask = async (taskId: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, 'tasks', taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      addToast('تم حذف المهمة بنجاح.', 'success');
    } catch(e: any) {
      addToast(`فشل حذف المهمة: ${e.message}`, 'error'); throw e;
    }
  };

  const handleUpdateTaskApproval = async (taskId: string, status: ApprovalStatus, notes: string) => {
    if (!supabaseClient) return;
    try {
      const updatedTask = await api.update<Task>(supabaseClient, 'tasks', taskId, { approvalStatus: status, approvalNotes: notes });
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      addToast('تم تحديث حالة الموافقة.', 'success');
    } catch (e: any) {
      addToast(`فشل تحديث حالة الموافقة: ${e.message}`, 'error'); throw e;
    }
  };
  
  const handleFreelancerProposal = async (projectId: string, proposalData: BillingProposalFormData) => {
      if (!supabaseClient || !currentUser) return;
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      try {
          const newContract: FreelancerContract = {
              ...proposalData,
              freelancerId: currentUser.id,
              status: 'pending'
          };
          await handleUpdateProject({ ...project, freelancerContract: newContract });
          addToast('تم إرسال الاقتراح بنجاح.', 'success');
      } catch (e: any) {
          addToast(`فشل إرسال الاقتراح: ${e.message}`, 'error'); throw e;
      }
  };

  const value = { 
    projects, tasks, taskComments, taskAttachments, isLoading, 
    handleAddProject, handleUpdateProject, handleDeleteProject, 
    handleAddTask, handleUpdateTask, handleUpdateTaskStatus, handleDeleteTask, 
    handleUpdateTaskApproval, handleFreelancerProposal,
    handleAddTaskComment, handleDeleteTaskComment, 
    handleAddTaskAttachment, handleDeleteTaskAttachment,
    fetchData
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
