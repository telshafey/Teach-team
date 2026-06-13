import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import {
  Project,
  Task,
  TaskAttachment,
  TaskComment,
  ProjectFormData,
  SuggestedTask,
  TeamMember,
} from "../types";
import { useSupabase } from "./SupabaseContext";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import * as api from "../services/apiService";
import { useTeamContext } from "./TeamContext";
import { useTaskAttachments } from "../hooks/useTaskAttachments";
import { useTaskComments } from "../hooks/useTaskComments";
import { useQueryClient } from "@tanstack/react-query";

export interface ProjectContextType {
  handleAddTask: (
    taskData: Omit<Task, "id" | "approvalStatus" | "creatorId">,
    projectId?: string,
  ) => Promise<void>;
  handleUpdateTask: (taskData: Partial<Task> & { id: string }) => Promise<void>;
  handleDeleteTask: (task: Task) => Promise<void>;
  handleUpdateProject: (
    projectData: Partial<Project> & { id: string },
  ) => Promise<void>;
  handleAddProject: (
    projectData: ProjectFormData,
    suggestedTasks?: SuggestedTask[],
  ) => Promise<Project>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  taskAttachments: TaskAttachment[];
  taskComments: TaskComment[];
  handleAddTaskComment: (taskId: string, text: string) => Promise<void>;
  handleAddTaskAttachment: (
    attachmentData: Omit<TaskAttachment, "id">,
  ) => Promise<TaskAttachment>;
  handleDeleteTaskAttachment: (attachment: TaskAttachment) => Promise<void>;
  handleDeleteTaskComment: (commentId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { teamMembers } = useTeamContext();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [initialAttachments, setInitialAttachments] = useState<
    TaskAttachment[]
  >([]);
  const [initialComments, setInitialComments] = useState<TaskComment[]>([]);

  // This initial fetch for attachments/comments can stay for now, as they are used across different tasks.
  useEffect(() => {
    if (!supabaseClient) return;
    const fetchSubData = async () => {
      const [fetchedAttachments, fetchedComments] = await Promise.all([
        api.getAll<TaskAttachment>(supabaseClient, "task_attachments"),
        api.getAll<TaskComment>(supabaseClient, "task_comments"),
      ]);
      setInitialAttachments(fetchedAttachments);
      setInitialComments(fetchedComments);
    };
    fetchSubData();
  }, [supabaseClient]);

  const {
    taskAttachments,
    handleAddTaskAttachment,
    handleDeleteTaskAttachment,
  } = useTaskAttachments(initialAttachments, supabaseClient, addToast);
  const { taskComments, handleAddTaskComment, handleDeleteTaskComment } =
    useTaskComments(
      initialComments,
      supabaseClient,
      currentUser,
      teamMembers,
      addToast,
    );

  const handleAddTask = useCallback(
    async (
      taskData: Omit<Task, "id" | "approvalStatus" | "creatorId">,
      projectId?: string,
    ) => {
      if (!supabaseClient || !currentUser) return;
      const fullTaskData = {
        ...taskData,
        projectId,
        creatorId: currentUser.id,
        approvalStatus: "pending" as const,
      };
      try {
        await api.insert<Task>(supabaseClient, "tasks", fullTaskData);
        addToast("Task added successfully.", "success");
        
        if (taskData.assignedTo && taskData.assignedTo !== currentUser.id) {
          try {
             const { createNotification } = await import("../services/notificationService");
             await createNotification(supabaseClient, {
               recipientId: taskData.assignedTo,
               type: "task_assigned",
               taskTitle: taskData.title,
               assignerName: currentUser.name,
               projectId: projectId,
               taskId: undefined,
             });
          } catch(e) {}
        }
        
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } catch (error: any) {
        addToast(`Failed to add task: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, currentUser, addToast, queryClient],
  );

  const handleUpdateTask = useCallback(
    async (taskData: Partial<Task> & { id: string }) => {
      if (!supabaseClient) return;
      try {
        await api.update<Task>(supabaseClient, "tasks", taskData.id, taskData);
        addToast("Task updated successfully.", "success");
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } catch (error: any) {
        addToast(`Failed to update task: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, addToast, queryClient],
  );

  const handleDeleteTask = useCallback(
    async (task: Task) => {
      if (!supabaseClient) return;
      try {
        await api.deleteById(supabaseClient, "tasks", task.id);
        addToast("Task deleted successfully.", "success");
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } catch (error: any) {
        addToast(`Failed to delete task: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, addToast, queryClient],
  );

  const handleUpdateProject = useCallback(
    async (projectData: Partial<Project> & { id: string }) => {
      if (!supabaseClient) return;
      try {
        await api.update<Project>(
          supabaseClient,
          "projects",
          projectData.id,
          projectData,
        );
        addToast("Project updated successfully.", "success");
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({
          queryKey: ["project", projectData.id],
        });
      } catch (error: any) {
        addToast(`Failed to update project: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, addToast, queryClient],
  );

  const handleAddProject = useCallback(
    async (
      projectData: ProjectFormData,
      suggestedTasks: SuggestedTask[] = [],
    ) => {
      if (!supabaseClient || !currentUser) throw new Error("Not authenticated");
      try {
        const newProject = await api.insert<Project>(
          supabaseClient,
          "projects",
          { ...projectData, creatorId: currentUser.id },
        );
        addToast("Project created successfully.", "success");
        queryClient.invalidateQueries({ queryKey: ["projects"] });

        if (suggestedTasks.length > 0) {
          const taskPromises = suggestedTasks.map((st) =>
            api.insert<Task>(supabaseClient, "tasks", {
              title: st.title,
              projectId: newProject.id,
              creatorId: currentUser.id,
              status: "todo",
              approvalStatus: "pending",
            }),
          );
          await Promise.all(taskPromises);
          addToast(
            `${suggestedTasks.length} tasks were added to the project.`,
            "info",
          );
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
        return newProject;
      } catch (error: any) {
        addToast(`Failed to create project: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, currentUser, addToast, queryClient],
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      if (!supabaseClient) return;
      try {
        await api.deleteById(supabaseClient, "projects", projectId);
        addToast("Project deleted successfully.", "success");
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] }); // Tasks might be deleted via cascade
      } catch (error: any) {
        addToast(`Failed to delete project: ${error.message}`, "error");
        throw error;
      }
    },
    [supabaseClient, addToast, queryClient],
  );

  const value = {
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    handleUpdateProject,
    handleAddProject,
    handleDeleteProject,
    taskAttachments,
    taskComments,
    handleAddTaskComment,
    handleAddTaskAttachment,
    handleDeleteTaskAttachment,
    handleDeleteTaskComment,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
};
