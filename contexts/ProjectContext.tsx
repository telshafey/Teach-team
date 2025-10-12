import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Project, Task, ProjectFormData, TaskFormData, ApprovalStatus, TaskStatus, SuggestedTask, BillingProposalFormData, TaskAttachment, TaskComment, ProjectMember } from '../types';
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
        const isRestrictedView = currentUser.roleId === 'employee' || currentUser.roleId === 'freelancer';

        let projectsData: Project[] = [];
        let tasksData: Task[] = [];
        let attachmentsData: TaskAttachment[] = [];
        let commentsData: TaskComment[] = [];

        if (isRestrictedView) {
            // Step 1: Find projects the user is part of by finding their tasks.
            const { data: myTasksData, error: myTasksError } = await supabaseClient
                .from('tasks')
                .select('project_id')
                .eq('assigned_to', currentUser.id);

            if (myTasksError) throw myTasksError;

            const myProjectIds = [...new Set(myTasksData.map((t: any) => t.project_id))];

            if (myProjectIds.length > 0) {
                // Step 2: Fetch all data related to those projects.
                const { data: projectsForUser, error: projectsError } = await supabaseClient
                    .from('projects').select('*').in('id', myProjectIds);
                if (projectsError) throw projectsError;
                projectsData = api.snakeToCamel(projectsForUser) as Project[];

                const { data: tasksForProjects, error: tasksError } = await supabaseClient
                    .from('tasks').select('*').in('project_id', myProjectIds);
                if (tasksError) throw tasksError;
                tasksData = api.snakeToCamel(tasksForProjects) as Task[];

                const taskIdsInMyProjects = tasksData.map(t => t.id);
                if (taskIdsInMyProjects.length > 0) {
                    const [attachmentsRes, commentsRes] = await Promise.all([
                        supabaseClient.from('task_attachments').select('*').in('task_id', taskIdsInMyProjects),
                        supabaseClient.from('task_comments').select('*').in('task_id', taskIdsInMyProjects),
                    ]);

                    if (attachmentsRes.error) throw attachmentsRes.error;
                    attachmentsData = api.snakeToCamel(attachmentsRes.data || []) as TaskAttachment[];
                    
                    if (commentsRes.error) throw commentsRes.error;
                    commentsData = api.snakeToCamel(commentsRes.data || []) as TaskComment[];
                }
            }
            // If the user has no tasks, they see no projects, which is correct.
        } else {
            // Manager/GM view: Fetch everything
            const [pData, tData, aData, cData] = await Promise.all([
                api.fetchAll<Project>(supabaseClient, 'projects'),
                api.fetchAll<Task>(supabaseClient, 'tasks'),
                api.fetchAll<TaskAttachment>(supabaseClient, 'task_attachments'),
                api.fetchAll<TaskComment>(supabaseClient, 'task_comments'),
            ]);
            projectsData = pData;
            tasksData = tData;
            attachmentsData = aData;
            commentsData = cData;
        }

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
      
      const handleProjectsChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch (eventType) {
          case 'INSERT': setProjects(prev => prev.some(p => p.id === record.id) ? prev : [...prev, record]); break;
          case 'UPDATE': setProjects(prev => prev.map(p => p.id === record.id ? record : p)); break;
          case 'DELETE': setProjects(prev => prev.filter(p => p.id !== oldRecord.id)); break;
        }
      };
      
      const handleTasksChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch (eventType) {
          case 'INSERT': setTasks(prev => prev.some(t => t.id === record.id) ? prev : [...prev, record]); break;
          case 'UPDATE': setTasks(prev => prev.map(t => t.id === record.id ? record : t)); break;
          case 'DELETE': setTasks(prev => prev.filter(t => t.id !== oldRecord.id)); break;
        }
      };

      const handleAttachmentsChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch (eventType) {
          case 'INSERT': setTaskAttachments(prev => prev.some(a => a.id === record.id) ? prev : [...prev, record]); break;
          case 'UPDATE': setTaskAttachments(prev => prev.map(a => a.id === record.id ? record : a)); break;
          case 'DELETE': setTaskAttachments(prev => prev.filter(a => a.id !== oldRecord.id)); break;
        }
      };
      
      const handleCommentsChange = (payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = api.snakeToCamel(newRecord);
        switch (eventType) {
          case 'INSERT': setTaskComments(prev => prev.some(c => c.id === record.id) ? prev : [...prev, record]); break;
          case 'UPDATE': setTaskComments(prev => prev.map(c => c.id === record.id ? record : c)); break;
          case 'DELETE': setTaskComments(prev => prev.filter(c => c.id !== oldRecord.id)); break;
        }
      };

      const projectsChannel = supabaseClient.channel('public:projects').on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, handleProjectsChange).subscribe();
      const tasksChannel = supabaseClient.channel('public:tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleTasksChange).subscribe();
      const attachmentsChannel = supabaseClient.channel('public:task_attachments').on('postgres_changes', { event: '*', schema: 'public', table: 'task_attachments' }, handleAttachmentsChange).subscribe();
      const commentsChannel = supabaseClient.channel('public:task_comments').on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, handleCommentsChange).subscribe();
      
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
  }, [supabaseClient, currentUser, setTaskAttachments, setTaskComments, fetchData]);
  
  const handleAddProject = async (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const projectMembers: ProjectMember[] = [{
            teamMemberId: currentUser.id,
            projectRole: 'Manager',
        }];

        const createdProject = await api.insert<Project>(supabaseClient, 'projects', { 
            ...projectData, 
            id: crypto.randomUUID(),
            members: projectMembers
        });
        setProjects(prev => [...prev, createdProject]);

        if (suggestedTasks && suggestedTasks.length > 0) {
            const newTasksData = suggestedTasks
                .filter(t => t.title.trim() !== '')
                .map(t => ({ 
                    ...t, 
                    projectId: createdProject.id, 
                    id: crypto.randomUUID(),
                    status: 'todo' as TaskStatus,
                    approvalStatus: 'approved' as ApprovalStatus,
                }));
            if (newTasksData.length > 0) {
              const createdTasks = await api.insertMany<Task>(supabaseClient, 'tasks', newTasksData);
              setTasks(prev => [...prev, ...createdTasks]);
            }
        }
        addToast('تمت إضافة المشروع بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل إضافة المشروع: ${e.message}`, 'error'); 
        throw e;
    }
  };

  const handleUpdateProject = async (projectUpdate: Partial<Project> & { id: string }) => {
    if (!supabaseClient) return;
    try {
        const { id, ...updates } = projectUpdate;
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
        const tasksInProject = tasks.filter(t => t.projectId === projectId).map(t => t.id);
        if (tasksInProject.length > 0) {
            await supabaseClient.from('task_attachments').delete().in('task_id', tasksInProject);
            await supabaseClient.from('task_comments').delete().in('task_id', tasksInProject);
            await supabaseClient.from('tasks').delete().in('id', tasksInProject);
        }
        await supabaseClient.from('daily_logs').update({ project_id: null }).eq('project_id', projectId);
        await supabaseClient.from('expense_claims').update({ project_id: null }).eq('project_id', projectId);
        await supabaseClient.from('overtime_requests').update({ project_id: null }).eq('project_id', projectId);
        await api.deleteById(supabaseClient, 'projects', projectId);
        
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setTasks(prev => prev.filter(t => t.projectId !== projectId));
        
        addToast('تم حذف المشروع بنجاح.', 'success');
    } catch (e: any) {
        addToast(`فشل حذف المشروع: ${e.message}`, 'error');
        throw e;
    }
  };


  const handleAddTask = async (taskData: TaskFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const createdTask = await api.insert<Task>(supabaseClient, 'tasks', { ...taskData, id: crypto.randomUUID(), approvalStatus: 'approved' });
        setTasks(prev => [...prev, createdTask]);
        if (taskData.assignedTo) {
            createNotification(supabaseClient, { recipientId: taskData.assignedTo, type: 'task_assigned', taskTitle: taskData.title, assignerName: currentUser.name, projectId: taskData.projectId });
        }
        addToast('تمت إضافة المهمة بنجاح.', 'success');
    } catch(e: any) {
        addToast(`فشل إضافة المهمة: ${e.message}`, 'error'); 
        throw e;
    }
  };

  const handleUpdateTask = async (taskUpdate: Partial<Task> & { id: string }) => {
    if (!supabaseClient) return;
    try {
        const { id, ...updates } = taskUpdate;
        const updatedTask = await api.update<Task>(supabaseClient, 'tasks', id, updates);
        setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
        addToast('تم تحديث المهمة بنجاح.', 'success');
    } catch (e: any) {
        addToast(`فشل تحديث المهمة: ${e.message}`, 'error');
        throw e;
    }
};

  const handleDeleteTask = async (taskId: string) => {
    if (!supabaseClient) return;
    try {
        await api.deleteById(supabaseClient, 'tasks', taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        addToast('تم حذف المهمة بنجاح.', 'success');
    } catch (e: any) {
        addToast(`فشل حذف المهمة: ${e.message}`, 'error');
        throw e;
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!supabaseClient || !currentUser) return;
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask || originalTask.status === status) return;
    const approvalStatus = status === 'done' ? 'pending' : 'approved';

    try {
        const updatedTask = await api.update<Task>(supabaseClient, 'tasks', taskId, { status, approvalStatus });
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        if (status === 'done' && originalTask.assignedTo) {
            const member = teamMembers.find(m => m.id === originalTask.assignedTo);
            if (member?.reportsTo) {
                createNotification(supabaseClient, { recipientId: member.reportsTo, type: 'task_approval', taskTitle: originalTask.title, assigneeName: member.name, projectId: originalTask.projectId, taskId: originalTask.id });
            }
        }
        addToast('تم تحديث حالة المهمة.', 'success');
    } catch(e: any) {
        addToast(`فشل تحديث الحالة: ${e.message}`, 'error');
    }
  };
  
  const handleUpdateTaskApproval = async (taskId: string, status: ApprovalStatus, notes: string) => {
    if (!supabaseClient) return;
    try {
        const updatedTask = await api.update<Task>(supabaseClient, 'tasks', taskId, { approvalStatus: status, approvalNotes: notes });
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        addToast('تم تحديث حالة الموافقة.', 'success');
    } catch (e: any) {
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