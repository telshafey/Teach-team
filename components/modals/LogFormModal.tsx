import React, { useState, FormEvent, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DailyLog, DailyLogFormData } from '../../types';
import { useProjectContext } from '../../contexts/ProjectContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface LogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logData: DailyLogFormData) => Promise<void>;
  log: DailyLog | null;
  date: string; // YYYY-MM-DD
  memberId: number;
  initialData?: Partial<DailyLogFormData & { hours: number }>;
}

export const LogFormModal: React.FC<LogFormModalProps> = ({ isOpen, onClose, onSave, log, date, memberId, initialData }) => {
  const { projects, tasks } = useProjectContext();
  const [formData, setFormData] = useState<DailyLogFormData>({
    hours: initialData?.hours || log?.hours || 1,
    description: log?.description || initialData?.description || '',
    projectId: log?.projectId || initialData?.projectId || '',
    taskId: log?.taskId || initialData?.taskId || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // If project changes, reset task if it doesn't belong to the new project
    if (formData.taskId) {
      const task = tasks.find(t => t.id === formData.taskId);
      if (task?.projectId !== formData.projectId) {
        setFormData(prev => ({ ...prev, taskId: '' }));
      }
    }
  }, [formData.projectId, tasks]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save log:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const myTasks = tasks.filter(t => t.assignedTo === memberId);
  const tasksForSelectedProject = formData.projectId
    ? myTasks.filter(task => task.projectId === formData.projectId)
    : myTasks.filter(task => !task.projectId); // Show private tasks if no project selected

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={log ? 'تعديل سجل عمل' : 'إضافة سجل عمل'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">التاريخ</label>
          <input type="date" id="date" value={date} disabled className="w-full p-2 mt-1 border rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-slate-700 dark:text-slate-300">الساعات</label>
            <input
              type="number"
              id="hours"
              step="0.1"
              min="0.1"
              value={formData.hours}
              onChange={e => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })}
              className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-slate-700 dark:text-slate-300">المشروع (اختياري)</label>
            <select
              id="project"
              value={formData.projectId}
              onChange={e => setFormData({ ...formData, projectId: e.target.value, taskId: '' })}
              className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
            >
              <option value="">خاص (بدون مشروع)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="task" className="block text-sm font-medium text-slate-700 dark:text-slate-300">المهمة (اختياري)</label>
          <select
            id="task"
            value={formData.taskId}
            onChange={e => setFormData({ ...formData, taskId: e.target.value })}
            className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
            disabled={tasksForSelectedProject.length === 0}
          >
            <option value="">-- اختر مهمة --</option>
            {tasksForSelectedProject.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">الوصف</label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
            required
          />
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
