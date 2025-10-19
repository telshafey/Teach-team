import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AppealPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appealReason: string) => Promise<void>;
}

export const AppealPenaltyModal: React.FC<AppealPenaltyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(reason);
      onClose();
    } catch (error) {
      console.error('Failed to submit appeal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقديم استئناف على جزاء">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300">سبب الاستئناف</label>
          <textarea
            id="reason"
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
            required
          />
        </div>
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'إرسال الاستئناف'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
