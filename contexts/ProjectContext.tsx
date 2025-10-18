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
    if (!supabaseClient || !currentUser) return; // Wait for client and user
    
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
  }, [supabaseClient, currentUser, addToast]); // Depend on currentUser

  const handleUpdateProject = useCallback(async (projectData: Partial<Project>) => {
    if (!supabaseClient || !projectData.id) return;
    try {
        const updatedProject = await api.update<Project>(supabaseClient, 'projects', projectData.id, projectData);
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        addToast('تم تحديث المشروع بنجاح.', 'success');
    } catch (error: any) {
        console.error("Failed to update project:", error);
        const message = (error?.message && typeof error.message === 'string') ? error.message : JSON.stringify(error);
        addToast(`فشل تحديث المشروع: ${message}`, 'error');
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
        setProjects(prev => [...prev, newProject]);
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
                const createdTasks: Task[] = [];
                for (const taskData of newTasksData) {
                    try {
                        const newTask = await api.insert<Task>(supabaseClient, 'tasks', taskData);
                        createdTasks.push(newTask);
                    } catch (error) {
                        console.error('Failed to add a suggested task:', error);
                    }
                }
                if (createdTasks.length > 0) {
                  setTasks(prev => [...prev, ...createdTasks]);
                }
            }
        }
    } catch (error: any) {
        console.error("Failed to add project:", error);
        const message = (error?.message && typeof error.message === 'string') ? error.message : JSON.stringify(error);
        addToast(`فشل حفظ المشروع: ${message}`, 'error');
        throw error;
    }
  }, [supabaseClient, currentUser, addToast, setTasks]);
  
 const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!supabaseClient) return;

    const originalState = { projects, tasks, taskAttachments, taskComments };

    const tasksToDelete = originalState.tasks.filter(t => t.projectId === projectId);
    const taskIdsToDelete = tasksToDelete.map(t => t.id);
    
    // Optimistic UI update
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    if (taskIdsToDelete.length > 0) {
        setTaskAttachments(prev => prev.filter(a => !taskIdsToDelete.includes(a.taskId)));
        setTaskComments(prev => prev.filter(c => !taskIdsToDelete.includes(c.taskId)));
    }
    
    try {
        if (taskIdsToDelete.length > 0) {
            const attachmentsToDelete = originalState.taskAttachments.filter(a => taskIdsToDelete.includes(a.taskId));
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

            const { error: attachmentsError } = await supabaseClient.from('task_attachments').delete().in('task_id', taskIdsToDelete);
            if (attachmentsError) throw attachmentsError;

            const { error: commentsError } = await supabaseClient.from('task_comments').delete().in('task_id', taskIdsToDelete);
            if (commentsError) throw commentsError;
            
            const { error: tasksError } = await supabaseClient.from('tasks').delete().in('id', taskIdsToDelete);
            if (tasksError) throw tasksError;
        }

        await api.deleteById(supabaseClient, 'projects', projectId);
        
        addToast('تم حذف المشروع وجميع بياناته بنجاح.', 'success');

    } catch (error: any) {
        setProjects(originalState.projects);
        setTasks(originalState.tasks);
        setTaskAttachments(originalState.taskAttachments);
        setTaskComments(originalState.taskComments);
        addToast(`فشل حذف المشروع: ${error.message}`, 'error');
        throw error;
    }
}, [supabaseClient, addToast, projects, tasks, taskAttachments, taskComments]);


  const handleAddTask = useCallback(async (taskData: TaskFormData) => {
    if (!supabaseClient || !currentUser) return;
    const newTaskData: Partial<Task> = { 
        ...taskData, 
        creatorId: currentUser.id,
        assignedTo: taskData.assignedTo ?? currentUser.id, // Default to creator if not assigned
    };
    const newTask = await api.insert<Task>(supabaseClient, 'tasks', newTaskData);
    setTasks(prev => [...prev, newTask]);
    addToast('تمت إضافة المهمة بنجاح.', 'success');

    if (newTask.projectId && newTask.assignedTo) {
        await ensureProjectMember(newTask.projectId, newTask.assignedTo);
    }
  }, [supabaseClient, currentUser, addToast, ensureProjectMember]);

  const handleUpdateTask = useCallback(async (taskData: Partial<Task>) => {
    if (!supabaseClient || !taskData.id) return;

    const originalTask = tasks.find(t => t.id === taskData.id);
    const updatedTask = await api.update<Task>(supabaseClient, 'tasks', taskData.id, taskData);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
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
  }, [supabaseClient, addToast, tasks, currentUser, ensureProjectMember]);

  const handleUpdateTaskStatus = useCallback(async (taskId: string, newStatus: Task['status']) => {
    await handleUpdateTask({ id: taskId, status: newStatus });
  }, [handleUpdateTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!supabaseClient) return;

    const originalState = { tasks, taskAttachments, taskComments };
    
    // Optimistic UI update
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setTaskAttachments(prev => prev.filter(a => a.taskId !== taskId));
    setTaskComments(prev => prev.filter(c => c.taskId !== taskId));

    try {
        const attachmentsToDelete = originalState.taskAttachments.filter(a => a.taskId === taskId);
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

        const { error: attachmentsError } = await supabaseClient.from('task_attachments').delete().eq('task_id', taskId);
        if (attachmentsError) throw attachmentsError;

        const { error: commentsError } = await supabaseClient.from('task_comments').delete().eq('task_id', taskId);
        if (commentsError) throw commentsError;
        
        await api.deleteById(supabaseClient, 'tasks', taskId);
        
        addToast('تم حذف المهمة وجميع بياناتها بنجاح.', 'success');

    } catch (error: any) {
        setTasks(originalState.tasks);
        setTaskAttachments(originalState.taskAttachments);
        setTaskComments(originalState.taskComments);
        addToast(`فشل حذف المهمة: ${error.message}`, 'error');
        throw error;
    }
}, [supabaseClient, addToast, tasks, taskAttachments, taskComments]);


  const handleUpdateTaskApproval = useCallback(async (taskId: string, status: Task['approvalStatus'], notes: string) => {
    await handleUpdateTask({ id: taskId, approvalStatus: status, approvalNotes: notes });
    addToast('تم تحديث حالة الموافقة.', 'success');
  }, [handleUpdateTask, addToast]);

  const handleFreelancerProposal = useCallback(async (projectId: string, proposalData: BillingProposalFormData) => {
      if (!currentUser) return;
      const contract: Omit<FreelancerContract, 'id'> = { ...proposalData, freelancerId: currentUser.id, status: 'pending' };
      await handleUpdateProject({id: projectId, freelancerContract: contract as FreelancerContract});
      addToast('تم إرسال اقتراحك بنجاح.', 'success');
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