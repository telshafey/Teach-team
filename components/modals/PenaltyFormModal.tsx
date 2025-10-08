import React, { useState, FormEvent, useEffect } from 'react';
import { PenaltyFormData, TeamMember } from '../../types';
import { ConfirmationModal } from './ConfirmationModal';
import { useAppDataContext } from '../../contexts/DataContext';
import { format } from 'date-fns';

interface PenaltyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: PenaltyFormData) => Promise<void>;
}

export const PenaltyFormModal: React.FC<PenaltyFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const { teamMembers, currency } = useAppDataContext();
  const [formData, setFormData] = useState({
    teamMemberId: '',
    amount: '',
    reason: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        teamMemberId: '',
        amount: '',
        reason: '',
        date: format(new Date(), 'yyyy-MM-dd'),
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
      await onSave({
        ...formData,
        teamMemberId: Number(formData.teamMemberId),
        amount: Number(formData.amount),
      });
      onClose();
    } catch (error) {
      console.error("Failed to issue penalty", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">إصدار جزاء جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="teamMemberId" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">الموظف</label>
              <select
                id="teamMemberId"
                value={formData.teamMemberId}
                onChange={e => setFormData({ ...formData, teamMemberId: e.target.value })}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                required
              >
                <option value="" disabled>-- اختر موظف --</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">مبلغ الخصم ({currency})</label>
                <input type="number" step="0.01" id="amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">تاريخ الواقعة</label>
                <input type="date" id="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required />
              </div>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">السبب</label>
              <textarea id="reason" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} rows={4} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm" required></textarea>
            </div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-slate-400">
                {isSaving ? 'جارٍ الإصدار...' : 'إصدار الجزاء'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد إصدار الجزاء"
        message="هل أنت متأكد من رغبتك في إصدار هذا الجزاء؟ سيتم إعلام الموظف بذلك."
        isDestructive
        confirmText="نعم، أصدر الجزاء"
      />
    </>
  );
};
