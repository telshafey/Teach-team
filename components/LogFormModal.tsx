import React, { useState, useEffect, FormEvent } from 'react';
import { DailyLog, DailyLogFormData } from '../types';
import { useProjectContext } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';

interface LogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logData: DailyLogFormData) => Promise<void>;
  log: DailyLog | null;
  date: string;
  memberId: number;
  initialData?: {
    hours: number;
    taskId: string;
    projectId: string;
  }
}

export const LogFormModal: React.FC<LogFormModalProps> = ({ isOpen, onClose, onSave, log, date, memberId, initialData }) => {
  const { tasks, projects } = useProjectContext();
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    hours: '',
    description: '',
    projectId: '',
    taskId: ''
  });

  useEffect(() => {
    if (initialData) {
        setFormData({
            hours: initialData.hours.toFixed(2),
            description: '',
            projectId: initialData.projectId,
            taskId: initialData.taskId
        });
    } else if (log) {
      setFormData({
        hours: log.hours.toString(),
        description: log.description,
        projectId: log.projectId || '',
        taskId: log.taskId || ''
      });
    } else {
      setFormData({ hours: '', description: '', projectId: '', taskId: '' });
    }
  }, [log, initialData, isOpen]);
  
  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await onSave({ 
            hours: parseFloat(formData.hours) || 0,
            description: formData.description,
            projectId: formData.projectId || undefined,
            taskId: formData.taskId || undefined,
        });
        onClose();
    } catch (error: any) {
        console.error("Failed to save log:", error);
        addToast(error.message || 'فشل حفظ السجل. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const availableTasks = formData.projectId ? tasks.filter(t => t.projectId === formData.projectId) : [];
  const isFromTimer = !!initialData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{log ? 'تعديل السجل' : `إضافة سجل ليوم ${date}`}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">عدد الساعات</label>
            <input type="number" step="0.1" id="hours" value={formData.hours} onChange={e => setFormData({...formData, hours: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-slate-100 dark:bg-slate-700 read-only:cursor-not-allowed" required readOnly={isFromTimer} />
          </div>
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المشروع</label>
            <select id="project" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value, taskId: ''})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-slate-100 dark:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70" disabled={isFromTimer}>
              <option value="">عمل آخر / غير مرتبط بمشروع</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
           {formData.projectId && availableTasks.length > 0 && (
            <div>
              <label htmlFor="task" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المهمة (اختياري)</label>
              <select id="task" value={formData.taskId} onChange={e => setFormData({...formData, taskId: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-slate-100 dark:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70" disabled={isFromTimer}>
                <option value="">اختر مهمة</option>
                {availableTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
           )}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الوصف</label>
            <textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required></textarea>
          </div>
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};