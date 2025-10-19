import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { OvertimeRequestFormData } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useProjectContext } from '../../contexts/ProjectContext';
import { startOfWeek, format } from 'date-fns';

interface OvertimeRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: OvertimeRequestFormData) => Promise<void>;
}

export const OvertimeRequestFormModal: React.FC<OvertimeRequestFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const { projects } = useProjectContext();
  const [formData, setFormData] = useState<OvertimeRequestFormData>({
    weekStartDate: format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),
    requestedHours: 1,
    projectId: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save overtime request:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طلب ساعات عمل إضافية">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="weekStartDate" className="block text-sm font-medium">بداية الأسبوع</label>
            <input type="date" id="weekStartDate" value={formData.weekStartDate} onChange={e => setFormData({ ...formData, weekStartDate: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
          <div>
            <label htmlFor="requestedHours" className="block text-sm font-medium">عدد الساعات</label>
            <input type="number" step="0.5" min="0.5" id="requestedHours" value={formData.requestedHours} onChange={e => setFormData({ ...formData, requestedHours: Number(e.target.value) })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
        </div>
        <div>
          <label htmlFor="project" className="block text-sm font-medium">المشروع (اختياري)</label>
          <select id="project" value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full p-2 mt-1 border rounded-md">
            <option value="">-- لا يوجد --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 hover:bg-slate-200">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'إرسال الطلب'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
