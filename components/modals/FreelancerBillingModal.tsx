import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Project, BillingProposalFormData, BillingType } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useSettingsContext } from '../../contexts/SettingsContext';

interface FreelancerBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proposalData: BillingProposalFormData) => Promise<void>;
  project: Project;
}

export const FreelancerBillingModal: React.FC<FreelancerBillingModalProps> = ({ isOpen, onClose, onSave, project }) => {
  const { currency } = useSettingsContext();
  const [formData, setFormData] = useState<BillingProposalFormData>({
    type: 'hourly',
    amount: undefined,
    hourlyRate: undefined,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save proposal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تقديم اقتراح لمشروع: ${project.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">نوع العقد المقترح</label>
          <div className="flex space-x-4 rtl:space-x-reverse">
            <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
              <input type="radio" name="type" value="hourly" checked={formData.type === 'hourly'} onChange={() => setFormData(p => ({...p, type: 'hourly'}))} className="h-4 w-4 text-sky-600 focus:ring-sky-500" />
              <span>بالساعة</span>
            </label>
            <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
              <input type="radio" name="type" value="fixed" checked={formData.type === 'fixed'} onChange={() => setFormData(p => ({...p, type: 'fixed'}))} className="h-4 w-4 text-sky-600 focus:ring-sky-500" />
              <span>مبلغ ثابت</span>
            </label>
          </div>
        </div>

        {formData.type === 'hourly' && (
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">سعر الساعة المقترح ({currency})</label>
            <input
              type="number"
              id="hourlyRate"
              value={formData.hourlyRate || ''}
              onChange={e => setFormData({ ...formData, hourlyRate: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
              required
            />
          </div>
        )}

        {formData.type === 'fixed' && (
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300">المبلغ الإجمالي المقترح ({currency})</label>
            <input
              type="number"
              id="amount"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
              required
            />
          </div>
        )}

        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'إرسال الاقتراح'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
