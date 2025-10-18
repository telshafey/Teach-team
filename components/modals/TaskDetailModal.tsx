import React, { useState, FormEvent, useMemo, useRef, useEffect } from 'react';
import { Task, TaskComment, TaskAttachment, TeamMember, TaskStatus, Project } from '../../types';
import { useTeamContext } from '../../contexts/TeamContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaperClipIcon, ChatBubbleLeftEllipsisIcon, ArrowUpTrayIcon, PencilIcon, TrashIcon, XMarkIcon } from '../ui/Icons';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ConfirmationModal } from './ConfirmationModal';


interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null; // null for create mode
  onSave?: (taskData: Partial<Task>, isNew: boolean) => Promise<void>;
  initialMode?: 'view' | 'edit';
}

type ItemToDelete = { type: 'attachment'; data: TaskAttachment } | { type: 'comment'; data: TaskComment };

// --- Extracted Components to fix focus loss issue ---

interface TaskDetailViewProps {
    task: Task;
    assignedMember: TeamMember | undefined;
    attachmentsForThisTask: TaskAttachment[];
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploading: boolean;
    localComments: TaskComment[];
    membersMap: Record<number, TeamMember>;
    currentUser: TeamMember;
    newComment: string;
    setNewComment: React.Dispatch<React.SetStateAction<string>>;
    handleAddCommentSubmit: (e: FormEvent) => void;
    onDeleteItem: (item: ItemToDelete) => void;
    canDeleteTasks: boolean;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({
    task, assignedMember, attachmentsForThisTask, handleFileUpload, isUploading,
    localComments, membersMap, currentUser, newComment, setNewComment, handleAddCommentSubmit,
    onDeleteItem, canDeleteTasks,
}) => (
    <>
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold text-slate-600 dark:text-slate-300">مسندة إلى:</span> {assignedMember?.name || 'غير مسندة'}</div>
                <div><span className="font-semibold text-slate-600 dark:text-slate-300">تاريخ الاستحقاق:</span> {task?.dueDate ? format(parseISO(task.dueDate), 'd MMMM yyyy', { locale: arSA }) : 'غير محدد'}</div>
            </div>

            <div>
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center"><PaperClipIcon className="w-5 h-5 ml-2"/> المرفقات</h3>
                <div className="space-y-2">
                    {attachmentsForThisTask.map(att => (
                        <div key={att.id} className="group flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 dark:text-sky-400 hover:underline truncate">{att.fileName}</a>
                            {(currentUser.id === att.uploaderId || canDeleteTasks) && (
                                <button onClick={() => onDeleteItem({ type: 'attachment', data: att })} className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    <label className={`flex items-center justify-center w-full p-3 border-2 border-dashed rounded-md ${isUploading ? 'cursor-wait' : 'cursor-pointer'}`}>
                        <ArrowUpTrayIcon className="w-5 h-5 ml-2"/>
                        <span>{isUploading ? 'جارٍ الرفع...' : 'رفع ملف جديد'}</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                </div>
            </div>

            <div>
                <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center"><ChatBubbleLeftEllipsisIcon className="w-5 h-5 ml-2"/> التعليقات</h3>
                <div className="space-y-4">
                    {localComments.map(comment => {
                        const author = membersMap[comment.authorId];
                        return (
                            <div key={comment.id} className="flex items-start space-x-3 rtl:space-x-reverse group">
                                <img src={author?.avatarUrl} alt={author?.name} className="w-8 h-8 rounded-full" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-sm">{author?.name}</span>
                                        {(currentUser.id === comment.authorId || canDeleteTasks) && (
                                            <button onClick={() => onDeleteItem({ type: 'comment', data: comment })} className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm bg-slate-100 p-2 rounded-md mt-1">{comment.text}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t flex-shrink-0">
            <form onSubmit={handleAddCommentSubmit} className="flex items-start space-x-3 rtl:space-x-reverse">
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="أضف تعليقًا... (يمكنك الإشارة إلى عضو باستخدام @)" rows={1} className="w-full p-2 border rounded-md text-sm" />
                    <button type="submit" className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md">إضافة</button>
                </div>
            </form>
        </div>
    </>
);

interface TaskDetailEditProps {
    formData: { title: string; projectId: string; assignedTo: string; dueDate: string; status: TaskStatus; };
    setFormData: React.Dispatch<React.SetStateAction<TaskDetailEditProps['formData']>>;
    handleFormSubmit: (e: FormEvent) => void;
    projects: Project[];
    assignableMembers: TeamMember[];
    isSaving: boolean;
    onCancel: () => void;
    canAssignToOthers: boolean;
    isNew: boolean;
}

const TaskDetailEdit: React.FC<TaskDetailEditProps> = ({
    formData, setFormData, handleFormSubmit, projects, assignableMembers, isSaving, onCancel, canAssignToOthers, isNew
}) => (
    <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4">
        <div>
            <label className="block text-sm font-medium mb-1">عنوان المهمة</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-md text-sm" required />
        </div>
        <div>
            <label className="block text-sm font-medium mb-1">المشروع</label>
            <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full p-2 border rounded-md text-sm">
                <option value="">-- بدون مشروع --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">مسندة إلى</label>
                <select 
                    value={formData.assignedTo} 
                    onChange={e => setFormData({...formData, assignedTo: e.target.value})} 
                    className="w-full p-2 border rounded-md text-sm"
                    disabled={isNew && !canAssignToOthers}
                    required
                >
                    <option value="">غير مسندة</option>
                    {assignableMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">تاريخ الاستحقاق</label>
                <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-2 border rounded-md text-sm" />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium mb-1">الحالة</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})} className="w-full p-2 border rounded-md text-sm">
                <option value="todo">لم تبدأ</option>
                <option value="inprogress">قيد التنفيذ</option>
                <option value="done">مكتملة</option>
            </select>
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm bg-slate-100 rounded-md">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md disabled:bg-slate-400">
                {isSaving ? <LoadingSpinner/> : 'حفظ'}
            </button>
        </div>
    </form>
);


// --- Main Modal Component ---

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, task, onSave, initialMode = 'view' }) => {
  const { teamMembers, hasPermission, visibleMemberIds } = useTeamContext();
  const { projects, taskAttachments, taskComments, handleAddTaskComment, handleAddTaskAttachment, handleDeleteTaskAttachment, handleDeleteTaskComment } = useProjectContext();
  const { currentUser } = useAuth();
  const { supabaseClient } = useSupabase();
  const { addToast } = useToast();
  
  const isNew = !task;
  const [isEditing, setIsEditing] = useState(isNew || initialMode === 'edit');
  const [formData, setFormData] = useState({
    title: task?.title || '',
    projectId: task?.projectId || '',
    assignedTo: task?.assignedTo?.toString() || '',
    dueDate: task?.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '',
    status: task?.status || 'todo' as TaskStatus,
  });
  
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

  const commentsForThisTask = useMemo(() => task ? taskComments.filter(c => c.taskId === task.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) : [], [taskComments, task]);
  const [localComments, setLocalComments] = useState<TaskComment[]>([]);

  const membersMap = useMemo(() => teamMembers.reduce((acc, m) => ({...acc, [m.id]: m}), {} as Record<number, TeamMember>), [teamMembers]);
  const canAssignToOthers = hasPermission('edit_tasks') || hasPermission('manage_projects');
  const canDeleteTasks = hasPermission('delete_tasks');

  const assignableMembers = useMemo(() => {
    return teamMembers.filter(m => visibleMemberIds.has(m.id));
  }, [teamMembers, visibleMemberIds]);

  useEffect(() => {
    setLocalComments(commentsForThisTask);
  }, [commentsForThisTask]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
            onClose();
        }
    };

    if (isOpen) { document.addEventListener('mousedown', handleClickOutside); }
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [isOpen, onClose]);


  useEffect(() => {
      if (task) {
           setFormData({
            title: task.title,
            projectId: task.projectId || '',
            assignedTo: task.assignedTo?.toString() || '',
            dueDate: task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '',
            status: task.status,
          });
      } else {
           const initialAssignee = currentUser ? currentUser.id.toString() : '';
           setFormData({ title: '', projectId: '', assignedTo: initialAssignee, dueDate: '', status: 'todo' });
      }
      setIsEditing(isNew || initialMode === 'edit');
  }, [task, isOpen, initialMode, isNew, currentUser]);

  const attachmentsForThisTask = useMemo(() => task ? taskAttachments.filter(a => a.taskId === task.id) : [], [taskAttachments, task]);
  
  const project = useMemo(() => projects.find(p => p.id === (isNew ? formData.projectId : task?.projectId)), [projects, task, formData.projectId, isNew]);
  const assignedMember = useMemo(() => teamMembers.find(m => m.id === (isNew ? parseInt(formData.assignedTo) : task?.assignedTo)), [teamMembers, task, formData.assignedTo, isNew]);

  if (!isOpen || !currentUser || !supabaseClient) return null;
  
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    setIsSaving(true);
    try {
        await onSave({
            ...formData,
            assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : undefined,
            dueDate: formData.dueDate || undefined,
        }, isNew);
        if (isNew) {
            onClose();
        } else {
            setIsEditing(false);
        }
    } catch (error) {
        // Toast is handled in context
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleAddCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    try {
        await handleAddTaskComment(task.id, newComment);
        setNewComment('');
    } catch (error) {
        // Error is handled in the context
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return;
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      try {
        const filePath = `${currentUser.id}/${task.id}/${Date.now()}_${file.name}`;
        const { error } = await supabaseClient.storage.from('task_attachments').upload(filePath, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabaseClient.storage.from('task_attachments').getPublicUrl(filePath);
        await handleAddTaskAttachment({ taskId: task.id, fileName: file.name, fileUrl: publicUrl, uploaderId: currentUser.id, timestamp: new Date().toISOString() });
        addToast('تم رفع المرفق بنجاح.', 'success');
      } catch (error: any) {
        addToast(`حدث خطأ أثناء رفع الملف: ${error.message}`, 'error');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'attachment') {
        await handleDeleteTaskAttachment(itemToDelete.data);
    } else {
        await handleDeleteTaskComment(itemToDelete.data.id);
    }
    setItemToDelete(null);
  };


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div ref={modalContentRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-start mb-4 flex-shrink-0">
              <div>
                  <h2 className="text-xl font-bold">{isNew ? 'مهمة جديدة' : isEditing ? 'تعديل المهمة' : task?.title}</h2>
                  {!isNew && <p className="text-sm text-slate-500">في مشروع: {project?.name || 'مهمة خاصة'}</p>}
              </div>
              <div className="flex items-center space-x-2">
                   {!isNew && !isEditing && onSave && <button onClick={() => setIsEditing(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><PencilIcon className="w-5 h-5"/></button>}
                  <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><XMarkIcon className="w-6 h-6"/></button>
              </div>
          </div>
          {isEditing && onSave ? (
            <TaskDetailEdit
              formData={formData}
              setFormData={setFormData}
              handleFormSubmit={handleFormSubmit}
              projects={projects}
              assignableMembers={assignableMembers}
              isSaving={isSaving}
              onCancel={isNew ? onClose : () => setIsEditing(false)}
              canAssignToOthers={canAssignToOthers}
              isNew={isNew}
            />
          ) : task ? (
            <TaskDetailView
              task={task}
              assignedMember={assignedMember}
              attachmentsForThisTask={attachmentsForThisTask}
              handleFileUpload={handleFileUpload}
              isUploading={isUploading}
              localComments={localComments}
              membersMap={membersMap}
              currentUser={currentUser}
              newComment={newComment}
              setNewComment={setNewComment}
              handleAddCommentSubmit={handleAddCommentSubmit}
              onDeleteItem={setItemToDelete}
              canDeleteTasks={canDeleteTasks}
            />
          ) : null}
        </div>
      </div>
      {itemToDelete && (
        <ConfirmationModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={confirmDeleteItem}
          title={`تأكيد حذف ${itemToDelete.type === 'attachment' ? 'المرفق' : 'التعليق'}`}
          message={`هل أنت متأكد من رغبتك في حذف هذا ${itemToDelete.type === 'attachment' ? 'المرفق' : 'التعليق'}؟ لا يمكن التراجع عن هذا الإجراء.`}
          isDestructive
        />
      )}
    </>
  );
};
