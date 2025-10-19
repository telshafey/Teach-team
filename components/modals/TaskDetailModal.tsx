import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Task, TaskFormData, TeamMember, Project, TaskAttachment, TaskComment } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { StatusBadge } from '../ui/StatusBadge';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { PaperClipIcon, ChatBubbleLeftEllipsisIcon, TrashIcon, ArrowUpTrayIcon } from '../ui/Icons';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useToast } from '../../contexts/ToastContext';

// A simple display component for attachments
const AttachmentItem: React.FC<{ attachment: TaskAttachment, onDelete: () => void, canDelete: boolean }> = ({ attachment, onDelete, canDelete }) => (
    <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
        <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-sky-600 hover:underline truncate">{attachment.fileName}</a>
        {canDelete && <button onClick={onDelete} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>}
    </div>
);

// A simple display component for comments
const CommentItem: React.FC<{ comment: TaskComment, author?: TeamMember, onDelete: () => void, canDelete: boolean }> = ({ comment, author, onDelete, canDelete }) => (
    <div className="flex items-start space-x-3 rtl:space-x-reverse">
        <img src={author?.avatarUrl} alt={author?.name} className="w-8 h-8 rounded-full"/>
        <div className="flex-1">
            <div className="flex items-center justify-between">
                <div>
                    <span className="font-semibold text-sm">{author?.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 rtl:ml-0 rtl:mr-2">{format(parseISO(comment.timestamp), 'd MMM, p', { locale: arSA })}</span>
                </div>
                {canDelete && <button onClick={onDelete} className="p-1 text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>}
            </div>
            <p className="text-sm mt-1 bg-slate-100 dark:bg-slate-700 p-2 rounded-md">{comment.text}</p>
        </div>
    </div>
);


interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (taskData: Partial<Task>, isNew: boolean) => Promise<void>;
  initialMode?: 'view' | 'edit';
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task, onSave, initialMode = 'view' }) => {
  const { teamMembers, hasPermission } = useTeamContext();
  const { projects, taskAttachments, taskComments, handleAddTaskComment, handleAddTaskAttachment, handleDeleteTaskAttachment, handleDeleteTaskComment } = useProjectContext();
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  
  const [mode, setMode] = useState(initialMode);
  const isNew = task === null;
  
  const [formData, setFormData] = useState<Partial<TaskFormData>>({
    title: task?.title || '',
    projectId: task?.projectId,
    assignedTo: task?.assignedTo,
    status: task?.status || 'todo',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
  });

  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(isNew ? 'edit' : initialMode);
    setFormData({
        title: task?.title || '',
        projectId: task?.projectId,
        assignedTo: task?.assignedTo || currentUser?.id,
        status: task?.status || 'todo',
        dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    });
  }, [task, isOpen, isNew, initialMode, currentUser]);

  const canEdit = isNew || hasPermission('edit_tasks');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData, isNew);
      if(isNew) onClose(); else setMode('view');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(!e.target.files || e.target.files.length === 0 || !task || !supabaseClient || !currentUser) return;
      
      const file = e.target.files[0];
      setIsUploading(true);
      try {
          const filePath = `${currentUser.id}/${task.id}/${new Date().getTime()}_${file.name}`;
          const { error: uploadError } = await supabaseClient.storage.from('task_attachments').upload(filePath, file);
          if(uploadError) throw uploadError;

          const { data: { publicUrl } } = supabaseClient.storage.from('task_attachments').getPublicUrl(filePath);

          await handleAddTaskAttachment({
              taskId: task.id,
              fileName: file.name,
              fileUrl: publicUrl,
              uploaderId: currentUser.id,
              timestamp: new Date().toISOString()
          });
          addToast("تم رفع المرفق بنجاح", "success");

      } catch(error: any) {
          addToast(`فشل رفع المرفق: ${error.message}`, 'error');
      } finally {
          setIsUploading(false);
      }
  }

  const submitComment = async () => {
      if(!newComment.trim() || !task) return;
      setIsAddingComment(true);
      try {
        await handleAddTaskComment(task.id, newComment.trim());
        setNewComment('');
      } finally {
        setIsAddingComment(false);
      }
  }

  const taskProject = projects.find(p => p.id === task?.projectId);
  const taskAssignee = teamMembers.find(m => m.id === task?.assignedTo);
  const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({...acc, [m.id]: m}), {} as Record<number, TeamMember>), [teamMembers]);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "مهمة جديدة" : task.title} size="xl">
        {mode === 'edit' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Edit Form Fields */}
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="عنوان المهمة" required className="w-full text-lg font-bold p-2 border rounded-md" />
                 <div className="grid grid-cols-2 gap-4">
                     <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2 border rounded-md"><option value="todo">لم تبدأ</option><option value="inprogress">قيد التنفيذ</option><option value="done">مكتملة</option></select>
                     <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-2 border rounded-md" />
                     <select value={formData.assignedTo || ''} onChange={e => setFormData({...formData, assignedTo: Number(e.target.value)})} className="w-full p-2 border rounded-md"><option value="">-- إسناد إلى --</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                     <select value={formData.projectId || ''} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full p-2 border rounded-md"><option value="">-- مشروع --</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
                 <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={() => isNew ? onClose() : setMode('view')} className="px-4 py-2 text-sm bg-slate-100 rounded-md">إلغاء</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md">{isSaving ? <LoadingSpinner/> : "حفظ"}</button>
                </div>
            </form>
        ) : task && (
             <div className="space-y-6">
                 {/* View Details */}
                <div className="flex justify-between items-start">
                    <div>
                        <StatusBadge status={task.status} type="task"/>
                        <p className="text-sm text-slate-500 mt-2">مسندة إلى: <span className="font-semibold">{taskAssignee?.name || 'غير مسندة'}</span></p>
                        <p className="text-sm text-slate-500">المشروع: <span className="font-semibold">{taskProject?.name || 'خاص'}</span></p>
                        <p className="text-sm text-slate-500">تاريخ الاستحقاق: <span className="font-semibold">{task.dueDate ? format(parseISO(task.dueDate), 'd MMMM yyyy', {locale: arSA}) : 'غير محدد'}</span></p>
                    </div>
                    {canEdit && <button onClick={() => setMode('edit')} className="text-sm font-semibold text-sky-600">تعديل</button>}
                </div>
                 {/* Attachments */}
                 <div className="space-y-2">
                     <h3 className="font-semibold flex items-center"><PaperClipIcon className="w-5 h-5 ml-2"/>المرفقات</h3>
                     {taskAttachments.filter(a => a.taskId === task.id).map(att => <AttachmentItem key={att.id} attachment={att} onDelete={() => handleDeleteTaskAttachment(att)} canDelete={currentUser?.id === att.uploaderId || canEdit}/>)}
                     <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center text-sm text-sky-600 space-x-2"><ArrowUpTrayIcon className="w-4 h-4"/><span>{isUploading ? "جارٍ الرفع..." : "إضافة مرفق"}</span></button>
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden"/>
                 </div>
                 {/* Comments */}
                  <div className="space-y-4">
                     <h3 className="font-semibold flex items-center"><ChatBubbleLeftEllipsisIcon className="w-5 h-5 ml-2"/>التعليقات</h3>
                     <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {taskComments.filter(c => c.taskId === task.id).map(c => <CommentItem key={c.id} comment={c} author={membersMap[c.authorId]} onDelete={() => handleDeleteTaskComment(c.id)} canDelete={currentUser?.id === c.authorId || canEdit} />)}
                     </div>
                     <div className="flex space-x-2">
                         <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="أضف تعليقاً..." className="flex-1 p-2 border rounded-md"/>
                         <button onClick={submitComment} disabled={isAddingComment} className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md">{isAddingComment ? <LoadingSpinner/> : "إرسال"}</button>
                     </div>
                 </div>
             </div>
        )}
    </Modal>
  );
};
