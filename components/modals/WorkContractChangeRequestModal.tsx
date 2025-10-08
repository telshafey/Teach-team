import React, { useState, FormEvent, useEffect } from 'react';
import { WorkContractChangeRequestFormData } from '../../types';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDataContext } from '../../contexts/DataContext';

interface WorkContractChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: WorkContractChangeRequestFormData) => Promise<void>;
}

export const WorkContractChangeRequestModal: React.FC<WorkContractChangeRequestModalProps> = ({ isOpen, onClose, onSave }) => {
  const { currentUser } = useAuth();
  const { currency } = useAppDataContext();
  const [formData, setFormData] = useState<WorkContractChangeRequestFormData>({
    requestedWeeklyHours: 0,
    requestedSalary: 0,
    reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData({
        requestedWeeklyHours: currentUser.weeklyHoursRequirement || 0,
        requestedSalary: currentUser.salary || 0,
        reason: '',
      });
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Failed to submit work contract change request", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">طلب تعديل عقد العمل</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">ساعات العمل الحالية</label>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{currentUser.weeklyHoursRequirement || 'غير محدد'} ساعة/أسبوع</p>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">الراتب الحالي</label>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{currentUser.salary?.toLocaleString() || 'غير محدد'} {currency}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="requestedWeeklyHours" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">ساعات العمل المطلوبة</label>
                <input
                  type="number"
                  id="requestedWeeklyHours"
                  value={formData.requestedWeeklyHours}
                  onChange={e => setFormData({ ...formData, requestedWeeklyHours: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="requestedSalary" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الراتب المطلوب ({currency})</label>
                <input
                  type="number"
                  id="requestedSalary"
                  value={formData.requestedSalary}
                  onChange={e => setFormData({ ...formData, requestedSalary: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">سبب الطلب</label>
              <textarea
                id="reason"
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                rows={4}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                required
              ></textarea>
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
        title="تأكيد طلب تعديل العقد"
        message="هل أنت متأكد من رغبتك في تقديم هذا الطلب؟ سيتم إرساله إلى مديرك للمراجعة."
      />
    </>
  );
};
