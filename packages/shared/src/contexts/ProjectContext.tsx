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
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

const EMPTY_ATTACHMENTS: TaskAttachment[] = [];
const EMPTY_COMMENTS: TaskComment[] = [];

export const useProject = (): ProjectContextType => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { teamMembers } = useTeamContext();

  // Queries for attachments and comments
  const { data: initialAttachments = EMPTY_ATTACHMENTS } = useQuery({
    queryKey: ["task_attachments"],
    queryFn: async () => {
      if (!supabaseClient) return EMPTY_ATTACHMENTS;
      return api.getAll<TaskAttachment>(supabaseClient, "task_attachments");
    },
    enabled: !!supabaseClient,
  });

  const { data: initialComments = EMPTY_COMMENTS } = useQuery({
    queryKey: ["task_comments"],
    queryFn: async () => {
      if (!supabaseClient) return EMPTY_COMMENTS;
      return api.getAll<TaskComment>(supabaseClient, "task_comments");
    },
    enabled: !!supabaseClient,
  });

  // Attachments and Comments Hooks
  const {
    taskAttachments,
    handleAddTaskAttachment,
    handleDeleteTaskAttachment,
  } = useTaskAttachments(initialAttachments, supabaseClient, addToast);

  const {
    taskComments,
    handleAddTaskComment,
    handleDeleteTaskComment,
  } = useTaskComments(
    initialComments,
    supabaseClient,
    currentUser,
    teamMembers,
    addToast
  );

  // Task Mutations
  const handleAddTask = async (
    taskData: Omit<Task, "id" | "approvalStatus" | "creatorId">,
    projectId?: string
  ) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const snakeData = api.camelToSnakeCase({
        ...taskData,
        projectId: projectId || taskData.projectId,
        approvalStatus: "approved", // auto approve
        creatorId: currentUser.id,
      });
      await api.insert(supabaseClient, "tasks", snakeData);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast("تم إضافة المهمة بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء إضافة المهمة", "error");
      throw error;
    }
  };

  const handleUpdateTask = async (
    taskData: Partial<Task> & { id: string }
  ) => {
    if (!supabaseClient) return;
    try {
      const snakeData = api.camelToSnakeCase(taskData);
      await api.update(supabaseClient, "tasks", taskData.id, snakeData);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast("تم تحديث المهمة بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء تحديث المهمة", "error");
      throw error;
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, "tasks", task.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast("تم حذف المهمة بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء حذف المهمة", "error");
      throw error;
    }
  };

  // Project Mutations
  const handleAddProject = async (
    projectData: ProjectFormData,
    suggestedTasks?: SuggestedTask[]
  ): Promise<Project> => {
    if (!supabaseClient || !currentUser) throw new Error("Client or User not authenticated");
    try {
      const snakeData = api.camelToSnakeCase({
        ...projectData,
        creatorId: currentUser.id,
      });
      
      const newProject = await api.insert<Project>(supabaseClient, "projects", snakeData);
      
      if (suggestedTasks && suggestedTasks.length > 0) {
        for (const t of suggestedTasks) {
          await api.insert(
            supabaseClient,
            "tasks",
            api.camelToSnakeCase({
              title: t.title,
              description: t.description,
              projectId: newProject.id,
              status: "todo",
              creatorId: currentUser.id,
              approvalStatus: "approved",
            })
          );
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast("تم إضافة المشروع بنجاح", "success");
      return newProject;
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء إضافة المشروع", "error");
      throw error;
    }
  };

  const handleUpdateProject = async (
    projectData: Partial<Project> & { id: string }
  ) => {
    if (!supabaseClient) return;
    try {
      const snakeData = api.camelToSnakeCase(projectData);
      await api.update(supabaseClient, "projects", projectData.id, snakeData);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      addToast("تم تحديث المشروع بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء تحديث المشروع", "error");
      throw error;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!supabaseClient) return;
    try {
      await api.deleteById(supabaseClient, "projects", projectId);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      addToast("تم حذف المشروع بنجاح", "success");
    } catch (error: any) {
      addToast(error.message || "حدث خطأ أثناء حذف المشروع", "error");
      throw error;
    }
  };

  return {
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
};

export const useProjectContext = useProject;
