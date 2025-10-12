import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Project, Task, ProjectFormData, TaskFormData, ApprovalStatus, TaskStatus, SuggestedTask, BillingProposalFormData, TaskAttachment, TaskComment } from '../types';
import * as api from '../services/apiService';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { createNotification } from '../services/notificationService';
import { useTeamContext } from './TeamContext';
import { useTaskComments } from '../hooks/useTaskComments';
import { useTaskAttachments } from '../hooks/useTaskAttachments';

export interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  taskAttachments: TaskAttachment[];
  taskComments: TaskComment[];
  isLoading: boolean;
  handleAddProject: (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => Promise<void>;
  handleUpdateProject: (project: Partial<Project> & { id: string }) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleAddTask: (taskData: TaskFormData) => Promise<void>;
  handleUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
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
  const { teamMembers } = useTeamContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { taskAttachments, setTaskAttachments, handleAddTaskAttachment, handleDeleteTaskAttachment } = useTaskAttachments([], supabaseClient, addToast);
  const { taskComments, setTaskComments, handleAddTaskComment, handleDeleteTaskComment } = useTaskComments([], supabaseClient, currentUser, tasks, teamMembers, addToast);


  const fetchData = useCallback(async () => {
    if (!supabaseClient || !currentUser) {
        setProjects([]);
        setTasks([]);
        setTaskAttachments([]);
        setTaskComments([]);
        setIsLoading(false);
        return;
    }
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
  }, [supabaseClient, addToast, currentUser, setTaskAttachments, setTaskComments]);

  useEffect(() => {
    if (supabaseClient && currentUser) {
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
    } else {
        setProjects([]);
        setTasks([]);
        setTaskAttachments([]);
        setTaskComments([]);
    }
  }, [supabaseClient, fetchData, currentUser, setTaskAttachments, setTaskComments]);
  
  const handleAddProject = async (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => {
    if (!supabaseClient) return;
    const tempProjectId = crypto.randomUUID();
    const newProject: Project = {
        ...projectData,
        id: tempProjectId,
        freelancerContract: undefined,
        budgetNotificationSent: undefined,
    };

    const tempTasks: Task[] = (suggestedTasks || [])
        .filter(st => st.title.trim() !== '')
        .map(st => ({
            id: crypto.randomUUID(),
            title: st.title,
            projectId: tempProjectId,
            status: 'todo' as TaskStatus,
            approvalStatus: 'approved' as ApprovalStatus,
        }));

    // Optimistic Updates
    setProjects(prev => [...prev, newProject]);
    if (tempTasks.length > 0) {
        setTasks(prev => [...prev, ...tempTasks]);
    }

    try {
        const createdProject = await api.insert<Project>(supabaseClient, 'projects', { ...projectData, id: crypto.randomUUID() });
        setProjects(prev => prev.map(p => p.id === tempProjectId ? createdProject : p));

        if (tempTasks.length > 0) {
            const newTasksData = tempTasks.map(t => ({ ...t, projectId: createdProject.id, id: crypto.randomUUID() }));
            const createdTasks = await api.insertMany<Task>(supabaseClient, 'tasks', newTasksData);
            setTasks(prev => [...prev.filter(t => t.projectId !== tempProjectId), ...createdTasks]);
        }
        addToast('تمت إضافة المشروع بنجاح.', 'success');
    } catch(e: any) {
        setProjects(prev => prev.filter(p => p.id !== tempProjectId));
        setTasks(prev => prev.filter(t => t.projectId !== tempProjectId));
        addToast(`فشل إضافة المشروع: ${e.message}`, 'error'); 
        throw e;
    }
  };

  const handleUpdateProject = async (projectUpdate: Partial<Project> & { id: string }) => {
    if (!supabaseClient) return;
    const originalProject = projects.find(p => p.id === projectUpdate.id);
    if (!originalProject) return;

    setProjects(prev => prev.map(p => p.id === projectUpdate.id ? { ...p, ...projectUpdate } : p));

    try {
        const { id, ...updates } = projectUpdate;
        await api.update<Project>(supabaseClient, 'projects', id, updates);
        addToast('تم تحديث المشروع بنجاح.', 'success');
    } catch (e: any) {
        setProjects(prev => prev.map(p => p.id === projectUpdate.id ? originalProject : p));
        addToast(`فشل تحديث المشروع: ${e.message}`, 'error');
        throw e;
    }
  };
  
  const handleDeleteProject = async (projectId: string) => {
    if (!supabaseClient) return;
    const originalState = { projects, tasks, taskAttachments, taskComments };
    const tasksInProject = originalState.tasks.filter(t => t.projectId === projectId).map(t => t.id);

    // Optimistic update
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    setTaskAttachments(prev => prev.filter(a => !tasksInProject.includes(a.taskId)));
    setTaskComments(prev => prev.filter(c => !tasksInProject.includes(c.taskId)));

    try {
        if (tasksInProject.length > 0) {
            await supabaseClient.from('task_attachments').delete().in('task_id', tasksInProject);
            await supabaseClient.from('task_comments').delete().in('task_id', tasksInProject);
            await supabaseClient.from('tasks').delete().in('id', tasksInProject);
        }
        await supabaseClient.from('daily_logs').update({ project_id: null }).eq('project_id', projectId);
        await supabaseClient.from('expense_claims').update({ project_id: null }).eq('project_id', projectId);
        await supabaseClient.from('overtime_requests').update({ project_id: null }).eq('project_id', projectId);
        await api.deleteById(supabaseClient, 'projects', projectId);
        addToast('تم حذف المشروع بنجاح.', 'success');
    } catch (e: any) {
        setProjects(originalState.projects);
        setTasks(originalState.tasks);
        setTaskAttachments(originalState.taskAttachments);
        setTaskComments(originalState.taskComments);
        addToast(`فشل حذف المشروع: ${e.message}`, 'error');
        throw e;
    }
  };


  const handleAddTask = async (taskData: TaskFormData) => {
    if (!supabaseClient || !currentUser) return;
    const tempId = crypto.randomUUID();
    const newTask: Task = { id: tempId, ...taskData, assignedTo: taskData.assignedTo || undefined, approvalStatus: 'approved' };
    setTasks(prev => [...prev, newTask]);

    try {
        const createdTask = await api.insert<Task>(supabaseClient, 'tasks', { ...taskData, id: crypto.randomUUID(), approvalStatus: 'approved' });
        setTasks(prev => prev.map(t => t.id === tempId ? createdTask : t));
        if (taskData.assignedTo) {
            createNotification(supabaseClient, { recipientId: taskData.assignedTo, type: 'task_assigned', taskTitle: taskData.title, assignerName: currentUser.name, projectId: taskData.projectId });
        }
        addToast('تمت إضافة المهمة بنجاح.', 'success');
    } catch(e: any) {
        setTasks(prev => prev.filter(t => t.id !== tempId));
        addToast(`فشل إضافة المهمة: ${e.message}`, 'error'); 
        throw e;
    }
  };

  const handleUpdateTask = async (taskUpdate: Partial<Task> & { id: string }) => {
    if (!supabaseClient) return;
    const originalTask = tasks.find(t => t.id === taskUpdate.id);
    if (!originalTask) return;
    setTasks(prev => prev.map(t => t.id === taskUpdate.id ? { ...t, ...taskUpdate } : t));

    try {
        const { id, ...updates } = taskUpdate;
        await api.update<Task>(supabaseClient, 'tasks', id, updates);
        addToast('تم تحديث المهمة بنجاح.', 'success');
    } catch (e: any) {
        setTasks(prev => prev.map(t => t.id === taskUpdate.id ? originalTask : t));
        addToast(`فشل تحديث المهمة: ${e.message}`, 'error');
        throw e;
    }
};

  const handleDeleteTask = async (taskId: string) => {
    if (!supabaseClient) return;
    const originalTasks = tasks;
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
        await api.deleteById(supabaseClient, 'tasks', taskId);
        addToast('تم حذف المهمة بنجاح.', 'success');
    } catch (e: any) {
        setTasks(originalTasks);
        addToast(`فشل حذف المهمة: ${e.message}`, 'error');
        throw e;
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!supabaseClient || !currentUser) return;
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask || originalTask.status === status) return;
    const approvalStatus = status === 'done' ? 'pending' : 'approved';
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, approvalStatus } : t));

    try {
        await api.update<Task>(supabaseClient, 'tasks', taskId, { status, approvalStatus });
        if (status === 'done' && originalTask.assignedTo) {
            const member = teamMembers.find(m => m.id === originalTask.assignedTo);
            if (member?.reportsTo) {
                createNotification(supabaseClient, { recipientId: member.reportsTo, type: 'task_approval', taskTitle: originalTask.title, assigneeName: member.name, projectId: originalTask.projectId, taskId: originalTask.id });
            }
        }
        addToast('تم تحديث حالة المهمة.', 'success');
    } catch(e: any) {
        setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
        addToast(`فشل تحديث الحالة: ${e.message}`, 'error');
    }
  };
  
  const handleUpdateTaskApproval = async (taskId: string, status: ApprovalStatus, notes: string) => {
    if (!supabaseClient) return;
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, approvalStatus: status, approvalNotes: notes } : t));
    
    try {
        await api.update<Task>(supabaseClient, 'tasks', taskId, { approvalStatus: status, approvalNotes: notes });
        addToast('تم تحديث حالة الموافقة.', 'success');
    } catch (e: any) {
        setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
        addToast(`فشل تحديث حالة الموافقة: ${e.message}`, 'error');
        throw e;
    }
  };
  
  const handleFreelancerProposal = async (projectId: string, proposalData: BillingProposalFormData) => {
    if (!supabaseClient || !currentUser) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const contract = { ...proposalData, freelancerId: currentUser.id, status: 'pending' as const };
    await handleUpdateProject({ ...project, freelancerContract: contract });
  };


  const value = { projects, tasks, taskAttachments, taskComments, isLoading, handleAddProject, handleUpdateProject, handleDeleteProject, handleAddTask, handleUpdateTask, handleDeleteTask, handleUpdateTaskStatus, handleUpdateTaskApproval, handleFreelancerProposal, handleAddTaskComment, handleDeleteTaskComment, handleAddTaskAttachment, handleDeleteTaskAttachment, fetchData };

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