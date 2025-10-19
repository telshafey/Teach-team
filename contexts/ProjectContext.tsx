import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Project, Task, TaskAttachment, TaskComment, ProjectFormData, TaskFormData, TeamMember, SuggestedTask, BillingProposalFormData, FreelancerContract, ProjectMember, ProjectRole } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { createNotification } from '../services/notificationService';
import { useTaskAttachments } from '../hooks/useTaskAttachments';
import { useTaskComments } from '../hooks/useTaskComments';
import { useTeamContext } from './TeamContext';

export interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  taskAttachments: TaskAttachment[];
  taskComments: TaskComment[];
  isLoading: boolean;
  handleAddTask: (taskData: TaskFormData) => Promise<void>;
  handleUpdateTask: (taskData: Partial<Task>) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, newStatus: Task['status']) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleAddProject: (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => Promise<void>;
  handleUpdateProject: (projectData: Partial<Project>) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleUpdateTaskApproval: (taskId: string, status: Task['approvalStatus'], notes: string) => Promise<void>;
  handleFreelancerProposal: (projectId: string, proposalData: BillingProposalFormData) => Promise<void>;
  handleAddTaskComment: (taskId: string, text: string) => Promise<void>;
  handleAddTaskAttachment: (attachmentData: Omit<TaskAttachment, 'id'>) => Promise<TaskAttachment>;
  handleDeleteTaskComment: (commentId: string) => Promise<void>;
  handleDeleteTaskAttachment: (attachment: TaskAttachment) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { teamMembers } = useTeamContext();
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { taskAttachments, setTaskAttachments, handleAddTaskAttachment, handleDeleteTaskAttachment } = useTaskAttachments([], supabaseClient, addToast);
  const { taskComments, setTaskComments, handleAddTaskComment, handleDeleteTaskComment } = useTaskComments([], supabaseClient, currentUser, tasks, teamMembers, addToast);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return; 
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedProjects, fetchedTasks, fetchedAttachments, fetchedComments] = await Promise.all([
          api.getAll<Project>(supabaseClient, 'projects'),
          api.getAll<Task>(supabaseClient, 'tasks'),
          api.getAll<TaskAttachment>(supabaseClient, 'task_attachments'),
          api.getAll<TaskComment>(supabaseClient, 'task_comments'),
        ]);
        setProjects(fetchedProjects);
        setTasks(fetchedTasks);
        setTaskAttachments(fetchedAttachments);
        setTaskComments(fetchedComments);
      } catch (error: any) {
        addToast(`Failed to fetch project data: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // Set up real-time subscriptions
    const projectsChannel = supabaseClient.channel('public:projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setProjects(prev => [api.keysToCamel(payload.new), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setProjects(prev => prev.map(p => p.id === payload.new.id ? api.keysToCamel(payload.new) : p));
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(p => p.id !== payload.old.id));
        }
      }).subscribe();

    const tasksChannel = supabaseClient.channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
         if (payload.eventType === 'INSERT') {
          setTasks(prev => [api.keysToCamel(payload.new), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? api.keysToCamel(payload.new) : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      }).subscribe();

    return () => {
      supabaseClient.removeChannel(projectsChannel);
      supabaseClient.removeChannel(tasksChannel);
    };

  }, [supabaseClient, currentUser, addToast, setTaskAttachments, setTaskComments]);

  const handleUpdateProject = useCallback(async (projectData: Partial<Project>) => {
    if (!supabaseClient || !projectData.id) return;
    try {
        await api.update<Project>(supabaseClient, 'projects', projectData.id, projectData);
        addToast('تم تحديث المشروع بنجاح.', 'success');
    } catch (error: any) {
        console.error("Failed to update project:", error);
        addToast(`فشل تحديث المشروع: ${error.message}`, 'error');
        throw error;
    }
  }, [supabaseClient, addToast]);

  const ensureProjectMember = useCallback(async (projectId: string, memberId: number) => {
      const project = projects.find(p => p.id === projectId);
      if (project && !(project.members || []).some(m => m.teamMemberId === memberId)) {
          const newMember: ProjectMember = { teamMemberId: memberId, projectRole: 'Member' };
          const updatedMembers = [...(project.members || []), newMember];
          await handleUpdateProject({ id: projectId, members: updatedMembers });
      }
  }, [projects, handleUpdateProject]);


  const handleAddProject = useCallback(async (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const newProjectData = { 
            ...projectData, 
            creatorId: currentUser.id, 
            members: [{teamMemberId: currentUser.id, projectRole: 'Manager' as ProjectRole}] 
        };
        const newProject = await api.insert<Project>(supabaseClient, 'projects', newProjectData);
        addToast('تمت إضافة المشروع بنجاح.', 'success');

        if (suggestedTasks && suggestedTasks.length > 0) {
            const newTasksData = suggestedTasks
                .filter(st => st.title.trim() !== '')
                .map(st => ({ 
                    title: st.title, 
                    projectId: newProject.id, 
                    status: 'todo' as const, 
                    creatorId: currentUser.id, 
                    assignedTo: undefined
                }));

            if (newTasksData.length > 0) {
                for (const taskData of newTasksData) {
                    try {
                        await api.insert<Task>(supabaseClient, 'tasks', taskData);
                    } catch (error) {
                        console.error('Failed to add a suggested task:', error);
                    }
                }
            }
        }
    } catch (error: any) {
        addToast(`فشل حفظ المشروع: ${error.message}`, 'error');
        throw error;
    }
  }, [supabaseClient, currentUser, addToast]);
  
 const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!supabaseClient) return;

    try {
        const tasksToDelete = tasks.filter(t => t.projectId === projectId);
        const taskIdsToDelete = tasksToDelete.map(t => t.id);

        if (taskIdsToDelete.length > 0) {
            const attachmentsToDelete = taskAttachments.filter(a => taskIdsToDelete.includes(a.taskId));
            if (attachmentsToDelete.length > 0) {
                const filePaths = attachmentsToDelete.map(att => {
                    try {
                        const url = new URL(att.fileUrl);
                        const path = url.pathname.split('/public/task_attachments/')[1];
                        return path ? decodeURIComponent(path) : null;
                    } catch (e) {
                        console.warn(`Could not parse attachment URL: ${att.fileUrl}`, e);
                        return null;
                    }
                }).filter((p): p is string => p !== null);

                if (filePaths.length > 0) {
                    const { error: storageError } = await supabaseClient.storage.from('task_attachments').remove(filePaths);
                    if (storageError) console.error("Error deleting project files from storage:", storageError);
                }
            }
        }
        
        await api.deleteById(supabaseClient, 'projects', projectId);
        
        addToast('تم حذف المشروع وجميع بياناته بنجاح.', 'success');

    } catch (error: any) {
        addToast(`فشل حذف المشروع: ${error.message}`, 'error');
        throw error;
    }
}, [supabaseClient, addToast, tasks, taskAttachments]);


  const handleAddTask = useCallback(async (taskData: TaskFormData) => {
    if (!supabaseClient || !currentUser) return;
    try {
        const newTaskData: Partial<Task> = { 
            ...taskData, 
            creatorId: currentUser.id,
            assignedTo: taskData.assignedTo ?? currentUser.id,
        };
        const newTask = await api.insert<Task>(supabaseClient, 'tasks', newTaskData);
        addToast('تمت إضافة المهمة بنجاح.', 'success');

        if (newTask.projectId && newTask.assignedTo) {
            await ensureProjectMember(newTask.projectId, newTask.assignedTo);
        }
    } catch (error: any) {
        addToast(`فشل إضافة المهمة: ${error.message}`, 'error');
        console.error("Failed to add task:", error);
        throw error;
    }
  }, [supabaseClient, currentUser, addToast, ensureProjectMember]);

  const handleUpdateTask = useCallback(async (taskData: Partial<Task>) => {
    if (!supabaseClient || !taskData.id) return;

    try {
        const originalTask = tasks.find(t => t.id === taskData.id);
        await api.update<Task>(supabaseClient, 'tasks', taskData.id, taskData);
        addToast('تم تحديث المهمة بنجاح.', 'success');

        if (taskData.projectId && taskData.assignedTo) {
            await ensureProjectMember(taskData.projectId, taskData.assignedTo);
        }
        
        if (taskData.assignedTo && taskData.assignedTo !== originalTask?.assignedTo && currentUser) {
          if (taskData.assignedTo !== currentUser.id) {
            createNotification(supabaseClient, {
              recipientId: taskData.assignedTo,
              type: 'task_assigned',
              taskTitle: taskData.title || originalTask?.title || '',
              assignerName: currentUser.name,
              projectId: taskData.projectId || originalTask?.projectId,
              taskId: taskData.id,
            });
          }
        }
    } catch (error: any) {
        addToast(`فشل تحديث المهمة: ${error.message}`, 'error');
        console.error("Failed to update task:", error);
        throw error;
    }
  }, [supabaseClient, addToast, tasks, currentUser, ensureProjectMember]);

  const handleUpdateTaskStatus = useCallback(async (taskId: string, newStatus: Task['status']) => {
    await handleUpdateTask({ id: taskId, status: newStatus });
  }, [handleUpdateTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!supabaseClient) return;

    try {
        const attachmentsToDelete = taskAttachments.filter(a => a.taskId === taskId);
        if (attachmentsToDelete.length > 0) {
            const filePaths = attachmentsToDelete.map(att => {
                try {
                    const url = new URL(att.fileUrl);
                    const path = url.pathname.split('/public/task_attachments/')[1];
                    return path ? decodeURIComponent(path) : null;
                } catch (e) {
                    console.warn(`Could not parse attachment URL: ${att.fileUrl}`, e);
                    return null;
                }
            }).filter((p): p is string => p !== null);

            if (filePaths.length > 0) {
                const { error: storageError } = await supabaseClient.storage.from('task_attachments').remove(filePaths);
                if (storageError) console.error("Error deleting from storage:", storageError);
            }
        }
        
        await api.deleteById(supabaseClient, 'tasks', taskId);
        
        addToast('تم حذف المهمة وجميع بياناتها بنجاح.', 'success');

    } catch (error: any) {
        addToast(`فشل حذف المهمة: ${error.message}`, 'error');
        throw error;
    }
}, [supabaseClient, addToast, taskAttachments]);


  const handleUpdateTaskApproval = useCallback(async (taskId: string, status: Task['approvalStatus'], notes: string) => {
    await handleUpdateTask({ id: taskId, approvalStatus: status, approvalNotes: notes });
    addToast('تم تحديث حالة الموافقة.', 'success');
  }, [handleUpdateTask, addToast]);

  const handleFreelancerProposal = useCallback(async (projectId: string, proposalData: BillingProposalFormData) => {
      if (!currentUser) return;
      try {
        const contract: Omit<FreelancerContract, 'id'> = { ...proposalData, freelancerId: currentUser.id, status: 'pending' };
        await handleUpdateProject({id: projectId, freelancerContract: contract as FreelancerContract});
        addToast('تم إرسال اقتراحك بنجاح.', 'success');
      } catch (error: any) {
        console.error("Failed to submit proposal:", error);
        addToast(`فشل تقديم الاقتراح: ${error.message}`, 'error');
        throw error;
      }
  }, [currentUser, handleUpdateProject, addToast]);


  const value = {
    projects,
    tasks,
    taskAttachments,
    taskComments,
    isLoading,
    handleAddProject,
    handleUpdateProject,
    handleDeleteProject,
    handleAddTask,
    handleUpdateTask,
    handleUpdateTaskStatus,
    handleDeleteTask,
    handleUpdateTaskApproval,
    handleFreelancerProposal,
    handleAddTaskComment,
    handleAddTaskAttachment,
    handleDeleteTaskComment,
    handleDeleteTaskAttachment,
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