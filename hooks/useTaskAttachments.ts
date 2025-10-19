import { useState, useCallback, useEffect } from 'react';
import { TaskAttachment } from '../types';
import * as api from '../services/apiService';
import { SupabaseClient } from '@supabase/supabase-js';

export const useTaskAttachments = (
    initialAttachments: TaskAttachment[],
    supabaseClient: SupabaseClient | null,
    addToast: (message: string, type: 'success' | 'error' | 'info') => void
) => {
    const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>(initialAttachments);

    useEffect(() => {
        if (!supabaseClient) return;

        const channel = supabaseClient.channel('public:task_attachments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_attachments' }, payload => {
                if (payload.eventType === 'INSERT') {
                    setTaskAttachments(prev => [...prev, api.keysToCamel(payload.new)]);
                } else if (payload.eventType === 'UPDATE') {
                    setTaskAttachments(prev => prev.map(a => a.id === payload.new.id ? api.keysToCamel(payload.new) : a));
                } else if (payload.eventType === 'DELETE') {
                    setTaskAttachments(prev => prev.filter(a => a.id !== payload.old.id));
                }
            }).subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [supabaseClient]);


    const handleAddTaskAttachment = useCallback(async (attachmentData: Omit<TaskAttachment, 'id'>) => {
        if (!supabaseClient) throw new Error("Supabase client not available");
        try {
            const createdAttachment = await api.insert<TaskAttachment>(supabaseClient, 'task_attachments', attachmentData);
            // State is updated via real-time subscription
            return createdAttachment;
        } catch (e: any) {
            addToast(`فشل حفظ المرفق: ${e.message}`, 'error');
            throw e;
        }
    }, [supabaseClient, addToast]);

    const handleDeleteTaskAttachment = useCallback(async (attachment: TaskAttachment) => {
        if (!supabaseClient) return;
        
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
            addToast(`فشل حذف المرفق: ${e.message}`, 'error');
            throw e;
        }
    }, [supabaseClient, addToast]);

    return {
        taskAttachments,
        setTaskAttachments,
        handleAddTaskAttachment,
        handleDeleteTaskAttachment
    };
};