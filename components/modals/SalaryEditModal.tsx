import React, { useState, FormEvent, useEffect } from 'react';
import { TeamMember } from '../../types';
import { useAppDataContext } from '../../contexts/DataContext';

interface SalaryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberId: number, salary: number) => Promise<void>;
  member: TeamMember;
}

export const SalaryEditModal: React.FC<SalaryEditModalProps> = ({ isOpen, onClose, onSave, member }) => {
  const { currency } = useAppDataContext();
  const [salary, setSalary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setSalary(member.salary?.toString() || '');
    }
  }, [member]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(member.id, parseFloat(salary) || 0);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-slate-800">تعديل راتب: {member.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-slate-600 mb-1">الراتب الشهري ({currency})</label>
            <input
              type="number"
              id="salary"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md text-sm"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">إلغاء</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-slate-400">
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
