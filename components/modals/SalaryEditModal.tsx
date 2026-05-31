import React, { useState, FormEvent, useEffect } from 'react';
import { TeamMember } from '@shared/types';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { useToast } from '@shared/contexts/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';

interface SalaryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberId: number, data: { salary?: number; hourlyRate?: number }) => Promise<void>;
  member: TeamMember;
}

export const SalaryEditModal: React.FC<SalaryEditModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { currency } = useSettingsContext();
  const [rate, setRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isFreelancer = member.roleId === 'freelancer';

  useEffect(() => {
    if (member) {
      if (isFreelancer) {
        setRate(member.hourlyRate?.toString() || '');
      } else {
        setRate(member.salary?.toString() || '');
      }
    }
  }, [member, isFreelancer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };
  
  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      const rateValue = parseFloat(rate) || 0;
      const data = isFreelancer ? { hourlyRate: rateValue } : { salary: rateValue };
      await onSave(member.id, data);
      onClose();
    } catch (error) {
        console.error("Failed to save salary/rate:", error);
        // Toast is now handled by the context with a more specific message
    } finally {
        setIsSaving(false);
    }
  };

  const label = isFreelancer ? `سعر الساعة (${currency})` : `الراتب الشهري (${currency})`;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">تعديل: {member.name}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="rate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
              <input
                type="number"
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                required
              />
            </div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد تعديل الراتب"
        message={`هل أنت متأكد من رغبتك في حفظ التعديلات على راتب/سعر ${member.name}؟`}
      />
    </>
  );
};
