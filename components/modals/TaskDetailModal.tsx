import React, { useState, FormEvent, useMemo } from 'react';
import { Task, TaskComment, TaskAttachment } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaperClipIcon, ChatBubbleLeftEllipsisIcon, ArrowUpTrayIcon, XCircleIcon } from '../ui/Icons';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';
import { fileToBase64 } from '../../utils/files';


interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task }) => {
  const { teamMembers } = useAppDataContext();
  const { projects, handleUpdateTask, handleAddTaskComment } = useProjectContext();
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === task?.projectId), [projects, task]);
  const assignedMember = useMemo(() => teamMembers.find(m => m.id === task?.assignedTo), [teamMembers, task]);

  if (!isOpen || !task || !currentUser || !supabaseClient) return null;

  const handleAddCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await handleAddTaskComment(task.id, newComment, teamMembers);
    setNewComment('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      
      try {
        const filePath = `${currentUser.id}/${task.id}/${Date.now()}_${file.name}`;
        const { data, error } = await supabaseClient.storage.from('task_attachments').upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabaseClient.storage.from('task_attachments').getPublicUrl(filePath);

        const newAttachment: Omit<TaskAttachment, 'id'> = {
            fileName: file.name,
            fileUrl: publicUrl,
            uploaderId: currentUser.id,
            timestamp: new Date().toISOString(),
        };
        
        // FIX: Cast result to 'unknown' first to solve strict type conversion error. The API returns a TaskAttachment shape,
        // but TypeScript infers the return type from the argument (which includes task_id), causing a mismatch.
        const createdAttachment = await api.insert(supabaseClient, 'task_attachments', { ...newAttachment, task_id: task.id }) as unknown as TaskAttachment;

        const updatedTask = { ...task, attachments: [...(task.attachments || []), createdAttachment] };
        await handleUpdateTask(updatedTask);

      } catch (error) {
        console.error("Error uploading file:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
      // Note: This only removes the DB record, not the file from storage, for simplicity.
      // A full implementation would also delete from Supabase Storage.
      if (!task.attachments) return;
      await api.deleteById(supabaseClient, 'task_attachments', attachmentId);
      const updatedAttachments = task.attachments.filter(a => a.id !== attachmentId);
      const updatedTask = { ...task, attachments: updatedAttachments };
      await handleUpdateTask(updatedTask);
  };
  
  const renderItem = (authorId: number, timestamp: string, content: React.ReactNode) => {
    const author = teamMembers.find(m => m.id === authorId);
    return (
        <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <img src={author?.avatarUrl} alt={author?.name} className="w-8 h-8 rounded-full" />
            <div className="flex-1">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{author?.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {format(new Date(timestamp), 'd MMM, hh:mm a', { locale: arSA })}
                    </span>
                </div>
                {content}
            </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start mb-4 flex-shrink-0">
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{task.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">في مشروع: {project?.name}</p>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold text-slate-600 dark:text-slate-300">مسندة إلى:</span> {assignedMember?.name || 'غير مسندة'}</div>
                <div><span className="font-semibold text-slate-600 dark:text-slate-300">تاريخ الاستحقاق:</span> {task.dueDate ? format(new Date(task.dueDate), 'd MMMM yyyy', { locale: arSA }) : 'غير محدد'}</div>
            </div>

            {/* Attachments Section */}
            <div>
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center"><PaperClipIcon className="w-5 h-5 ml-2"/> المرفقات</h3>
                <div className="space-y-2">
                    {(task.attachments || []).map(att => (
                        <div key={att.id} className="group flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">{att.fileName}</a>
                            {att.uploaderId === currentUser.id && (
                                <button onClick={() => handleRemoveAttachment(att.id)} className="p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <XCircleIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    <label className={`flex items-center justify-center w-full p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-500 dark:text-slate-400 ${isUploading ? 'cursor-wait bg-slate-100' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <ArrowUpTrayIcon className="w-5 h-5 ml-2"/>
                        <span>{isUploading ? 'جارٍ الرفع...' : 'رفع ملف جديد'}</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                </div>
            </div>

            {/* Comments Section */}
            <div>
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center"><ChatBubbleLeftEllipsisIcon className="w-5 h-5 ml-2"/> التعليقات</h3>
                 <div className="space-y-4">
                    {(task.comments || []).map(comment => renderItem(comment.authorId, comment.timestamp, 
                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 p-2 rounded-md mt-1">{comment.text}</p>
                    ))}
                 </div>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
             <form onSubmit={handleAddCommentSubmit} className="flex items-start space-x-3 rtl:space-x-reverse">
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                    <textarea 
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="أضف تعليقًا... (يمكنك الإشارة لزميل باستخدام @الاسم)"
                        rows={2}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                    />
                    <button type="submit" className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">إضافة تعليق</button>
                </div>
             </form>
        </div>

      </div>
    </div>
  );
};