import { useState, useCallback, useEffect } from "react";
import { TaskComment, Task, TeamMember } from "../types";
import * as api from "../services/apiService";
import { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "../services/notificationService";
import { parseMentions } from "../utils/mentions";
import { useRealtime } from "../contexts/RealtimeContext";

export const useTaskComments = (
  initialComments: TaskComment[],
  supabaseClient: SupabaseClient | null,
  currentUser: TeamMember | null,
  teamMembers: TeamMember[],
  addToast: (message: string, type: "success" | "error" | "info") => void,
) => {
  const [taskComments, setTaskComments] =
    useState<TaskComment[]>(initialComments);
  const { subscribe } = useRealtime();

  useEffect(() => {
    setTaskComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (!supabaseClient) return () => {};

    const handleCommentChange = (payload: any) => {
      const camelPayload = api.keysToCamel(payload.new) as TaskComment;
      if (payload.eventType === "INSERT") {
        setTaskComments((prev) => [
          camelPayload,
          ...prev.filter((c) => c.id !== camelPayload.id),
        ]);
      } else if (payload.eventType === "UPDATE") {
        setTaskComments((prev) =>
          prev.map((c) => (c.id === camelPayload.id ? camelPayload : c)),
        );
      } else if (payload.eventType === "DELETE") {
        setTaskComments((prev) => prev.filter((c) => c.id !== payload.old.id));
      }
    };

    const unsubscribe = subscribe("task_comments", handleCommentChange);

    return () => {
      unsubscribe();
    };
  }, [supabaseClient, subscribe]);

  const handleAddTaskComment = useCallback(
    async (taskId: string, text: string) => {
      if (!supabaseClient || !currentUser) return;

      const { data, error } = await supabaseClient
        .from("tasks")
        .select("id, title, project_id")
        .eq("id", taskId)
        .single();
      if (error || !data) {
        addToast("Task not found for comment.", "error");
        return;
      }
      const task = api.keysToCamel(data) as Task;

      const newCommentData = {
        taskId,
        authorId: currentUser.id,
        text,
        timestamp: new Date().toISOString(),
      };

      try {
        const newComment = await api.insert<TaskComment>(
          supabaseClient,
          "task_comments",
          newCommentData,
        );
        addToast("تم إضافة التعليق بنجاح.", "success");
        setTaskComments((prev) => [newComment, ...prev]);

        const mentionedUsers = parseMentions(text, teamMembers);
        for (const user of mentionedUsers) {
          await createNotification(supabaseClient, {
            recipientId: user.id,
            type: "comment_mention",
            taskTitle: task.title,
            commentAuthorName: currentUser.name,
            projectId: task.projectId,
            taskId: task.id,
          });
        }
      } catch (e: any) {
        addToast(`فشل إضافة التعليق: ${e.message}`, "error");
        throw e;
      }
    },
    [supabaseClient, currentUser, teamMembers, addToast],
  );

  const handleDeleteTaskComment = useCallback(
    async (commentId: string) => {
      if (!supabaseClient) return;
      try {
        await api.deleteById(supabaseClient, "task_comments", commentId);
        addToast("تم حذف التعليق بنجاح.", "success");
        setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (e: any) {
        addToast(`فشل حذف التعليق: ${e.message}`, "error");
        throw e;
      }
    },
    [supabaseClient, addToast],
  );

  return {
    taskComments,
    setTaskComments,
    handleAddTaskComment,
    handleDeleteTaskComment,
  };
};
