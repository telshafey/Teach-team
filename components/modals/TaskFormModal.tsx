import React, { useState, useEffect, FormEvent } from 'react';
import { Task, Project, TeamMember, TaskStatus, TaskFormData } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskFormData) => Promise<void>;
  task: Task | null;
  projects: Project[];
  defaultProjectId: string;
  members: TeamMember[];
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, task, projects, defaultProjectId, members }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    projectId: defaultProjectId,
    assignedTo: '',
    dueDate: '',
    status: 'todo' as TaskStatus,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        projectId: task.projectId,
        assignedTo: task.assignedTo?.toString() || '',
        dueDate: task.dueDate || '',
        status: task.status,
      });
    } else {
      setFormData({
        title: '',
        projectId: defaultProjectId,
        assignedTo: '',
        dueDate: '',
        status: 'todo',
      });
    }
  }, [task, isOpen, defaultProjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await onSave({
          title: formData.title,
          projectId: formData.projectId,
          status: formData.status,
          assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : undefined,
          dueDate: formData.dueDate || undefined,
        });
        onClose();
    } catch (error) {
        console.error("Failed to save task", error);
        // Toast is now handled by the context with a more specific message
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{task ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">عنوان المهمة</label>
            <input type="text" id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
          </div>

          {projects.length > 1 && (
            <div>
              <label htmlFor="projectId" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المشروع</label>
              <select id="projectId" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">مسندة إلى</label>
              <select id="assignedTo" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                <option value="">غير مسندة</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">تاريخ الاستحقاق</label>
              <input type="date" id="dueDate" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" />
            </div>
          </div>

          <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الحالة</label>
              <select id="status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm">
                <option value="todo">لم تبدأ</option>
                <option value="inprogress">قيد التنفيذ</option>
                <option value="done">مكتملة</option>
              </select>
            </div>

          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};