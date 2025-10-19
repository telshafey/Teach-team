import React, { useState, FormEvent, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Task, TaskFormData, TaskStatus, TeamMember, Project } from './types';
import { useTeamContext } from './contexts/TeamContext';
import { useProjectContext } from './contexts/ProjectContext';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskFormData, isNew: boolean) => Promise<void>;
  task: Task | null;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, task }) => {
  const { teamMembers } = useTeamContext();
  const { projects } = useProjectContext();
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    status: 'todo',
  });
  const [isSaving, setIsSaving] = useState(false);
  const isNew = task === null;

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        projectId: task.projectId,
        assignedTo: task.assignedTo,
        status: task.status,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : undefined,
      });
    } else {
      setFormData({
        title: '',
        status: 'todo',
        projectId: undefined,
        assignedTo: undefined,
        dueDate: undefined,
      });
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData, isNew);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'مهمة جديدة' : 'تعديل المهمة'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>العنوان</label>
          <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full p-2 mt-1 border rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>الحالة</label>
            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })} className="w-full p-2 mt-1 border rounded-md">
              <option value="todo">لم تبدأ</option>
              <option value="inprogress">قيد التنفيذ</option>
              <option value="done">مكتملة</option>
            </select>
          </div>
          <div>
            <label>تاريخ الاستحقاق</label>
            <input type="date" value={formData.dueDate || ''} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full p-2 mt-1 border rounded-md" />
          </div>
          <div>
            <label>المشروع</label>
            <select value={formData.projectId || ''} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full p-2 mt-1 border rounded-md">
              <option value="">-- خاص --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label>مسندة إلى</label>
            <select value={formData.assignedTo || ''} onChange={e => setFormData({ ...formData, assignedTo: Number(e.target.value) })} className="w-full p-2 mt-1 border rounded-md">
              <option value="">-- غير مسندة --</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-md">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-white bg-sky-600 rounded-md">
            {isSaving ? <LoadingSpinner/> : "حفظ"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
