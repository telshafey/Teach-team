import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';
import { useToast } from './ToastContext';
import { Project, Task, ProjectFormData, TaskFormData, SuggestedTask, ApprovalStatus, BillingProposalFormData, ContractStatus, TaskStatus, TaskComment, TeamMember } from '../types';
import { parseMentions } from '../utils/mentions';
import { useAppDataContext } from './DataContext';

interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  isLoading: boolean;
  handleAddProject: (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]) => Promise<Project | undefined>;
  handleUpdateProject: (project: Project) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleAddTask: (taskData: TaskFormData) => Promise<void>;
  handleUpdateTask: (task: Task) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  handleUpdateTaskApproval: (taskId: string, status: ApprovalStatus, notes: string) => Promise<void>;
  handleFreelancerProposal: (projectId: string, proposalData: BillingProposalFormData) => Promise<void>;
  handleAddTaskComment: (taskId: string, commentText: string, allTeamMembers: TeamMember[]) => Promise<void>;
  handleUpdateTaskComment: (taskId: string, comment: TaskComment) => Promise<void>;
  handleDeleteTaskComment: (taskId: string, commentId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();
    const { addToast } = useToast();
    const { handleCreateNotification } = useAppDataContext();
    
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
        } catch (error: any) {
            addToast(`فشل تحميل بيانات المشاريع: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, supabaseClient, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddProject = async (projectData: ProjectFormData, suggestedTasks?: SuggestedTask[]): Promise<Project | undefined> => {
        if (!supabaseClient) return;
        try {
            const newProject = await api.insert<Project>(supabaseClient, 'projects', projectData);
            setProjects(prev => [...prev, newProject]);

            if (suggestedTasks && suggestedTasks.length > 0) {
                const newTasksData = suggestedTasks.map(st => ({
                    title: st.title,
                    projectId: newProject.id,
                    status: 'todo' as TaskStatus,
                    approvalStatus: 'approved' as ApprovalStatus,
                }));
                const newTasks = await api.insertMany<Task>(supabaseClient, 'tasks', newTasksData);
                setTasks(prev => [...prev, ...newTasks]);
            }
            addToast(`تمت إضافة مشروع "${newProject.name}" بنجاح.`, 'success');
            return newProject;
        } catch (error) {
            addToast('فشل إضافة المشروع.', 'error');
            throw error;
        }
    };

    const handleUpdateProject = async (project: Project) => {
        if (!supabaseClient) return;
        const originalProjects = [...projects];
        setProjects(prev => prev.map(p => p.id === project.id ? project : p));

        try {
            await api.update(supabaseClient, 'projects', project.id, project);
            addToast(`تم تحديث مشروع "${project.name}".`, 'success');
        } catch (error) {
            setProjects(originalProjects);
            addToast('فشل تحديث المشروع.', 'error');
            throw error;
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!supabaseClient) return;
        const originalProjects = [...projects];
        setProjects(prev => prev.filter(p => p.id !== projectId));
        try {
            await api.deleteById(supabaseClient, 'projects', projectId);
            addToast('تم حذف المشروع بنجاح.', 'success');
        } catch (error) {
            setProjects(originalProjects);
            addToast('فشل حذف المشروع.', 'error');
            throw error;
        }
    };

    const handleAddTask = async (taskData: TaskFormData) => {
        if (!supabaseClient || !currentUser) return;
        try {
            const newTask = await api.insert<Task>(supabaseClient, 'tasks', {
                ...taskData,
                approvalStatus: 'approved' as ApprovalStatus
            });
            setTasks(prev => [...prev, newTask]);
            addToast(`تمت إضافة مهمة "${newTask.title}".`, 'success');

            // Create notification if assigned
            if (newTask.assignedTo) {
                handleCreateNotification({
                    recipientId: newTask.assignedTo,
                    type: 'task_assigned',
                    taskTitle: newTask.title,
                    projectId: newTask.projectId,
                    taskId: newTask.id,
                    assignerName: currentUser.name,
                });
            }

        } catch (error) {
            addToast('فشل إضافة المهمة.', 'error');
            throw error;
        }
    };

    const handleUpdateTask = async (task: Task) => {
        if (!supabaseClient || !currentUser) return;
        
        const originalTask = tasks.find(t => t.id === task.id);
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));

        // Create notification if assignment changed
        if (task.assignedTo && task.assignedTo !== originalTask?.assignedTo) {
             handleCreateNotification({
                recipientId: task.assignedTo,
                type: 'task_assigned',
                taskTitle: task.title,
                projectId: task.projectId,
                taskId: task.id,
                assignerName: currentUser.name,
            });
        }

        try {
            await api.update(supabaseClient, 'tasks', task.id, task);
            addToast(`تم تحديث مهمة "${task.title}".`, 'success');
        } catch (error) {
            setTasks(originalTasks);
            addToast('فشل تحديث المهمة.', 'error');
            throw error;
        }
    };
    
    const handleDeleteTask = async (taskId: string) => {
        if (!supabaseClient) return;
        const originalTasks = [...tasks];
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await api.deleteById(supabaseClient, 'tasks', taskId);
            addToast('تم حذف المهمة بنجاح.', 'success');
        } catch (error) {
            setTasks(originalTasks);
            addToast('فشل حذف المهمة.', 'error');
            throw error;
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        await handleUpdateTask({ ...task, status, approvalStatus: 'pending' });
    };

    const handleUpdateTaskApproval = async (taskId: string, status: ApprovalStatus, notes: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        await handleUpdateTask({ ...task, approvalStatus: status, approvalNotes: notes });
        addToast('تم تحديث حالة الموافقة للمهمة.', 'success');
    };

    const handleFreelancerProposal = async (projectId: string, proposalData: BillingProposalFormData) => {
        if (!currentUser || currentUser.roleId !== 'freelancer') return;
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const contract = {
            freelancerId: currentUser.id,
            status: 'pending' as ContractStatus,
            ...proposalData,
        };
        await handleUpdateProject({ ...project, freelancerContract: contract });
        addToast('تم إرسال اقتراحك للمراجعة.', 'success');
    };

    const handleAddTaskComment = async (taskId: string, commentText: string, allTeamMembers: TeamMember[]) => {
        if (!supabaseClient || !currentUser) return;
        try {
            const newCommentData = {
                taskId,
                authorId: currentUser.id,
                text: commentText,
            };
            const newComment = await api.insert(supabaseClient, 'task_comments', newCommentData) as unknown as TaskComment;
            setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    return { ...t, comments: [...(t.comments || []), newComment] };
                }
                return t;
            }));
            addToast('تم إضافة التعليق.', 'success');

            const mentionedUsers = parseMentions(commentText, allTeamMembers);
            mentionedUsers.forEach(user => {
                if (user.id !== currentUser.id) {
                     handleCreateNotification({
                        recipientId: user.id,
                        type: 'comment_mention',
                        taskTitle: tasks.find(t=> t.id === taskId)?.title,
                        projectId: tasks.find(t=> t.id === taskId)?.projectId,
                        taskId: taskId,
                        commentAuthorName: currentUser.name,
                    });
                }
            });

        } catch (error) {
            addToast('فشل إضافة التعليق.', 'error');
            throw error;
        }
    };
    
    const handleUpdateTaskComment = async (taskId: string, comment: TaskComment) => {
        if (!supabaseClient || !currentUser) return;
        try {
            const updatedComment = await api.update<TaskComment>(supabaseClient, 'task_comments', comment.id, { text: comment.text });
            setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    const updatedComments = (t.comments || []).map(c => c.id === comment.id ? updatedComment : c);
                    return { ...t, comments: updatedComments };
                }
                return t;
            }));
            addToast('تم تعديل التعليق.', 'success');
        } catch(e) {
            addToast('فشل تعديل التعليق.', 'error');
            throw e;
        }
    };
    
    const handleDeleteTaskComment = async (taskId: string, commentId: string) => {
        if (!supabaseClient) return;
        try {
            await api.deleteById(supabaseClient, 'task_comments', commentId);
             setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    const updatedComments = (t.comments || []).filter(c => c.id !== commentId);
                    return { ...t, comments: updatedComments };
                }
                return t;
            }));
            addToast('تم حذف التعليق.', 'success');
        } catch(e) {
            addToast('فشل حذف التعليق.', 'error');
            throw e;
        }
    };


    const value = {
        projects,
        tasks,
        isLoading,
        handleAddProject,
        handleUpdateProject,
        handleDeleteProject,
        handleAddTask,
        handleUpdateTask,
        handleDeleteTask,
        handleUpdateTaskStatus,
        handleUpdateTaskApproval,
        handleFreelancerProposal,
        handleAddTaskComment,
        handleUpdateTaskComment,
        handleDeleteTaskComment,
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