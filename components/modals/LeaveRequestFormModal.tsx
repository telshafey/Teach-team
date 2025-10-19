import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { LeaveRequestFormData, LeaveType } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface LeaveRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: LeaveRequestFormData) => Promise<void>;
}

export const LeaveRequestFormModal: React.FC<LeaveRequestFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<LeaveRequestFormData>({
    type: 'regular',
    startDate: '',
    endDate: '',
    reason: '',
    createdAt: new Date().toISOString(),
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save leave request:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طلب إجازة جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium">نوع الإجازة</label>
          <select id="type" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as LeaveType })} className="w-full p-2 mt-1 border rounded-md" required>
            <option value="regular">عادية</option>
            <option value="emergency">طارئة</option>
            <option value="work-from-home">عمل من المنزل</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium">تاريخ البدء</label>
            <input type="date" id="startDate" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium">تاريخ الانتهاء</label>
            <input type="date" id="endDate" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium">السبب</label>
          <textarea id="reason" rows={3} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
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
