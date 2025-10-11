import React, { useState, useEffect, FormEvent } from 'react';
import { LeaveRequestFormData, LeaveType } from '../../types';
import { ConfirmationModal } from './ConfirmationModal';
import { format } from 'date-fns';

interface LeaveRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: LeaveRequestFormData) => Promise<void>;
}

export const LeaveRequestFormModal: React.FC<LeaveRequestFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<LeaveRequestFormData, 'createdAt' | 'id' | 'teamMemberId' | 'status' | 'managerNotes'>>({
    type: 'regular',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = format(new Date(), 'yyyy-MM-dd');
      setFormData({
        type: 'regular',
        startDate: today,
        endDate: today,
        reason: '',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      const dataToSave: LeaveRequestFormData = {
          ...formData,
          createdAt: new Date().toISOString()
      };
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error("Failed to submit leave request", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">تقديم طلب إجازة</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">نوع الإجازة</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as LeaveType })}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
              >
                <option value="regular">عادية</option>
                <option value="emergency">طارئة</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">من تاريخ</label>
                <input type="date" id="startDate" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">إلى تاريخ</label>
                <input type="date" id="endDate" value={formData.endDate} min={formData.startDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
              </div>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">السبب</label>
              <textarea id="reason" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required></textarea>
            </div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                {isSaving ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد طلب الإجازة"
        message="هل أنت متأكد من رغبتك في تقديم طلب الإجازة هذا؟"
      />
    </>
  );
};
