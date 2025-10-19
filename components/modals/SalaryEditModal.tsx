import React, { useState, FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { TeamMember } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useSettingsContext } from '../../contexts/SettingsContext';

interface SalaryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberId: number, data: { salary?: number; hourlyRate?: number }) => Promise<void>;
  member: TeamMember;
}

export const SalaryEditModal: React.FC<SalaryEditModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { currency } = useSettingsContext();
  const [salary, setSalary] = useState(member.salary || '');
  const [hourlyRate, setHourlyRate] = useState(member.hourlyRate || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saveData = member.employmentType === 'freelancer'
        ? { hourlyRate: Number(hourlyRate) }
        : { salary: Number(salary) };
      await onSave(member.id, saveData);
    } catch (error) {
      console.error("Failed to save salary/rate", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تعديل راتب ${member.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {member.employmentType === 'freelancer' ? (
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">سعر الساعة ({currency})</label>
            <input
              type="number"
              id="hourlyRate"
              value={hourlyRate}
              onChange={e => setHourlyRate(e.target.value)}
              className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
              required
            />
          </div>
        ) : (
          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-slate-700 dark:text-slate-300">الراتب الشهري ({currency})</label>
            <input
              type="number"
              id="salary"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              className="w-full p-2 mt-1 border border-slate-300 dark:border-slate-600 rounded-md"
              required
            />
          </div>
        )}
        <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">إلغاء</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
            {isSaving ? <LoadingSpinner /> : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
