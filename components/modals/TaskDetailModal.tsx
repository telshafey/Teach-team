import React, { useState, FormEvent, useMemo, useRef, useEffect } from 'react';
import { Task, TaskComment, TaskAttachment, TeamMember } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaperClipIcon, ChatBubbleLeftEllipsisIcon, ArrowUpTrayIcon, XCircleIcon, PencilIcon, TrashIcon } from '../ui/Icons';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useSupabase } from '../../contexts/SupabaseContext';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';


interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task }) => {
  const { teamMembers } = useTeamContext();
  const { projects, taskAttachments, taskComments, handleAddTaskComment, handleDeleteTaskComment, handleAddTaskAttachment, handleDeleteTaskAttachment } = useProjectContext();
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  
  // Correctly derive storage configuration status from the Supabase client.
  const isStorageConfigured = !!supabaseClient?.storage;

  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showStorageErrorModal, setShowStorageErrorModal] = useState(false);
  
  const [commentToDelete, setCommentToDelete] = useState<TaskComment | null>(null);

  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const project = useMemo(() => projects.find(p => p.id === task?.projectId), [projects, task]);
  const assignedMember = useMemo(() => teamMembers.find(m => m.id === task?.assignedTo), [teamMembers, task]);

  const attachmentsForThisTask = useMemo(() => taskAttachments.filter(a => a.taskId === task?.id), [taskAttachments, task]);
  const commentsForThisTask = useMemo(() => taskComments.filter(c => c.taskId === task?.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [taskComments, task]);
  
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return [];
    return teamMembers.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [mentionQuery, teamMembers]);


  if (!isOpen || !task || !currentUser || !supabaseClient) return null;

  const handleAddCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
        await handleAddTaskComment(task.id, newComment);
        setNewComment('');
    } catch (error) {
        console.error("Failed to add comment from modal:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isStorageConfigured) {
        setShowStorageErrorModal(true);
        e.target.value = '';
        return;
    }
    
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      
      try {
        const filePath = `${currentUser.id}/${task.id}/${Date.now()}_${file.name}`;
        const { error } = await supabaseClient.storage.from('task_attachments').upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabaseClient.storage.from('task_attachments').getPublicUrl(filePath);

        await handleAddTaskAttachment({
            taskId: task.id,
            fileName: file.name,
            fileUrl: publicUrl,
            uploaderId: currentUser.id,
            timestamp: new Date().toISOString(),
        });
        
        addToast('تم رفع المرفق بنجاح.', 'success');

      } catch (error: any) {
        console.error("Error uploading file:", error);
        addToast(error.message.includes('rls') ? 'فشل رفع الملف. ليس لديك الصلاحية.' : `حدث خطأ أثناء رفع الملف: ${error.message}`, 'error');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleRemoveAttachment = async (attachment: TaskAttachment) => {
      try {
        await handleDeleteTaskAttachment(attachment);
      } catch(error: any) {
        console.error("Error removing attachment:", error);
      }
  };
  
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewComment(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([\p{L}\p{N}_\s]*)$/u);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (user: TeamMember) => {
    if (!commentTextareaRef.current) return;
    const text = newComment;
    const cursorPos = commentTextareaRef.current.selectionStart;
    const textAfterCursor = text.substring(cursorPos);
    
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([\p{L}\p{N}_\s]*)$/u);

    if(mentionMatch) {
        const startIndex = mentionMatch.index || 0;
        const newText = `${text.substring(0, startIndex)}@${user.name} ${textAfterCursor}`;
        setNewComment(newText);
    }

    setShowMentions(false);
    setTimeout(() => commentTextareaRef.current?.focus(), 0);
  };
  
  const renderItem = (authorId: number, timestamp: string, content: React.ReactNode, comment?: TaskComment) => {
    const author = teamMembers.find(m => m.id === authorId);
    return (
        <div className="flex items-start space-x-3 rtl:space-x-reverse group">
            <img src={author?.avatarUrl} alt={author?.name} className="w-8 h-8 rounded-full" />
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{author?.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                            {format(new Date(timestamp), 'd MMM, hh:mm a', { locale: arSA })}
                        </span>
                    </div>
                     {comment && currentUser.id === authorId && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setCommentToDelete(comment)} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                     )}
                </div>
                {content}
            </div>
        </div>
    );
  };

  return (
    <>
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

            <div>
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center"><PaperClipIcon className="w-5 h-5 ml-2"/> المرفقات</h3>
                <div className="space-y-2">
                    {attachmentsForThisTask.map(att => (
                        <div key={att.id} className="group flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">{att.fileName}</a>
                            {att.uploaderId === currentUser.id && (
                                <button onClick={() => handleRemoveAttachment(att)} className="p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
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

            <div>
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center"><ChatBubbleLeftEllipsisIcon className="w-5 h-5 ml-2"/> التعليقات</h3>
                 <div className="space-y-4">
                    {commentsForThisTask.map(comment => (
                        renderItem(comment.authorId, comment.timestamp, 
                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 p-2 rounded-md mt-1 whitespace-pre-wrap">{comment.text}</p>,
                            comment
                        )
                    ))}
                 </div>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 relative">
             <form onSubmit={handleAddCommentSubmit} className="flex items-start space-x-3 rtl:space-x-reverse">
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                    <textarea 
                        ref={commentTextareaRef}
                        value={newComment}
                        onChange={handleCommentChange}
                        placeholder="أضف تعليقًا... (يمكنك الإشارة لزميل باستخدام @الاسم)"
                        rows={2}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                    />
                    <button type="submit" className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">إضافة تعليق</button>
                </div>
             </form>
             {showMentions && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full mb-1 w-3/4 left-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
                    {mentionSuggestions.map(user => (
                        <div key={user.id} onClick={() => handleMentionSelect(user)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm flex items-center space-x-2 rtl:space-x-reverse">
                            <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
                            <span>{user.name}</span>
                        </div>
                    ))}
                </div>
             )}
        </div>
      </div>
    </div>
    {commentToDelete && (
        <ConfirmationModal 
            isOpen={!!commentToDelete}
            onClose={() => setCommentToDelete(null)}
            onConfirm={async () => {
                await handleDeleteTaskComment(commentToDelete.id);
                setCommentToDelete(null);
            }}
            title="تأكيد حذف التعليق"
            message="هل أنت متأكد من رغبتك في حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء."
            isDestructive
        />
    )}
    {showStorageErrorModal && (
        <ConfirmationModal
          isOpen={showStorageErrorModal}
          onClose={() => setShowStorageErrorModal(false)}
          onConfirm={() => setShowStorageErrorModal(false)}
          title="خطأ في إعدادات التخزين"
          message="ميزة رفع الملفات غير مفعلة. يرجى مراجعة المسؤول لإعداد 'bucket' التخزين المسمى 'task_attachments' في لوحة تحكم Supabase كما هو موضح في ملف README.md."
          confirmText="حسنًا"
        />
    )}
    </>
  );
};