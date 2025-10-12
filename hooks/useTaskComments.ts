import { useState, useCallback } from 'react';
import { TaskComment, Task, TeamMember } from '../types';
import * as api from '../services/apiService';
import { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '../services/notificationService';
import { parseMentions } from '../utils/mentions';

export const useTaskComments = (
    initialComments: TaskComment[],
    supabaseClient: SupabaseClient | null,
    currentUser: TeamMember | null,
    tasks: Task[],
    teamMembers: TeamMember[],
    addToast: (message: string, type: 'success' | 'error' | 'info') => void
) => {
    const [taskComments, setTaskComments] = useState<TaskComment[]>(initialComments);

    const handleAddTaskComment = useCallback(async (taskId: string, text: string) => {
        if (!supabaseClient || !currentUser) return;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const tempId = crypto.randomUUID();
        const newComment: TaskComment = { id: tempId, taskId, authorId: currentUser.id, text, timestamp: new Date().toISOString() };
        setTaskComments(prev => [...prev, newComment]);

        try {
            const createdComment = await api.insert<TaskComment>(supabaseClient, 'task_comments', { ...newComment, id: crypto.randomUUID() });
            setTaskComments(prev => prev.map(c => c.id === tempId ? createdComment : c));
            addToast('تم إضافة التعليق بنجاح.', 'success');

            const mentionedUsers = parseMentions(text, teamMembers);
            for (const user of mentionedUsers) {
                if (user.id !== currentUser.id) {
                    createNotification(supabaseClient, { recipientId: user.id, type: 'comment_mention', taskTitle: task.title, commentAuthorName: currentUser.name, projectId: task.projectId, taskId: task.id });
                }
            }
        } catch (e: any) {
            setTaskComments(prev => prev.filter(c => c.id !== tempId));
            addToast(`فشل إضافة التعليق: ${e.message}`, 'error');
            throw e;
        }
    }, [supabaseClient, currentUser, tasks, teamMembers, addToast]);

    const handleDeleteTaskComment = useCallback(async (commentId: string) => {
        if (!supabaseClient) return;
        const originalComments = taskComments;
        setTaskComments(prev => prev.filter(c => c.id !== commentId));
        try {
            await api.deleteById(supabaseClient, 'task_comments', commentId);
            addToast('تم حذف التعليق بنجاح.', 'success');
        } catch (e: any) {
            setTaskComments(originalComments);
            addToast(`فشل حذف التعليق: ${e.message}`, 'error');
            throw e;
        }
    }, [supabaseClient, taskComments, addToast]);

    return {
        taskComments,
        setTaskComments, // allow direct setting from the context fetch
        handleAddTaskComment,
        handleDeleteTaskComment
    };
};