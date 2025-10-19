import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { WorkContractChangeRequestFormData } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface WorkContractChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: WorkContractChangeRequestFormData) => Promise<void>;
}

export const WorkContractChangeRequestModal: React.FC<WorkContractChangeRequestModalProps> = ({ isOpen, onClose, onSave }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<WorkContractChangeRequestFormData>({
    requestedWeeklyHours: currentUser?.weeklyHoursRequirement || 40,
    requestedSalary: currentUser?.salary || 0,
    reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit request:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طلب تعديل ساعات العمل والراتب">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentHours" className="block text-sm font-medium text-slate-500">الساعات الأسبوعية الحالية</label>
            <p className="font-semibold mt-1">{currentUser?.weeklyHoursRequirement || 'N/A'}</p>
          </div>
          <div>
            <label htmlFor="currentSalary" className="block text-sm font-medium text-slate-500">الراتب الحالي</label>
            <p className="font-semibold mt-1">{currentUser?.salary?.toLocaleString() || 'N/A'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="requestedWeeklyHours" className="block text-sm font-medium">الساعات الأسبوعية المطلوبة</label>
            <input type="number" id="requestedWeeklyHours" value={formData.requestedWeeklyHours} onChange={e => setFormData({ ...formData, requestedWeeklyHours: Number(e.target.value) })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
          <div>
            <label htmlFor="requestedSalary" className="block text-sm font-medium">الراتب المطلوب</label>
            <input type="number" id="requestedSalary" value={formData.requestedSalary} onChange={e => setFormData({ ...formData, requestedSalary: Number(e.target.value) })} className="w-full p-2 mt-1 border rounded-md" required />
          </div>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium">سبب الطلب</label>
          <textarea id="reason" rows={3} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full p-2 mt-1 border rounded-md" required />
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-slate-100">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md">
            {isSaving ? <LoadingSpinner /> : 'إرسال الطلب'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
