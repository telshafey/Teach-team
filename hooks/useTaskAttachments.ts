import { useState, useCallback } from 'react';
import { TaskAttachment } from '../types';
import * as api from '../services/apiService';
import { SupabaseClient } from '@supabase/supabase-js';

export const useTaskAttachments = (
    initialAttachments: TaskAttachment[],
    supabaseClient: SupabaseClient | null,
    addToast: (message: string, type: 'success' | 'error' | 'info') => void
) => {
    const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>(initialAttachments);

    const handleAddTaskAttachment = useCallback(async (attachmentData: Omit<TaskAttachment, 'id'>) => {
        if (!supabaseClient) throw new Error("Supabase client not available");
        const tempId = crypto.randomUUID();
        const newAttachment: TaskAttachment = { id: tempId, ...attachmentData };
        setTaskAttachments(prev => [...prev, newAttachment]);
        try {
            const createdAttachment = await api.insert<TaskAttachment>(supabaseClient, 'task_attachments', { ...attachmentData, id: crypto.randomUUID() });
            setTaskAttachments(prev => prev.map(a => a.id === tempId ? createdAttachment : a));
            return createdAttachment;
        } catch (e: any) {
            setTaskAttachments(prev => prev.filter(a => a.id !== tempId));
            addToast(`فشل حفظ المرفق: ${e.message}`, 'error');
            throw e;
        }
    }, [supabaseClient, addToast]);

    const handleDeleteTaskAttachment = useCallback(async (attachment: TaskAttachment) => {
        if (!supabaseClient) return;
        const originalAttachments = taskAttachments;
        setTaskAttachments(prev => prev.filter(a => a.id !== attachment.id));
        
        try {
            await api.deleteById(supabaseClient, 'task_attachments', attachment.id);
            addToast('تم حذف المرفق بنجاح.', 'success');
            try {
                const filePath = new URL(attachment.fileUrl).pathname.split(`/public/task_attachments/`)[1];
                if (filePath) {
                    const { error: storageError } = await supabaseClient.storage.from('task_attachments').remove([decodeURIComponent(filePath)]);
                    if (storageError && storageError.message !== 'The resource was not found') {
                        console.warn(`Failed to delete file from storage: ${storageError.message}`);
                    }
                }
            } catch (storageError) {
                 console.warn(`An error occurred during storage file deletion:`, storageError);
            }
        } catch (e: any) {
            setTaskAttachments(originalAttachments);
            addToast(`فشل حذف المرفق: ${e.message}`, 'error');
            throw e;
        }
    }, [supabaseClient, taskAttachments, addToast]);

    return {
        taskAttachments,
        setTaskAttachments,
        handleAddTaskAttachment,
        handleDeleteTaskAttachment
    };
};